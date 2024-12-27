import { Student } from "./Student";

export interface Group {
  _id: string;
  name: string;
  description: string;
  type: string;
  students: Student[];
  teacherId: string;
}
