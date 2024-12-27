import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
} from '@mui/material';
import {
  Palette,
  Notifications,
  Language,
  Security,
  Assessment,
  School,
  WorkspacePremium,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface SubscriptionInfo {
  status: string;
  plan: string;
  nextBillingDate?: string;
  amount: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update subscription info after cancellation
        setSubscriptionInfo(null);
      } else {
        console.error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setCancelDialogOpen(false);
    }
  };

  const settingsGroups = [
    {
      title: 'Subscription',
      icon: <WorkspacePremium />,
      description: subscriptionInfo ? 
        `Current plan: ${subscriptionInfo.plan} (${subscriptionInfo.amount}/month)` :
        'Manage your subscription plan and billing details.',
      action: () => navigate('/subscription'),
      secondaryAction: subscriptionInfo ? {
        label: 'Cancel Subscription',
        onClick: () => setCancelDialogOpen(true),
        color: 'error' as const
      } : undefined
    },
    {
      title: 'Appearance',
      icon: <Palette />,
      description: 'Customize the look and feel of your dashboard, including themes and layout preferences.'
    },
    {
      title: 'Notifications',
      icon: <Notifications />,
      description: 'Configure email notifications for student progress, upcoming sessions, and reminders.'
    },
    {
      title: 'Language & Region',
      icon: <Language />,
      description: 'Set your preferred language and regional settings for dates and measurements.'
    },
    {
      title: 'Security',
      icon: <Security />,
      description: 'Manage your password, enable two-factor authentication, and review login history.'
    },
    {
      title: 'Reports & Analytics',
      icon: <Assessment />,
      description: 'Configure default settings for student progress reports and data analytics.'
    },
    {
      title: 'Teaching Preferences',
      icon: <School />,
      description: 'Set default values for guided reading sessions and intervention strategies.'
    },
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto', mt: 8 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure your TeachAssist experience with these settings.
      </Typography>

      <List>
        {settingsGroups.map((group, index) => (
          <React.Fragment key={group.title}>
            <Paper sx={{ mb: 2 }}>
              {group.action ? (
                <ListItemButton onClick={group.action} sx={{ py: 2 }}>
                  <ListItemIcon>
                    {group.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={group.title}
                    secondary={group.description}
                    primaryTypographyProps={{
                      variant: 'h6',
                      gutterBottom: true
                    }}
                    secondaryTypographyProps={{
                      variant: 'body2'
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {group.secondaryAction && (
                      <Button
                        variant="outlined"
                        color={group.secondaryAction.color}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          group.secondaryAction?.onClick();
                        }}
                      >
                        {group.secondaryAction.label}
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                    >
                      Manage
                    </Button>
                  </Box>
                </ListItemButton>
              ) : (
                <ListItem sx={{ py: 2 }}>
                  <ListItemIcon>
                    {group.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={group.title}
                    secondary={group.description}
                    primaryTypographyProps={{
                      variant: 'h6',
                      gutterBottom: true
                    }}
                    secondaryTypographyProps={{
                      variant: 'body2'
                    }}
                  />
                </ListItem>
              )}
            </Paper>
            {index < settingsGroups.length - 1 && <Box sx={{ mb: 2 }} />}
          </React.Fragment>
        ))}
      </List>

      {/* Cancellation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCancelDialogOpen(false)} 
            color="primary"
            disabled={loading}
          >
            Keep Subscription
          </Button>
          <Button 
            onClick={handleCancelSubscription} 
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Cancelling...' : 'Yes, Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings; 