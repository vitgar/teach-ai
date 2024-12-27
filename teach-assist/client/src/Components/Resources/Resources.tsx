import React, { useRef } from "react";
import {
  Box,
  Typography,
  Button,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useReactToPrint } from "react-to-print";
import html2pdf from "html2pdf.js";

interface Resource {
  type: string;
  title: string;
  content: string;
  metadata?: {
    instructions?: string;
    grade_level?: string;
    subject?: string;
    [key: string]: any;
  };
}

interface ResourceDisplayProps {
  resources: Resource[];
  onDownloadResource: (resource: Resource) => void;
  onPrintResource: () => void;
}

export const ResourceDisplay: React.FC<ResourceDisplayProps> = ({
  resources,
  onDownloadResource,
  onPrintResource,
}) => {
  const resourceRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => resourceRef.current,
    documentTitle: "Resource",
    pageStyle: `
      @page {
        size: auto;
        margin: 20mm;
      }
    `,
  });

  const handleDownload = () => {
    if (resourceRef.current) {
      const element = resourceRef.current;
      const options = {
        margin: 0.5,
        filename: "resource.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };
      html2pdf().set(options).from(element).save();
    }
  };

  // Only display the first resource
  const resource = resources[0];

  if (!resource) {
    return <Typography>No resource available.</Typography>;
  }

  return (
    <Box sx={{ mt: 2 }} ref={resourceRef}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleDownload}
        >
          Download PDF
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={handlePrint}
        >
          Print
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {resource.content}
        </ReactMarkdown>
      </Box>
    </Box>
  );
};
