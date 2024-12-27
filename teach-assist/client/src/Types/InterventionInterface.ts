export interface InterventionInterface {
  _id: string;
  studentId: string;
  intervention: string;
  interventionResults: string;
  date: string; // ISO string format
  duration: number; // in minutes
  lessonPlanId?: string | null;
}
