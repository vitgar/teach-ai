import React, { useState } from 'react';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Tooltip,
  Popover
} from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';

interface HelpSection {
  title: string;
  content: string;
}

interface PageHelp {
  title: string;
  description: string;
  sections: HelpSection[];
}

const HELP_CONTENT: { [key: string]: PageHelp } = {
  'lesson-delivery': {
    title: 'Lesson Delivery Help',
    description: 'This page helps you manage and record your small group lesson delivery sessions.',
    sections: [
      {
        title: 'Group and Date Selection',
        content: 'Select a group from your created small groups and choose a date for the lesson. For past dates, you can view previously delivered lessons. For current/future dates, you can select from available lesson plans.'
      },
      {
        title: 'Lesson Selection',
        content: 'Choose a lesson plan to deliver. For current/future dates, you can select from available lesson plans. For past dates, you\'ll see the lesson that was delivered on that date.'
      },
      {
        title: 'Student Observations',
        content: 'Record observations for each student during the lesson. Click on a student\'s name to expand their section and add observations. Use the AI improvement feature to enhance your observation notes.'
      },
      {
        title: 'AI Improvement',
        content: 'Click the magic wand icon next to any observation to have AI help improve and expand your notes. This feature helps make your observations more detailed and professional.'
      },
      {
        title: 'Observation History',
        content: 'View past observations for your students by clicking the "View History" button. This helps track student progress over time.'
      },
      {
        title: 'Lesson Plan View',
        content: 'Click "View Lesson Plan" to see the full lesson plan details, including the story, warm-up, guided practice, and comprehension sections.'
      }
    ]
  }
};

interface HelpButtonProps {
  page: string;
}

const QuickHelp: { [key: string]: string } = {
  'lesson-delivery': `
• Pick a Group: Choose from your existing small groups
• Set a Lesson Date:
  - Past Dates: Review delivered lessons
  - Current/Future Dates: Select from available lesson plans
• Record Observations:
  - Click student names to expand
  - Use AI magic wand to enhance notes
• View History: Track student progress over time
  `
};

const HelpButton: React.FC<HelpButtonProps> = ({ page }) => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const helpContent = HELP_CONTENT[page];
  const quickHelp = QuickHelp[page];

  if (!helpContent) return null;

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const popoverOpen = Boolean(anchorEl);

  return (
    <>
      <Box 
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <IconButton 
          onClick={() => setOpen(true)}
          onMouseEnter={handlePopoverOpen}
          onMouseLeave={handlePopoverClose}
          sx={{ 
            color: 'white',
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.dark',
              transform: 'scale(1.1)',
              transition: 'transform 0.2s'
            },
            width: 32,
            height: 32,
            padding: '4px',
            '& .MuiSvgIcon-root': {
              fontSize: '1.5rem'
            }
          }}
        >
          <HelpIcon />
        </IconButton>
      </Box>

      <Popover
        sx={{
          pointerEvents: 'none',
        }}
        open={popoverOpen}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Paper sx={{ 
          p: 2, 
          maxWidth: 300,
          backgroundColor: 'primary.main',
          color: 'white'
        }}>
          <Typography
            component="pre"
            sx={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              lineHeight: 1.6
            }}
          >
            {quickHelp}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              mt: 1,
              fontStyle: 'italic',
              opacity: 0.8
            }}
          >
            Click the help icon for more detailed information
          </Typography>
        </Paper>
      </Popover>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="div" gutterBottom>
            {helpContent.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {helpContent.description}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {helpContent.sections.map((section, index) => (
              <Paper key={index} sx={{ p: 2 }}>
                <Typography variant="h6" color="primary.main" gutterBottom>
                  {section.title}
                </Typography>
                <Typography variant="body1">
                  {section.content}
                </Typography>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HelpButton; 