import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTeacher } from '../../context/TeacherContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface SubscriptionInfo {
  status: string;
  plan: string;
  amount: string;
  next_billing_date?: string;
}

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const { teacher } = useTeacher();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [cancelling, setCancelling] = useState(false);

  const fetchSubscriptionStatus = async () => {
    if (!teacher?._id) {
      setError('Please log in to manage your subscription');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5002/subscription/status?teacherId=${encodeURIComponent(teacher._id)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.has_subscription && data.subscription_info) {
        setSubscriptionInfo(data.subscription_info);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      setError('Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [teacher?._id]);

  const handleSubscribe = async () => {
    if (!teacher?._id) {
      setError('Please log in to subscribe');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5002/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          interval: selectedInterval,
          teacherId: teacher._id,
          email: teacher.email
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else if (data.redirectUrl) {
        // Store the flow ID and interval in localStorage
        localStorage.setItem('subscriptionFlowId', data.flowId);
        localStorage.setItem('subscriptionInterval', selectedInterval);
        localStorage.setItem('subscriptionTeacherId', teacher._id);
        window.location.href = data.redirectUrl;
      } else {
        setError('Failed to create subscription');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!teacher?._id) {
      setError('Please log in to manage your subscription');
      return;
    }

    try {
      setCancelling(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5002/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          teacherId: teacher._id
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        // Refresh subscription status
        await fetchSubscriptionStatus();
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Return to Home
        </Button>
      </Box>
    );
  }

  if (subscriptionInfo?.status === 'active') {
    return (
      <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto', mt: 8 }}>
        <Typography variant="h4" gutterBottom>
          Current Subscription
        </Typography>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" color="primary">
                {subscriptionInfo.plan}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                backgroundColor: 'success.light',
                color: 'success.contrastText',
                px: 2,
                py: 0.5,
                borderRadius: 1
              }}>
                <Typography variant="body2">
                  Active
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="h6" color="primary" gutterBottom>
              {subscriptionInfo.amount}
              <Typography 
                component="span" 
                variant="body1" 
                color="text.secondary" 
                sx={{ ml: 1 }}
              >
                {subscriptionInfo.plan.toLowerCase().includes('monthly') ? '/month' : '/year'}
              </Typography>
            </Typography>

            {subscriptionInfo.next_billing_date && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                Next billing date: {new Date(subscriptionInfo.next_billing_date).toLocaleDateString()}
              </Typography>
            )}

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Plan Features:
              </Typography>
              {[
                'Unlimited Lesson Plans',
                'AI-Powered Content Generation',
                'Student Progress Tracking',
                'Premium Support',
                'Regular Updates'
              ].map((feature, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1
                  }}
                >
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  <Typography variant="body2">{feature}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
          <CardActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => {
                const newInterval = subscriptionInfo.plan.toLowerCase().includes('monthly') ? 'yearly' : 'monthly';
                setSelectedInterval(newInterval);
                handleSubscribe();
              }}
              disabled={loading}
            >
              Switch to {subscriptionInfo.plan.toLowerCase().includes('monthly') ? 'Yearly' : 'Monthly'} Plan
              {subscriptionInfo.plan.toLowerCase().includes('monthly') ? ' ($79.99/year - Save 16%)' : ' ($7.99/month)'}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={handleCancelSubscription}
              disabled={loading || cancelling}
            >
              {cancelling ? <CircularProgress size={24} /> : 'Cancel Subscription'}
            </Button>
          </CardActions>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto', mt: 8 }}>
      <Typography variant="h4" gutterBottom>
        Subscribe to TeachAssist Premium
      </Typography>
      <Typography variant="body1" paragraph>
        Get access to all premium features and unlimited AI-powered teaching assistance.
      </Typography>

      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: '100%',
              border: selectedInterval === 'monthly' ? 2 : 1,
              borderColor: selectedInterval === 'monthly' ? 'primary.main' : 'grey.300'
            }}
          >
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Monthly Plan
              </Typography>
              <Typography variant="h4" color="primary" gutterBottom>
                $7.99
                <Typography variant="subtitle1" component="span" color="text.secondary">
                  /month
                </Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Billed monthly
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                fullWidth 
                variant={selectedInterval === 'monthly' ? 'contained' : 'outlined'}
                onClick={() => setSelectedInterval('monthly')}
              >
                {selectedInterval === 'monthly' ? 'Selected' : 'Select Monthly'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: '100%',
              border: selectedInterval === 'yearly' ? 2 : 1,
              borderColor: selectedInterval === 'yearly' ? 'primary.main' : 'grey.300'
            }}
          >
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Yearly Plan
              </Typography>
              <Typography variant="h4" color="primary" gutterBottom>
                $79.99
                <Typography variant="subtitle1" component="span" color="text.secondary">
                  /year
                </Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Billed annually (Save 16%)
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                fullWidth 
                variant={selectedInterval === 'yearly' ? 'contained' : 'outlined'}
                onClick={() => setSelectedInterval('yearly')}
              >
                {selectedInterval === 'yearly' ? 'Selected' : 'Select Yearly'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Subscribe Now'}
        </Button>
      </Box>
    </Box>
  );
};

export default Subscription; 