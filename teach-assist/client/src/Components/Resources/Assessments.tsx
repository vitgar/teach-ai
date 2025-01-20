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
  Chip,
  OutlinedInput,
  Typography,
  Menu,
  MenuItem as MuiMenuItem,
} from '@mui/material';
import { useTeacher } from '../../context/TeacherContext';
import StreamingPassage from './StreamingPassage';
import SuccessAlert from '../Common/SuccessAlert';
import apiAxiosInstance from "../../utils/axiosInstance";
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import html2pdf from 'html2pdf.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';

// **** IMPORTANT: for server-side rendering of Markdown ****
import ReactDOMServer from 'react-dom/server';

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

// --- Updated styles for Markdown ---
const markdownStyles = `
  .markdown-body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .markdown-body h1, .markdown-body h2, .markdown-body h3 {
    color: #333;
    font-weight: bold;
    margin: 1em 0 0.5em;
  }

  .markdown-body h1 {
    text-align: center;
    font-size: 1.5em;
  }

  /* Questions section */
  .markdown-body h2:not(.answer-key-section h2) {
    margin-top: 2em;
    font-size: 1.3em;
    border-bottom: 2px solid #333;
    padding-bottom: 0.5em;
  }

  /* Numbered questions */
  .markdown-body ol {
    list-style-type: none;
    counter-reset: question;
    padding-left: 0;
    margin-top: 1.5em;
  }

  .markdown-body ol > li {
    counter-increment: question;
    margin-bottom: 2em;
    padding-left: 2em;
    position: relative;
  }

  .markdown-body ol > li::before {
    content: counter(question) ".";
    position: absolute;
    left: 0;
    font-weight: bold;
  }

  /* Answer choices (A, B, C, D) */
  .markdown-body ol > li > ol {
    list-style-type: none;
    margin: 1em 0 1em 0;
    padding-left: 2em;
  }

  .markdown-body ol > li > ol > li {
    margin: 0.5em 0;
    position: relative;
    padding-left: 1.5em;
    display: block;
  }

  .markdown-body ol > li > ol > li::before {
    content: attr(value) ".";
    position: absolute;
    left: 0;
    font-weight: normal;
  }

  /* Answer key section */
  .answer-key-section {
    page-break-before: always;
    margin-top: 2em;
    border-top: 2px solid #333;
    padding-top: 2em;
  }

  .answer-key-section h2 {
    text-align: center;
    margin-bottom: 1em;
  }

  /* Print-specific styles */
  @media print {
    .answer-key-section {
      page-break-before: always !important;
    }
    .markdown-body {
      padding: 0;
    }
  }
`;

const splitContent = (content: string) => {
  console.log("\n=== Splitting Content ===");
  console.log("Original content length:", content.length);
  
  const marker = '[[ANSWER_KEY_START]]';
  console.log("Looking for marker:", marker);
  
  const parts = content.split(marker);
  console.log("Number of parts after split:", parts.length);
  
  if (parts.length > 1) {
    console.log("Main content length:", parts[0].length);
    console.log("Answer key content length:", parts[1].length);
    console.log("Split successful - found marker");
    return {
      mainContent: parts[0].trim(),
      answerKeyContent: parts[1].trim()
    };
  }
  
  console.log("No marker found - returning full content");
  return {
    mainContent: content.trim(),
    answerKeyContent: ""
  };
};

// A helper to embed the main content + answer key together.
const createPrintContent = (mainContentHTML: string, answerKeyHTML: string) => {
  // Format questions to ensure they appear on separate lines
  const formattedMainContent = mainContentHTML.replace(
    /([A-D])\./g,
    '<br>$1.'
  );

  return `
    <div class="markdown-body">
      ${formattedMainContent}
    </div>

    ${
      answerKeyHTML
        ? `
        <div class="markdown-body answer-key-section" style="page-break-before: always;">
          <h2>Answer Key</h2>
          ${answerKeyHTML}
        </div>
      `
        : ''
    }
  `;
};

// Utility to convert raw Markdown into rendered HTML using react-markdown + SSR
function convertMarkdownToHtml(markdown: string) {
  return ReactDOMServer.renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
  );
}

const Assessments: React.FC = () => {
  const { teacher } = useTeacher();

  // Form states
  const [topic, setTopic] = useState('');
  const [genre, setGenre] = useState('');
  const [questionStyle, setQuestionStyle] = useState('Generic');
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const [isPairedPassage, setIsPairedPassage] = useState(false);
  const [topicTwo, setTopicTwo] = useState('');
  const [genreTwo, setGenreTwo] = useState('');

  // Content states
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [answerKeyBuffer, setAnswerKeyBuffer] = useState<string>('');
  const [isCollectingAnswerKey, setIsCollectingAnswerKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null);

  // Grade level and standards
  const [gradeLevel, setGradeLevel] = useState('');
  const [standards, setStandards] = useState<Standard[]>([]);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);

  // For the download dropdown
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Fetch standards once teacher is known
  useEffect(() => {
    if (teacher?.gradeLevel) {
      const grade = teacher.gradeLevel.replace(/[^0-8K]/g, '');
      setGradeLevel(grade);

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

  const handleGradeLevelChange = async (event: SelectChangeEvent) => {
    const newGradeLevel = event.target.value;
    setGradeLevel(newGradeLevel);
    setSelectedStandards([]);
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
    setAnswerKeyBuffer('');
    setIsCollectingAnswerKey(false);

    try {
      const requestData: AssessmentRequestData = {
        isPairedPassage,
        generateQuestions: true,
        questionStyle,
        includeAnswerKey: showAnswerKey,
        ...(isPairedPassage
          ? {
              topic: undefined,
              genre: undefined,
              passages: [
                { topic, genre: genre || 'Informational' },
                { topic: topicTwo, genre: genreTwo || 'Informational' }
              ]
            }
          : {
              topic,
              genre: genre || 'Informational',
              passages: undefined
            }),
        standards: selectedStandards
          .map((id) => {
            const standard = standards.find((s) => s._id === id);
            return standard
              ? {
                  id: standard._id,
                  code: standard.code || standard.standard,
                  standard: standard.standard,
                  description: standard.description
                }
              : null;
          })
          .filter(Boolean)
      };

      console.log('Request data:', requestData);

      const response = await fetch('http://localhost:5001/generate-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                  // Start collecting answer key
                  const [passageContent] = content.split('ANSWER_KEY_START');
                  setStreamedContent((prev) => prev + passageContent);
                  setIsCollectingAnswerKey(true);
                  setAnswerKeyBuffer((prev) => prev + content.substring(content.indexOf('ANSWER_KEY_START')));
                } else if (isCollectingAnswerKey) {
                  setAnswerKeyBuffer((prev) => prev + content);
                } else {
                  setStreamedContent((prev) => prev + content);
                }
              } else if (data.type === 'questions') {
                setQuestions(data.questions);
              } else if (data.type === 'complete') {
                setIsStreaming(false);
                setIsCollectingAnswerKey(false);

                // Parse the answer key text
                if (answerKeyBuffer) {
                  console.log('Answer Key Buffer:', answerKeyBuffer);
                  const updatedQuestions = [...questions];
                  const answerKeyLines = answerKeyBuffer.split('\n');
                  let currentQuestionIndex = -1;

                  answerKeyLines.forEach((line) => {
                    // e.g. "Question 1: A"
                    const questionMatch = line.match(/Question (\d+): ([A-D])/);
                    if (questionMatch) {
                      currentQuestionIndex = parseInt(questionMatch[1]) - 1;
                      if (updatedQuestions[currentQuestionIndex]) {
                        updatedQuestions[currentQuestionIndex].correctAnswer = questionMatch[2];
                      }
                    } else if (
                      line.startsWith('Standard:') &&
                      updatedQuestions[currentQuestionIndex]
                    ) {
                      updatedQuestions[currentQuestionIndex].standardReference = line
                        .replace('Standard:', '')
                        .trim();
                    } else if (
                      line.startsWith('Explanation:') &&
                      updatedQuestions[currentQuestionIndex]
                    ) {
                      updatedQuestions[currentQuestionIndex].explanation = line
                        .replace('Explanation:', '')
                        .trim();
                    }
                  });
                  setQuestions(updatedQuestions);
                }

                // Auto-save
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
                      questions: questions.map((q) => ({
                        question: q.question,
                        answers: q.answers,
                        correctAnswer: q.correctAnswer || '',
                        explanation: q.explanation || '',
                        standardReference: q.standardReference || '',
                        bloomsLevel: q.bloomsLevel || ''
                      })),
                      isPairedPassage,
                      passages: isPairedPassage
                        ? [
                            { topic, genre: genre || 'Informational' },
                            { topic: topicTwo, genre: genreTwo || 'Informational' }
                          ]
                        : undefined
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

  const handleCloseSuccess = () => {
    setShowSuccessAlert(false);
  };

  // -- Download menu handlers --
  const handleDownloadClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleDownloadClose = () => {
    setAnchorEl(null);
  };

  // -- Print handler --
  const handlePrint = () => {
    // 1) Split out main vs. answer key from the raw text
    const { mainContent, answerKeyContent } = splitContent(streamedContent);

    // 2) Convert each piece to HTML
    const mainHtml = convertMarkdownToHtml(mainContent);
    const answerKeyHtml = convertMarkdownToHtml(answerKeyContent);

    // 3) Combine them with custom styles
    const formattedContent = createPrintContent(mainHtml, answerKeyHtml);

    // 4) Open a new window and write our final HTML + CSS
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Assessment</title>
          <style>
            ${markdownStyles}
            @media print {
              .answer-key-section {
                page-break-before: always !important;
                margin-top: 50px;
              }
              @page {
                margin: 0.5in;
              }
            }
          </style>
        </head>
        <body>
          ${formattedContent}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // -- Download as PDF --
  const handleDownloadPDF = async () => {
    const { mainContent, answerKeyContent } = splitContent(streamedContent);
    const mainHtml = convertMarkdownToHtml(mainContent);
    const answerKeyHtml = convertMarkdownToHtml(answerKeyContent);
    const formattedContent = createPrintContent(mainHtml, answerKeyHtml);

    const element = document.createElement('div');
    element.innerHTML = formattedContent;

    const opt = {
      margin: 0.7,
      filename: 'assessment.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      handleDownloadClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF');
    }
  };

  // -- Download as Word --
  const handleDownloadWord = () => {
    const { mainContent, answerKeyContent } = splitContent(streamedContent);
    const mainHtml = convertMarkdownToHtml(mainContent);
    const answerKeyHtml = convertMarkdownToHtml(answerKeyContent);
    const formattedContent = createPrintContent(mainHtml, answerKeyHtml);

    const blob = new Blob([formattedContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'assessment.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    handleDownloadClose();
  };

  return (
    <Box sx={{ p: 3 }}>
      <SuccessAlert open={showSuccessAlert} message={successMessage} onClose={handleCloseSuccess} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          {/* Grade Level & Standards */}
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
                      const standard = standards.find((s) => s._id === value);
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
                  '& .MuiSelect-select': { minHeight: 40 }
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
                      <Checkbox
                        checked={selectedStandards.indexOf(standard._id) > -1}
                      />
                      <Box sx={{ ml: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 'bold', color: 'primary.main', mb: 0.5 }}
                        >
                          {standard.standard}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: 'text.secondary', whiteSpace: 'normal', lineHeight: 1.3 }}
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

          {/* Single/Paired Passage Inputs */}
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
                  <MenuItem key={g} value={g}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Question Style & Answer Key */}
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

          {/* Generate Button */}
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

      {/* Render the streamed content + questions */}
      {streamedContent && (
        <>
          <StreamingPassage
            passage={streamedContent}
            questions={questions}
            isLoading={isLoading}
          />

          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handlePrint}
              startIcon={<PrintIcon />}
            >
              Print
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={handleDownloadClick}
              startIcon={<DownloadIcon />}
            >
              Download
            </Button>

            <Menu anchorEl={anchorEl} open={open} onClose={handleDownloadClose}>
              <MuiMenuItem onClick={handleDownloadPDF}>
                <PictureAsPdfIcon sx={{ mr: 1 }} />
                Download as PDF
              </MuiMenuItem>

              <MuiMenuItem onClick={handleDownloadWord}>
                <DescriptionIcon sx={{ mr: 1 }} />
                Download as Word
              </MuiMenuItem>
            </Menu>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Assessments;
