import React, { useState } from "react";
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
  CircularProgress, // Import CircularProgress
} from "@mui/material";
import { StudentWithIntervention } from "@/Types/StudentWithIntervention";
import { aiAxiosInstance } from "../../utils/axiosInstance";

interface StudentTableProps {
  students: StudentWithIntervention[];
  onUpdateStudent: (studentId: string, field: string, value: string) => void;
}

export const StudentTableWithIntervention: React.FC<StudentTableProps> = ({
  students,
  onUpdateStudent,
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Add loadingStates state to track loading per student and field
  const [loadingStates, setLoadingStates] = useState<{
    [studentId: string]: { [field: string]: boolean };
  }>({});

  const handleRowClick = (studentId: string) => {
    setExpandedRow(expandedRow === studentId ? null : studentId);
  };

  const handleInputChange = (
    studentId: string,
    field: string,
    value: string
  ) => {
    console.log("Updating...", field, value);
    onUpdateStudent(studentId, field, value);
  };

  const handleAIImprove = async (
    studentId: string,
    field: string,
    value: string
  ) => {
    console.log("Improving with AI...", field, value);

    // Set loading state to true
    setLoadingStates((prevState) => ({
      ...prevState,
      [studentId]: {
        ...prevState[studentId],
        [field]: true,
      },
    }));

    try {
      const improvedText = await improveInterventionText(value);
      console.log("Improved with AI...", improvedText);
      onUpdateStudent(studentId, field, improvedText);
    } catch (error) {
      console.error("Error improving text with AI:", error);
      // Handle the error appropriately, e.g., show a notification to the user
    } finally {
      // Set loading state to false
      setLoadingStates((prevState) => ({
        ...prevState,
        [studentId]: {
          ...prevState[studentId],
          [field]: false,
        },
      }));
    }
  };

  // Function to call the AI backend to improve intervention text
  const improveInterventionText = async (text: string): Promise<string> => {
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
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>Intervention</TableCell>
            <TableCell>Intervention Results</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student) => (
            <React.Fragment key={student._id}>
              <TableRow
                className="hover-highlight"
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    expandedRow === student._id ? "#f0f0f0" : "inherit",
                }}
                onClick={() => handleRowClick(student._id)}
              >
                <TableCell>{`${student.firstName} ${student.lastName}`}</TableCell>
                <TableCell>{student.intervention}</TableCell>
                <TableCell>{student.interventionResults}</TableCell>
              </TableRow>
              {expandedRow === student._id && (
                <TableRow className="expanded-row">
                  <TableCell colSpan={3}>
                    <div>
                      {/* Intervention TextField with AI Assist Button */}
                      <div
                        style={{ position: "relative", marginBottom: "16px" }}
                      >
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Intervention"
                          value={student.intervention || ""}
                          onChange={(e) =>
                            handleInputChange(
                              student._id,
                              "intervention",
                              e.target.value
                            )
                          }
                          style={{
                            backgroundColor: "#ffffff",
                          }}
                        />
                        <Tooltip title="Improve with AI">
                          <IconButton
                            onClick={() =>
                              handleAIImprove(
                                student._id,
                                "intervention",
                                student.intervention || ""
                              )
                            }
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              padding: "4px",
                              color: "#1976d2", // Blue color
                            }}
                            size="small"
                          >
                            {loadingStates[student._id]?.intervention ? (
                              <CircularProgress size={20} />
                            ) : (
                              <span role="img" aria-label="magic wand">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  width="24"
                                >
                                  <path d="M0 0h24v24H0z" fill="none" />

                                  <path
                                    color="#DDDDDD"
                                    d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29c-.39-.39-1.02-.39-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05c.39-.39.39-1.02 0-1.41l-2.33-2.35zm-1.03 5.49l-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z"
                                  />
                                </svg>{" "}
                              </span>
                            )}
                          </IconButton>
                        </Tooltip>
                      </div>
                      {/* Intervention Results TextField with AI Assist Button */}
                      <div style={{ position: "relative" }}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Intervention Results"
                          value={student.interventionResults || ""}
                          onChange={(e) =>
                            handleInputChange(
                              student._id,
                              "interventionResults",
                              e.target.value
                            )
                          }
                          style={{ backgroundColor: "#ffffff" }}
                        />
                        <Tooltip title="Improve with AI">
                          <IconButton
                            onClick={() =>
                              handleAIImprove(
                                student._id,
                                "interventionResults",
                                student.interventionResults || ""
                              )
                            }
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              padding: "4px",
                              color: "#1976d2", // Blue color
                            }}
                            size="small"
                          >
                            {loadingStates[student._id]?.interventionResults ? (
                              <CircularProgress size={20} />
                            ) : (
                              <span role="img" aria-label="magic wand">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  width="24"
                                >
                                  <path d="M0 0h24v24H0z" fill="none" />
                                  <path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29c-.39-.39-1.02-.39-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05c.39-.39.39-1.02 0-1.41l-2.33-2.35zm-1.03 5.49l-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z" />
                                </svg>{" "}
                              </span>
                            )}
                          </IconButton>
                        </Tooltip>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
