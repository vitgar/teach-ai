import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface SuccessAlertProps {
  open: boolean;
  message: string;
  onClose: () => void;
  severity?: AlertColor;
  duration?: number;
}

const SuccessAlert: React.FC<SuccessAlertProps> = ({
  open,
  message,
  onClose,
  severity = 'success',
  duration = 3000
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        onClose={onClose} 
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default SuccessAlert; 