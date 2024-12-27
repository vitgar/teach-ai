import { Student } from "@/Types/Student";

export interface StudentWithIntervention extends Student {
  intervention?: string;
  interventionResults?: string;
  interventionId?: string | null;
  lessonPlanId?: string | null; // Optional field to link to LessonPlan
}
