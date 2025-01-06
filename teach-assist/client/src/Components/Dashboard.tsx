import React, { useEffect, useState } from 'react';
import { Grid, Box, Typography, Skeleton } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupsIcon from '@mui/icons-material/Groups';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import StatusCard from './Common/StatusCard';
import { useTeacher } from '../context/TeacherContext';
import { useNavigate } from 'react-router-dom';
import apiAxiosInstance from '../utils/axiosInstance';

const Dashboard: React.FC = () => {
  const { teacher } = useTeacher();
  const navigate = useNavigate();
  const [hasStudents, setHasStudents] = useState(false);
  const [hasGroups, setHasGroups] = useState(false);
  const [hasLessonPlans, setHasLessonPlans] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if profile is complete
  const isProfileComplete = Boolean(
    teacher?.firstName &&
    teacher?.lastName &&
    teacher?.gradeLevel &&
    Array.isArray(teacher?.teachingStandards) && 
    teacher.teachingStandards.length > 0
  );

  useEffect(() => {
    const checkStudentsAndGroups = async () => {
      try {
        setIsLoading(true);
        // Check for students
        const studentsResponse = await apiAxiosInstance.get('/api/students');
        setHasStudents(studentsResponse.data.length > 0);

        // Check for groups
        const groupsResponse = await apiAxiosInstance.get('/api/groups');
        setHasGroups(groupsResponse.data.length > 0);

        // Check for lesson plans
        const lessonPlansResponse = await apiAxiosInstance.get('/api/small-group-lesson-plans');
        setHasLessonPlans(lessonPlansResponse.data.length > 0);
      } catch (error) {
        console.error('Error checking students and groups:', error);
        setHasStudents(false);
        setHasGroups(false);
        setHasLessonPlans(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (teacher?._id) {
      checkStudentsAndGroups();
    }
  }, [teacher]);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Welcome, {teacher?.firstName || 'Teacher'}!
      </Typography>
      
      <Grid container spacing={3}>
        {/* Profile Status Card */}
        <Grid item xs={12}>
          <Box onClick={() => navigate('/complete-profile')} sx={{ cursor: 'pointer' }}>
            <StatusCard
              title={isProfileComplete ? "Edit Profile" : "Complete Your Profile"}
              description="Add your personal information and teaching preferences to get started."
              icon={<AccountBoxIcon />}
              hasItems={isProfileComplete}
            />
          </Box>
        </Grid>

        {/* Progress Status Cards */}
        <Grid item xs={12} md={6}>
          <Box onClick={() => navigate('/add-students')} sx={{ cursor: 'pointer' }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            ) : (
              <StatusCard
                title={hasStudents ? "Student(s)" : "Add Your First Student"}
                description="Start by adding students to create and manage your teaching groups effectively."
                icon={<PersonAddIcon />}
                hasItems={hasStudents}
              />
            )}
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box onClick={() => navigate('/group-list')} sx={{ cursor: 'pointer' }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            ) : (
              <StatusCard
                title={hasGroups ? "Group(s)" : "Add Your First Group"}
                description="Create groups to organize your students for different activities."
                icon={<GroupAddIcon />}
                hasItems={hasGroups}
              />
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box onClick={() => navigate('/small-group/lesson-plan')} sx={{ cursor: 'pointer' }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            ) : (
              <StatusCard
                title={hasLessonPlans ? "Small Group Lesson Plan(s)" : "Create Your First Lesson Plan"}
                description="Design engaging lesson plans tailored to your students' needs."
                icon={<AssignmentIcon />}
                hasItems={hasLessonPlans}
              />
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 