import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTeacher } from '../../context/TeacherContext';
import { Box, CircularProgress } from '@mui/material';
import apiAxiosInstance from '../../utils/axiosInstance';

const LinkedInCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTeacher } = useTeacher();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      
      if (token) {
        // Store the token
        localStorage.setItem('token', token);
        
        try {
          // Verify token and get teacher data
          const response = await apiAxiosInstance.get('/auth/verify');
          setTeacher(response.data.teacher);
          
          // Navigate to dashboard instead of complete-profile
          navigate('/dashboard');
        } catch (error) {
          console.error('LinkedIn callback error:', error);
          localStorage.removeItem('token');
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setTeacher]);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      <CircularProgress />
    </Box>
  );
};

export default LinkedInCallback; 