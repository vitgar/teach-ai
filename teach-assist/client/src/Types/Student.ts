export interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  gradeLevel: string;
  readingLevel: string;
  teacherId: string;
  periodId?: string | null;
  groupIds?: string[];
}

export interface NewStudent extends Omit<Student, '_id'> {
  _id?: string;
}
