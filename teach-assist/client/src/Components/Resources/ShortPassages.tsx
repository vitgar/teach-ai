import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

const LEXILE_LEVELS = [
  { value: 'BR', label: 'Beginning Reader' },
  { value: '200L-300L', label: '200L-300L' },
  { value: '300L-400L', label: '300L-400L' },
  { value: '400L-500L', label: '400L-500L' },
  { value: '500L-600L', label: '500L-600L' },
  { value: '600L-700L', label: '600L-700L' },
  { value: '700L-800L', label: '700L-800L' },
  { value: '800L-900L', label: '800L-900L' },
  { value: '900L-1000L', label: '900L-1000L' },
];

const ShortPassages: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          Short Passages Generator
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Coming Soon: Generate short reading passages for quick assessments and practice.
        </Typography>

        <Box sx={{ mt: 4 }}>
          <TextField
            select
            fullWidth
            label="Reading Level (Lexile)"
            disabled
            sx={{ mb: 2 }}
          >
            {LEXILE_LEVELS.map((level) => (
              <MenuItem key={level.value} value={level.value}>
                {level.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Prompt"
            placeholder="Enter a topic or specific requirements for the passage..."
            disabled
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                disabled
                checked={false}
              />
            }
            label="Generate comprehension questions"
          />

          <Button
            variant="contained"
            fullWidth
            disabled
            sx={{ mt: 2 }}
          >
            Generate Short Passage
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ShortPassages; 