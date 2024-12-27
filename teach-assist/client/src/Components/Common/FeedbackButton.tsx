import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Rating,
  Typography,
  Box,
  CircularProgress,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem
} from '@mui/material';
import FeedbackIcon from '@mui/icons-material/Feedback';
import apiAxiosInstance from '../../utils/axiosInstance';

interface FeedbackButtonProps {
  page: string;
}

interface FeedbackQuestion {
  id: string;
  question: string;
  type: 'rating' | 'text' | 'yesno' | 'select';
  options?: string[];
  required?: boolean;
}

const FEEDBACK_QUESTIONS: { [key: string]: FeedbackQuestion[] } = {
  'lesson-plan': [
    {
      id: 'overall',
      question: 'How was your experience creating a lesson plan on this page?',
      type: 'rating',
      required: true
    },
    {
      id: 'features',
      question: 'Which part of the lesson creation process did you find most helpful?',
      type: 'select',
      options: ['Warm Up', 'Introduction', 'Guided Practice', 'Independent Practice', 'Checking Comprehension'],
      required: false
    },
    {
      id: 'navigation',
      question: 'Was it easy to find everything you needed?',
      type: 'yesno',
      required: false
    },
    {
      id: 'suggestions',
      question: 'Any suggestions to improve this page?',
      type: 'text',
      required: false
    }
  ],
  'lesson-delivery': [
    {
      id: 'overall',
      question: 'How was your experience using the lesson delivery page?',
      type: 'rating',
      required: true
    },
    {
      id: 'observation',
      question: 'How helpful was the AI-powered observation improvement feature?',
      type: 'rating',
      required: false
    },
    {
      id: 'features',
      question: 'Which feature did you find most useful?',
      type: 'select',
      options: [
        'Student Observations',
        'AI Improvement',
        'Observation History',
        'Lesson Plan View',
        'Date Selection'
      ],
      required: false
    },
    {
      id: 'usability',
      question: 'Was it easy to record and manage student observations?',
      type: 'yesno',
      required: false
    },
    {
      id: 'suggestions',
      question: 'What additional features would help you during lesson delivery?',
      type: 'text',
      required: false
    }
  ]
};

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ page }): JSX.Element => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});

  const questions = FEEDBACK_QUESTIONS[page] || [];

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    if (!isSubmitting) {
      setOpen(false);
      if (!submitted) {
        setAnswers({});
      }
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const isValid = () => {
    return questions
      .filter(q => q.required)
      .every(q => answers[q.id] !== undefined && answers[q.id] !== '');
  };

  const formatAnswersForSubmission = () => {
    const formattedComments = questions.map(q => {
      let answer = answers[q.id];
      if (q.type === 'yesno') {
        answer = answer ? 'Yes' : 'No';
      }
      return `${q.question}\nAnswer: ${answer}`;
    }).join('\n\n');

    return {
      rating: answers.overall || 0,
      comment: formattedComments,
      timestamp: new Date().toISOString()
    };
  };

  const handleSubmit = async () => {
    if (!isValid()) return;

    setIsSubmitting(true);
    try {
      const formattedData = formatAnswersForSubmission();
      await apiAxiosInstance.post('/api/feedback', {
        page,
        ...formattedData
      });
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setAnswers({});
        setSubmitted(false);
      }, 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: FeedbackQuestion) => {
    switch (question.type) {
      case 'rating':
        return (
          <Box sx={{ mb: 3 }}>
            <Typography component="legend" gutterBottom>
              {question.question}
            </Typography>
            <Rating
              value={answers[question.id] || null}
              onChange={(_, newValue) => handleAnswerChange(question.id, newValue)}
              size="large"
              sx={{ color: 'primary.main' }}
            />
          </Box>
        );

      case 'text':
        return (
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              label={question.question}
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              disabled={isSubmitting}
            />
          </Box>
        );

      case 'yesno':
        return (
          <Box sx={{ mb: 3 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">{question.question}</FormLabel>
              <RadioGroup
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value === 'true')}
              >
                <FormControlLabel value="true" control={<Radio />} label="Yes" />
                <FormControlLabel value="false" control={<Radio />} label="No" />
              </RadioGroup>
              {answers[question.id] === false && (
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  variant="outlined"
                  label="Please explain why"
                  value={answers[`${question.id}_comment`] || ''}
                  onChange={(e) => handleAnswerChange(`${question.id}_comment`, e.target.value)}
                  sx={{ mt: 1 }}
                />
              )}
            </FormControl>
          </Box>
        );

      case 'select':
        return (
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <FormLabel component="legend" sx={{ mb: 1 }}>{question.question}</FormLabel>
              <Select
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select an option</em>
                </MenuItem>
                {question.options?.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="feedback"
        onClick={handleOpen}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000
        }}
      >
        <FeedbackIcon />
      </Fab>

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {submitted ? "Thank You!" : "Share Your Feedback"}
        </DialogTitle>
        <DialogContent>
          {submitted ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              py: 3 
            }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                Your feedback has been submitted!
              </Typography>
              <Typography color="text.secondary">
                We appreciate your input.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              {questions.map((question) => (
                <Box key={question.id}>
                  {renderQuestion(question)}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        {!submitted && (
          <DialogActions>
            <Button onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isValid() || isSubmitting}
              variant="contained"
              startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
};

export default FeedbackButton; 