import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacher } from '../context/TeacherContext';
import apiAxiosInstance from '../utils/axiosInstance';
import { CircularProgress, Box } from '@mui/material';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { setTeacher } = useTeacher();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('AuthCallback: Starting callback handling');
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      console.log('AuthCallback: Received token:', token ? 'yes' : 'no');

      if (token) {
        try {
          console.log('AuthCallback: Setting token in localStorage');
          localStorage.setItem('token', token);
          
          console.log('AuthCallback: Verifying token with backend');
          const response = await apiAxiosInstance.get('/auth/verify');
          console.log('AuthCallback: Verify response:', response.data);
          
          if (response.data.teacher) {
            console.log('AuthCallback: Setting teacher in context');
            setTeacher(response.data.teacher);
            
            const redirectPath = sessionStorage.getItem('redirectPath') || '/dashboard';
            console.log('AuthCallback: Redirecting to:', redirectPath);
            sessionStorage.removeItem('redirectPath');
            navigate(redirectPath, { replace: true });
          }
        } catch (error) {
          console.error('AuthCallback: Error during verification:', error);
          navigate('/login?error=auth_failed', { replace: true });
        }
      } else {
        console.log('AuthCallback: No token found in URL');
        navigate('/login?error=no_token', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, setTeacher]);

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

export default AuthCallback; 