from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import gocardless_pro
import logging
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# Initialize GoCardless client
gocardless_client = gocardless_pro.Client(
    access_token=os.getenv('GOCARDLESS_ACCESS_TOKEN'),
    environment=os.getenv('GOCARDLESS_ENVIRONMENT', 'sandbox')
)

# Define plans at module level
PLANS = {
    'monthly': {
        'template_id': 'PL00001QKDB18E',
        'amount': 799
    },
    'yearly': {
        'template_id': 'PL00001QKE0E60',
        'amount': 7999
    }
}

@app.route('/create-subscription', methods=['POST'])
def create_subscription():
    try:
        data = request.json
        interval = data.get('interval', 'monthly')
        teacher_id = data.get('teacherId')
        email = data.get('email')

        if not teacher_id or not email:
            return jsonify({"error": "Teacher ID and email are required"}), 400

        plan = PLANS.get(interval)
        if not plan:
            return jsonify({"error": "Invalid interval"}), 400

        # Create a redirect flow
        redirect_flow = gocardless_client.redirect_flows.create({
            "description": f"TeachAssist Premium ({interval} plan)",
            "session_token": teacher_id,  # Use teacher_id as session token
            "success_redirect_url": "http://localhost:3000/subscription/success",
            "prefilled_customer": {
                "email": email
            }
        })

        logging.info(f"Created redirect flow with ID: {redirect_flow.id}")
        return jsonify({
            "redirectUrl": redirect_flow.redirect_url,
            "flowId": redirect_flow.id,
            "templateId": plan['template_id']
        })

    except Exception as e:
        logging.error(f"Error creating subscription: {str(e)}")
        return jsonify({"error": f"Failed to create subscription: {str(e)}"}), 500

@app.route('/subscription/confirm', methods=['POST'])
def confirm_subscription():
    try:
        data = request.json
        flow_id = data.get('flowId')
        interval = data.get('interval', 'monthly')
        teacher_id = data.get('teacherId')

        if not flow_id or not interval or not teacher_id:
            return jsonify({"error": "Missing required parameters"}), 400

        try:
            # Complete the redirect flow
            completed_flow = gocardless_client.redirect_flows.complete(
                flow_id,
                params={
                    "session_token": teacher_id
                }
            )
            
            logging.info(f"Completed redirect flow, mandate ID: {completed_flow.links.mandate}")

            # Create subscription using the template
            subscription_params = {
                "amount": PLANS[interval]['amount'],
                "currency": "USD",
                "links": {
                    "mandate": completed_flow.links.mandate
                },
                "metadata": {
                    "teacher_id": teacher_id,
                    "template_id": PLANS[interval]['template_id']
                }
            }

            # Add interval-specific parameters
            if interval == 'yearly':
                subscription_params.update({
                    "interval_unit": "yearly",
                    "start_date": None
                })
            else:
                subscription_params.update({
                    "interval_unit": "monthly",
                    "day_of_month": "1"
                })

            subscription = gocardless_client.subscriptions.create(subscription_params)
            
            # Get customer ID from completed flow
            customer_id = completed_flow.links.customer
            
            # Get auth token from request
            auth_token = request.headers.get('Authorization')
            
            # Safely get next billing date
            next_billing_date = None
            try:
                if subscription.upcoming_payments and len(subscription.upcoming_payments) > 0:
                    next_billing_date = subscription.upcoming_payments[0].charge_date
            except AttributeError:
                logging.warning("Could not get next billing date from subscription")
            
            # Update teacher's subscription status in our database
            response = requests.post(
                f'http://localhost:5000/teachers/{teacher_id}/subscription',
                headers={'Authorization': auth_token} if auth_token else {},
                json={
                    'subscription': {
                        'status': 'active',
                        'plan': interval,
                        'subscriptionId': subscription.id,
                        'nextBillingDate': next_billing_date
                    },
                    'paymentProviders': {
                        'gocardless': {
                            'customerId': customer_id,
                            'mandateId': completed_flow.links.mandate
                        }
                    }
                }
            )
            
            if not response.ok:
                logging.error(f"Failed to update teacher subscription status: {response.text}")
                return jsonify({"error": "Failed to update subscription status"}), 500

            logging.info(f"Created subscription with ID: {subscription.id}")
            return jsonify({
                "success": True,
                "subscription_id": subscription.id
            })

        except gocardless_pro.errors.InvalidStateError as e:
            logging.warning(f"GoCardless state error: {str(e)}")
            return jsonify({
                "error": "Invalid subscription state. Please try again."
            }), 400

    except Exception as e:
        logging.error(f"Error confirming subscription: {str(e)}")
        return jsonify({"error": f"Failed to confirm subscription: {str(e)}"}), 500

@app.route('/subscription/status', methods=['GET'])
def get_subscription_status():
    try:
        teacher_id = request.args.get('teacherId')
        auth_token = request.headers.get('Authorization')
        logging.info(f"Checking subscription status for teacher ID: {teacher_id}")
        
        if not teacher_id:
            return jsonify({"error": "Teacher ID is required"}), 400

        # Get teacher data from our database to check for GoCardless customer ID
        response = requests.get(
            f'http://localhost:5000/teachers/{teacher_id}',
            headers={'Authorization': auth_token} if auth_token else {}
        )
        if not response.ok:
            logging.error(f"Failed to fetch teacher data: {response.status_code} - {response.text}")
            return jsonify({"error": "Failed to fetch teacher data"}), response.status_code
        
        teacher_data = response.json()
        logging.info(f"Teacher data received: {teacher_data}")
        
        gocardless_data = teacher_data.get('paymentProviders', {}).get('gocardless', {})
        customer_id = gocardless_data.get('customerId')
        logging.info(f"GoCardless customer ID: {customer_id}")

        if not customer_id:
            return jsonify({
                "has_subscription": False,
                "message": "No GoCardless customer ID found"
            })

        try:
            logging.info("Fetching mandates from GoCardless...")
            # Get all mandates to check their status
            all_mandates_response = gocardless_client.mandates.list(params={
                "customer": customer_id
            })
            all_mandates = all_mandates_response.records
            logging.info(f"Found {len(all_mandates)} total mandates")
            for mandate in all_mandates:
                logging.info(f"Mandate {mandate.id} status: {mandate.status}")

            # Get mandates that are either active or pending_submission
            valid_mandates = [m for m in all_mandates if m.status in ['active', 'pending_submission']]
            logging.info(f"Found {len(valid_mandates)} valid mandates")

            if not valid_mandates:
                if all_mandates:
                    return jsonify({
                        "has_subscription": False,
                        "message": f"Found mandate(s) but none are valid. Latest mandate status: {all_mandates[0].status}"
                    })
                return jsonify({
                    "has_subscription": False,
                    "message": "No mandates found"
                })

            # Use the most recent valid mandate
            current_mandate = valid_mandates[0]
            logging.info(f"Using mandate: {current_mandate.id} with status: {current_mandate.status}")

            # Get all subscriptions for the mandate
            all_subscriptions_response = gocardless_client.subscriptions.list(params={
                "mandate": current_mandate.id
            })
            all_subscriptions = all_subscriptions_response.records
            logging.info(f"Found {len(all_subscriptions)} total subscriptions")

            # Filter subscriptions by status
            valid_subscriptions = [
                s for s in all_subscriptions 
                if s.status in ['active', 'pending_submission']
            ]
            logging.info(f"Found {len(valid_subscriptions)} valid subscriptions")

            if valid_subscriptions:
                current_subscription = valid_subscriptions[0]
                logging.info(f"Found subscription: {current_subscription.id} with status: {current_subscription.status}")
                
                # Get upcoming payments for the subscription
                try:
                    upcoming_payments = gocardless_client.payments.list(params={
                        "subscription": current_subscription.id,
                        "status": "pending_submission"
                    }).records
                    logging.info(f"Found {len(upcoming_payments)} upcoming payments")
                    next_billing_date = upcoming_payments[0].charge_date if upcoming_payments else None
                except Exception as payment_error:
                    logging.warning(f"Error fetching upcoming payments: {str(payment_error)}")
                    next_billing_date = None

                logging.info(f"Next billing date: {next_billing_date}")

                return jsonify({
                    "has_subscription": True,
                    "subscription_info": {
                        "status": current_subscription.status,
                        "plan": f"{'Monthly' if current_subscription.interval_unit == 'monthly' else 'Yearly'} Plan",
                        "amount": "$7.99" if current_subscription.interval_unit == 'monthly' else "$79.99",
                        "next_billing_date": next_billing_date,
                        "subscription_id": current_subscription.id
                    }
                })
            else:
                return jsonify({
                    "has_subscription": False,
                    "message": "No active subscription found"
                })

        except Exception as gocardless_error:
            logging.error(f"Error verifying with GoCardless: {str(gocardless_error)}")
            return jsonify({
                "error": f"Failed to verify subscription with GoCardless: {str(gocardless_error)}"
            }), 500

    except Exception as e:
        logging.error(f"Error getting subscription status: {str(e)}")
        return jsonify({"error": f"Failed to get subscription status: {str(e)}"}), 500

@app.route('/subscription/cancel', methods=['POST'])
def cancel_subscription():
    try:
        data = request.json
        teacher_id = data.get('teacherId')
        auth_token = request.headers.get('Authorization')

        if not teacher_id:
            return jsonify({"error": "Teacher ID is required"}), 400

        # Get teacher data to find subscription
        response = requests.get(
            f'http://localhost:5000/teachers/{teacher_id}',
            headers={'Authorization': auth_token} if auth_token else {}
        )
        if not response.ok:
            return jsonify({"error": "Failed to fetch teacher data"}), response.status_code
        
        teacher_data = response.json()
        gocardless_data = teacher_data.get('paymentProviders', {}).get('gocardless', {})
        customer_id = gocardless_data.get('customerId')

        if not customer_id:
            return jsonify({"error": "No subscription found"}), 404

        # Get customer's mandates from GoCardless
        mandates = gocardless_client.mandates.list(params={
            "customer": customer_id
        }).records

        if not mandates:
            return jsonify({"error": "No active mandate found"}), 404

        # Get subscriptions for the mandate
        subscriptions = gocardless_client.subscriptions.list(params={
            "mandate": mandates[0].id
        }).records

        active_subscriptions = [s for s in subscriptions if s.status == "active"]

        if not active_subscriptions:
            return jsonify({"error": "No active subscription found"}), 404

        try:
            # Cancel the subscription
            subscription = active_subscriptions[0]
            gocardless_client.subscriptions.cancel(subscription.id)
            logging.info(f"Cancelled subscription: {subscription.id}")

            # Update teacher's subscription status in our database
            response = requests.post(
                f'http://localhost:5000/teachers/{teacher_id}/subscription',
                headers={'Authorization': auth_token} if auth_token else {},
                json={
                    'subscription': {
                        'status': 'cancelled',
                        'plan': 'none',
                        'subscriptionId': None,
                        'nextBillingDate': None
                    }
                }
            )

            if not response.ok:
                logging.error(f"Failed to update teacher subscription status: {response.status_code} - {response.text}")
                return jsonify({"error": "Failed to update subscription status"}), 500

            return jsonify({"success": True, "message": "Subscription cancelled successfully"})
        except Exception as cancel_error:
            logging.error(f"Error cancelling subscription with GoCardless: {str(cancel_error)}")
            return jsonify({"error": f"Failed to cancel subscription: {str(cancel_error)}"}), 500

    except Exception as e:
        logging.error(f"Error cancelling subscription: {str(e)}")
        return jsonify({"error": f"Failed to cancel subscription: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5002)