import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { setTeacher } = useTeacher();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords don't match");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiAxiosInstance.post('/auth/signup', formData);

      if (response.data.token && response.data.teacher) {
        localStorage.removeItem('token');
        localStorage.setItem('token', response.data.token);
        setTeacher(response.data.teacher);
        navigate('/complete-profile');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setErrorMessage(err.response?.data?.message || 'Error during signup');
    } finally {
      setLoading(false);
    }
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
          Create Account
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
          />
          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
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
            {loading ? <CircularProgress size={24} /> : 'Sign Up'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Signup; 