// Intervention.tsx

import React, { useState, useEffect, useRef, useContext } from "react";
import {
  Button,
  TextField,
  Box,
  SelectChangeEvent,
  Typography,
  Tabs,
  Tab,
} from "@mui/material";
import apiAxiosInstance, { aiAxiosInstance } from "../utils/axiosInstance";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { GroupDropdown } from "./Groups/GroupDropDown";
import { Student } from "@/Types/Student";
import { Group } from "@/Types/Group";
import { ResourceRenderer } from "./Resource/ResourceRenderer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useReactToPrint } from "react-to-print";
import ProgressWithText from "./ProgressWithText/ProgressWithText";
import { TeacherContext, useTeacher } from "../context/TeacherContext";
import { StudentWithIntervention } from "@/Types/StudentWithIntervention";
import { InterventionInterface } from "@/Types/InterventionInterface";
import { LessonPlan } from "@/Types/LessonPlan";
import html2pdf from "html2pdf.js";
import { StudentTable } from "./Student/StudentTable";

export interface Resource {
  type: string;
  title: string;
  content: any;
  metadata?: any;
}

export interface GenerateResourcesResponse {
  resources: Resource[];
}

export const Intervention: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentWithIntervention[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [duration, setDuration] = useState<number>(30); // Default value of 30 minutes
  const [lessonPlanGenerated, setLessonPlanGenerated] =
    useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState<number>(0); // For tabs
  const [additionalRequirements, setAdditionalRequirements] =
    useState<string>("");
  const [
    additionalRequirementsForResource,
    setAdditionalRequirementsForResource,
  ] = useState<string>("");
  const [lessonPlan, setLessonPlan] = useState<string>("");
  const [resources, setResources] = useState<Resource[]>([]); // AI-generated resources
  const { teacher } = useTeacher(); // Use the custom hook

  const lessonPlanRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    console.log("LOG Teacher Standards:", teacher?.teachingStandards);
  }, [teacher]);
  // TypeScript interfaces for API responses
  interface GenerateLessonPlanResponse {
    lesson_plan: string;
  }

  // Fetch groups with type "Intervention" when component mounts
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await apiAxiosInstance.get<{ groups: Group[] }>(
          "/api/groups"
        );

        console.log("Response Data:", response.data); // Add this line to inspect the response

        const allGroups = response.data.groups; // Access the groups array
        const interventionGroups = allGroups.filter(
          (group) => group.type === "Intervention"
        );
        setGroups(interventionGroups);
        if (interventionGroups.length > 0) {
          setSelectedGroupId(interventionGroups[0]._id || null);
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
        setError("Failed to fetch groups. Please try again.");
      }
    };

    fetchGroups();
  }, []);

  // Fetch students and interventions for the selected group and date
  useEffect(() => {
    const fetchStudentsAndInterventions = async () => {
      if (selectedGroupId && selectedDate) {
        try {
          // Fetch students in the selected group
          const groupResponse = await apiAxiosInstance.get<Group>(
            `/api/groups/${selectedGroupId}`
          );
          const selectedGroup = groupResponse.data;

          if (selectedGroup.students && selectedGroup.students.length > 0) {
            const groupStudents = selectedGroup.students; // Array of student objects

            // Fetch interventions based on groupId, studentIds, and date
            const interventionsResponse = await apiAxiosInstance.get<
              InterventionInterface[]
            >(`/interventions`, {
              params: {
                studentIds: groupStudents
                  .map((student) => student._id)
                  .join(","),
                date: selectedDate.toISOString(),
              },
            });

            const fetchedInterventions = interventionsResponse.data;

            // Map interventions by studentId
            const interventionMap: {
              [studentId: string]: InterventionInterface;
            } = {};
            fetchedInterventions.forEach((intervention) => {
              interventionMap[intervention.studentId] = intervention;
            });

            // Merge interventions into students
            const studentsWithInterventions: StudentWithIntervention[] =
              groupStudents.map((student) => ({
                ...student,
                intervention: interventionMap[student._id]?.intervention || "",
                interventionResults:
                  interventionMap[student._id]?.interventionResults || "",
                interventionId: interventionMap[student._id]?._id || null,
                lessonPlanId:
                  interventionMap[student._id]?.lessonPlanId || null,
              }));

            setStudents(studentsWithInterventions);

            // Fetch the associated LessonPlan
            const lessonPlanResponse = await apiAxiosInstance.get<LessonPlan[]>(
              `/lesson-plans`,
              {
                params: {
                  groupId: selectedGroupId,
                  date: selectedDate.toISOString(),
                  lessonType: "Intervention",
                },
              }
            );
            if (lessonPlanResponse.data.length > 0) {
              const fetchedLessonPlan: LessonPlan = lessonPlanResponse.data[0];
              setLessonPlan(fetchedLessonPlan.lesson);

              // Handle single resource string
              if (fetchedLessonPlan.resource) {
                setResources([
                  {
                    type: "markdown",
                    title: "Resource",
                    content: fetchedLessonPlan.resource,
                  },
                ]);
              } else {
                setResources([]);
              }

              setLessonPlanGenerated(true);
            } else {
              setLessonPlan("");
              setResources([]);
              setLessonPlanGenerated(false);
            }
          } else {
            // If the group has no students, clear the students state
            setStudents([]);
            setLessonPlan("");
            setResources([]);
            setLessonPlanGenerated(false);
          }
        } catch (error) {
          console.error("Error fetching students or interventions:", error);
          setError(
            "Failed to fetch students or interventions. Please try again."
          );
        }
      } else {
        // If no group is selected, clear the students state
        setStudents([]);
        setLessonPlan("");
        setResources([]);
        setLessonPlanGenerated(false);
      }
    };

    fetchStudentsAndInterventions();
  }, [selectedGroupId, selectedDate]);

  const handleGroupChange = (event: SelectChangeEvent<string>) => {
    const groupId = event.target.value;
    setSelectedGroupId(groupId);
  };

  const handleUpdateStudent = (
    studentId: string,
    field: string,
    value: string
  ) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) =>
        student._id === studentId ? { ...student, [field]: value } : student
      )
    );
  };

  const handleGenerateLessonPlan = async (generateAll: boolean) => {
    setLessonPlan("");
    setLoading(true);
    setLessonPlanGenerated(false);
    setError(null);

    // Check if all students have empty intervention and interventionResults
    const allEmpty = students.every(
      (student) => !student.intervention && !student.interventionResults
    );
    if (allEmpty) {
      setError(
        "All students have empty intervention and intervention results. Please fill in at least one."
      );
      setLoading(false);
      return;
    }

    // Construct the prompt for the lesson plan generator
    let prompt =
      `Create a ${teacher?.gradeLevel} grade level lesson plan based on the ${
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
      // Generate the lesson plan
      const response = await aiAxiosInstance.post<GenerateLessonPlanResponse>(
        "/generate-lesson-plan",
        { prompt }
      );
      const lessonPlanMarkdown = response.data.lesson_plan;

      setLessonPlan(lessonPlanMarkdown);
      setLessonPlanGenerated(true);

      let resourceContent = "";

      // Generate resources based on the lesson plan
      if (generateAll) {
        resourceContent = await GenerateResource(lessonPlanMarkdown);
      }

      // Save the LessonPlan to the backend
      // Ensure that resourceContent is a string (even if empty)
      resourceContent = resourceContent || "";

      // Prepare the data to be sent
      const lessonPlanData = {
        lesson: lessonPlanMarkdown,
        resource: resourceContent, // Save as single string
        groupId: selectedGroupId,
        date: selectedDate.toISOString(),
        lessonType: "Intervention",
        teacherId: teacher?._id,
      };

      console.log("Data being sent to /lesson-plans:", lessonPlanData);

      const saveLessonPlanResponse = await apiAxiosInstance.post(
        "/lesson-plans",
        lessonPlanData
      );

      const lessonPlanId = saveLessonPlanResponse.data.lessonPlanId;

      // Assign lessonPlanId to each intervention
      const interventionsToUpdate = students
        .filter(
          (student) =>
            student.intervention && student.intervention.trim() !== ""
        )
        .map((student) => ({
          _id: student.interventionId || undefined,
          studentId: student._id,
          intervention: student.intervention,
          interventionResults: student.interventionResults,
          date: selectedDate.toISOString(),
          duration: duration,
          lessonPlanId: lessonPlanId,
          groupId: selectedGroupId,
        }));

      if (interventionsToUpdate.length > 0) {
        await apiAxiosInstance.post("/interventions", interventionsToUpdate);
      }
    } catch (error) {
      console.error("Error generating lesson plan or resources: ", error);

      // More specific error handling
      if ((error as any).response) {
        const errorMessage = (error as any).response.data.error;
        console.error("Error details:", errorMessage);
        setError(`Failed to generate lesson plan: ${errorMessage}`);
      } else if ((error as any).request) {
        setError("No response received from the server.");
      } else {
        setError(`Error: ${(error as any).message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const GenerateResource = async (
    lessonPlanMarkdown: string
  ): Promise<string> => {
    setLoading(true);
    try {
      const resourcesResponse =
        await aiAxiosInstance.post<GenerateResourcesResponse>(
          "/generate-resources",
          {
            lesson_plan: lessonPlanMarkdown,
            additional_requirements: additionalRequirementsForResource,
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
    } catch (error) {
      console.error("Error generating resources:", error);

      // More specific error handling
      if ((error as any).response) {
        const errorMessage = (error as any).response.data.error;
        console.error("Error details:", errorMessage);
        setError(`Failed to generate resources: ${errorMessage}`);
      } else if ((error as any).request) {
        setError("No response received from the server.");
      } else {
        setError(`Error: ${(error as any).message}`);
      }

      return "";
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Filter out students without intervention information
    const studentsWithIntervention = students.filter(
      (student) => student.intervention && student.intervention.trim() !== ""
    );

    // Check if at least one student has intervention data
    if (studentsWithIntervention.length === 0) {
      setError(
        "Please enter intervention information for at least one student."
      );
      return;
    }

    // Prepare the data to be saved
    const interventionData = studentsWithIntervention.map((student) => ({
      _id: student.interventionId || undefined,
      studentId: student._id,
      intervention: student.intervention,
      interventionResults: student.interventionResults,
      date: selectedDate.toISOString(),
      duration: duration,
      lessonPlanId: student.lessonPlanId || undefined,
      groupId: selectedGroupId,
    }));

    try {
      const response = await apiAxiosInstance.post(
        `/interventions`,
        interventionData
      );
      console.log(response.data.message);
      alert("Interventions saved successfully!");

      // Update interventions with the saved data
      const savedInterventions: InterventionInterface[] = response.data.data;
      const interventionMap: { [studentId: string]: InterventionInterface } =
        {};
      savedInterventions.forEach((intervention) => {
        interventionMap[intervention.studentId] = intervention;
      });

      setStudents((prevStudents) =>
        prevStudents.map((student) => ({
          ...student,
          interventionId:
            interventionMap[student._id]?._id || student.interventionId,
          lessonPlanId:
            interventionMap[student._id]?.lessonPlanId || student.lessonPlanId,
        }))
      );
      setError(null);
    } catch (error) {
      const errorMessage =
        (error as any).response?.data?.error || (error as any).message;
      console.error("Error saving interventions:", errorMessage);
      alert(`Failed to save interventions: ${errorMessage}`);
    }
  };

  const handleDateChange = (newDate: Dayjs | null) => {
    setSelectedDate(newDate || dayjs());
  };

  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDuration(Number(event.target.value));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleAdditionalRequirementsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAdditionalRequirements(event.target.value);
  };

  const handleAdditionalRequirementsForResourceChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAdditionalRequirementsForResource(event.target.value);
  };

  const handleDownloadLessonPlanPdf = () => {
    if (lessonPlanRef.current) {
      const element = lessonPlanRef.current;
      const options = {
        margin: 0.5,
        filename: "lesson_plan.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };
      html2pdf().set(options).from(element).save();
    }
  };

  const handlePrintLessonPlan = useReactToPrint({
    content: () => lessonPlanRef.current,
    documentTitle: "Lesson Plan",
    pageStyle: `
      @page {
        size: auto;
        margin: 20mm;
      }
    `,
  });

  const handleDownloadResourcesPdf = () => {
    if (resourcesRef.current) {
      const element = resourcesRef.current;
      const options = {
        margin: 0.5,
        filename: "resources.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };
      html2pdf().set(options).from(element).save();
    }
  };

  const handlePrintResources = useReactToPrint({
    content: () => resourcesRef.current,
    documentTitle: "Resource",
    pageStyle: `
      @page {
        size: auto;
        margin: 20mm;
      }
    `,
  });

  return (
    <div>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <GroupDropdown
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleGroupChange}
        />
        <Box display="flex" alignItems="center">
          <TextField
            label="Duration (minutes)"
            name="duration"
            type="number"
            variant="outlined"
            value={duration}
            onChange={handleDurationChange}
            style={{ marginRight: "16px" }}
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={selectedDate}
              onChange={handleDateChange}
              renderInput={(params) => <TextField {...params} />} // Add renderInput
            />
          </LocalizationProvider>
        </Box>
      </Box>
      <StudentTable students={students} onUpdateStudent={handleUpdateStudent} />

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      <div className="button-container mt-4">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          sx={{ mr: 2 }}
        >
          Save
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => handleGenerateLessonPlan(true)}
          disabled={loading}
        >
          Generate Mini Lesson
        </Button>
      </div>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
          <ProgressWithText
            isLessonDone={lessonPlan.length > 0}
            isResourceDone={resources.length > 0}
          />{" "}
        </Box>
      )}

      {lessonPlanGenerated && (
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
            onChange={handleTabChange}
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
              label="Lesson Plan"
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
                  onClick={handleDownloadLessonPlanPdf}
                >
                  Download as PDF
                </Button>
                <Button variant="contained" onClick={handlePrintLessonPlan}>
                  Print
                </Button>
                <Button
                  variant="contained"
                  disabled={additionalRequirements.length === 0}
                  onClick={() => handleGenerateLessonPlan(false)}
                >
                  Regenerate Lesson
                </Button>
              </Box>
              {/* Lesson Plan Display */}
              {lessonPlanGenerated && lessonPlan && (
                <div
                  className="markdown-output"
                  ref={lessonPlanRef}
                  style={{ border: "none" }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {lessonPlan}
                  </ReactMarkdown>
                </div>
              )}
            </Box>
          )}
          {tabIndex === 1 && (
            <Box sx={{ padding: 2, border: "none", boxShadow: "none" }}>
              {/* Additional Requirements Input */}
              <TextField
                label="Additional Requirements for Resource"
                multiline
                rows={4}
                variant="outlined"
                value={additionalRequirementsForResource}
                onChange={handleAdditionalRequirementsForResourceChange}
                fullWidth
                sx={{ mb: 2, border: "none" }}
              />
              {/* Buttons for Download and Print */}
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleDownloadResourcesPdf}
                >
                  Download as PDF
                </Button>
                <Button variant="contained" onClick={handlePrintResources}>
                  Print
                </Button>
                <Button
                  variant="contained"
                  disabled={additionalRequirementsForResource.length === 0}
                  onClick={() => GenerateResource(lessonPlan)}
                >
                  Regenerate Resource
                </Button>
              </Box>
              {/* Resources Display */}
              {resources.length > 0 ? (
                <div ref={resourcesRef}>
                  {resources.map((resource, index) => (
                    <ResourceRenderer key={index} resource={resource} />
                  ))}
                </div>
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
