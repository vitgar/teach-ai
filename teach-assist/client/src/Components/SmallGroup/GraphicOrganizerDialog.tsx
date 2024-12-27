import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { jsPDF } from 'jspdf';

interface GraphicOrganizerDialogProps {
  open: boolean;
  onClose: () => void;
  content: string;
}

const GraphicOrganizerDialog: React.FC<GraphicOrganizerDialogProps> = ({ 
  open, 
  onClose, 
  content 
}) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Graphic Organizer</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              h2 { 
                color: #333;
                margin-bottom: 15px;
              }
              .instructions {
                font-style: italic;
                color: #666;
                margin-bottom: 20px;
              }
              .section {
                margin-bottom: 25px;
              }
              .section-title {
                font-weight: bold;
                margin-bottom: 10px;
              }
              .section-content {
                margin-left: 20px;
              }
            </style>
          </head>
          <body>
            <div>${content.replace(/\n/g, '<br>')}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Graphic Organizer", 20, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const splitText = doc.splitTextToSize(content, 170);
    doc.text(splitText, 20, 40);
    
    doc.save('graphic-organizer.pdf');
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
          Graphic Organizer
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
          component="div"
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
          onClick={handleDownload} 
          startIcon={<DownloadIcon />}
          variant="contained"
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GraphicOrganizerDialog; 