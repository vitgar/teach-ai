import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Tooltip,
  IconButton,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import { StudentWithGuidedReading } from "@/Types/StudentWithGuidedReading";
import { aiAxiosInstance } from "../../utils/axiosInstance";
import MagicWandIcon from "@mui/icons-material/AutoFixHigh";

interface StudentTableProps {
  students: StudentWithGuidedReading[];
  onUpdateStudent: (
    studentId: string,
    field: "activity" | "comments",
    value: string
  ) => void;
}

export const StudentTableWithGuidedReading: React.FC<StudentTableProps> = ({
  students,
  onUpdateStudent,
}) => {
  const [loadingStates, setLoadingStates] = React.useState<{
    [studentId: string]: { [field: string]: boolean };
  }>({});

  const handleAIImprove = async (
    studentId: string,
    field: "activity" | "comments",
    value: string
  ) => {
    if (!value.trim()) return;

    setLoadingStates((prevState) => ({
      ...prevState,
      [studentId]: {
        ...prevState[studentId],
        [field]: true,
      },
    }));

    try {
      const improvedText = await improveTextWithAI(value);
      onUpdateStudent(studentId, field, improvedText);
    } catch (error) {
      console.error("Error improving text with AI:", error);
      alert("Failed to improve text with AI. Please try again.");
    } finally {
      setLoadingStates((prevState) => ({
        ...prevState,
        [studentId]: {
          ...prevState[studentId],
          [field]: false,
        },
      }));
    }
  };

  const improveTextWithAI = async (text: string): Promise<string> => {
    try {
      const response = await aiAxiosInstance.post<{ improved_text: string }>(
        "/improve-intervention",
        {
          text: text,
        }
      );
      return response.data.improved_text;
    } catch (error) {
      console.error("Error calling AI backend:", error);
      throw error;
    }
  };

  return (
    <TableContainer component={Paper} sx={{ mt: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width="15%">Student</TableCell>
            <TableCell width="42.5%">Activity</TableCell>
            <TableCell width="42.5%">Comments</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student._id}>
              {/* Student Name - Now stacked */}
              <TableCell>
                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                  {student.firstName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {student.lastName}
                </Typography>
              </TableCell>

              {/* Activity Field with AI Improvement */}
              <TableCell>
                <Box display="flex" alignItems="flex-start">
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    variant="outlined"
                    placeholder="Enter activity"
                    value={student.activity}
                    onChange={(e) =>
                      onUpdateStudent(student._id, "activity", e.target.value)
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "background.paper",
                      },
                    }}
                  />
                  <Tooltip title="Improve with AI">
                    <IconButton
                      onClick={() =>
                        handleAIImprove(
                          student._id,
                          "activity",
                          student.activity
                        )
                      }
                      size="small"
                      sx={{
                        ml: 1,
                        mt: 1,
                        backgroundColor: "rgba(255, 255, 255, 0.7)",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 1)",
                        },
                      }}
                      aria-label={`Improve activity for ${student.firstName} ${student.lastName}`}
                    >
                      {loadingStates[student._id]?.activity ? (
                        <CircularProgress size={20} />
                      ) : (
                        <MagicWandIcon color="primary" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>

              {/* Comments Field with AI Improvement */}
              <TableCell>
                <Box display="flex" alignItems="flex-start">
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    variant="outlined"
                    placeholder="Enter comments"
                    value={student.comments}
                    onChange={(e) =>
                      onUpdateStudent(student._id, "comments", e.target.value)
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "background.paper",
                      },
                    }}
                  />
                  <Tooltip title="Improve with AI">
                    <IconButton
                      onClick={() =>
                        handleAIImprove(
                          student._id,
                          "comments",
                          student.comments
                        )
                      }
                      size="small"
                      sx={{
                        ml: 1,
                        mt: 1,
                        backgroundColor: "rgba(255, 255, 255, 0.7)",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 1)",
                        },
                      }}
                      aria-label={`Improve comments for ${student.firstName} ${student.lastName}`}
                    >
                      {loadingStates[student._id]?.comments ? (
                        <CircularProgress size={20} />
                      ) : (
                        <MagicWandIcon color="primary" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
