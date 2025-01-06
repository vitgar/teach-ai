import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
// @ts-ignore
import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';

interface StoryDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

const StoryDialog: React.FC<StoryDialogProps> = ({ open, onClose, title, content }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.6;
              }
              h1 { 
                text-align: center;
                font-weight: bold;
                font-size: 24px;
                margin-bottom: 20px;
                color: #333;
              }
              p { 
                line-height: 1.8;
                font-size: 16px;
                color: #444;
                margin: 1em 0;
              }
              @media print {
                body {
                  padding: 0;
                }
                h1 {
                  margin-top: 0;
                }
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div>${content.split('\n').map(paragraph => `<p>${paragraph}</p>`).join('')}</div>
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
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            text-align: center;
            font-weight: bold;
            font-size: 24px;
            margin: 1.5em 0;
            color: #333;
          }
          p {
            margin: 1em 0;
            line-height: 1.8;
            font-size: 16px;
          }
        </style>
        <h1>${title}</h1>
        ${content.split('\n').map(paragraph => `<p>${paragraph}</p>`).join('')}
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      const worker = html2pdf();
      await worker
        .set(opt)
        .from(element)
        .save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleDownloadWord = () => {
    handleDownloadClose();
    try {
      // Create RTF content with proper formatting
      let rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}
{\\colortbl;\\red0\\green0\\blue0;}

\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440

\\pard\\qc\\b\\fs36 ${title}\\par
\\pard\\sa360\\par

\\pard\\sa360\\fs28\\b0 ${content.split('\n').map(paragraph => paragraph.trim()).join('\\par\\sa360 ')}\\par
}`;

      // Create and download Word document
      const blob = new Blob([rtfContent], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error generating Word document:', error);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          padding: 2
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, pr: 6 }}>
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            fontWeight: 'bold',
            color: 'primary.main'
          }}
        >
          {title}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: 'grey.500'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 4, py: 3 }}>
        <Typography 
          variant="body1" 
          sx={{ 
            lineHeight: 1.8,
            fontSize: '1.1rem',
            color: 'text.primary',
            whiteSpace: 'pre-line'
          }}
        >
          {content}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handlePrint} 
          startIcon={<PrintIcon />}
          variant="outlined"
          sx={{ mr: 1 }}
        >
          Print
        </Button>
        <Button 
          onClick={handleDownloadClick} 
          startIcon={<DownloadIcon />}
          variant="contained"
          aria-controls="download-menu"
          aria-haspopup="true"
        >
          Download
        </Button>
      </DialogActions>

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
        <MenuItem onClick={handleDownloadPDF}>
          <PictureAsPdfIcon sx={{ mr: 1 }} />
          PDF
        </MenuItem>
        <MenuItem onClick={handleDownloadWord}>
          <DescriptionIcon sx={{ mr: 1 }} />
          Word
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default StoryDialog; 