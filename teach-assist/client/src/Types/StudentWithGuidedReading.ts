// Types/StudentWithGuidedReading.ts

import { Student } from "./Student";

export interface StudentWithGuidedReading extends Student {
  activity: string;
  comments: string;
  activityId: string | null;
  guidedReadingId: string | null;
}
