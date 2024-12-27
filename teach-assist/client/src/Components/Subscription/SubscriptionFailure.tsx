import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useNavigate } from 'react-router-dom';

const SubscriptionFailure: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3
        }}
      >
        <ErrorOutlineIcon 
          sx={{ 
            fontSize: 64,
            color: 'error.main'
          }} 
        />

        <Typography 
          variant="h4" 
          component="h1"
          sx={{ fontWeight: 600 }}
        >
          Subscription Failed
        </Typography>

        <Typography variant="body1" color="text.secondary">
          We encountered an issue while processing your subscription. 
          Don't worry - no payment has been taken. Please try again or contact support if the problem persists.
        </Typography>

        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/subscription')}
            sx={{ 
              px: 4,
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => window.location.href = 'mailto:support@teachassist.com'}
            sx={{ 
              px: 4,
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            Contact Support
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SubscriptionFailure; 