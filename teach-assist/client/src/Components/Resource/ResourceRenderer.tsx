// src/Components/Resource/ResourceRenderer.tsx
import { Typography } from "@mui/material";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ResourceProps {
  resource: {
    type: string;
    title: string;
    content: string;
    metadata?: any;
  };
}

export const ResourceRenderer: React.FC<ResourceProps> = ({ resource }) => {
  return (
    <div style={{ marginBottom: "20px" }}>
      <Typography variant="h6">{resource.title}</Typography>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {resource.content}
      </ReactMarkdown>
    </div>
  );
};
