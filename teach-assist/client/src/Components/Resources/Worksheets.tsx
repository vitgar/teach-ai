import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Send as SendIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { useTeacher } from '../../context/TeacherContext';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Components } from 'react-markdown';
import aiAxiosInstance from '../../utils/axiosInstance';
import './worksheet-styles.css';
import ReactDOMServer from 'react-dom/server';

const WORKSHEET_TYPES = [
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'comprehension', label: 'Reading Comprehension' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'writing', label: 'Writing' },
  { value: 'phonics', label: 'Phonics' },
  { value: 'spelling', label: 'Spelling' },
];

interface WorksheetContent {
  worksheet: string;
  answerKey: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface MarkdownProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

const Worksheets: React.FC = () => {
  const { teacher } = useTeacher();
  const [worksheetType, setWorksheetType] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<WorksheetContent>({
    worksheet: '',
    answerKey: '',
  });
  const [activeTab, setActiveTab] = useState(0);
  const worksheetRef = useRef<HTMLDivElement>(null);
  const answerKeyRef = useRef<HTMLDivElement>(null);

  const renderMarkdownContent = (content: string) => {
    return ReactDOMServer.renderToString(
      <div className="worksheet-container">
        <ReactMarkdown components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const worksheetHtml = renderMarkdownContent(content.worksheet);
    const answerKeyHtml = renderMarkdownContent(content.answerKey);

    printWindow.document.write(`
      <html>
        <head>
          <title>Worksheet with Answer Key</title>
          <style>
            ${document.querySelector('style[data-jss]')?.innerHTML || ''}
            
            body { 
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }

            .worksheet-container {
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }

            h1 { font-size: 24px; margin-bottom: 20px; text-align: center; }
            h2 { font-size: 20px; margin: 20px 0; }
            h3 { font-size: 18px; margin: 16px 0; }
            p { margin-bottom: 16px; line-height: 1.6; }
            
            .multiple-choice {
              margin-bottom: 24px;
            }
            
            .choice {
              padding-left: 32px;
              margin-bottom: 12px;
            }

            ul, ol {
              margin-bottom: 16px;
              padding-left: 24px;
            }

            li {
              margin-bottom: 8px;
            }

            @media print {
              .answer-key {
                page-break-before: always;
              }
              
              .multiple-choice {
                page-break-inside: avoid;
              }

              @page {
                margin: 1in;
                size: portrait;
              }
            }
          </style>
        </head>
        <body>
          <div class="worksheet-container">
            ${worksheetHtml}
          </div>
          <div class="worksheet-container answer-key">
            ${answerKeyHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownload = async () => {
    try {
      // Create separate containers for worksheet and answer key
      const worksheetContainer = document.createElement('div');
      const answerKeyContainer = document.createElement('div');
      
      worksheetContainer.style.width = '800px';
      worksheetContainer.style.position = 'absolute';
      worksheetContainer.style.left = '-9999px';
      worksheetContainer.style.backgroundColor = 'white';
      
      answerKeyContainer.style.width = '800px';
      answerKeyContainer.style.position = 'absolute';
      answerKeyContainer.style.left = '-9999px';
      answerKeyContainer.style.backgroundColor = 'white';

      const styles = `
        <style>
          ${document.querySelector('style[data-jss]')?.innerHTML || ''}
          
          .content-container {
            padding: 40px;
            font-family: Arial, sans-serif;
            background-color: white;
          }

          h1 { font-size: 24px; margin-bottom: 20px; text-align: center; }
          h2 { font-size: 20px; margin: 20px 0; }
          h3 { font-size: 18px; margin: 16px 0; }
          p { margin-bottom: 16px; line-height: 1.6; }
          
          .multiple-choice {
            margin-bottom: 32px;
            page-break-inside: avoid;
          }

          ol {
            margin-bottom: 16px;
            padding-left: 40px;
            counter-reset: item;
            list-style-type: none;
          }

          ol li {
            margin-bottom: 32px;  /* Increased space between questions */
            position: relative;
            padding-left: 40px;
          }

          /* Custom numbering with proper spacing */
          ol li:before {
            content: counter(item) ".";
            counter-increment: item;
            position: absolute;
            left: -20px;
            width: 40px;
            text-align: right;
            padding-right: 16px;
          }

          /* Question text styling */
          ol li p:first-child {
            display: block;  /* Changed to block for vertical layout */
            margin: 0 0 16px 0;  /* Added bottom margin */
            padding-left: 8px;
          }

          /* Choice container */
          .choices {
            display: flex;
            flex-direction: column;
            margin-top: 16px;
            margin-left: 40px;  /* Indent choices */
          }

          /* Individual choice styling */
          .choice {
            display: block;
            margin-bottom: 16px;  /* Space between choices */
            padding-left: 0;
          }

          /* Choice text */
          .choice p {
            margin: 0;
            padding-left: 8px;
          }

          /* Answer options letters */
          .choice:before {
            content: attr(data-letter);
            width: 24px;
            display: inline-block;
          }
        </style>
      `;

      // Set up worksheet container
      worksheetContainer.innerHTML = `
        ${styles}
        <div class="content-container">
          ${renderMarkdownContent(content.worksheet)}
        </div>
      `;

      // Set up answer key container
      answerKeyContainer.innerHTML = `
        ${styles}
        <div class="content-container">
          ${renderMarkdownContent(content.answerKey)}
        </div>
      `;

      document.body.appendChild(worksheetContainer);
      document.body.appendChild(answerKeyContainer);

      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;

        // Process worksheet
        const worksheetCanvas = await html2canvas(worksheetContainer.querySelector('.content-container') as HTMLElement, {
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          windowWidth: 800,
          height: worksheetContainer.scrollHeight,
        });

        const contentWidth = pageWidth - (2 * margin);
        const worksheetHeight = (worksheetCanvas.height * contentWidth) / worksheetCanvas.width;
        
        let remainingHeight = worksheetHeight;
        let sourceY = 0;
        const sourceWidth = worksheetCanvas.width;
        const sourceHeight = (pageHeight - 2 * margin) * (worksheetCanvas.width / contentWidth);

        // Add worksheet pages
        while (remainingHeight > 0) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = worksheetCanvas.width;
          tempCanvas.height = Math.min(sourceHeight, remainingHeight * (worksheetCanvas.width / contentWidth));
          const ctx = tempCanvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            ctx.drawImage(
              worksheetCanvas,
              0,
              sourceY,
              sourceWidth,
              Math.min(sourceHeight, remainingHeight * (worksheetCanvas.width / contentWidth)),
              0,
              0,
              sourceWidth,
              Math.min(sourceHeight, remainingHeight * (worksheetCanvas.width / contentWidth))
            );

            const imgData = tempCanvas.toDataURL('image/jpeg', 1.0);
            if (sourceY > 0) {
              pdf.addPage();
            }

            pdf.addImage(
              imgData,
              'JPEG',
              margin,
              margin,
              contentWidth,
              Math.min(pageHeight - (2 * margin), remainingHeight)
            );

            sourceY += sourceHeight;
            remainingHeight -= pageHeight - (2 * margin);
          }
        }

        // Always add a new page for answer key
        pdf.addPage();

        // Process answer key
        const answerKeyCanvas = await html2canvas(answerKeyContainer.querySelector('.content-container') as HTMLElement, {
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          windowWidth: 800,
          height: answerKeyContainer.scrollHeight,
        });

        const answerKeyHeight = (answerKeyCanvas.height * contentWidth) / answerKeyCanvas.width;
        remainingHeight = answerKeyHeight;
        sourceY = 0;

        // Add answer key pages
        while (remainingHeight > 0) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = answerKeyCanvas.width;
          tempCanvas.height = Math.min(sourceHeight, remainingHeight * (answerKeyCanvas.width / contentWidth));
          const ctx = tempCanvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            ctx.drawImage(
              answerKeyCanvas,
              0,
              sourceY,
              sourceWidth,
              Math.min(sourceHeight, remainingHeight * (answerKeyCanvas.width / contentWidth)),
              0,
              0,
              sourceWidth,
              Math.min(sourceHeight, remainingHeight * (answerKeyCanvas.width / contentWidth))
            );

            const imgData = tempCanvas.toDataURL('image/jpeg', 1.0);
            if (sourceY > 0) {
              pdf.addPage();
            }

            pdf.addImage(
              imgData,
              'JPEG',
              margin,
              margin,
              contentWidth,
              Math.min(pageHeight - (2 * margin), remainingHeight)
            );

            sourceY += sourceHeight;
            remainingHeight -= pageHeight - (2 * margin);
          }
        }

        pdf.save('worksheet-with-answers.pdf');
      } finally {
        document.body.removeChild(worksheetContainer);
        document.body.removeChild(answerKeyContainer);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const handleGenerate = async () => {
    if (!worksheetType || !prompt.trim()) {
      setError('Please select a worksheet type and enter a description');
      return;
    }

    setLoading(true);
    setError(null);
    setContent({ worksheet: '', answerKey: '' });
    let fullContent = '';

    try {
      const response = await fetch('http://localhost:5001/generate-worksheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          worksheetType,
          prompt,
          teacherGrade: teacher?.gradeLevel,
          teachingStandards: teacher?.teachingStandards
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.error) {
              setError(data.error);
              break;
            }

            if (data.done && data.fullContent) {
              fullContent = data.fullContent;
            } else {
              fullContent += data.content || '';
            }

            // Split content when we have the full content
            if (data.done) {
              const parts = fullContent.split('[[ANSWER_KEY_START]]');
              setContent({
                worksheet: parts[0]?.trim() || '',
                answerKey: parts[1]?.trim() || ''
              });
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }

      // Clear inputs after successful generation
      setPrompt('');
      setWorksheetType('');
    } catch (err) {
      console.error('Error generating worksheet:', err);
      setError('Failed to generate worksheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markdownComponents: Partial<Components> = {
    h1: ({ children, ...props }: MarkdownProps) => (
      <Typography variant="h4" component="h1" gutterBottom {...props}>
        {children}
      </Typography>
    ),
    h2: ({ children, ...props }: MarkdownProps) => (
      <Typography variant="h5" component="h2" gutterBottom {...props}>
        {children}
      </Typography>
    ),
    h3: ({ children, ...props }: MarkdownProps) => (
      <Typography variant="h6" component="h3" gutterBottom {...props}>
        {children}
      </Typography>
    ),
    p: ({ children, ...props }: MarkdownProps) => {
      // Check if this is a multiple choice option
      const isMultipleChoice = typeof children === 'string' && /^[a-d]\)/.test(children);
      
      return (
        <Typography 
          variant="body1" 
          component="p" 
          paragraph
          sx={{
            ...(isMultipleChoice && {
              pl: 4,  // Indent choices
              mb: 2,  // Add space between choices
              '&:last-child': {
                mb: 4,  // Add extra space after last choice
              }
            })
          }}
          {...props}
        >
          {children}
        </Typography>
      );
    },
    li: ({ children, ...props }: MarkdownProps) => (
      <li {...props}>
        <Typography variant="body1" component="span">
          {children}
        </Typography>
      </li>
    ),
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        position: 'relative',
      }}
    >
      {/* Content Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          backgroundColor: '#f5f5f5',
        }}
      >
        {(content.worksheet || content.answerKey) && (
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
              >
                Download PDF
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
              >
                Print
              </Button>
            </Box>

            <Paper elevation={3} sx={{ p: 3 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, newValue) => setActiveTab(newValue)}
                  sx={{ mb: 2 }}
                >
                  <Tab label="Worksheet" />
                  <Tab label="Answer Key" />
                </Tabs>
              </Box>

              <TabPanel value={activeTab} index={0}>
                <div ref={worksheetRef}>
                  <ReactMarkdown components={markdownComponents}>
                    {content.worksheet}
                  </ReactMarkdown>
                </div>
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                <div ref={answerKeyRef} className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={markdownComponents}
                  >
                    {content.answerKey}
                  </ReactMarkdown>
                </div>
              </TabPanel>
            </Paper>
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, maxWidth: 800, mx: 'auto' }}
          >
            {error}
          </Alert>
        )}
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          p: 2,
          backgroundColor: 'white',
          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
        }}
      >
        <Box
          sx={{
            maxWidth: 800,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <TextField
            select
            label="Worksheet Type"
            value={worksheetType}
            onChange={(e) => setWorksheetType(e.target.value)}
            sx={{
              minWidth: 200,
            }}
          >
            {WORKSHEET_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want in the worksheet (e.g., 'Create a vocabulary worksheet about weather terms with matching exercises')"
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    variant="contained"
                    onClick={handleGenerate}
                    disabled={loading || !prompt.trim() || !worksheetType}
                    sx={{
                      height: '40px',
                      borderRadius: '20px',
                      px: 3,
                      minWidth: '40px',
                      backgroundColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <SendIcon />
                    )}
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                pr: 1,
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Worksheets;
