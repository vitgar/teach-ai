import React from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ChatIcon from '@mui/icons-material/Chat';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

interface SubMenuItem {
  text: string;
  path: string;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path?: string;
  items?: SubMenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard'
  },
  // DO NOT REMOVE UNTIL REQUESTED - Guided Reading section
  /*{
    text: 'Guided Reading',
    icon: <MenuBookIcon />,
    path: '/guided-reading'
  },*/
  {
    text: 'Small Group',
    icon: <GroupsIcon />,
    items: [
      { text: 'Create Lesson Plan', path: '/small-group/lesson-plan' },
      { text: 'Saved Lesson Plans', path: '/small-group/saved' },
      { text: 'Lesson Delivery', path: '/small-group/delivery' }
    ]
  },
  {
    text: 'Students',
    icon: <SchoolIcon />,
    items: [
      { text: 'Student List', path: '/student-list' },
      { text: 'Add Students', path: '/add-students' }
    ]
  },
  {
    text: 'Groups',
    icon: <PeopleAltIcon />,
    items: [
      { text: 'Group List', path: '/group-list' },
      { text: 'Add Group', path: '/add-group' }
    ]
  },
  {
    text: 'Resources',
    icon: <LibraryBooksIcon />,
    items: [
      { text: 'Passages', path: '/resources/passages' },
      // DO NOT REMOVE UNTIL REQUESTED - Short Passages subsection
      /*{ text: 'Short Passages', path: '/resources/short-passages' },*/
      // DO NOT REMOVE UNTIL REQUESTED - Worksheets subsection
      /*{ text: 'Worksheets', path: '/resources/worksheets' }*/
    ]
  },
  {
    text: 'AI Chat',
    icon: <ChatIcon />,
    path: '/chat'
  },
  {
    text: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings'
  }
];

export default menuItems; 