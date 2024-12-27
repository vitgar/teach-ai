import React from 'react';
import { Box, Card, CardContent, Typography, styled } from '@mui/material';

interface StatusCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  hasItems?: boolean;
}

const StyledCard = styled(Card)<{ hasItems?: boolean }>(({ theme, hasItems }) => ({
  position: 'relative',
  backgroundColor: hasItems ? '#e8f5e9' : '#ffebee',
  marginBottom: '16px',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  }
}));

const StatusCard: React.FC<StatusCardProps> = ({ 
  title, 
  description, 
  icon,
  hasItems
}) => {
  return (
    <StyledCard hasItems={hasItems}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          {icon && (
            <Box sx={{ 
              color: hasItems ? 'success.main' : 'primary.main',
              display: 'flex',
              alignItems: 'center'
            }}>
              {icon}
            </Box>
          )}
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </StyledCard>
  );
};

export default StatusCard; 