import React, { useState } from 'react';
import {
  IconButton,
  Popover,
  Typography,
  Box,
  Paper
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface InlineHelpProps {
  content: string;
}

const InlineHelp: React.FC<InlineHelpProps> = ({ content }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        ml: 1,
        position: 'relative',
        top: 1
      }}
    >
      <IconButton
        size="small"
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
        sx={{
          width: 18,
          height: 18,
          color: 'primary.main',
          opacity: 0.8,
          '&:hover': {
            color: 'primary.dark',
            backgroundColor: 'transparent',
            opacity: 1
          },
          '& .MuiSvgIcon-root': {
            fontSize: '0.9rem'
          }
        }}
      >
        <HelpOutlineIcon />
      </IconButton>

      <Popover
        sx={{
          pointerEvents: 'none'
        }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Paper sx={{ 
          p: 1.5,
          maxWidth: 250,
          backgroundColor: 'primary.main',
          color: 'white'
        }}>
          <Typography
            component="pre"
            sx={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '0.75rem',
              lineHeight: 1.4
            }}
          >
            {content}
          </Typography>
        </Paper>
      </Popover>
    </Box>
  );
};

export default InlineHelp; 