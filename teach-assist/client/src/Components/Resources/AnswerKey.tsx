import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

interface Question {
  question: string;
  answers: string[];
  correctAnswer: string;
  bloomsLevel?: string;
  standardReference?: string;
}

interface AnswerKeyProps {
  questions: Question[];
}

const AnswerKey: React.FC<AnswerKeyProps> = ({ questions }) => {
  if (!questions.length) return null;

  return (
    <Paper
      elevation={3}
      className="answer-key-section"
      sx={{ p: 2, mt: 4 }}
    >
      <h2 className="answer-key-title">Answer Key</h2>
      {questions.map((q, index) => (
        <Box key={index} sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            {index + 1}. {q.correctAnswer}
          </Typography>
          {q.bloomsLevel && (
            <Typography variant="caption" color="text.secondary" display="block">
              Bloom's Level: {q.bloomsLevel}
            </Typography>
          )}
          {q.standardReference && (
            <Typography variant="caption" color="text.secondary" display="block">
              Standard: {q.standardReference}
            </Typography>
          )}
        </Box>
      ))}
    </Paper>
  );
};

export default AnswerKey;
