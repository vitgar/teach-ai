import { Standard } from "./Standard";

// Define the Teacher interface
export interface Teacher {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  gradeLevel?: string;
  teachingStandards: Standard[];
  state: string;
  linkedinId?: string;
  // Add any other fields you need
}

export interface TeacherContextType {
  teacher: Teacher | null;
  setTeacher: (teacher: Teacher) => void;
}
