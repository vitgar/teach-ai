import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { CloudUpload, Add, ContentPaste, Clear, Description, Delete } from '@mui/icons-material';
import { useTeacher } from '../../context/TeacherContext';
import apiAxiosInstance, { aiAxiosInstance } from '../../utils/axiosInstance';
import { Student } from '@/Types/Student';
import axios from 'axios';


interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ProcessedStudent {
  firstName: string;
  lastName: string;
  readingLevel: string;
  studentId?: string;
  gradeLevel?: string;
}

interface ErrorResponse {
  error: string;
  duplicates?: string[];
  details?: string;
}

interface ErrorMessageProps {
  error: string;
  duplicates?: string[];
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, duplicates }) => (
  <Box>
    <Typography variant="body1" gutterBottom>
      {error}
    </Typography>
    {duplicates && (
      <>
        <Typography variant="body2" color="text.secondary">
          Duplicate students:
        </Typography>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          {duplicates.map((name, index) => (
            <li key={index}>{name}</li>
          ))}
        </ul>
        <Typography variant="body2">
          Please remove duplicates before saving.
        </Typography>
      </>
    )}
  </Box>
);

interface BulkStudentData {
  firstName: string;
  lastName: string;
  studentId: string;
  gradeLevel: string;
  readingLevel: string;
  periodId?: string;
}

const AddStudents: React.FC = () => {
  const { teacher } = useTeacher();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [singleStudent, setSingleStudent] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    studentId: '',
    gradeLevel: teacher?.gradeLevel || '',
    readingLevel: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'text' | null>(null);
  const [processedStudents, setProcessedStudents] = useState<ProcessedStudent[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingClipboardData, setPendingClipboardData] = useState<DataTransfer | null>(null);

  const setErrorMessage = (message: string) => {
    setError({ error: message });
  };

  const handleSingleStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSingleStudent({
      ...singleStudent,
      [e.target.name]: e.target.value
    });
  };

  const handleSingleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher?._id || !teacher?.gradeLevel) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const studentData: Student = {
        ...singleStudent as Omit<Student, 'gradeLevel' | 'teacherId'>,
        teacherId: teacher._id,
        gradeLevel: teacher.gradeLevel,
        readingLevel: singleStudent.readingLevel || ''
      };

      const response = await apiAxiosInstance.post('/api/students', studentData);
      setSuccess('Student added successfully!');
      setSingleStudent({
        firstName: '',
        lastName: '',
        studentId: '',
        gradeLevel: teacher.gradeLevel,
        readingLevel: '',
      });
    } catch (err) {
      setErrorMessage('Failed to add student. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      setErrorMessage('Please enter student information');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First, send to AI for processing
      const aiResponse = await aiAxiosInstance.post<{ students: Student[] }>('/parse-students', {
        text: textInput,
        teacherGrade: teacher?.gradeLevel,
        teacherId: teacher?._id
      });

      const processedStudents = aiResponse.data.students;

      // Then, save the processed students
      const response = await apiAxiosInstance.post('/api/students/bulk-create', {
        students: processedStudents.map((student: Student) => ({
          ...student,
          teacherId: teacher?._id
        }))
      });

      // If there are any groups or periods to update
      const studentsWithGroups = processedStudents.filter((s: Student) => s.groupIds && s.groupIds.length > 0);
      const studentsWithPeriods = processedStudents.filter((s: Student) => s.periodId);

      // Update groups if needed
      if (studentsWithGroups.length > 0) {
        await Promise.all(studentsWithGroups.flatMap((student: Student) => 
          (student.groupIds || []).map(groupId =>
            apiAxiosInstance.post(`/api/groups/${groupId}/add-student`, {
              studentId: student._id
            })
          )
        ));
      }

      // Update periods if needed
      if (studentsWithPeriods.length > 0) {
        await Promise.all(studentsWithPeriods.map((student: Student) =>
          apiAxiosInstance.post(`/periods/${student.periodId}/add-student`, {
            studentId: student._id
          })
        ));
      }

      setSuccess(`Successfully added ${processedStudents.length} students!`);
      setTextInput('');

    } catch (err) {
      console.error('Error:', err);
      setErrorMessage('Failed to process student information. Please check the format and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (processedStudents.length > 0) {
      setPendingFile(file);
      setShowConfirmDialog(true);
    } else {
      processFile(file);
    }
    
    if (event.target.value) {
      event.target.value = '';
    }
  };

  const processFile = (file: File) => {
    // Clear previous processed data when new file is uploaded
    setProcessedStudents([]);
    setSuccess(null);
    setError(null);

    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
      setFileType('image');
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImageData(result);
        setTextInput('');
      };
      reader.readAsDataURL(file);
    } else if (
      file.type === 'text/plain' || 
      file.type === 'text/csv' || 
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.txt') || 
      file.name.endsWith('.csv')
    ) {
      setFileType('text');
      reader.onloadend = () => {
        const result = reader.result as string;
        setTextInput(result);
        setImagePreview(null);
        setImageData(null);
      };
      reader.readAsText(file);
    } else {
      setErrorMessage('Unsupported file type. Please upload an image, text, or CSV file.');
    }
  };

  const handleFileSubmit = async () => {
    if (!file) {
      setErrorMessage('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('teacherGrade', teacher?.gradeLevel || '');

    try {
      const response = await apiAxiosInstance.post('/api/students/parse-file', formData);
      setSuccess(`Successfully added ${response.data.count} students!`);
      setFile(null);
    } catch (err) {
      setErrorMessage('Failed to process file. Please check the format and try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processData = async () => {
    if (!imageData && !textInput.trim()) {
      setErrorMessage('Please provide either text or an image to process');
      return;
    }

    if (!teacher?._id) {
      setErrorMessage('Teacher ID is required');
      return;
    }

    setProcessedStudents([]);
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      if (imageData) {
        console.log('Processing with teacher ID:', teacher._id);
        response = await aiAxiosInstance.post('/parse-students-from-image', {
          image: imageData,
          teacherGrade: teacher.gradeLevel,
          teacherId: teacher._id
        });
      } else {
        response = await aiAxiosInstance.post('/parse-students', {
          text: textInput,
          teacherGrade: teacher.gradeLevel,
          teacherId: teacher._id
        });
      }

      console.log('Received students:', response.data.students);
      setProcessedStudents(response.data.students);
      setSuccess('Students processed successfully! Review the list below and click Save to add them.');
    } catch (err) {
      console.error('Error:', err);
      setErrorMessage('Failed to process data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStudents = async () => {
    if (processedStudents.length === 0) {
      setError({ error: 'No students to save' });
      return;
    }

    if (!teacher?._id) {
      setError({ error: 'Teacher ID is required' });
      return;
    }

    setLoading(true);
    try {
      // Add teacherId to each student
      const studentsWithTeacher = processedStudents.map(student => ({
        ...student,
        teacherId: teacher._id,
        gradeLevel: student.gradeLevel || teacher.gradeLevel,
      }));

      const response = await apiAxiosInstance.post('/api/students/bulk-create', {
        students: studentsWithTeacher
      });

      setSuccess(`Successfully added ${response.data.count} students!`);
      setImagePreview(null);
      setImageData(null);
      setTextInput('');
      setProcessedStudents([]);
    } catch (err) {
      console.error('Error:', err);
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data as ErrorResponse;
        if (errorData.duplicates) {
          setError({
            error: 'Some students could not be added due to duplicate IDs',
            details: 'Please check the student list and try again.',
            duplicates: errorData.duplicates
          });
        } else {
          setError(errorData);
        }
      } else {
        setError({ error: 'Failed to save students. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = (index: number) => {
    setProcessedStudents(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageData(result);
      setTextInput(''); // Clear text input when image is uploaded
    };
    reader.readAsDataURL(file);
    
    if (event.target.value) {
      event.target.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    
    for (const item of Array.from(items || [])) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        
        if (processedStudents.length > 0) {
          setPendingClipboardData(e.clipboardData);
          setShowConfirmDialog(true);
        } else {
          processPastedData(e.clipboardData);
        }
        break;
      }
    }
  };

  const processPastedData = (clipboardData: DataTransfer) => {
    const items = clipboardData.items;
    
    for (const item of Array.from(items || [])) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          setProcessedStudents([]);
          setSuccess(null);
          setError(null);

          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            setImagePreview(result);
            setImageData(result);
            setTextInput('');
            setFileType('image');
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setImageData(null);
  };

  const handleConfirmDiscard = () => {
    if (pendingFile) {
      processFile(pendingFile);
    } else if (pendingClipboardData) {
      processPastedData(pendingClipboardData);
    }
    setShowConfirmDialog(false);
    setPendingFile(null);
    setPendingClipboardData(null);
  };

  const handleCancelDiscard = () => {
    setShowConfirmDialog(false);
    setPendingFile(null);
    setPendingClipboardData(null);
  };

  const resetForm = () => {
    setSingleStudent({
      firstName: '',
      lastName: '',
      studentId: '',
      gradeLevel: teacher?.gradeLevel || '',
      readingLevel: '',
    });
  };

  const handleBulkImport = (data: BulkStudentData[]) => {
    // Process the data without intervention fields
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Add Students
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label="Single Student" />
          <Tab label="Multiple Students" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handleSingleStudentSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={singleStudent.firstName}
                  onChange={handleSingleStudentChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={singleStudent.lastName}
                  onChange={handleSingleStudentChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Student ID"
                  name="studentId"
                  value={singleStudent.studentId}
                  onChange={handleSingleStudentChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Reading Level"
                  name="readingLevel"
                  value={singleStudent.readingLevel}
                  onChange={handleSingleStudentChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                >
                  Add Student
                </Button>
              </Grid>
            </Grid>
          </form>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Add Multiple Students
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Enter text, paste an image, or upload a file (supports image, text, and CSV).
              </Typography>
              
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={`Paste or type student information here...

Supported formats:
- Free text describing students
- Image with student information
- CSV format: FirstName,LastName,ReadingLevel
- One student per line`}
                  disabled={loading}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                      fontFamily: 'monospace',
                    }
                  }}
                />
                
                {imagePreview && !processedStudents.length && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    zIndex: 1,
                  }}>
                    <IconButton
                      size="small"
                      onClick={handleClearImage}
                      sx={{ 
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Clear />
                    </IconButton>
                  </Box>
                )}
              </Box>

              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                mb: 2 
              }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,text/plain,text/csv,.csv,application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                <Button
                  variant="contained"
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={fileType === 'image' ? <CloudUpload /> : <Description />}
                  disabled={loading}
                >
                  Upload File
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={processData}
                  disabled={loading || (!textInput && !imageData)}
                >
                  Process Data
                </Button>
              </Box>

              {!processedStudents.length && (
                <>
                  {fileType === 'text' && textInput && (
                    <Paper 
                      elevation={3} 
                      sx={{ 
                        p: 1,
                        mb: 2,
                        backgroundColor: 'background.paper',
                        position: 'relative',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        File Preview
                      </Typography>
                      <Box
                        sx={{
                          maxHeight: '200px',
                          overflow: 'auto',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          p: 1,
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                        }}
                      >
                        {textInput}
                      </Box>
                      {loading && (
                        <Box sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          zIndex: 1,
                        }}>
                          <CircularProgress />
                        </Box>
                      )}
                    </Paper>
                  )}

                  {fileType === 'image' && imagePreview && (
                    <Paper 
                      elevation={3} 
                      sx={{ 
                        p: 1,
                        mb: 2,
                        backgroundColor: 'background.paper',
                        position: 'relative'
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Image Preview
                      </Typography>
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto'
                        }} 
                      />
                      {loading && (
                        <Box sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        }}>
                          <CircularProgress />
                        </Box>
                      )}
                    </Paper>
                  )}
                </>
              )}

              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 2,
                    '& .MuiAlert-message': {
                      width: '100%'
                    }
                  }}
                >
                  {error.duplicates ? (
                    <ErrorMessage error={error.error} duplicates={error.duplicates} />
                  ) : (
                    error.error
                  )}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
            </Box>
          </Box>

          {processedStudents.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 2 
                }}>
                  <Typography variant="h6">
                    Processed Students ({processedStudents.length})
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveStudents}
                    disabled={loading || processedStudents.length === 0}
                  >
                    Save All Students
                  </Button>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>First Name</TableCell>
                        <TableCell>Last Name</TableCell>
                        <TableCell>Reading Level</TableCell>
                        <TableCell>Grade Level</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {processedStudents.map((student, index) => (
                        <TableRow 
                          key={index}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell>{student.firstName}</TableCell>
                          <TableCell>{student.lastName}</TableCell>
                          <TableCell>{student.readingLevel}</TableCell>
                          <TableCell>{student.gradeLevel || teacher?.gradeLevel}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveStudent(index)}
                              color="error"
                              title="Remove student"
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {processedStudents.length > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography variant="body2" color="text.secondary">
                      Review the information above and click Save All Students when ready
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* Add confirmation dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleCancelDiscard}
        aria-labelledby="discard-dialog-title"
        aria-describedby="discard-dialog-description"
      >
        <DialogTitle id="discard-dialog-title">
          Unsaved Processed Data
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="discard-dialog-description">
            You have processed students that haven't been saved yet. 
            Do you want to discard them and process the new file?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDiscard} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDiscard} 
            color="error"
            variant="contained"
          >
            Discard and Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddStudents; 