// src/context/TeacherContext.tsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import apiAxiosInstance from '../utils/axiosInstance';

// Define the Teacher type
export interface Teacher {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  state: string;
  gradeLevel?: string;
  teachingStandards?: Array<{ 
    _id: string;
    name: string;
    description: string;
    state: string;
  }>;
  linkedinId?: string;
}

// Define the context type
export interface TeacherContextType {
  teacher: Teacher | null;
  setTeacher: React.Dispatch<React.SetStateAction<Teacher | null>>;
  loading: boolean;
}

// Create the context with proper typing
export const TeacherContext = createContext<TeacherContextType>({
  teacher: null,
  setTeacher: () => null,
  loading: true,
});

// Create the provider component
export const TeacherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token and get teacher data
          const response = await apiAxiosInstance.get('/auth/verify');
          setTeacher(response.data.teacher);
        } catch (error) {
          console.error('Auth error:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  return (
    <TeacherContext.Provider value={{ teacher, setTeacher, loading }}>
      {children}
    </TeacherContext.Provider>
  );
};

// Custom hook for using the teacher context
export const useTeacher = () => {
  const context = useContext(TeacherContext);
  if (context === undefined) {
    throw new Error('useTeacher must be used within a TeacherProvider');
  }
  return context;
};
