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
} from '@mui/material';
import { useTeacher } from '../../context/TeacherContext';
import StreamingPassage from './StreamingPassage';
import AnswerKey from './AnswerKey';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import html2pdf from 'html2pdf.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import fs from 'fs';
import path from 'path';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import SaveIcon from '@mui/icons-material/Save';
import SuccessAlert from '../Common/SuccessAlert';

const GENRES = [
  'Fiction', 'Realistic Fiction', 'Historical Fiction', 'Science Fiction',
  'Fantasy', 'Mystery', 'Adventure', 'Horror', 'Drama', 'Poetry',
  'Mythology', 'Fable', 'Folktale', 'Biography', 'Autobiography',
  'Informational', 'Expository', 'Persuasive'
];

const LEXILE_LEVELS = [
  'BR', '0-200', '200-300', '300-400', '400-500', 
  '500-600', '600-700', '700-800', '800-900', '900-1000',
  '1000-1100', '1100-1200'
];

interface Question {
  question: string;
  answers: string[];
  correctAnswer: string;
  explanation?: string;
  bloomsLevel?: string;
  standardReference?: string;
}

const splitContent = (content: string, answerKey: string) => {
  return {
    mainContent: content,
    answerKeyContent: answerKey
  };
};

const createPrintContent = (mainContent: string, answerKey: string) => {
  return `
    <div style="font-family: Arial, sans-serif;">
      ${mainContent}
      <div style="page-break-before: always;">
        <h2>Answer Key</h2>
        ${answerKey}
      </div>
    </div>
  `;
};

const markdownStyles = `
  .markdown-body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  .markdown-body h1 {
    text-align: center;
    font-weight: bold;
    font-size: 1.5em;
    margin: 1.5em 0;
    color: #333;
  }

  /* Question formatting */
  .markdown-body ol {
    list-style-type: none;
    counter-reset: question;
    padding: 0;
  }

  .markdown-body ol > li {
    counter-increment: question;
    margin-bottom: 2em;
  }

  .markdown-body ol > li::before {
    content: counter(question) ". ";
    font-weight: bold;
  }

  /* Answer choices */
  .markdown-body ol > li > ol {
    list-style-type: upper-alpha;
    margin-top: 1em;
    margin-left: 2em;
  }

  .markdown-body ol > li > ol > li {
    margin: 0.5em 0;
  }

  /* Answer key section */
  .answer-key-section {
    page-break-before: always !important;
    padding-top: 2em;
    border-top: 2px solid #333;
    margin-top: 3em;
  }

  .answer-key-section h1 {
    text-align: center;
    font-weight: bold;
    margin-bottom: 2em;
  }

  .answer-key-content {
    margin-left: 2em;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  /* Print-specific styles */
  @media print {
    .answer-key-section {
      page-break-before: always !important;
    }
    
    .markdown-body {
      padding: 0;
    }
    
    h1 {
      margin-top: 0;
    }
  }

  /* Basic paragraph and text styles */
  p {
    margin: 1em 0;
    line-height: 1.6;
  }

  /* Additional spacing for readability */
  .question-text {
    margin-bottom: 1em;
    font-weight: 500;
  }

  .answer-choice {
    margin: 0.5em 0;
    padding-left: 1em;
  }

  /* Keep questions title with questions */
  .questions-section {
    page-break-inside: avoid;
    break-inside: avoid;
    margin-top: 2em;
  }

  .questions-title {
    page-break-after: avoid;
    break-after: avoid;
  }

  .questions {
    page-break-before: avoid;
    break-before: avoid;
  }
`;

const Passages: React.FC = () => {
  const { teacher } = useTeacher();
  
  // Form states
  const [topic, setTopic] = useState('');
  const [readingLevel, setReadingLevel] = useState('');
  const [genre, setGenre] = useState('');
  const [generateQuestions, setGenerateQuestions] = useState(false);
  const [questionStyle, setQuestionStyle] = useState('Generic');
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

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add new state for saved passage ID
  const [savedPassageId, setSavedPassageId] = useState<string | null>(null);

  // Set default reading level based on teacher's grade
  useEffect(() => {
    if (teacher?.gradeLevel) {
      const grade = teacher.gradeLevel.replace(/[^0-8KK]/g, '');
      let defaultLevel = 'BR';
      if (grade !== 'K') {
        const gradeNum = parseInt(grade);
        if (gradeNum <= 1) defaultLevel = '200-300';
        else if (gradeNum <= 2) defaultLevel = '300-400';
        else if (gradeNum <= 3) defaultLevel = '400-500';
        else if (gradeNum <= 4) defaultLevel = '500-600';
        else if (gradeNum <= 5) defaultLevel = '600-700';
        else if (gradeNum <= 6) defaultLevel = '700-800';
        else if (gradeNum <= 7) defaultLevel = '800-900';
        else defaultLevel = '900-1000';
      }
      setReadingLevel(defaultLevel);
    }
  }, [teacher?.gradeLevel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStreaming(true);
    setStreamedContent('');
    setError(null);
    setQuestions([]);
    setIsLoading(false);
    setSavedPassageId(null); // Reset saved passage ID

    try {
      console.log('Reading Level:', readingLevel);

      const requestData = {
        topic,
        reading_level: readingLevel,
        genre: genre || 'Informational',
        generateQuestions,
        questionStyle: generateQuestions ? questionStyle : 'STAAR',
        gradeLevel: teacher?.gradeLevel || 1,
        includeAnswerKey: showAnswerKey
      };
      console.log('Request data:', requestData);

      const response = await fetch('http://localhost:5001/generate-passage', {
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
                console.log('Content chunk:', content);
                
                if (content.includes('[[ANSWER_KEY_START]]')) {
                  console.log('Found answer key marker');
                  const [passageContent, answerKeyContent] = content.split('[[ANSWER_KEY_START]]');
                  setStreamedContent(prev => prev + passageContent);
                  setIsCollectingAnswerKey(true);
                  if (answerKeyContent) {
                    setAnswerKeyBuffer(prev => prev + answerKeyContent);
                  }
                } else if (isCollectingAnswerKey) {
                  setAnswerKeyBuffer(prev => prev + content);
                } else {
                  setStreamedContent(prev => prev + content);
                }
              } else if (data.type === 'questions') {
                console.log('Received questions:', data.questions);
                setQuestions(data.questions);
              } else if (data.type === 'complete') {
                console.log('Stream complete. Questions:', questions.length);
                let formattedAnswerKey = '';
                
                if (answerKeyBuffer) {
                  formattedAnswerKey = answerKeyBuffer
                    .trim()
                    .replace(/Question (\d+):/g, '\n\nQuestion $1:')
                    .replace(/Explanation:/g, '\n\nExplanation:');
                  console.log('Setting formatted answer key:', formattedAnswerKey);
                  setAnswerKey(formattedAnswerKey);
                }
                setIsStreaming(false);
                setIsCollectingAnswerKey(false);
                setAnswerKeyBuffer('');

                // Save the passage after everything is complete
                if (teacher?._id) {
                  try {
                    const title = streamedContent.split('\n')[0].replace(/^# /, '').replace(/\*\*/g, '');
                    const response = await fetch('http://localhost:5000/api/passages', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        teacherId: teacher._id,
                        title,
                        passage: streamedContent,
                        genre,
                        lexileLevel: readingLevel,
                        isAIGenerated: true,
                        includeAnswerKey: showAnswerKey,
                        answerKey: formattedAnswerKey,
                        questions
                      }),
                    });

                    if (response.ok) {
                      const savedPassage = await response.json();
                      setSavedPassageId(savedPassage._id);
                      console.log('Passage saved successfully with ID:', savedPassage._id);
                    } else {
                      console.error('Failed to save passage:', await response.json());
                    }
                  } catch (error) {
                    console.error('Error auto-saving passage:', error);
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

  const handleGenerateQuestions = async () => {
    if (!streamedContent) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passage: streamedContent,
          style: questionStyle,
          gradeLevel: teacher?.gradeLevel
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setQuestions(data.questions);
    } catch (error) {
      console.error('Error generating questions:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate questions');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAnswerKeyForDisplay = (answerKey: string) => {
    return `
      <h2>Answer Key</h2>
      <div style="white-space: pre-line;">
        ${answerKey}
      </div>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Format the content first
      const formattedContent = formatPassageContent(streamedContent);

      printWindow.document.write(`
        <html>
          <head>
            <style>
              @page {
                margin: 1in;
                size: letter;
              }
              
              @media print {
                @page {
                  margin: 1in;
                  size: letter;
                }
                head, title, header, footer {
                  display: none !important;
                }
              }

              .markdown-body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              ${markdownStyles}
            </style>
          </head>
          <body>
            <div class="markdown-body">
              ${formattedContent}
            </div>
            <script>
              document.title = '';
              history.replaceState(null, '', ' ');
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const formatPassageContent = (content: string) => {
    // First split out the answer key if it exists
    const [mainContent, answerKeyContent] = content.split('ANSWER_KEY_START');
    
    // Split remaining content into sections
    const sections = mainContent.split('## Questions');
    
    // Process passage section
    const passageParts = sections[0].split('\n');
    const title = passageParts[0].replace(/^# /, '').replace(/\*\*/g, '');
    const passageContent = passageParts
      .slice(1)
      .join('\n')
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.trim()}</p>`)
      .join('\n');

    // Process answer key content
    let formattedAnswerKey = '';
    if (answerKeyContent && showAnswerKey) {
      const answerKeyLines = answerKeyContent.trim().split('\n');
      let answerKeyHtml = '';
      let isInQuestion = false;

      answerKeyLines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'Answer Key' || trimmedLine === '**Answer Key**') {
          return;
        }
        
        if (trimmedLine.startsWith('Question')) {
          isInQuestion = true;
          answerKeyHtml += `<div class="answer-key-item"><strong>${trimmedLine}</strong>`;
        } else if (trimmedLine.startsWith('Explanation:')) {
          answerKeyHtml += `<div class="answer-key-explanation">${trimmedLine}</div>`;
          answerKeyHtml += '</div>';  // Close answer-key-item
          isInQuestion = false;
        } else if (isInQuestion) {
          answerKeyHtml += `<div class="answer-key-text">${trimmedLine}</div>`;
        }
      });
      formattedAnswerKey = answerKeyHtml;
    }

    return `
      <h2 class="passage-title">${title}</h2>
      <div class="passage-content">
        ${passageContent}
      </div>
      <div class="questions-section">
        <h2 class="questions-title">Questions</h2>
        <div class="questions">
          ${sections[1] ? formatQuestions(sections[1]) : ''}
        </div>
      </div>
      ${formattedAnswerKey ? `
        <div class="answer-key-section">
          <h2 class="answer-key-title">Answer Key</h2>
          <div class="answer-key-content">
            ${formattedAnswerKey}
          </div>
        </div>
      ` : ''}
    `;
  };

  const formatQuestions = (questionsText: string) => {
    const lines = questionsText.trim().split('\n');
    let currentQuestion = '';
    let answers: string[] = [];
    let questionsHtml = '';

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^\d+\./)) {
        if (currentQuestion) {
          questionsHtml += formatQuestionBlock(currentQuestion, answers);
          answers = [];
        }
        currentQuestion = trimmedLine;
      } else if (trimmedLine.match(/^[A-D]\./)) {
        answers.push(trimmedLine);
      }
    });

    // Process the last question
    if (currentQuestion) {
      questionsHtml += formatQuestionBlock(currentQuestion, answers);
    }

    return questionsHtml;
  };

  const formatQuestionBlock = (question: string, answers: string[]) => {
    return `
      <div class="question">
        <div class="question-text">${question}</div>
        <div class="answer-choices">
          ${answers.map(answer => `
            <div class="answer-choice">${answer}</div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const formatAnswerKeyContent = (content: string) => {
    return `
      <div class="answer-key-title">Answer Key</div>
      <div class="answer-key-content">${content}</div>
    `;
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDownloadClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDownloadClose = () => {
    setAnchorEl(null);
  };

  const handleDownloadPDF = async () => {
    handleDownloadClose();
    const formattedContent = formatPassageContent(streamedContent);
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

          /* Rest of markdown styles */
          ${markdownStyles}

          /* Question spacing */
          .question {
            margin-bottom: 2.5em;  /* Increased from 2em to create more space between questions */
          }

          .question-text {
            margin-bottom: 1em;
          }

          .answer-choices {
            margin-left: 2em;
            margin-bottom: 1em;  /* Add space after answer choices */
          }

          .answer-choice {
            margin-bottom: 0.5em;
          }

          /* Answer key spacing */
          .answer-key-item {
            margin-bottom: 0.8em;  /* Reduced from 1.5em to bring items closer */
          }

          .answer-key-explanation {
            margin-top: 0.3em;
            margin-bottom: 0.8em;  /* Reduced from 1.5em */
            margin-left: 1em;
          }

          .answer-key-content {
            margin-left: 2em;
            line-height: 1.4;  /* Reduced from 1.8 to tighten spacing */
          }
        </style>
        ${formattedContent}
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `${topic}-passage.pdf`,
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
      let answers: string[] = [];

      questionLines.forEach((line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine.match(/^\d+\./)) {
          if (currentQuestion) {
            rtfContent += `\\b ${currentQuestion}\\b0\\par\\sa180\n`;
            answers.forEach(answer => {
              rtfContent += `\\li720 ${answer}\\par\\sa120\n`;
            });
            rtfContent += '\\par\\sa360\n';  // Extra space between questions
            answers = [];
          }
          currentQuestion = trimmedLine;
        } else if (trimmedLine.match(/^[A-D]\./)) {
          answers.push(trimmedLine);
        }
      });

      // Add last question
      if (currentQuestion) {
        rtfContent += `\\b ${currentQuestion}\\b0\\par\\sa180\n`;
        answers.forEach(answer => {
          rtfContent += `\\li720 ${answer}\\par\\sa120\n`;
        });
        rtfContent += '\\par\\sa360\n';
      }

      // Add answer key if needed
      if (showAnswerKey && answerKeyContent) {
        console.log('Adding answer key section');
        
        rtfContent += `\\page\\pard\\qc\\b\\fs32 Answer Key\\b0\\par\\sa360\\pard\\par\n`;
        
        // Process the answer key content
        const answerKeyLines = answerKeyContent
          .replace('**Answer Key**', '')
          .trim()
          .split('\n');
        
        let currentQuestion = '';
        let currentExplanation = '';
        
        answerKeyLines.forEach((line, index) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          
          if (trimmedLine.startsWith('Question')) {
            // Output previous question/explanation pair if exists
            if (currentQuestion) {
              rtfContent += `\\b ${currentQuestion}\\b0\\par\\sa180\n`;
              if (currentExplanation) {
                rtfContent += `\\li720 ${currentExplanation}\\par\\sa180\n`;
              }
              rtfContent += '\\par\\sa360\n';  // Extra space between questions
            }
            currentQuestion = trimmedLine;
            currentExplanation = '';
          } else if (trimmedLine.startsWith('Explanation:')) {
            currentExplanation = trimmedLine;
          } else if (currentExplanation && !trimmedLine.startsWith('**Answer Key**')) {
            // Append to current explanation
            currentExplanation += ' ' + trimmedLine;
          }
        });

        // Output the last question/explanation pair
        if (currentQuestion) {
          rtfContent += `\\b ${currentQuestion}\\b0\\par\\sa180\n`;
          if (currentExplanation) {
            rtfContent += `\\li720 ${currentExplanation}\\par\\sa180\n`;
          }
          rtfContent += '\\par\\sa360\n';
        }
      }

      console.log('Final RTF content:', rtfContent);

      rtfContent += '}';

      // Create and download Word document
      const blob = new Blob([rtfContent], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${topic}-passage.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating Word document:', error);
      setError('Failed to generate Word document');
    }
  };

  const formatAnswerKeyForPrint = (questions: Question[]) => {
    return `
      <div class="answer-key-section">
        <h2 class="answer-key-title">Answer Key</h2>
        ${questions.map((q, index) => `
          <div class="answer-key-item">
            <div class="answer-number">${index + 1}. ${q.correctAnswer}</div>
            ${q.bloomsLevel ? `
              <div class="answer-detail">Bloom's Level: ${q.bloomsLevel}</div>
            ` : ''}
            ${q.standardReference ? `
              <div class="answer-detail">Standard: ${q.standardReference}</div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  const formatAnswerKey = (answerKeyText: string) => {
    const lines = answerKeyText.trim().split('\n');
    let currentQuestion = '';
    let currentExplanation = '';
    let answerKeyHtml = '';

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine === 'Answer Key' || trimmedLine === '**Answer Key**') {
        return; // Skip the header
      }
      
      if (trimmedLine.startsWith('Question')) {
        // If we have a previous question/explanation pair, add it to the HTML
        if (currentQuestion) {
          answerKeyHtml += `
            <div class="answer-key-item">
              <div class="answer-key-question">${currentQuestion}</div>
              <div class="answer-key-explanation">${currentExplanation}</div>
            </div>
          `;
        }
        currentQuestion = trimmedLine;
        currentExplanation = '';
      } else if (trimmedLine.startsWith('Explanation:')) {
        currentExplanation = trimmedLine;
      } else if (trimmedLine && currentExplanation) {
        // Append additional explanation lines
        currentExplanation += ' ' + trimmedLine;
      }
    });

    // Add the last question/explanation pair
    if (currentQuestion) {
      answerKeyHtml += `
        <div class="answer-key-item">
          <div class="answer-key-question">${currentQuestion}</div>
          <div class="answer-key-explanation">${currentExplanation}</div>
        </div>
      `;
    }

    return answerKeyHtml;
  };

  const handleCloseSuccess = () => {
    setShowSuccessAlert(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
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
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              sx={{ flexGrow: 1 }}
            />
            
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Reading Level</InputLabel>
              <Select
                value={readingLevel}
                onChange={(e: SelectChangeEvent) => setReadingLevel(e.target.value)}
                label="Reading Level"
                required
              >
                {LEXILE_LEVELS.map((level) => (
                  <MenuItem key={level} value={level}>{level}</MenuItem>
                ))}
              </Select>
            </FormControl>

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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={generateQuestions}
                  onChange={(e) => setGenerateQuestions(e.target.checked)}
                />
              }
              label="Generate Questions"
            />
            
            {generateQuestions && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Question Style</InputLabel>
                <Select
                  value={questionStyle}
                  onChange={(e: SelectChangeEvent) => setQuestionStyle(e.target.value)}
                  label="Question Style"
                >
                  <MenuItem value="Generic">Generic</MenuItem>
                  <MenuItem value="STAAR">STAAR</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={isStreaming}
              startIcon={isStreaming ? <CircularProgress size={20} /> : null}
            >
              Generate Passage
            </Button>
            {generateQuestions && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showAnswerKey}
                    onChange={(e) => setShowAnswerKey(e.target.checked)}
                  />
                }
                label="Include Answer Key"
              />
            )}
          </Box>
        </form>
      </Paper>

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

      {streamedContent && questions.length > 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={showAnswerKey ? 8 : 12}>
            <StreamingPassage
              passage={streamedContent}
              questions={questions}
              isLoading={isLoading}
            />
          </Grid>
          {showAnswerKey && questions.length > 0 && (
            <Grid item xs={12} md={4}>
              <AnswerKey questions={questions} />
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="caption" component="div">
                    Debug Info:
                  </Typography>
                  <Typography variant="caption" component="div">
                    Questions: {questions.length}
                  </Typography>
                  <Typography variant="caption" component="div">
                    Show Answer Key: {showAnswerKey.toString()}
                  </Typography>
                  <Typography variant="caption" component="div">
                    Generate Questions: {generateQuestions.toString()}
                  </Typography>
                  {/* Add answer key debug info */}
                  <Typography variant="caption" component="div">
                    Answer Key Present: {Boolean(answerKey).toString()}
                  </Typography>
                </Box>
              )}
            </Grid>
          )}
        </Grid>
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

export default Passages; 