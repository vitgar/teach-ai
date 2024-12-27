import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const SubscriptionPlans: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5002/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: 'monthly',
          amount: 799, // $7.99 in cents
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const data = await response.json();
      // Redirect to GoCardless checkout
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom 
        sx={{ 
          textAlign: 'center',
          mb: 4,
          fontWeight: 600
        }}
      >
        Choose Your Plan
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4,
            width: '100%',
            maxWidth: 400,
            textAlign: 'center',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.02)'
            }
          }}
        >
          <Typography 
            variant="h5" 
            component="h2" 
            gutterBottom
            sx={{ color: 'primary.main', fontWeight: 600 }}
          >
            Monthly Plan
          </Typography>

          <Box sx={{ my: 3 }}>
            <Typography 
              variant="h3" 
              component="div" 
              sx={{ fontWeight: 700 }}
            >
              $7.99
              <Typography 
                component="span" 
                sx={{ 
                  fontSize: '1rem',
                  color: 'text.secondary',
                  ml: 1
                }}
              >
                /month
              </Typography>
            </Typography>
          </Box>

          <Box sx={{ my: 4 }}>
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
                  justifyContent: 'center',
                  gap: 1,
                  mb: 2
                }}
              >
                <CheckCircleIcon sx={{ color: 'success.main' }} />
                <Typography>{feature}</Typography>
              </Box>
            ))}
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubscribe}
            disabled={loading}
            sx={{ 
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Subscribe Now'
            )}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default SubscriptionPlans; 