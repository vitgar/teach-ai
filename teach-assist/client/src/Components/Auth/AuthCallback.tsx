import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTeacher } from '../../context/TeacherContext';
import axios from 'axios';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTeacher } = useTeacher();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const teacherId = searchParams.get('teacherId');

      if (token && teacherId) {
        localStorage.setItem('token', token);

        try {
          const teacherRes = await axios.get(
            `http://localhost:5000/teachers/${teacherId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          setTeacher(teacherRes.data);
          navigate('/dashboard');
        } catch (error) {
          console.error('Error fetching teacher data:', error);
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setTeacher]);

  return (
    <div>Loading...</div>
  );
};

export default AuthCallback; 