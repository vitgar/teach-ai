import React, { useState, useEffect } from "react";
import axios from "axios";
import { DataGrid, GridColDef, GridRowId } from "@mui/x-data-grid";
import {
  Box,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Collapse,
  SelectChangeEvent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import { Delete, Edit } from '@mui/icons-material';
import { Student, NewStudent } from "@/Types/Student";
import StudentForm from "./StudentForm";
import apiAxiosInstance from "../../utils/axiosInstance";
import { useTeacher } from "../../context/TeacherContext";

const StudentList: React.FC = () => {
  const { teacher } = useTeacher();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>(
    undefined
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number>(5);

  const fetchStudents = async () => {
    if (!teacher?._id) {
      setError("No teacher ID found");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiAxiosInstance.get(`/api/students?teacherId=${teacher._id}`);
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [teacher?._id]);

  const filterStudents = () => {
    let filtered = [...students];

    if (period && period !== "0") {
      filtered = filtered.filter((student) => student.periodId === period);
    }

    setSelectedStudents(filtered);
  };

  useEffect(() => {
    filterStudents();
  }, [period, students]);

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setPeriod(event.target.value);
  };

  const handleAddStudent = () => {
    setFormMode("add");
    setSelectedStudent(undefined);
    setIsFormVisible(true);
  };

  const handleEditClick = () => {
    if (selectedIds.length === 1) {
      const studentToEdit = students.find(
        (student) => student._id === selectedIds[0]
      );
      if (studentToEdit) {
        setFormMode("edit");
        setSelectedStudent(studentToEdit);
        setIsFormVisible(true);
      }
    }
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await apiAxiosInstance.post('/api/students/bulk-delete', {
        studentIds: selectedIds
      });
      await fetchStudents(); // Refresh the list
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error deleting students:', error);
      setError('Failed to delete students. Please try again.');
    }
  };

  const handleSaveStudent = async (student: NewStudent) => {
    if (!teacher?._id) {
      setError("No teacher ID found");
      return;
    }

    try {
      if (formMode === "add") {
        const studentWithTeacher = {
          ...student,
          teacherId: teacher._id,
          gradeLevel: teacher.gradeLevel,
          periodId: student.periodId || null
        };
        
        const response = await apiAxiosInstance.post("/api/students", studentWithTeacher);
        setStudents(prevStudents => [...prevStudents, response.data.student]);
      } else {
        const updatedStudent = {
          ...student,
          periodId: student.periodId || null,
          teacherId: teacher._id,
          groupIds: student.groupIds || []
        };
        
        await apiAxiosInstance.put(`/api/students/${student._id}`, updatedStudent);
        setStudents(prevStudents =>
          prevStudents.map((s) => (s._id === student._id ? updatedStudent as Student : s))
        );
      }
      setIsFormVisible(false);
    } catch (error) {
      console.error("Error saving student:", error);
      setError("Failed to save student. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsFormVisible(false);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      // Filter out any undefined _ids
      setSelectedIds(students.filter(s => s._id).map(s => s._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    const selectedIndex = selectedIds.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selectedIds, id];
    } else {
      newSelected = selectedIds.filter(item => item !== id);
    }

    setSelectedIds(newSelected);
  };

  const columns: GridColDef[] = [
    { field: "firstName", headerName: "First Name", flex: 1 },
    { field: "lastName", headerName: "Last Name", flex: 1 },
    { field: "studentId", headerName: "Student ID", flex: 1 },
    { field: "gradeLevel", headerName: "Grade Level", flex: 1 },
    { field: "readingLevel", headerName: "Reading Level", flex: 1 },
  ];

  return (
    <Box sx={{ height: '100%', width: '100%', p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <FormControl variant="outlined" fullWidth sx={{ mb: 2 }}>
        <InputLabel id="select-period-label">Select Period</InputLabel>
        <Select
          labelId="select-period-label"
          value={period}
          onChange={handlePeriodChange}
          label="Select Period"
        >
          <MenuItem value="0">All Students</MenuItem>
          <MenuItem value="1">Period 1</MenuItem>
          <MenuItem value="2">Period 2</MenuItem>
        </Select>
      </FormControl>

      <Box display="flex" justifyContent="flex-end" mb={2} gap={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleEditClick}
          disabled={selectedIds.length !== 1}
          startIcon={<Edit />}
        >
          Edit
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteClick}
          disabled={selectedIds.length === 0}
          startIcon={<Delete />}
        >
          Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
        </Button>
      </Box>

      <Collapse in={isFormVisible}>
        <Box mb={2}>
          <StudentForm
            student={selectedStudent}
            onSubmit={handleSaveStudent}
            onCancel={handleCancel}
          />
        </Box>
      </Collapse>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={selectedStudents}
            columns={columns}
            getRowId={(row: Student) => row._id}
            checkboxSelection
            disableSelectionOnClick
            onSelectionModelChange={(newSelectionModel) => {
              setSelectedIds(newSelectionModel.map(String));
            }}
            pageSize={pageSize}
            onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
            rowsPerPageOptions={[5, 10, 20, 50]}
            pagination
            autoHeight
          />
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedIds.length} student{selectedIds.length !== 1 ? 's' : ''}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentList;
