import React from 'react';
import { Box, Grid, Card, CardContent, Typography, CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';

const Tools: React.FC = () => {
  const navigate = useNavigate();

  const tools = [
    {
      title: 'Passages',
      description: 'Generate and manage reading passages',
      icon: <MenuBookIcon sx={{ fontSize: 40 }} />,
      path: '/passages'
    },
    {
      title: 'Assessments',
      description: 'Create and manage assessments',
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      path: '/assessments'
    }
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Tools
      </Typography>
      <Grid container spacing={3}>
        {tools.map((tool) => (
          <Grid item xs={12} sm={6} md={4} key={tool.title}>
            <Card>
              <CardActionArea onClick={() => navigate(tool.path)}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  {tool.icon}
                  <Typography variant="h6" component="div" sx={{ mt: 2 }}>
                    {tool.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tool.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Tools; 