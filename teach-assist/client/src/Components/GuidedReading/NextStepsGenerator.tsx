// src/components/GuidedReading/NextStepsGenerator.tsx

import React from "react";
import { CircularProgress, Tooltip, IconButton } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"; // MUI icon
import { improveText } from "../../utils/aiHelpers";

interface NextStepsGeneratorProps {
  nextSteps: string;
  setNextSteps: (value: string) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
}

const NextStepsGenerator: React.FC<NextStepsGeneratorProps> = ({
  nextSteps,
  setNextSteps,
  loading,
  setLoading,
}) => {
  const handleAIImprove = async () => {
    if (!nextSteps.trim()) return;

    setLoading(true);

    try {
      const improvedText = await improveText(nextSteps);
      setNextSteps(improvedText);
    } catch (error) {
      console.error("Error improving next steps:", error);
      alert("Failed to improve next steps. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Improve Next Steps with AI">
      <IconButton onClick={handleAIImprove}>
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <AutoAwesomeIcon color="primary" />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default NextStepsGenerator;
