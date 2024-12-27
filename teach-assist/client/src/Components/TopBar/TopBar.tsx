import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Box,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTeacher } from '../../context/TeacherContext';
import HelpButton from '../Common/HelpButton';

const TopBar: React.FC = () => {
  const { teacher, setTeacher } = useTeacher();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Get current page from location
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes('/small-group/delivery')) return 'lesson-delivery';
    // Add more page mappings as needed
    return '';
  };

  const getInitials = (teacher: any): string => {
    if (teacher?.firstName && teacher?.lastName) {
      return `${teacher.firstName[0]}${teacher.lastName[0]}`.toUpperCase();
    }
    return teacher?.email?.[0].toUpperCase() || '';
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setTeacher(null);
    navigate('/login');
  };

  const handleSettings = () => {
    navigate('/settings');
    handleClose();
  };

  const handleAccount = () => {
    navigate('/teacher-info');
    handleClose();
  };

  const currentPage = getCurrentPage();

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          TeachAssist
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {currentPage && <HelpButton page={currentPage} />}
          <IconButton
            onClick={handleMenu}
            sx={{ 
              p: 0,
              '&:hover': {
                transform: 'scale(1.1)',
                transition: 'transform 0.2s'
              }
            }}
          >
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              {teacher && getInitials(teacher)}
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1.5,
              minWidth: 200,
              borderRadius: 2,
              overflow: 'visible',
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
        >
          <MenuItem onClick={handleSettings}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <MenuItem onClick={handleAccount}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Account
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            <Typography color="error">Sign Out</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;