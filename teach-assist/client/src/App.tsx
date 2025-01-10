// src/App.tsx
import React from 'react';
import { useTeacher } from './context/TeacherContext';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from '@mui/material';
import Sidebar from './Components/Sidebar';
import Login from './Components/Login';
import Register from './Components/Register';
import Dashboard from './Components/Dashboard';
import { GuidedReading } from './Components/GuidedReading';
import Settings from './Components/Settings/Settings';
import Students from './Components/Student/Students';
import StudentList from './Components/Student/StudentList';
import { Intervention } from './Components/Intervention';
import GroupList from './Components/Groups/GroupList';
import PrivateRoute from './Components/Auth/PrivateRoute';
import TopBar from './Components/TopBar/TopBar';
import Passages from './Components/Resources/Passages';
import ShortPassages from './Components/Resources/ShortPassages';
import Worksheets from './Components/Resources/Worksheets';
import AddStudents from './Components/Students/AddStudents';
import AIChat from './Components/AIChat/AIChat';
import LessonPlan from './Components/SmallGroup/LessonPlan';
import SavedLessonPlans from './Components/SmallGroup/SavedLessonPlans';
import LessonDelivery from './Components/SmallGroup/LessonDelivery';
import Signup from './Components/Signup';
import CompleteProfile from './Components/CompleteProfile';
import LinkedInCallback from './Components/Auth/LinkedInCallback';
import AuthCallback from './Components/AuthCallback';
import Subscription from './Components/Subscription/Subscription';
import SubscriptionSuccess from './Components/Subscription/SubscriptionSuccess';
import Assessments from './Components/Resources/Assessments';
import Tools from './Components/Resources/Tools';


function App() {
  const { teacher, loading } = useTeacher();
  const location = useLocation();

  if (loading) {
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
  }

  // Define public routes
  const publicRoutes = [
    '/login', 
    '/register', 
    '/signup', 
    '/auth/linkedin/callback',
    '/auth/callback'
  ];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // If user is not logged in and trying to access a protected route, redirect to login
  if (!teacher && !isPublicRoute) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is logged in and trying to access login/register, redirect to dashboard
  if (teacher && isPublicRoute && location.pathname !== '/auth/linkedin/callback') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box sx={{ 
      display: 'flex',
      minHeight: '100vh',
    }}>
      {teacher && <TopBar />}
      {teacher && <Sidebar />}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          width: '100%',
          mt: teacher ? '64px' : 0,
        }}
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/subscription" element={
            <PrivateRoute>
              <Subscription />
            </PrivateRoute>
          } />
          <Route path="/subscription/success" element={
            <PrivateRoute>
              <SubscriptionSuccess />
            </PrivateRoute>
          } />
          <Route path="/guided-reading" element={
            <PrivateRoute>
              <GuidedReading />
            </PrivateRoute>
          } />
          <Route path="/intervention" element={
            <PrivateRoute>
              <Intervention />
            </PrivateRoute>
          } />
          <Route path="/students" element={
            <PrivateRoute>
              <Students />
            </PrivateRoute>
          } />
          <Route path="/student-list" element={
            <PrivateRoute>
              <StudentList />
            </PrivateRoute>
          } />
          <Route path="/manage-students" element={
            <PrivateRoute>
              <StudentList />
            </PrivateRoute>
          } />
          <Route path="/add-students" element={
            <PrivateRoute>
              <AddStudents />
            </PrivateRoute>
          } />
          <Route path="/group-list" element={
            <PrivateRoute>
              <GroupList />
            </PrivateRoute>
          } />
          <Route path="/add-group" element={
            <PrivateRoute>
              <GroupList />
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } />
          <Route path="/resources/passages" element={
            <PrivateRoute>
              <Passages />
            </PrivateRoute>
          } />
          <Route path="/resources/short-passages" element={
            <PrivateRoute>
              <ShortPassages />
            </PrivateRoute>
          } />
          <Route path="/resources/worksheets" element={
            <PrivateRoute>
              <Worksheets />
            </PrivateRoute>
          } />
          <Route path="/chat" element={
            <PrivateRoute>
              <AIChat />
            </PrivateRoute>
          } />
          <Route path="/small-group/lesson-plan" element={
            <PrivateRoute>
              <LessonPlan />
            </PrivateRoute>
          } />
          <Route path="/small-group/saved" element={<SavedLessonPlans />} />
          <Route path="/small-group/delivery" element={
            <PrivateRoute>
              <LessonDelivery />
            </PrivateRoute>
          } />
          <Route path="/complete-profile" element={
            <PrivateRoute>
              <CompleteProfile />
            </PrivateRoute>
          } />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/tools" element={
            <PrivateRoute>
              <Tools />
            </PrivateRoute>
          } />
          <Route path="/passages" element={<Passages />} />
          <Route path="/assessments" element={<Assessments />} />

          {/* Default redirect */}
          <Route path="/" element={
            teacher ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          } />

          {/* Catch all route */}
          <Route path="*" element={
            teacher ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          } />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
