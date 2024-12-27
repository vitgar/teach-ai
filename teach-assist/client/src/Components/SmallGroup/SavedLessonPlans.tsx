import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Collapse,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Menu,
  MenuItem as MuiMenuItem,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useTeacher } from '../../context/TeacherContext';
import apiAxiosInstance from "../../utils/axiosInstance";
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';

interface SavedLessonPlan {
  _id: string;
  standard: {
    code: string;
    description: string;
  };
  story: {
    title: string;
    content: string;
  };
  lexileLevel: string;
  sections: {
    warmUp: string;
    introductionAndGuidedPractice: string;
    independentPractice: string;
    checkingComprehension: string;
  };
  createdAt: string;
}

interface RowProps {
  lessonPlan: SavedLessonPlan;
  onDelete: (id: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const Row: React.FC<RowProps> = ({ lessonPlan, onDelete, error, setError }) => {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDelete = async (lessonPlanId: string) => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await apiAxiosInstance.delete(`/api/small-group-lesson-plans/${lessonPlan._id}`);
      onDelete(lessonPlan._id);
      setError(null);
    } catch (error) {
      console.error('Error deleting lesson plan:', error);
      setError('Failed to delete lesson plan');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatMarkdownContent = (content: string) => {
    return content
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '')   // Remove italic markers
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/`/g, '')    // Remove code markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just text
      .replace(/\n\n/g, '\\par\\par ') // Convert double newlines to RTF paragraphs
      .replace(/\n/g, '\\line ') // Convert single newlines to RTF line breaks
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  const formatHtmlContent = (content: string) => {
    return content
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '')   // Remove italic markers
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/`/g, '')    // Remove code markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just text
      .replace(/\n\n/g, '</p><p>') // Convert double newlines to paragraphs
      .replace(/\n/g, '<br>') // Convert single newlines to line breaks
      .trim();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Lesson Plan - ${lessonPlan.story.title}</title>
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
              }

              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }

              h1, h2 {
                color: #1976d2;
                margin-top: 2em;
                margin-bottom: 1em;
              }

              .story-content {
                background-color: #f5f5f5;
                padding: 1em;
                margin: 1em 0;
                border-radius: 4px;
                white-space: pre-wrap;
                word-wrap: break-word;
              }

              .section {
                margin-bottom: 2em;
                page-break-inside: avoid;
              }

              .section-content {
                white-space: pre-wrap;
                word-wrap: break-word;
              }

              p {
                margin: 1em 0;
              }
            </style>
          </head>
          <body>
            <h1>Lesson Plan: ${lessonPlan.story.title}</h1>
            ${lessonPlan.standard.code ? `
              <div style="margin-bottom: 2em;">
                <strong>Standard:</strong> ${lessonPlan.standard.code}
                ${lessonPlan.standard.description ? `<br><em>${lessonPlan.standard.description}</em>` : ''}
              </div>
            ` : ''}

            <div class="section">
              <h2>Story: ${lessonPlan.story.title}</h2>
              <div class="story-content">${lessonPlan.story.content}</div>
            </div>

            <div class="section">
              <h2>Warm Up</h2>
              <div class="section-content"><p>${formatHtmlContent(lessonPlan.sections.warmUp)}</p></div>
            </div>

            <div class="section">
              <h2>Introduction and Guided Practice</h2>
              <div class="section-content"><p>${formatHtmlContent(lessonPlan.sections.introductionAndGuidedPractice)}</p></div>
            </div>

            <div class="section">
              <h2>Independent Practice</h2>
              <div class="section-content"><p>${formatHtmlContent(lessonPlan.sections.independentPractice)}</p></div>
            </div>

            <div class="section">
              <h2>Checking Comprehension</h2>
              <div class="section-content"><p>${formatHtmlContent(lessonPlan.sections.checkingComprehension)}</p></div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const handleDownloadClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDownloadClose = () => {
    setAnchorEl(null);
  };

  const handleDownloadPDF = async () => {
    handleDownloadClose();
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <style>
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              display: block;
              position: relative;
              margin: 15px 0;
            }
            h2 {
              page-break-after: avoid !important;
              break-after: avoid !important;
              margin: 0 0 10px 0 !important;
              padding: 0 !important;
            }
            .content-wrapper {
              page-break-before: avoid !important;
              break-before: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .content {
              page-break-before: avoid !important;
              break-before: avoid !important;
              white-space: pre-wrap;
              word-wrap: break-word;
              line-height: 1.6;
            }
            p {
              orphans: 3;
              widows: 3;
              margin: 0 0 10px 0;
            }
          }
        </style>
        <h1 style="color: #1976d2; margin: 0 0 20px 0;">Lesson Plan: ${lessonPlan.story.title}</h1>
        ${lessonPlan.standard.code ? `
          <div style="margin: 0 0 20px 0;">
            <strong>Standard:</strong> ${lessonPlan.standard.code}
            ${lessonPlan.standard.description ? `<br><em>${lessonPlan.standard.description}</em>` : ''}
          </div>
        ` : ''}

        <div class="section">
          <h2 style="color: #1976d2;">Story: ${lessonPlan.story.title}</h2>
          <div class="content-wrapper">
            <div class="content" style="background-color: #f5f5f5; padding: 15px; border-radius: 4px;">
              ${lessonPlan.story.content}
            </div>
          </div>
        </div>

        <div class="section">
          <h2 style="color: #1976d2;">Warm Up</h2>
          <div class="content-wrapper">
            <div class="content">${formatHtmlContent(lessonPlan.sections.warmUp)}</div>
          </div>
        </div>

        <div class="section">
          <h2 style="color: #1976d2;">Introduction and Guided Practice</h2>
          <div class="content-wrapper">
            <div class="content">${formatHtmlContent(lessonPlan.sections.introductionAndGuidedPractice)}</div>
          </div>
        </div>

        <div class="section">
          <h2 style="color: #1976d2;">Independent Practice</h2>
          <div class="content-wrapper">
            <div class="content">${formatHtmlContent(lessonPlan.sections.independentPractice)}</div>
          </div>
        </div>

        <div class="section">
          <h2 style="color: #1976d2;">Checking Comprehension</h2>
          <div class="content-wrapper">
            <div class="content">${formatHtmlContent(lessonPlan.sections.checkingComprehension)}</div>
          </div>
        </div>
      </div>
    `;

    const opt = {
      margin: 0.75,
      filename: `lesson-plan-${lessonPlan.story.title}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { 
        mode: ['avoid-all'],
        before: '.section',
        avoid: ['h2', '.content-wrapper', '.content']
      }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF');
    }
  };

  const handleDownloadWord = () => {
    handleDownloadClose();
    try {
      let rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}
{\\colortbl;\\red25\\green118\\blue210;}

\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440
\\widowctrl\\ftnbj\\aenddoc\\wrapdefault\\adjustright

\\pard\\qc\\b\\fs36 Lesson Plan: ${lessonPlan.story.title}\\par
${lessonPlan.standard.code ? `\\pard\\sa360\\fs24\\b Standard: ${lessonPlan.standard.code}\\par` : ''}
${lessonPlan.standard.description ? `\\pard\\sa360\\fs24\\i ${lessonPlan.standard.description}\\i0\\par` : ''}

\\pard\\qc\\b\\fs32 Story: ${lessonPlan.story.title}\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${lessonPlan.story.content}\\par

\\pard\\qc\\b\\fs32 Warm Up\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${formatMarkdownContent(lessonPlan.sections.warmUp)}\\par

\\pard\\qc\\b\\fs32 Introduction and Guided Practice\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${formatMarkdownContent(lessonPlan.sections.introductionAndGuidedPractice)}\\par

\\pard\\qc\\b\\fs32 Independent Practice\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${formatMarkdownContent(lessonPlan.sections.independentPractice)}\\par

\\pard\\qc\\b\\fs32 Checking Comprehension\\par
\\pard\\sa360\\fs24\\b0\\sl480\\slmult1 ${formatMarkdownContent(lessonPlan.sections.checkingComprehension)}\\par
}`;

      const blob = new Blob([rtfContent], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `lesson-plan-${lessonPlan.story.title}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating Word document:', error);
      setError('Failed to generate Word document');
    }
  };

  return (
    <>
      <TableRow 
        sx={{ 
          '& > *': { borderBottom: 'unset' },
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'action.hover' }
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
            {lessonPlan.standard.code}
          </Typography>
          <Typography variant="body2">
            {lessonPlan.standard.description}
          </Typography>
        </TableCell>
        <TableCell>{lessonPlan.story.title}</TableCell>
        <TableCell>{lessonPlan.lexileLevel}</TableCell>
        <TableCell>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(lessonPlan._id);
            }}
            color="error"
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div" color="primary">
                Lesson Plan Details
              </Typography>
              
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint();
                  }}
                >
                  Print
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadClick(e);
                  }}
                >
                  Download
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                {/* Story */}
                <Grid item xs={12}>
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
                </Grid>

                {/* Warm Up */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Warm Up
                    </Typography>
                    <ReactMarkdown>{lessonPlan.sections.warmUp}</ReactMarkdown>
                  </Paper>
                </Grid>

                {/* Introduction and Guided Practice */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Introduction and Guided Practice
                    </Typography>
                    <ReactMarkdown>{lessonPlan.sections.introductionAndGuidedPractice}</ReactMarkdown>
                  </Paper>
                </Grid>

                {/* Independent Practice */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Independent Practice
                    </Typography>
                    <ReactMarkdown>{lessonPlan.sections.independentPractice}</ReactMarkdown>
                  </Paper>
                </Grid>

                {/* Checking Comprehension */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Checking Comprehension
                    </Typography>
                    <ReactMarkdown>{lessonPlan.sections.checkingComprehension}</ReactMarkdown>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Lesson Plan</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this lesson plan? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
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
    </>
  );
};

const SavedLessonPlans: React.FC = () => {
  const { teacher } = useTeacher();
  const [lessonPlans, setLessonPlans] = useState<SavedLessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessonPlans = async () => {
      try {
        setLoading(true);
        const response = await apiAxiosInstance.get('/api/small-group-lesson-plans');
        setLessonPlans(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching lesson plans:', error);
        setError('Failed to load lesson plans');
      } finally {
        setLoading(false);
      }
    };

    if (teacher?._id) {
      fetchLessonPlans();
    }
  }, [teacher]);

  const handleDelete = (deletedId: string) => {
    setLessonPlans(prev => prev.filter(plan => plan._id !== deletedId));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Saved Lesson Plans
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table aria-label="collapsible table">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Standard</TableCell>
              <TableCell>Book Title</TableCell>
              <TableCell>Lexile Level</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lessonPlans.map((lessonPlan) => (
              <Row 
                key={lessonPlan._id} 
                lessonPlan={lessonPlan} 
                onDelete={handleDelete}
                error={error}
                setError={setError}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SavedLessonPlans; 