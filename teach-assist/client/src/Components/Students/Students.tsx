import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import StudentList from './StudentList';
import { useTeacher } from '../../context/TeacherContext';
import { Student } from '@/Types/Student';
import apiAxiosInstance from '@/utils/axiosInstance';

const Students: React.FC = () => {
  const { teacher } = useTeacher();
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await apiAxiosInstance.get(`/api/students?teacherId=${teacher?._id}`);
      setStudents(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (teacher?._id) {
      fetchStudents();
    }
  }, [teacher?._id]);

  const handleDelete = async (studentIds: string[]) => {
    try {
      await apiAxiosInstance.post('/api/students/bulk-delete', { studentIds });
      fetchStudents(); // Refresh the list
    } catch (error) {
      console.error('Error deleting students:', error);
    }
  };

  const handleEdit = async (student: Student) => {
    try {
      await apiAxiosInstance.put(`/api/students/${student._id}`, student);
      fetchStudents(); // Refresh the list
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, color: 'error.main' }}>
        {error}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <StudentList 
        students={students}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </Box>
  );
};

export default Students; 