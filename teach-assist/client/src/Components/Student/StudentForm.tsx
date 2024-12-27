// StudentForm.tsx

import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  SelectChangeEvent,
} from "@mui/material";
import { Student, NewStudent } from "@/Types/Student";
import { useTeacher } from "../../context/TeacherContext";

interface StudentFormProps {
  student?: Student;
  onSubmit: (student: NewStudent) => void;
  onCancel: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ student, onSubmit, onCancel }) => {
  const { teacher } = useTeacher();
  const [formData, setFormData] = useState<NewStudent>({
    firstName: student?.firstName || '',
    lastName: student?.lastName || '',
    studentId: student?.studentId || '',
    readingLevel: student?.readingLevel || '',
    gradeLevel: student?.gradeLevel || teacher?.gradeLevel || '',
    teacherId: student?.teacherId || teacher?._id || '',
    periodId: student?.periodId || null,
    groupIds: student?.groupIds || []
  });

  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    studentId: false,
  });

  useEffect(() => {
    if (student) {
      setFormData({
        ...student,
        gradeLevel: student.gradeLevel || teacher?.gradeLevel || "",
        periodId: student.periodId || "",
        groupIds: student.groupIds || [],
      });
    } else {
      setFormData(prev => ({
        ...prev,
        gradeLevel: teacher?.gradeLevel || "",
      }));
    }
  }, [student, teacher]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const newErrors = {
      firstName: (formData.firstName || "").trim() === "",
      lastName: (formData.lastName || "").trim() === "",
      studentId: (formData.studentId || "").trim() === "",
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            error={errors.firstName}
            helperText={errors.firstName ? "First Name is required" : ""}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            error={errors.lastName}
            helperText={errors.lastName ? "Last Name is required" : ""}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Student ID"
            name="studentId"
            value={formData.studentId}
            onChange={handleChange}
            required
            error={errors.studentId}
            helperText={errors.studentId ? "Student ID is required" : ""}
            disabled={!!student}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Reading Level"
            name="readingLevel"
            value={formData.readingLevel}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="grade-level-label">Grade Level</InputLabel>
            <Select
              labelId="grade-level-label"
              name="gradeLevel"
              value={formData.gradeLevel || teacher?.gradeLevel || ''}
              onChange={handleSelectChange}
              disabled
            >
              <MenuItem value={teacher?.gradeLevel || ''}>
                {teacher?.gradeLevel || 'No Grade Level Set'}
              </MenuItem>
            </Select>
            <FormHelperText>Automatically set to teacher's grade level</FormHelperText>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="period-label">Period</InputLabel>
            <Select
              labelId="period-label"
              name="periodId"
              value={formData.periodId || ''}
              onChange={handleSelectChange}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="period1">Period 1</MenuItem>
              <MenuItem value="period2">Period 2</MenuItem>
              {/* Add your periods */}
              {/* ... other periods ... */}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            Save
          </Button>
          <Button onClick={onCancel} sx={{ ml: 2 }}>
            Cancel
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default StudentForm;
