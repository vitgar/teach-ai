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
  ButtonGroup,
  Menu,
  MenuItem as MuiMenuItem,
  OutlinedInput,
  ListItemText,
  Chip,
} from '@mui/material';
import { useTeacher } from '../../context/TeacherContext';
import StreamingPassage from './StreamingPassage';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import html2pdf from 'html2pdf.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import SaveIcon from '@mui/icons-material/Save';
import SuccessAlert from '../Common/SuccessAlert';
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

interface PassageData {
  topic: string;
  genre: string;
}

interface AssessmentRequestData {
  isPairedPassage: boolean;
  generateQuestions: boolean;
  questionStyle: string;
  includeAnswerKey: boolean;
  passages?: PassageData[];
  topic?: string;
  genre?: string;
  standards: Array<{
    id: string;
    code: string;
    standard: string;
    description: string;
  } | null>;
}

const GENRES = [
  'Fiction', 'Realistic Fiction', 'Historical Fiction', 'Science Fiction',
  'Fantasy', 'Mystery', 'Adventure', 'Horror', 'Drama', 'Poetry',
  'Mythology', 'Fable', 'Folktale', 'Biography', 'Autobiography',
  'Informational', 'Expository', 'Persuasive'
];

const GRADE_LEVELS = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];

const Assessments: React.FC = () => {
  const { teacher } = useTeacher();
  
  // Form states
  const [topic, setTopic] = useState('');
  const [genre, setGenre] = useState('');
  const [questionStyle, setQuestionStyle] = useState('Generic');
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  // Add new state for paired passage
  const [isPairedPassage, setIsPairedPassage] = useState(false);
  const [topicTwo, setTopicTwo] = useState('');
  const [genreTwo, setGenreTwo] = useState('');

  // Content states
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [answerKey, setAnswerKey] = useState<string>('');
  const [answerKeyBuffer, setAnswerKeyBuffer] = useState<string>('');
  const [isCollectingAnswerKey, setIsCollectingAnswerKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add new state for saved assessment ID
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null);

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
    setSavedAssessmentId(null);

    try {
      const requestData: AssessmentRequestData = {
        isPairedPassage,
        generateQuestions: true, // Always true now
        questionStyle: questionStyle,
        includeAnswerKey: showAnswerKey,
        ...(isPairedPassage ? {
          topic: undefined,
          genre: undefined,
          passages: [
            {
              topic,
              genre: genre || 'Informational',
            },
            {
              topic: topicTwo,
              genre: genreTwo || 'Informational',
            }
          ]
        } : {
          topic,
          genre: genre || 'Informational',
          passages: undefined
        }),
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

      console.log('Request data:', requestData);

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
                
                // Parse answer key to extract question details
                if (answerKeyBuffer) {
                  console.log('Answer Key Buffer:', answerKeyBuffer);
                  console.log('Current questions before parsing:', questions);
                  const answerKeyLines = answerKeyBuffer.split('\n');
                  console.log('Answer Key Lines:', answerKeyLines);
                  const updatedQuestions = [...questions];
                  let currentQuestionIndex = -1;
                  
                  for (const line of answerKeyLines) {
                    console.log('Processing line:', line);
                    // Match "Question X: [A-D]"
                    const questionMatch = line.match(/Question (\d+): ([A-D])/);
                    if (questionMatch) {
                      currentQuestionIndex = parseInt(questionMatch[1]) - 1;
                      console.log('Found question', currentQuestionIndex + 1, 'with answer', questionMatch[2]);
                      if (updatedQuestions[currentQuestionIndex]) {
                        updatedQuestions[currentQuestionIndex].correctAnswer = questionMatch[2];
                      }
                    } 
                    // Match "Standard: [text]"
                    else if (line.startsWith('Standard:') && updatedQuestions[currentQuestionIndex]) {
                      const standard = line.replace('Standard:', '').trim();
                      console.log('Found standard:', standard);
                      updatedQuestions[currentQuestionIndex].standardReference = standard;
                    }
                    // Match "Explanation: [text]"
                    else if (line.startsWith('Explanation:') && updatedQuestions[currentQuestionIndex]) {
                      const explanation = line.replace('Explanation:', '').trim();
                      console.log('Found explanation:', explanation);
                      updatedQuestions[currentQuestionIndex].explanation = explanation;
                    }
                  }
                  console.log('Updated questions after parsing:', updatedQuestions);
                  setQuestions(updatedQuestions);
                }
                
                // Auto-save the assessment
                if (teacher?._id && streamedContent) {
                  try {
                    setIsSaving(true);
                    
                    const saveResponse = await apiAxiosInstance.post('/api/assessment-passages', {
                      teacherId: teacher?._id,
                      title: `Assessment: ${topic}`,
                      passage: streamedContent,
                      genre: genre || 'Informational',
                      isAIGenerated: true,
                      includeAnswerKey: showAnswerKey,
                      answerKey: answerKeyBuffer,
                      questions: questions.map(q => ({
                        question: q.question,
                        answers: q.answers,
                        correctAnswer: q.correctAnswer || '',
                        explanation: q.explanation || '',
                        standardReference: q.standardReference || '',
                        bloomsLevel: q.bloomsLevel || ''
                      })),
                      isPairedPassage,
                      passages: isPairedPassage ? [
                        { topic, genre: genre || 'Informational' },
                        { topic: topicTwo, genre: genreTwo || 'Informational' }
                      ] : undefined
                    });

                    if (saveResponse.status === 200) {
                      setSavedAssessmentId(saveResponse.data._id);
                      setSuccessMessage('Assessment saved successfully!');
                      setShowSuccessAlert(true);
                    } else {
                      throw new Error('Failed to save assessment');
                    }
                  } catch (error) {
                    console.error('Error saving assessment:', error);
                    setError('Failed to save assessment automatically. Please try again.');
                  } finally {
                    setIsSaving(false);
                  }
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

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDownloadClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDownloadClose = () => {
    setAnchorEl(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    handleDownloadClose();
    const formattedContent = formatContent(streamedContent);
    const element = document.createElement('div');
    element.innerHTML = `
      <div class="markdown-body" style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <style>
          /* Keep questions title with questions */
          .questions-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .questions-title {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .questions {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }

          /* Ensure answer key starts on new page */
          .answer-key-section {
            page-break-before: always !important;
            break-before: always !important;
            padding-top: 2em;
          }

          /* Question spacing */
          .question {
            margin-bottom: 2.5em;
          }

          .question-text {
            margin-bottom: 1em;
          }

          .answer-choices {
            margin-left: 2em;
            margin-bottom: 1em;
          }

          .answer-choice {
            margin-bottom: 0.5em;
          }

          /* Answer key spacing */
          .answer-key-item {
            margin-bottom: 0.8em;
          }

          .answer-key-explanation {
            margin-top: 0.3em;
            margin-bottom: 0.8em;
            margin-left: 1em;
          }

          .answer-key-content {
            margin-left: 2em;
            line-height: 1.4;
          }
        </style>
        ${formattedContent}
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `${topic}-assessment.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF');
    }
  };

  const handleDownloadWord = async () => {
    handleDownloadClose();
    try {
      // Split content into sections
      const [mainContent, answerKeyContent] = streamedContent.split('ANSWER_KEY_START');
      
      // Debug the split
      console.log('mainContent:', mainContent);
      console.log('answerKeyContent:', answerKeyContent);

      // Split into passage and questions sections
      const sections = mainContent.split('## Questions');
      
      // Process passage section
      const passageParts = sections[0].split('\n');
      const title = passageParts[0].replace(/^# /, '').replace(/\*\*/g, '');
      const passageContent = passageParts
        .slice(1)
        .join('\n')
        .split('\n\n')
        .map(paragraph => paragraph.trim())
        .join('\n\n');

      // Create RTF content with proper formatting
      let rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}
{\\colortbl;\\red0\\green0\\blue0;}

\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440

\\pard\\qc\\b\\fs36 ${title}\\par
\\pard\\sa360\\par

\\pard\\sa360\\fs28\\b0 ${passageContent.replace(/\n\n/g, '\\par\\sa360 ')}\\par
\\sa360

\\pard\\qc\\b\\fs32 Questions\\par
\\pard\\sa360\\par
`;

      // Process questions
      const questionLines = sections[1]?.trim().split('\n') || [];
      let currentQuestion = '';
      for (const line of questionLines) {
        if (line.match(/^\d+\./)) {
          if (currentQuestion) {
            rtfContent += currentQuestion + '\\par\\sa360 ';
          }
          currentQuestion = '\\b ' + line + '\\b0\\par ';
        } else if (line.trim().match(/^[A-D]\./)) {
          currentQuestion += '   ' + line + '\\par ';
        }
      }
      if (currentQuestion) {
        rtfContent += currentQuestion;
      }

      // Add answer key if present
      if (answerKeyContent) {
        rtfContent += `
\\page
\\pard\\qc\\b\\fs32 Answer Key\\par
\\pard\\sa360\\par

\\pard\\sa360\\fs28\\b0 ${answerKeyContent.replace(/\n\n/g, '\\par\\sa360 ')}\\par
`;
      }

      rtfContent += '}';

      // Create and download the file
      const blob = new Blob([rtfContent], { type: 'application/rtf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic}-assessment.rtf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating Word document:', error);
      setError('Failed to generate Word document');
    }
  };

  const formatContent = (content: string): string => {
    const sections = content.split('## Questions');
    const passageParts = sections[0].split('\n');
    const title = passageParts[0].replace(/^# /, '').replace(/\*\*/g, '');
    const passageContent = passageParts.slice(1).join('\n');

    let formattedQuestions = '';
    if (sections[1]) {
      const questionLines = sections[1].trim().split('\n');
      let currentQuestion = '';
      let questionNumber = 1;

      for (const line of questionLines) {
        if (line.match(/^\d+\./)) {
          if (currentQuestion) {
            formattedQuestions += `</div>`;
          }
          currentQuestion = line;
          formattedQuestions += `
            <div class="question">
              <div class="question-text">${questionNumber}. ${line.split('.')[1]}</div>
              <div class="answer-choices">
          `;
          questionNumber++;
        } else if (line.trim().match(/^[A-D]\./)) {
          formattedQuestions += `<div class="answer-choice">${line}</div>`;
        }
      }
      if (currentQuestion) {
        formattedQuestions += `</div></div>`;
      }
    }

    return `
      <h2 class="passage-title">${title}</h2>
      <div class="passage-content">
        ${passageContent}
      </div>
      <div class="questions-section">
        <h2 class="questions-title">Questions</h2>
        <div class="questions">
          ${formattedQuestions}
        </div>
      </div>
      ${answerKey ? `
        <div class="answer-key-section">
          <h2 class="answer-key-title">Answer Key</h2>
          <div class="answer-key-content">
            ${answerKey}
          </div>
        </div>
      ` : ''}
    `;
  };

  const handleCloseSuccess = () => {
    setShowSuccessAlert(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <SuccessAlert
        open={showSuccessAlert}
        message={successMessage}
        onClose={handleCloseSuccess}
      />
      
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
                sx={{
                  '& .MuiSelect-select': {
                    minHeight: 40
                  }
                }}
              >
                {standards.map((standard) => (
                  <MenuItem 
                    key={standard._id} 
                    value={standard._id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      py: 1,
                      minHeight: 'auto',
                      whiteSpace: 'normal'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Checkbox checked={selectedStandards.indexOf(standard._id) > -1} />
                      <Box sx={{ ml: 1 }}>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: 'primary.main',
                            mb: 0.5
                          }}
                        >
                          {standard.standard}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.secondary',
                            whiteSpace: 'normal',
                            lineHeight: 1.3
                          }}
                        >
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

      {streamedContent && questions.length > 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <StreamingPassage
              passage={streamedContent}
              questions={questions}
              isLoading={isLoading}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                disabled={!streamedContent}
              >
                Print
              </Button>
              
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadClick}
                disabled={!streamedContent}
                aria-controls="download-menu"
                aria-haspopup="true"
              >
                Download
              </Button>
            </Box>
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

      {(isStreaming || streamedContent) && !questions.length && (
        <>
          <StreamingPassage
            passage={streamedContent}
            questions={[]}
            isLoading={isStreaming}
          />
          {!isStreaming && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                disabled={!streamedContent}
              >
                Print
              </Button>
              
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadClick}
                disabled={!streamedContent}
                aria-controls="download-menu"
                aria-haspopup="true"
              >
                Download
              </Button>
            </Box>
          )}
        </>
      )}

      <Menu
        id="download-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleDownloadClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MuiMenuItem onClick={handleDownloadPDF}>
          <PictureAsPdfIcon sx={{ mr: 1 }} />
          PDF
        </MuiMenuItem>
        <MuiMenuItem onClick={handleDownloadWord}>
          <DescriptionIcon sx={{ mr: 1 }} />
          Word
        </MuiMenuItem>
      </Menu>
    </Box>
  );
};

export default Assessments; 