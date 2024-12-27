export interface LessonPlan {
  _id: string;
  lesson: string;
  resource: string;
  groupId: string;
  date: string; // ISO string format
  lessonType: string;
  teacherId: string;
  createdAt: string; // ISO string format
}
