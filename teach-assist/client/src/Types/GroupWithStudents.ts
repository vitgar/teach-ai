// Types/GroupWithStudents.ts

import { Group } from "@/Types/Group";
import { Student } from "@/Types/Student";

export interface GroupWithStudents extends Group {
  students: Student[];
}
