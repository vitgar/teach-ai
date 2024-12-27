import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert,
  SelectChangeEvent,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Divider,
  IconButton,
  Button,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import Tooltip from '@mui/material/Tooltip';
import { useTeacher } from '../../context/TeacherContext';
import apiAxiosInstance from "../../utils/axiosInstance";
import aiAxiosInstance from "../../utils/aiAxiosInstance";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import PreviewIcon from '@mui/icons-material/Preview';
import ReactMarkdown from 'react-markdown';
import SaveIcon from '@mui/icons-material/Save';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { TextFieldProps } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ObservationsHistoryDialog from './ObservationsHistoryDialog';
import FeedbackButton from '../Common/FeedbackButton';
import InlineHelp from '../Common/InlineHelp';

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
}

interface StudentObservation {
  studentId: string;
  observation: string;
}

interface Group {
  _id: string;
  name: string;
  students: Student[];
}

interface LessonPlan {
  _id: string;
  groups: string[];
  standard: {
    code: string;
    description: string;
  };
  story: {
    title: string;
    content: string;
  };
  sections: {
    warmUp: string;
    introductionAndGuidedPractice: string;
    independentPractice: string;
    checkingComprehension: string;
  };
  createdAt: string;
}

interface LessonViewDialogProps {
  open: boolean;
  onClose: () => void;
  lessonPlan: LessonPlan | null;
}

interface UsedLessonCombo {
  standardCode: string;
  storyTitle: string;
  date: Date;
}

const isDateInPast = (date: Dayjs) => {
  const today = dayjs().startOf('day');
  return date.isBefore(today);
};

const LessonDelivery: React.FC = () => {
  const { teacher } = useTeacher();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openStudents, setOpenStudents] = useState<{ [key: string]: boolean }>({});
  const [observations, setObservations] = useState<{ [key: string]: string }>({});
  const [improvingObservation, setImprovingObservation] = useState<{ [key: string]: boolean }>({});
  const [lessonViewOpen, setLessonViewOpen] = useState(false);
  const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [isSavingObservations, setIsSavingObservations] = useState(false);
  const [observationsHistoryOpen, setObservationsHistoryOpen] = useState(false);
  const [observationsHistory, setObservationsHistory] = useState<{ [key: string]: any[] }>({});

  // Fetch groups when component mounts
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await apiAxiosInstance.get('/api/groups', {
          params: { 
            teacherId: teacher?._id,
            type: 'Small Group'
          }
        });
        setGroups(response.data || []);
      } catch (error) {
        console.error('Error fetching groups:', error);
        setError('Failed to load groups');
      }
    };

    if (teacher?._id) {
      fetchGroups();
    }
  }, [teacher]);

  // Update the useEffect that loads group data
  useEffect(() => {
    const loadGroupData = async () => {
      if (!selectedGroup || !selectedDate) return;

      try {
        setLoading(true);
        
        // First, load ALL historical observations for this group to get used story titles
        const allObservationsResponse = await apiAxiosInstance.get('/api/student-observations/history', {
          params: {
            groupId: selectedGroup
          }
        });

        // Get all previously used story titles
        const usedStoryTitles = new Set(
          allObservationsResponse.data.observations
            .filter((obs: any) => obs.lessonPlan?.story?.title)
            .map((obs: any) => obs.lessonPlan.story.title)
        );

        console.log('Used story titles:', usedStoryTitles);

        // Load existing observations for current date
        const currentDateObservationsResponse = await apiAxiosInstance.get('/api/student-observations', {
          params: {
            groupId: selectedGroup,
            date: selectedDate.format('YYYY-MM-DD')
          }
        });

        // Set observations for current date
        const observationsMap = currentDateObservationsResponse.data.observations.reduce((acc: { [key: string]: string }, obs: any) => {
          acc[obs.student._id] = obs.observation;
          return acc;
        }, {});
        setObservations(observationsMap);

        // Load all lesson plans for this group
        const lessonPlansResponse = await apiAxiosInstance.get('/api/small-group-lesson-plans', {
          params: { groupId: selectedGroup }
        });

        let filteredLessonPlans = lessonPlansResponse.data;
        const today = dayjs().startOf('day');
        const selectedDateStart = selectedDate.startOf('day');

        if (selectedDateStart.isSame(today)) {
          // For today's date, filter out any lessons with previously used story titles
          filteredLessonPlans = lessonPlansResponse.data.filter((plan: any) => {
            return !usedStoryTitles.has(plan.story?.title);
          });
        } else if (selectedDateStart.isBefore(today)) {
          // For past dates, only show the lesson that was used on that specific date
          const selectedDateStr = selectedDate.format('YYYY-MM-DD');
          filteredLessonPlans = lessonPlansResponse.data.filter((plan: any) => {
            return currentDateObservationsResponse.data.observations.some((obs: any) => 
              obs.lessonPlan?._id === plan._id
            );
          });
        }

        console.log('Filtered lesson plans:', filteredLessonPlans);
        setLessonPlans(filteredLessonPlans);

        // If there's an existing observation with a lesson plan, select it
        if (currentDateObservationsResponse.data.lessonPlanId) {
          setSelectedLesson(currentDateObservationsResponse.data.lessonPlanId);
        }

        setError(null);
      } catch (error) {
        console.error('Error loading group data:', error);
        setError('Failed to load group data');
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, [selectedGroup, selectedDate]);

  useEffect(() => {
    if (selectedLesson) {
      const plan = lessonPlans.find(p => p._id === selectedLesson);
      setSelectedLessonPlan(plan || null);
    } else {
      setSelectedLessonPlan(null);
    }
  }, [selectedLesson, lessonPlans]);

  const handleGroupChange = (event: SelectChangeEvent<string>) => {
    setSelectedGroup(event.target.value);
    // Don't reset selected lesson here anymore since we'll load it from observations
  };

  const handleLessonChange = (event: SelectChangeEvent<string>) => {
    setSelectedLesson(event.target.value);
  };

  const handleStudentClick = (studentId: string) => {
    setOpenStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleObservationChange = (studentId: string, value: string) => {
    setObservations(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleImproveObservation = async (studentId: string) => {
    const currentObservation = observations[studentId];
    if (!currentObservation || !selectedLessonPlan) return;

    setImprovingObservation(prev => ({ ...prev, [studentId]: true }));
    try {
      const response = await aiAxiosInstance.post('/improve-observation', {
        observation: currentObservation,
        topic: selectedLessonPlan.standard.description
      });

      if (response.data.content) {
        setObservations(prev => ({
          ...prev,
          [studentId]: response.data.content
        }));
      }
    } catch (error) {
      console.error('Error improving observation:', error);
      setError('Failed to improve observation');
    } finally {
      setImprovingObservation(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleSaveObservations = async () => {
    if (!selectedGroup || !selectedLesson || !selectedDate) return;

    setIsSavingObservations(true);
    try {
      const observationsToSave = Object.entries(observations)
        .filter(([_, observation]) => observation.trim() !== '')
        .map(([studentId, observation]) => ({
          studentId,
          observation
        }));

      if (observationsToSave.length === 0) {
        setError('No observations to save');
        return;
      }

      const response = await apiAxiosInstance.post('/api/student-observations', {
        observations: observationsToSave,
        groupId: selectedGroup,
        lessonPlanId: selectedLesson,
        date: selectedDate.format()
      });

      if (response.data.message) {
        setError(null);
      }
    } catch (error) {
      console.error('Error saving observations:', error);
      setError('Failed to save observations');
    } finally {
      setIsSavingObservations(false);
    }
  };

  const hasObservations = () => {
    return Object.values(observations).some(obs => obs.trim() !== '');
  };

  const fetchObservationHistory = async () => {
    if (!selectedGroup) return;

    try {
      const response = await apiAxiosInstance.get('/api/student-observations/history', {
        params: {
          groupId: selectedGroup
        }
      });

      // Organize observations by student
      const observationsByStudent = response.data.observations.reduce((acc: any, obs: any) => {
        if (!acc[obs.student._id]) {
          acc[obs.student._id] = [];
        }
        acc[obs.student._id].push(obs);
        return acc;
      }, {});

      setObservationsHistory(observationsByStudent);
    } catch (error) {
      console.error('Error fetching observation history:', error);
      setError('Failed to load observation history');
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      fetchObservationHistory();
    }
  }, [selectedGroup]);

  if (!teacher) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Please log in to access this page.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Lesson Delivery
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Group and Date Selection */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <InputLabel sx={{ position: 'relative', transform: 'none', mb: 0 }}>Select Group</InputLabel>
              <InlineHelp content={`
• Choose from your existing small groups
• Only groups marked as "Small Group" will appear here
• Students in the selected group will be shown below`} />
            </Box>
            <Select
              value={selectedGroup}
              onChange={handleGroupChange}
              label="Select Group"
            >
              {groups.map((group) => (
                <MenuItem key={group._id} value={group._id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" color="text.primary">Select Date</Typography>
                <InlineHelp content={`
• Past Dates: View previously delivered lessons
• Current Date: Deliver a new lesson
• Future Dates: Plan upcoming lessons
• Each story can only be used once per group`} />
              </Box>
              <DatePicker
                label="Date"
                value={selectedDate}
                onChange={(value) => {
                  if (dayjs.isDayjs(value)) {
                    setSelectedDate(value);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                  />
                )}
              />
            </Box>
          </LocalizationProvider>
        </Box>

        {/* Lesson Selection */}
        {selectedGroup && (
          <>
            {isDateInPast(selectedDate) ? (
              lessonPlans.length > 0 ? (
                <Paper sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Delivered Lesson
                    </Typography>
                    <InlineHelp content={`
• This shows the lesson that was delivered on the selected date
• You cannot modify past lessons
• Use this to review previous lesson content and observations`} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" color="primary.main" gutterBottom>
                      {lessonPlans[0].standard?.code}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {lessonPlans[0].standard?.description}
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      Story: {lessonPlans[0].story?.title}
                    </Typography>
                  </Box>
                </Paper>
              ) : (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  No lesson was delivered on this date
                </Typography>
              )
            ) : (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <InputLabel sx={{ position: 'relative', transform: 'none', mb: 0 }}>Select Lesson</InputLabel>
                  <InlineHelp content={`
• Choose a lesson plan to deliver
• Each lesson includes:
  - Standard and description
  - Story title and content
  - Lesson sections (warm-up, practice, etc.)
• A story can only be used once per group`} />
                </Box>
                <Select
                  value={selectedLesson}
                  onChange={handleLessonChange}
                  label="Select Lesson"
                >
                  {lessonPlans.length > 0 ? (
                    lessonPlans.map((plan) => (
                      <MenuItem 
                        key={plan._id} 
                        value={plan._id}
                        sx={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          py: 1,
                          whiteSpace: 'normal'
                        }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 'bold',
                              color: 'primary.main',
                              mb: 0.5
                            }}
                          >
                            {plan.standard?.code}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              whiteSpace: 'normal',
                              lineHeight: 1.3,
                              mb: 0.5
                            }}
                          >
                            {plan.standard?.description}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontStyle: 'italic',
                              color: 'text.primary'
                            }}
                          >
                            Story: {plan.story?.title}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        No lesson plans available for this group
                      </Typography>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            )}
          </>
        )}

        {selectedLesson && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={() => setLessonViewOpen(true)}
                sx={{ mb: 2 }}
              >
                View Lesson Plan
              </Button>
              <InlineHelp content={`
• View the complete lesson plan details
• Includes:
  - Story text
  - Warm-up activities
  - Guided practice
  - Independent practice
  - Comprehension questions`} />
            </Box>
          </Box>
        )}

        {/* Student List */}
        {selectedGroup && (
          <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Students
              </Typography>
              <InlineHelp content={`
• Click student names to expand/collapse
• Record observations during the lesson
• Use AI magic wand to enhance notes
• Save observations to track progress
• View history to see past observations`} />
            </Box>
            <List>
              {groups.find(g => g._id === selectedGroup)?.students.map((student) => (
                <React.Fragment key={student._id}>
                  <ListItem 
                    disablePadding
                    sx={{ 
                      flexDirection: 'column', 
                      alignItems: 'stretch'
                    }}
                  >
                    <ListItemButton 
                      onClick={() => handleStudentClick(student._id)}
                      sx={{ 
                        '&:hover': { 
                          backgroundColor: 'action.hover' 
                        }
                      }}
                    >
                      <ListItemText 
                        primary={`${student.firstName} ${student.lastName}`}
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            fontWeight: 'medium' 
                          }
                        }}
                      />
                      {openStudents[student._id] ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                    <Collapse 
                      in={openStudents[student._id]} 
                      timeout="auto" 
                      unmountOnExit
                    >
                      <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
                        <Box sx={{ position: 'relative' }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Observations"
                            value={observations[student._id] || ''}
                            onChange={(e) => handleObservationChange(student._id, e.target.value)}
                            variant="outlined"
                            sx={{ mt: 1 }}
                            disabled={isDateInPast(selectedDate)}
                          />
                          {!isDateInPast(selectedDate) && (
                            <Tooltip title="Improve with AI">
                              <IconButton
                                onClick={() => handleImproveObservation(student._id)}
                                disabled={!observations[student._id] || improvingObservation[student._id]}
                                sx={{
                                  position: 'absolute',
                                  right: 8,
                                  top: 8,
                                  backgroundColor: 'primary.main',
                                  color: 'white',
                                  '&:hover': {
                                    backgroundColor: 'primary.dark',
                                  },
                                  '&.Mui-disabled': {
                                    backgroundColor: 'action.disabledBackground',
                                    color: 'action.disabled',
                                  },
                                  width: 36,
                                  height: 36,
                                }}
                              >
                                {improvingObservation[student._id] ? (
                                  <CircularProgress size={20} color="inherit" />
                                ) : (
                                  <AutoFixHighIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </Collapse>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {!isDateInPast(selectedDate) && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setObservationsHistoryOpen(true)}
                  startIcon={<HistoryIcon />}
                  disabled={!selectedGroup}
                >
                  View History
                </Button>
                <InlineHelp content={`
• View past observations for all students
• Track progress over time
• See previous lesson details
• Review teaching notes and strategies`} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveObservations}
                  disabled={!selectedLesson || !hasObservations() || isSavingObservations}
                  startIcon={isSavingObservations ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {isSavingObservations ? 'Saving...' : 'Save Observations'}
                </Button>
                <InlineHelp content={`
• Save all student observations
• Observations are saved with:
  - Selected lesson plan
  - Current date
  - Group context
• Button is disabled until you add observations`} />
              </Box>
            </>
          )}
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" mt={3}>
            <CircularProgress />
          </Box>
        )}
      </Paper>

      <LessonViewDialog 
        open={lessonViewOpen}
        onClose={() => setLessonViewOpen(false)}
        lessonPlan={selectedLessonPlan}
      />

      <ObservationsHistoryDialog
        open={observationsHistoryOpen}
        onClose={() => setObservationsHistoryOpen(false)}
        observations={observationsHistory}
      />

      <FeedbackButton page="lesson-delivery" />
    </Box>
  );
};

const LessonViewDialog: React.FC<LessonViewDialogProps> = ({ open, onClose, lessonPlan }) => {
  if (!lessonPlan) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Lesson Plan: {lessonPlan.story.title}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {lessonPlan.standard.code} - {lessonPlan.standard.description}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Story Section */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Story: {lessonPlan.story.title}
            </Typography>
            <Box sx={{ 
              maxHeight: '200px', 
              overflow: 'auto',
              backgroundColor: 'grey.50',
              p: 2,
              borderRadius: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'grey.100',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'grey.400',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: 'grey.500',
                },
              },
            }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {lessonPlan.story.content}
              </Typography>
            </Box>
          </Paper>

          {/* Warm Up */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Warm Up
            </Typography>
            <ReactMarkdown>{lessonPlan.sections.warmUp}</ReactMarkdown>
          </Paper>

          {/* Introduction and Guided Practice */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Introduction and Guided Practice
            </Typography>
            <ReactMarkdown>{lessonPlan.sections.introductionAndGuidedPractice}</ReactMarkdown>
          </Paper>

          {/* Independent Practice */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Independent Practice
            </Typography>
            <ReactMarkdown>{lessonPlan.sections.independentPractice}</ReactMarkdown>
          </Paper>

          {/* Checking Comprehension */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Checking Comprehension
            </Typography>
            <ReactMarkdown>{lessonPlan.sections.checkingComprehension}</ReactMarkdown>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LessonDelivery;