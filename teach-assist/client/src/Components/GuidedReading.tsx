// src/components/GuidedReading.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  TextField,
  Box,
  SelectChangeEvent,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import axios, { AxiosError } from "axios"; // Import axios and AxiosError
import apiAxiosInstance, { aiAxiosInstance } from "../utils/axiosInstance";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { GroupDropdown } from "./Groups/GroupDropDown";
import { useTeacher } from "../context/TeacherContext";
import { StudentWithGuidedReading } from "../Types/StudentWithGuidedReading";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useReactToPrint } from "react-to-print";
import ProgressWithText from "./ProgressWithText/ProgressWithText";
import html2pdf from "html2pdf.js";
import { StudentTableWithGuidedReading } from "./Student/StudentTableGuidedReading";
import { GroupWithStudents } from "@/Types/GroupWithStudents";
import { ResourceDisplay } from "./Resources/Resources";
import { Resource } from "./Intervention";

interface SessionType {
  _id: string;
  date: string; // ISO string
  book: string;
  level: string;
  groupId: string;
  teacherId: string;
  duration: number;
}

interface GuidedReadingActivity {
  _id: string;
  sessionId: string;
  studentId: string;
  activity: string;
  comments: string;
  nextStepsId?: string;
  duration?: number;
  groupId: string;
  createdAt: string;
  updatedAt: string;
}

interface NextStepsResponse {
  next_steps: string;
  resources: Resource[];
}

interface GenerateResourcesResponse {
  resources: Resource[];
}

interface NextStepsData {
  nextSteps: string;
  resources: Resource[];
  groupId: string;
  date: string;
  nextStepsType: string;
  teacherId: string;
  book?: string;
}

export const GuidedReading: React.FC = () => {
  const [groups, setGroups] = useState<GroupWithStudents[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentWithGuidedReading[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs().startOf('day'));
  const [book, setBook] = useState<string>(""); // Separate Book field
  const [level, setLevel] = useState<string>(""); // Separate Level field
  const [tabIndex, setTabIndex] = useState<number>(0); // For tabs
  const [additionalRequirements, setAdditionalRequirements] =
    useState<string>("");
  const { teacher } = useTeacher(); // Use the custom hook
  const [nextSteps, setNextSteps] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nextStepsGenerated, setNextStepsGenerated] = useState<boolean>(false);
  const [resources, setResources] = useState<Resource[]>([]); // Ensure resources state exists
  const [duration, setDuration] = useState<number>(0); // Add duration state
  const nextStepsRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  // Loading states for AI improvements
  const [loadingStates, setLoadingStates] = useState<{
    [studentId: string]: { [field: string]: boolean };
  }>({});

  // Fetch groups with type "Guided Reading" when component mounts
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await apiAxiosInstance.get<{
          groups: GroupWithStudents[];
        }>("/api/groups", {
          params: { type: "Guided Reading" }, // Assuming your backend supports filtering by type
        });
        const guidedReadingGroups = response.data.groups;
        console.log("Fetched Groups:", guidedReadingGroups); // Debug log
        setGroups(guidedReadingGroups);
        if (guidedReadingGroups.length > 0) {
          setSelectedGroupId(guidedReadingGroups[0]._id || null);
          console.log("Selected Group ID:", guidedReadingGroups[0]._id || null); // Debug log
        }
      } catch (error: unknown) {
        console.error("Error fetching groups:", error);
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.error || error.message;
          setError(`Failed to fetch groups: ${errorMessage}`);
        } else {
          setError(`Error: ${(error as Error).message}`);
        }
      }
    };

    fetchGroups();
  }, []);

  // Fetch students when the selected group changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (selectedGroupId) {
        setLoading(true);
        setError(null);
        try {
          console.log("Fetching students for Group ID:", selectedGroupId); // Debug log

          // Fetch group details to get students
          const groupResponse = await apiAxiosInstance.get<GroupWithStudents>(
            `/api/groups/${selectedGroupId}`
          );
          const selectedGroup = groupResponse.data;
          console.log("Fetched Group Details:", selectedGroup); // Debug log

          if (selectedGroup.students && selectedGroup.students.length > 0) {
            const groupStudents: StudentWithGuidedReading[] =
              selectedGroup.students.map((student: any) => ({
                ...student,
                activity: "", // Initialize activity
                comments: "", // Initialize comments
                activityId: null, // Initialize activityId
                guidedReadingId: null, // Initialize guidedReadingId
              }));
            console.log("Group Students:", groupStudents); // Debug log
            setStudents(groupStudents);
          } else {
            console.log("Selected group has no students."); // Debug log
            setStudents([]);
            setBook("");
            setLevel("");
            setNextSteps("");
            setDuration(0); // Reset duration if needed
          }
        } catch (error: unknown) {
          console.error("Error fetching students:", error);
          if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.error || error.message;
            setError(`Failed to fetch students: ${errorMessage}`);
          } else {
            setError(`Error: ${(error as Error).message}`);
          }
          setStudents([]);
        } finally {
          setLoading(false);
        }
      } else {
        console.log("No group selected."); // Debug log
        setStudents([]);
        setBook("");
        setLevel("");
        setNextSteps("");
        setDuration(0); // Reset duration if needed
      }
    };

    fetchStudents();
  }, [selectedGroupId]);

  // Fetch session and activities when the selected group or date changes
  useEffect(() => {
    const fetchData = async () => {
      if (selectedGroupId && selectedDate && students.length > 0) {
        await fetchSessionAndActivities();
      }
    };

    fetchData();
  }, [selectedGroupId, selectedDate, students.length]); // Watch for changes in students.length

  // Function to fetch existing session and activities
  const fetchSessionAndActivities = async () => {
    if (!selectedGroupId || !selectedDate) {
      console.log("Group ID or Date not selected.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Add debug log to see what date is being sent
      console.log('Selected Date:', selectedDate.format('YYYY-MM-DD'));
      
      // First, fetch next steps and resources
      const nextStepsResponse = await apiAxiosInstance.get("/next-steps", {
        params: {
          groupId: selectedGroupId,
          date: selectedDate.startOf('day').toISOString(),
          nextStepsType: "GuidedReading",
        },
      });

      // Set next steps and resources regardless of session existence
      if (nextStepsResponse.data.nextSteps) {
        setNextSteps(nextStepsResponse.data.nextSteps.nextSteps);
        setResources(Array.isArray(nextStepsResponse.data.nextSteps.resources) 
          ? nextStepsResponse.data.nextSteps.resources 
          : []);
      } else {
        setNextSteps("");
        setResources([]);
      }

      // Then fetch session data with both group and date
      const sessionResponse = await apiAxiosInstance.get<{
        session: SessionType | null;
      }>("/guided-reading/sessions", {
        params: {
          groupId: selectedGroupId,
          date: selectedDate.startOf('day').toISOString(), // Add date parameter
        },
      });

      const { session } = sessionResponse.data;

      if (session) {
        // Set session data
        setBook(session.book);
        setLevel(session.level);
        setDuration(session.duration || 0);

        // Fetch activities for the session
        const activitiesResponse = await apiAxiosInstance.get<{
          activities: GuidedReadingActivity[];
        }>("/guided-reading/activities", {
          params: {
            sessionId: session._id,
          },
        });

        const activities = activitiesResponse.data.activities;

        // Update students with activities
        setStudents((prevStudents) => {
          return prevStudents.map((student) => {
            const activity = activities.find(
              (act) => act.studentId === student._id
            );
            return activity
              ? {
                  ...student,
                  activity: activity.activity,
                  comments: activity.comments,
                  guidedReadingId: activity._id,
                  duration: activity.duration || duration,
                }
              : { ...student, activity: "", comments: "" };
          });
        });
      } else {
        // Reset session-related fields if no session found
        setBook("");
        setLevel("");
        setDuration(0);
        setStudents((prevStudents) =>
          prevStudents.map((student) => ({
            ...student,
            activity: "",
            comments: "",
          }))
        );
      }
    } catch (error: unknown) {
      console.error("Error fetching data:", error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        setError(`Failed to fetch data: ${errorMessage}`);
      } else {
        setError(`Error: ${(error as Error).message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (event: SelectChangeEvent<string>) => {
    const groupId = event.target.value;
    console.log("Group changed to:", groupId); // Debug log
    setSelectedGroupId(groupId);
  };

  const handleUpdateStudent = (
    studentId: string,
    field: "activity" | "comments",
    value: string
  ) => {
    console.log(
      `Updating Student ID: ${studentId}, Field: ${field}, Value: ${value}`
    ); // Debug log
    setStudents((prevStudents) =>
      prevStudents.map((student) =>
        student._id === studentId ? { ...student, [field]: value } : student
      )
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    // Ensure teacher data is available
    if (!teacher) {
      setError("Teacher information is not available.");
      setLoading(false);
      return;
    }

    try {
      // Prepare session data (without nextSteps)
      const sessionData = {
        date: selectedDate.toISOString(),
        book,
        level,
        duration,
        groupId: selectedGroupId,
        teacherId: teacher._id,
      };

      // Save the session
      const sessionResponse = await apiAxiosInstance.post(
        "/guided-reading/sessions",
        sessionData
      );
      const session = sessionResponse.data.session;

      // Prepare activities data
      const activitiesData = students.map((student) => ({
        sessionId: session._id,
        studentId: student._id,
        activity: student.activity,
        comments: student.comments,
      }));

      // Save activities
      await apiAxiosInstance.post("/guided-reading/activities", activitiesData);
      alert("Data saved successfully!");
      setError(null);
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : (error as Error).message;
      console.error("Error saving data:", errorMessage);
      alert(`Failed to save data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNextSteps = async () => {
    setNextSteps("");
    setLoading(true);
    setNextStepsGenerated(false);
    setError(null);

    // Ensure the book and level fields are not empty
    if (!book.trim()) {
      setError("Book field is required.");
      setLoading(false);
      return;
    }

    if (!level.trim()) {
      setError("Level field is required.");
      setLoading(false);
      return;
    }

    // Ensure teacher data is available
    if (!teacher || !teacher._id) {
      setError("Teacher information is not available.");
      setLoading(false);
      return;
    }

    // Check if all students have empty activity and comments
    const allEmpty = students.every(
      (student) => !student.activity && !student.comments
    );
    if (allEmpty) {
      setError(
        "All students have empty activity and comments. Please fill in at least one."
      );
      setLoading(false);
      return;
    }

    // Construct the prompt for the next steps generator
    let prompt =
      `Create a ${teacher?.gradeLevel} grade level next steps plan based on the ${
        teacher?.teachingStandards
          ? teacher?.teachingStandards[0].description
          : ''
      }`;
    if (additionalRequirements.length !== 0) {
      prompt +=
        " Additional requirements: " +
        additionalRequirements +
        " If additional requirements conflict with original requirements, please prioritize additional requirements.";
    }

    try {
      // Generate the next steps
      const response = await aiAxiosInstance.post<NextStepsResponse>(
        "/generate-next-steps",
        { prompt }
      );

      const nextStepsMarkdown = response.data.next_steps;
      
      // Generate resources
      const resourceResponse = await aiAxiosInstance.post<GenerateResourcesResponse>(
        "/generate-resources",
        { 
          lesson_plan: nextStepsMarkdown,
          additional_requirements: additionalRequirements 
        }
      );

      console.log('Resource Response:', resourceResponse.data); // Add this debug log

      // Convert resource to proper format if it's a string
      let formattedResources = resourceResponse.data.resources;
      console.log('Initial Resources:', formattedResources); // Add this debug log

      if (!Array.isArray(formattedResources)) {
        console.log('Resources is not an array, converting...'); // Add this debug log
        formattedResources = [{
          type: 'worksheet',
          title: 'Guided Reading Resource',
          content: typeof formattedResources === 'string' ? formattedResources : JSON.stringify(formattedResources),
          metadata: {
            instructions: 'Complete the following activity',
            grade_level: 'Elementary',
            subject: 'Reading'
          }
        }];
      }

      console.log('Formatted Resources:', formattedResources); // Add this debug log

      setNextSteps(nextStepsMarkdown);
      setResources(formattedResources);
      setNextStepsGenerated(true);

      // Save the NextSteps to the backend
      const nextStepsData: NextStepsData = {
        nextSteps: nextStepsMarkdown,
        resources: formattedResources,
        groupId: selectedGroupId!,
        date: selectedDate.toISOString(),
        nextStepsType: "GuidedReading",
        teacherId: teacher._id,
      };

      const saveNextStepsResponse = await apiAxiosInstance.post(
        "/next-steps",
        nextStepsData
      );

      const nextStepsId = saveNextStepsResponse.data.nextStepsId;

      // Assign nextStepsId to each guided reading activity
      // You can add logic here if needed to associate nextStepsId with activities

    } catch (error: unknown) {
      console.error("Error generating next steps or resources: ", error);

      // More specific error handling
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        console.error("Error details:", errorMessage);
        setError(`Failed to generate next steps: ${errorMessage}`);
      } else {
        setError(`Error: ${(error as Error).message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const GenerateResource = async (
    nextStepsMarkdown: string
  ): Promise<string> => {
    setLoading(true);
    try {
      const resourcesResponse =
        await aiAxiosInstance.post<GenerateResourcesResponse>(
          "/generate-resources",
          {
            lesson_plan: nextStepsMarkdown,
            additional_requirements: additionalRequirements, // Ensure correct variable
          }
        );
      const resourcesData = resourcesResponse.data.resources;
      if (resourcesData.length > 0) {
        const resourceContent = resourcesData[0].content;
        setResources([resourcesData[0]]);
        return resourceContent;
      } else {
        setResources([]);
        return "";
      }
    } catch (error: unknown) {
      console.error("Error generating resources:", error);

      // More specific error handling
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        console.error("Error details:", errorMessage);
        setError(`Failed to generate resources: ${errorMessage}`);
      } else {
        setError(`Error: ${(error as Error).message}`);
      }

      return "";
    } finally {
      setLoading(false);
    }
  };

  const handleAdditionalRequirementsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAdditionalRequirements(event.target.value);
  };

  const handleDownloadNextStepsPdf = () => {
    if (nextStepsRef.current) {
      const element = nextStepsRef.current;
      const options = {
        margin: 0.5,
        filename: "next_steps.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };
      html2pdf().set(options).from(element).save();
    }
  };

  const handlePrintNextSteps = useReactToPrint({
    content: () => nextStepsRef.current,
    documentTitle: "Next Steps",
    pageStyle: `
      @page {
        size: auto;
        margin: 20mm;
      }
    `,
  });

  const handleDownloadResource = (resource: Resource) => {
    const element = document.createElement('div');
    element.innerHTML = `
      <h1>${resource.title}</h1>
      ${resource.metadata?.instructions ? `<p><strong>Instructions:</strong> ${resource.metadata.instructions}</p>` : ''}
      ${resource.content}
    `;

    const options = {
      margin: 1,
      filename: `${resource.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(options).from(element).save();
  };

  const handlePrintResource = useReactToPrint({
    content: () => resourcesRef.current,
    documentTitle: "Resource",
    pageStyle: `
      @page {
        size: auto;
        margin: 20mm;
      }
    `,
  });

  // Function to handle AI improvement (passed to Student Table)
  const handleAIImprove = async (
    studentId: string,
    field: "activity" | "comments",
    value: string
  ): Promise<string> => {
    // If the input is empty, do not proceed
    if (!value.trim()) return "";

    // Set loading state to true
    setLoadingStates((prevState) => ({
      ...prevState,
      [studentId]: {
        ...prevState[studentId],
        [field]: true,
      },
    }));

    try {
      // Call the AI backend to improve the text
      const improvedText = await improveTextWithAI(value);
      // Update the field with the improved text
      handleUpdateStudent(studentId, field, improvedText);
      return improvedText;
    } catch (error: unknown) {
      console.error("Error improving text with AI:", error);
      // Optionally, notify the user about the error
      alert("Failed to improve text with AI. Please try again.");
      return "";
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

  // Function to call the AI backend to improve text
  const improveTextWithAI = async (text: string): Promise<string> => {
    try {
      const response = await aiAxiosInstance.post<{ improved_text: string }>(
        "/improve-intervention",
        {
          text: text,
        }
      );
      return response.data.improved_text;
    } catch (error: unknown) {
      console.error("Error calling AI backend:", error);
      throw error;
    }
  };

  return (
    <div>
      {/* Header: Group Selection and Date Picker */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
        flexWrap="wrap"
        gap={2}
      >
        <GroupDropdown
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleGroupChange}
        />
        <Box display="flex" alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={selectedDate}
              onChange={(newDate) =>  setSelectedDate(newDate || dayjs())}
              renderInput={(params) => <TextField {...params} />}
            />
          </LocalizationProvider>
        </Box>
      </Box>

      {/* Separate Book, Level, and Duration Inputs */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          label="Book"
          name="book"
          variant="outlined"
          placeholder="Enter book title"
          value={book}
          onChange={(e) => setBook(e.target.value)}
          fullWidth
        />
        <TextField
          label="Level"
          name="level"
          variant="outlined"
          placeholder="Enter level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          fullWidth
        />
        <TextField
          label="Duration (minutes)"
          name="duration"
          variant="outlined"
          type="number"
          placeholder="Enter duration"
          value={duration}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (value >= 0) setDuration(value);
          }}
          fullWidth
          inputProps={{ min: 0 }}
        />
      </Box>

      {/* Student Table */}
      <StudentTableWithGuidedReading
        students={students}
        onUpdateStudent={handleUpdateStudent}
        // onAIImprove={handleAIImprove} // Pass the AI improvement handler
        // loadingStates={loadingStates} // Pass loading states
      />

      {/* Error Message */}
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      {/* Action Buttons */}
      <Box className="button-container mt-4" display="flex" gap={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={students.length === 0}
        >
          Save
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleGenerateNextSteps}
          disabled={loading || students.length === 0}
        >
          Generate Next Steps
        </Button>
      </Box>

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
          <ProgressWithText
            isLessonDone={nextSteps.length > 0}
            isResourceDone={false} // Adjust this as needed
          />
        </Box>
      )}

      {/* Next Steps and Resources Tabs */}
      {nextSteps && (
        <Box
          sx={{
            width: "100%",
            marginTop: 4,
            border: "none",
            boxShadow: "none",
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={(e, newValue) => setTabIndex(newValue)}
            sx={{
              borderBottom: "none",
              ".MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": {
                border: "none",
                outline: "none",
              },
            }}
          >
            <Tab
              label="Next Steps"
              sx={{
                border: "none",
                outline: "none",
              }}
            />
            <Tab
              label="Resource"
              sx={{
                border: "none",
                outline: "none",
              }}
            />
          </Tabs>
          {tabIndex === 0 && (
            <Box sx={{ padding: 2, border: "none", boxShadow: "none" }}>
              {/* Additional Requirements Input */}
              <TextField
                label="Additional Requirements"
                multiline
                rows={4}
                variant="outlined"
                value={additionalRequirements}
                onChange={handleAdditionalRequirementsChange}
                fullWidth
                sx={{ mb: 2, border: "none" }}
              />
              {/* Buttons for Download and Print */}
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleDownloadNextStepsPdf}
                >
                  Download as PDF
                </Button>
                <Button variant="contained" onClick={handlePrintNextSteps}>
                  Print
                </Button>
              </Box>
              {/* Next Steps Display */}
              <div
                className="markdown-output"
                ref={nextStepsRef}
                style={{ border: "none" }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {nextSteps}
                </ReactMarkdown>
              </div>
            </Box>
          )}
          {tabIndex === 1 && (
            <Box sx={{ padding: 2 }} ref={resourcesRef}>
              {resources.length > 0 ? (
                <ResourceDisplay
                  resources={resources}
                  onDownloadResource={handleDownloadResource}
                  onPrintResource={handlePrintResource}
                />
              ) : (
                <Typography>No resources available.</Typography>
              )}
            </Box>
          )}
        </Box>
      )}
    </div>
  );
};

export default GuidedReading;
