import React from "react";
import {
  Typography,
  Paper,
  List as MUIList,
  ListItem,
  ListItemText,
  Divider,
  Box,
} from "@mui/material";
import { LessonPlanSchema } from "@/Types/LessonPlanSchema";

interface Objective {
  objectiveId: string;
  description: string;
  importanceLevel: string;
}

interface Material {
  materialId: string;
  name: string;
  quantity: string;
  optional: boolean;
}

interface ActivityStep {
  stepNumber: number;
  instruction: string;
}

interface Activity {
  activityId: string;
  title: string;
  description: string;
  type: string;
  duration: string;
  materialsNeeded: string[];
  steps: ActivityStep[];
}

interface AssessmentTool {
  toolId: string;
  name: string;
  criteria: string;
}

interface Assessment {
  type: string;
  tools: AssessmentTool[];
}

interface Differentiation {
  differentiationId: string;
  strategy: string;
  targetGroup: string;
  description: string;
}

interface Homework {
  description: string;
  dueDate: string;
}

interface Extension {
  extensionId: string;
  title: string;
  description: string;
}

export interface LessonPlan {
  title: string;
  gradeLevel: string;
  subject: string;
  duration: string;
  objectives: Objective[];
  materials: Material[];
  activities: Activity[];
  assessment: Assessment;
  differentiation: Differentiation[];
  homework: Homework;
  extensions: Extension[];
  notes: string;
}

interface LessonPlanDisplayProps {
  lessonPlan: LessonPlanSchema;
}

const renderList = (items: any[], renderItem: (item: any) => string) => {
  if (!items || items.length === 0) return null;
  return (
    <MUIList>
      {items.map((item, index) => (
        <ListItem key={index}>
          <ListItemText primary={renderItem(item)} />
        </ListItem>
      ))}
    </MUIList>
  );
};

const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({
  lessonPlan,
}) => {
  if (!lessonPlan) return null;
  const renderSection = (title: string, content: React.ReactNode) => {
    if (
      content === null ||
      content === undefined ||
      (Array.isArray(content) && content.length === 0)
    )
      return null;

    return (
      <Box mb={2}>
        <Typography variant="h6">{title}</Typography>
        {content}
      </Box>
    );
  };

  return (
    <Paper elevation={3} sx={{ padding: 3, marginTop: 3 }}>
      {lessonPlan.title && (
        <>
          <Typography variant="h4" gutterBottom>
            {lessonPlan.title}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            {`${lessonPlan.subject} | ${lessonPlan.gradeLevel} | ${lessonPlan.duration}`}
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </>
      )}

      {lessonPlan.objectives &&
        renderSection(
          "Objectives",
          renderList(
            lessonPlan.objectives,
            (obj: Objective) =>
              `${obj.description} (Importance: ${obj.importanceLevel})`
          )
        )}

      {lessonPlan.materials &&
        renderSection(
          "Materials",
          renderList(
            lessonPlan.materials,
            (mat: Material) =>
              `${mat.name} (Quantity: ${mat.quantity})${
                mat.optional ? " - Optional" : ""
              }`
          )
        )}

      {lessonPlan.activities &&
        renderSection(
          "Activities",
          lessonPlan.activities.map((activity, index) => (
            <Box key={activity.description} mb={2}>
              <Typography variant="subtitle1">{`${index + 1}. ${
                activity.title
              } (${activity.type}, ${activity.duration})`}</Typography>
              <Typography variant="body2">{activity.description}</Typography>
              {activity.materialsNeeded.length > 0 && (
                <Typography variant="body2">
                  Materials: {activity.materialsNeeded.join(", ")}
                </Typography>
              )}
              {renderList(
                activity.steps,
                (step: ActivityStep) =>
                  `Step ${step.stepNumber}: ${step.instruction}`
              )}
            </Box>
          ))
        )}

      {lessonPlan.assessment &&
        renderSection(
          "Assessment",
          <>
            <Typography variant="body1">
              Type: {lessonPlan.assessment.type}
            </Typography>
            {renderList(
              lessonPlan.assessment.tools,
              (tool: AssessmentTool) => `${tool.name}: ${tool.criteria}`
            )}
          </>
        )}

      {lessonPlan.differentiation &&
        renderSection(
          "Differentiation",
          renderList(
            lessonPlan.differentiation,
            (diff: Differentiation) =>
              `${diff.strategy} (for ${diff.targetGroup}): ${diff.description}`
          )
        )}

      {lessonPlan.homework &&
        renderSection(
          "Homework",
          <>
            <Typography variant="body1">
              {lessonPlan.homework.description}
            </Typography>
            <Typography variant="body2">
              Due: {lessonPlan.homework.dueDate}
            </Typography>
          </>
        )}

      {lessonPlan.extensions &&
        renderSection(
          "Extensions",
          renderList(
            lessonPlan.extensions,
            (ext: Extension) => `${ext.title}: ${ext.description}`
          )
        )}

      {lessonPlan.notes &&
        renderSection(
          "Notes",
          <Typography variant="body1">{lessonPlan.notes}</Typography>
        )}
    </Paper>
  );
};

export default LessonPlanDisplay;
