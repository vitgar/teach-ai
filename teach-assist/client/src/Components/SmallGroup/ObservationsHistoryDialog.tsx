import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Paper,
  DialogActions,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Observation {
  student: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  observation: string;
  date: string;
  lessonPlan?: {
    standard: {
      code: string;
      description: string;
    };
  };
}

interface ObservationsHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  observations: { [key: string]: Observation[] };
}

const ObservationsHistoryDialog: React.FC<ObservationsHistoryDialogProps> = ({
  open,
  onClose,
  observations,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const studentIds = Object.keys(observations);
  const maxObservations = Math.max(...Object.values(observations).map(obs => obs.length));

  // Reset currentIndex when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open]);

  const handleNext = () => {
    // Next means going to older observations
    if (currentIndex < maxObservations - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    // Previous means going to newer observations
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get the current observation's standard (from any student's observation)
  const currentStandard = Object.values(observations)[0]?.[currentIndex]?.lessonPlan?.standard;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Observation History</Typography>
          {maxObservations > 1 && (
            <Box>
              <IconButton 
                onClick={handleNext}
                disabled={currentIndex === maxObservations - 1}
                title="View older observations"
                sx={{ mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <IconButton 
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                title="View newer observations"
              >
                <ArrowForwardIcon />
              </IconButton>
            </Box>
          )}
        </Box>
        {maxObservations > 0 && Object.values(observations)[0]?.[currentIndex] && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              {formatDate(Object.values(observations)[0][currentIndex].date)}
            </Typography>
            {currentStandard && (
              <Box sx={{ mt: 1, backgroundColor: 'primary.light', p: 1.5, borderRadius: 1 }}>
                <Typography variant="subtitle2" color="primary.contrastText" fontWeight="bold">
                  {currentStandard.code}
                </Typography>
                <Typography variant="body2" color="primary.contrastText">
                  {currentStandard.description}
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {studentIds.map((studentId) => {
            const studentObs = observations[studentId][currentIndex];
            if (!studentObs) return null;

            return (
              <Paper key={studentId} sx={{ p: 2 }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  {studentObs.student.firstName} {studentObs.student.lastName}
                </Typography>
                <Typography variant="body1">
                  {studentObs.observation}
                </Typography>
              </Paper>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ObservationsHistoryDialog; 