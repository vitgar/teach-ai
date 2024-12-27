// src/Types/GroupRequest.ts

import { Student } from "./Student"; // Ensure correct import path

/**
 * GroupRequest is used for creating or updating a group.
 * It includes only the fields that the client manages.
 */
export interface GroupRequest {
  name: string;
  description: string;
  type: string;
  students?: Student[]; // Make 'students' optional
}
