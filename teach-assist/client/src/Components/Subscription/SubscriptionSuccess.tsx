import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper
} from '@mui/material';

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const confirmationInProgress = useRef(false);

  useEffect(() => {
    const confirmSubscription = async () => {
      // If confirmation is already in progress, don't send another request
      if (confirmationInProgress.current) {
        return;
      }

      try {
        confirmationInProgress.current = true;
        const flowId = localStorage.getItem('subscriptionFlowId');
        const interval = localStorage.getItem('subscriptionInterval');
        const teacherId = localStorage.getItem('subscriptionTeacherId');
        const token = localStorage.getItem('token');

        if (!flowId || !interval || !teacherId) {
          throw new Error('Missing subscription details');
        }

        const response = await fetch('http://localhost:5002/subscription/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            flowId,
            interval,
            teacherId
          }),
        });

        const data = await response.json();
        if (data.success) {
          setStatus('success');
          // Clear the localStorage
          localStorage.removeItem('subscriptionFlowId');
          localStorage.removeItem('subscriptionInterval');
          localStorage.removeItem('subscriptionTeacherId');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Error confirming subscription:', error);
        setStatus('error');
      } finally {
        confirmationInProgress.current = false;
      }
    };

    confirmSubscription();
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: '0 auto', mt: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        {status === 'loading' && (
          <Box>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Processing your subscription...
            </Typography>
            <Typography color="text.secondary">
              Please wait while we confirm your payment details.
            </Typography>
          </Box>
        )}
        {status === 'success' && (
          <Box>
            <Typography variant="h5" color="primary" gutterBottom>
              Subscription Successful!
            </Typography>
            <Typography paragraph color="text.secondary">
              Thank you for subscribing to TeachAssist Premium.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{ mt: 2 }}
            >
              Return to Home
            </Button>
          </Box>
        )}
        {status === 'error' && (
          <Box>
            <Typography variant="h5" color="error" gutterBottom>
              Something went wrong
            </Typography>
            <Typography paragraph color="text.secondary">
              We couldn't process your subscription. Please try again.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/subscription')}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SubscriptionSuccess; 