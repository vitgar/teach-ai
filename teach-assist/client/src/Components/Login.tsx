import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Location, NavigateFunction } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useTeacher } from '../context/TeacherContext';
import apiAxiosInstance from '../utils/axiosInstance';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const Login: React.FC = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setTeacher } = useTeacher();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const clearAuthData = () => {
    localStorage.removeItem('token');
    setTeacher(null);
  };

  useEffect(() => {
    clearAuthData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      clearAuthData();
      
      const response = await apiAxiosInstance.post('/auth/login', formData);

      if (response.data.token && response.data.teacher) {
        localStorage.setItem('token', response.data.token);
        setTeacher(response.data.teacher);

        const from = location.state?.from?.pathname || 
                    (window.location.pathname !== '/login' ? window.location.pathname : '/dashboard');
        navigate(from, { replace: true });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLinkedInLogin = () => {
    sessionStorage.setItem('redirectPath', location.state?.from?.pathname || '/dashboard');
    window.location.href = `${process.env.REACT_APP_AUTH_URL}/linkedin`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    
    if (error) {
      setErrorMessage('Authentication failed');
      return;
    }
    
    if (token) {
      localStorage.setItem('token', token);
      
      const fetchUser = async () => {
        try {
          const response = await apiAxiosInstance.get('/auth/verify');
          if (response.data.teacher) {
            setTeacher(response.data.teacher);
            const redirectPath = sessionStorage.getItem('redirectPath') || '/dashboard';
            sessionStorage.removeItem('redirectPath');
            navigate(redirectPath, { replace: true });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setErrorMessage('Error authenticating with provider');
        }
      };

      fetchUser();
    }
  }, [navigate, setTeacher]);

  const handleGoogleLogin = () => {
    sessionStorage.setItem('redirectPath', location.state?.from?.pathname || '/dashboard');
    window.location.href = `${process.env.REACT_APP_AUTH_URL}/google`;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '400px',
          borderRadius: 2,
          backgroundColor: '#fff',
        }}
      >
        <Typography 
          variant="h5" 
          component="h1" 
          gutterBottom 
          textAlign="center"
          color="primary"
          fontWeight="bold"
          mb={3}
        >
          TeachAssist Login
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="email"
            autoFocus
          />

          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="current-password"
          />

          {errorMessage && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: 3,
              mb: 2,
              height: '48px',
              fontSize: '1.1rem',
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Login'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Or login with
            </Typography>
            <Button
              variant="outlined"
              onClick={handleLinkedInLogin}
              startIcon={
                <img 
                  src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                  alt="LinkedIn" 
                  style={{ width: 20, height: 20 }}
                />
              }
              sx={{ 
                width: '200px',
                height: '40px',
              }}
            >
              LinkedIn
            </Button>
          </Box>

          <Button
            variant="outlined"
            onClick={handleGoogleLogin}
            startIcon={
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" 
                alt="Google" 
                style={{ width: 20, height: 20 }}
              />
            }
            sx={{ 
              width: '200px',
              height: '40px',
              mt: 2
            }}
          >
            Google
          </Button>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Don't have an account?
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate('/signup')}
              sx={{ 
                width: '200px',
                height: '40px',
              }}
            >
              Sign Up
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
