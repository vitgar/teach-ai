import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  SelectChangeEvent,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  OutlinedInput,
  Chip,
} from '@mui/material';
import { useTeacher } from '../../context/TeacherContext';
import StreamingPassage from './StreamingPassage';
import apiAxiosInstance from "../../utils/axiosInstance";

interface Question {
  question: string;
  answers: string[];
  correctAnswer: string;
  explanation?: string;
  bloomsLevel?: string;
  standardReference?: string;
}

interface Standard {
  _id: string;
  code: string;
  standard: string;
  description: string;
  strand?: string;
  gradeLevel?: string;
  short_description?: string;
  teachingStandard?: string;
}

const GENRES = [
  'Fiction', 'Realistic Fiction', 'Historical Fiction', 'Science Fiction',
  'Fantasy', 'Mystery', 'Adventure', 'Horror', 'Drama', 'Poetry',
  'Mythology', 'Fable', 'Folktale', 'Biography', 'Autobiography',
  'Informational', 'Expository', 'Persuasive'
];

const GRADE_LEVELS = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];

const Assessment: React.FC = () => {
  const { teacher } = useTeacher();
  
  // Form states
  const [topic, setTopic] = useState('');
  const [genre, setGenre] = useState('');
  const [questionStyle, setQuestionStyle] = useState('STAAR');
  const [showAnswerKey, setShowAnswerKey] = useState(true);

  // Content states
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [answerKey, setAnswerKey] = useState<string>('');
  const [answerKeyBuffer, setAnswerKeyBuffer] = useState<string>('');
  const [isCollectingAnswerKey, setIsCollectingAnswerKey] = useState(false);

  // Add new states for grade level and standards
  const [gradeLevel, setGradeLevel] = useState('');
  const [standards, setStandards] = useState<Standard[]>([]);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);

  // Set default grade level based on teacher's grade and fetch standards
  useEffect(() => {
    if (teacher?.gradeLevel) {
      const grade = teacher.gradeLevel.replace(/[^0-8KK]/g, '');
      setGradeLevel(grade);
      
      // Fetch standards for the teacher's grade level
      const fetchStandards = async () => {
        try {
          const response = await apiAxiosInstance.get('/api/detailedstandards', {
            params: { gradeLevel: grade }
          });
          setStandards(response.data);
        } catch (error) {
          console.error('Error fetching standards:', error);
          setError('Failed to fetch standards');
        }
      };
      
      fetchStandards();
    }
  }, [teacher?.gradeLevel]);

  // Add handler for grade level change
  const handleGradeLevelChange = async (event: SelectChangeEvent) => {
    const newGradeLevel = event.target.value;
    setGradeLevel(newGradeLevel);
    setSelectedStandards([]); // Reset selected standards when grade level changes
    
    try {
      const response = await apiAxiosInstance.get('/api/detailedstandards', {
        params: { gradeLevel: newGradeLevel }
      });
      setStandards(response.data);
    } catch (error) {
      console.error('Error fetching standards:', error);
      setError('Failed to fetch standards');
    }
  };

  // Add handler for standards change
  const handleStandardsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedStandards(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStreaming(true);
    setStreamedContent('');
    setError(null);
    setQuestions([]);
    setIsLoading(false);

    try {
      const requestData = {
        topic,
        genre: genre || 'Informational',
        generateQuestions: true,
        questionStyle,
        includeAnswerKey: showAnswerKey,
        standards: selectedStandards.map(id => {
          const standard = standards.find(s => s._id === id);
          return standard ? {
            id: standard._id,
            code: standard.code || standard.standard,
            standard: standard.standard,
            description: standard.description
          } : null;
        }).filter(Boolean)
      };

      const response = await fetch('http://localhost:5001/generate-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('Received data:', data);

              if (data.type === 'error') {
                setError(data.message);
                setIsStreaming(false);
                break;
              } else if (data.type === 'content') {
                const content = data.content.replace(/[\[\]"]/g, '');
                
                if (content.includes('ANSWER_KEY_START')) {
                  const [passageContent] = content.split('ANSWER_KEY_START');
                  setStreamedContent(prev => prev + passageContent);
                  setIsCollectingAnswerKey(true);
                  setAnswerKeyBuffer(prev => prev + content.substring(content.indexOf('ANSWER_KEY_START')));
                } else if (isCollectingAnswerKey) {
                  setAnswerKeyBuffer(prev => prev + content);
                } else {
                  setStreamedContent(prev => prev + content);
                }
              } else if (data.type === 'questions') {
                console.log('Received questions:', data.questions);
                setQuestions(data.questions);
              } else if (data.type === 'complete') {
                setIsStreaming(false);
                setIsCollectingAnswerKey(false);
                
                if (answerKeyBuffer) {
                  const formattedAnswerKey = answerKeyBuffer
                    .trim()
                    .replace(/Question (\d+):/g, '\n\nQuestion $1:')
                    .replace(/Explanation:/g, '\n\nExplanation:');
                  setAnswerKey(formattedAnswerKey);
                }
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
              setError('Error parsing response data');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setIsStreaming(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          {/* Grade Level and Standards Row */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Grade Level</InputLabel>
              <Select
                value={gradeLevel}
                onChange={handleGradeLevelChange}
                label="Grade Level"
                required
              >
                {GRADE_LEVELS.map((grade) => (
                  <MenuItem key={grade} value={grade}>
                    Grade {grade === 'K' ? 'K' : grade}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ flexGrow: 1 }}>
              <InputLabel>Standards</InputLabel>
              <Select
                multiple
                value={selectedStandards}
                onChange={handleStandardsChange}
                input={<OutlinedInput label="Standards" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const standard = standards.find(s => s._id === value);
                      return standard ? (
                        <Chip 
                          key={value} 
                          label={`${standard.standard} - ${standard.description}`}
                          size="small"
                        />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {standards.map((standard) => (
                  <MenuItem 
                    key={standard._id} 
                    value={standard._id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      py: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Checkbox checked={selectedStandards.indexOf(standard._id) > -1} />
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {standard.standard}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {standard.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Topic and Genre Row */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              sx={{ flexGrow: 1 }}
            />
            
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Genre</InputLabel>
              <Select
                value={genre}
                onChange={(e: SelectChangeEvent) => setGenre(e.target.value)}
                label="Genre"
                required
              >
                {GENRES.map((g) => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Question Style and Answer Key Row */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Question Style</InputLabel>
              <Select
                value={questionStyle}
                onChange={(e: SelectChangeEvent) => setQuestionStyle(e.target.value)}
                label="Question Style"
              >
                <MenuItem value="STAAR">STAAR</MenuItem>
                <MenuItem value="Generic">Generic</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={showAnswerKey}
                  onChange={(e) => setShowAnswerKey(e.target.checked)}
                />
              }
              label="Include Answer Key"
            />
          </Box>

          {/* Submit Button */}
          <Box sx={{ mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isStreaming || isLoading}
              startIcon={isStreaming ? <CircularProgress size={20} /> : null}
            >
              Generate Assessment
            </Button>
          </Box>
        </form>
      </Paper>

      {streamedContent && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <StreamingPassage
              passage={streamedContent}
              questions={questions}
              isLoading={isLoading}
            />
          </Grid>
          {showAnswerKey && answerKey && (
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Answer Key
                </Typography>
                <div style={{ whiteSpace: 'pre-line' }}>
                  {answerKey}
                </div>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default Assessment; 