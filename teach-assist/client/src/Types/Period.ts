export interface Period {
  _id?: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  gradeLevels: string[];
  daysOfWeek: string[];
  subject: string;
  roomNumber: string;
}
