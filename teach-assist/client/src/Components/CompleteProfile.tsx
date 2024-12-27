import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  TextField,
} from '@mui/material';
import { useTeacher } from '../context/TeacherContext';
import apiAxiosInstance from '../utils/axiosInstance';
import { Teacher } from '../Types/Teacher';
import { Standard } from '../Types/Standard';

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const { teacher, setTeacher } = useTeacher();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gradeLevel: '',
    teachingStandards: '',
  });

  // Initialize form data from teacher context
  useEffect(() => {
    if (teacher) {
      console.log('Initializing form with teacher:', teacher);
      const standardId = teacher.teachingStandards?.[0]?._id ?? '';

      setFormData({
        firstName: teacher.firstName ?? '',
        lastName: teacher.lastName ?? '',
        gradeLevel: teacher.gradeLevel ?? '',
        teachingStandards: standardId
      });
    }
  }, [teacher]);

  // Fetch standards separately
  useEffect(() => {
    const fetchStandards = async () => {
      try {
        const response = await apiAxiosInstance.get('/api/standards');
        setStandards(response.data);
        
        if (teacher?.teachingStandards?.[0] && response.data.length > 0) {
          // Type assertion here as well
          const standard = teacher.teachingStandards[0] as Standard;
          const standardId = standard._id ?? '';
          setFormData(prev => ({
            ...prev,
            teachingStandards: standardId
          }));
        }
      } catch (err) {
        console.error('Error fetching standards:', err);
      }
    };

    fetchStandards();
  }, [teacher]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      // Debug log the current token
      const currentToken = localStorage.getItem('token');
      console.log('Current token:', currentToken);
      
      if (!teacher?._id) {
        throw new Error('No teacher ID available');
      }

      // Get the ID from the current teacher context
      const teacherId = teacher._id;
      console.log('Using teacher ID:', teacherId);

      const response = await apiAxiosInstance.patch(`/auth/complete-profile/${teacherId}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gradeLevel: formData.gradeLevel,
        teachingStandards: formData.teachingStandards,
      });

      if (response.data) {
        setTeacher(response.data);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Profile completion error:', err);
      // More detailed error message
      const errorMsg = err.response?.data?.message || 
                      `Error updating profile: ${err.message}`;
      setErrorMessage(errorMsg);
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
          width: '500px',
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
          mb={2}
        >
          Complete Your Profile
        </Typography>

        <Typography 
          variant="body1"
          textAlign="center"
          color="text.secondary"
          mb={4}
        >
          Let's complete your profile to better assist you
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleTextChange}
            margin="normal"
            required
            autoFocus
          />

          <TextField
            fullWidth
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleTextChange}
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Grade Level</InputLabel>
            <Select
              value={formData.gradeLevel}
              label="Grade Level"
              name="gradeLevel"
              onChange={handleSelectChange}
              required
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                <MenuItem key={grade} value={grade.toString()}>
                  Grade {grade}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Teaching Standards</InputLabel>
            <Select
              value={formData.teachingStandards}
              label="Teaching Standards"
              name="teachingStandards"
              onChange={handleSelectChange}
            >
              {standards.map((standard) => (
                <MenuItem key={standard._id} value={standard._id}>
                  {standard.name} - {standard.state}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
            {loading ? <CircularProgress size={24} /> : 'Complete Profile'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default CompleteProfile; 