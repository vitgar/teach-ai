import React, { useState, useEffect } from "react";
import CircularProgress from "@mui/material/CircularProgress"; // Ensure you have @mui/material installed
import "./ProgressWithText.css"; // Import the CSS file

interface ProgressWithTextProps {
  isLessonDone: boolean;
  isResourceDone: boolean;
}

const ProgressWithText: React.FC<ProgressWithTextProps> = ({
  isLessonDone,
  isResourceDone,
}) => {
  const [statusText, setStatusText] = useState("Generating Lesson");
  useEffect(() => {
    if (isLessonDone && !isResourceDone) {
      setStatusText("Generating Resource");
    } else if (isLessonDone && isResourceDone) {
      setStatusText("Done");
    }
  }, [isLessonDone, isResourceDone]);
  return (
    <div className="container">
      {!isResourceDone || !isLessonDone ? (
        <>
          <CircularProgress />
          <div className="textContainer">
            <span className="progressText">{statusText}</span>
          </div>
        </>
      ) : undefined}
    </div>
  );
};

export default ProgressWithText;
