import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Toolbar,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { Student } from '@/Types/Student';

interface StudentListProps {
  students: Student[];
  onDelete: (studentIds: string[]) => void;
  onEdit: (student: Student) => void;
}

const StudentList: React.FC<StudentListProps> = ({ students, onDelete, onEdit }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(students.map(student => student._id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(item => item !== id);
    }

    setSelected(newSelected);
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(selected);
    setSelected([]);
    setDeleteConfirmOpen(false);
  };

  const handleEditClick = (student: Student) => {
    setEditStudent(student);
  };

  const isSelected = (id: string) => selected.includes(id);

  return (
    <>
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          bgcolor: selected.length > 0 ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
        }}
      >
        {selected.length > 0 ? (
          <>
            <Typography
              sx={{ flex: '1 1 100%' }}
              color="inherit"
              variant="subtitle1"
              component="div"
            >
              {selected.length} selected
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={handleDeleteClick}
            >
              Delete
            </Button>
          </>
        ) : (
          <Typography variant="h6" component="div" sx={{ flex: '1 1 100%' }}>
            Students
          </Typography>
        )}
      </Toolbar>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < students.length}
                  checked={students.length > 0 && selected.length === students.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Student ID</TableCell>
              <TableCell>Grade Level</TableCell>
              <TableCell>Reading Level</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => {
              const isItemSelected = isSelected(student._id);
              return (
                <TableRow
                  key={student._id}
                  selected={isItemSelected}
                  hover
                  onClick={() => handleSelect(student._id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={isItemSelected} />
                  </TableCell>
                  <TableCell>{`${student.firstName} ${student.lastName}`}</TableCell>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell>{student.gradeLevel}</TableCell>
                  <TableCell>{student.readingLevel}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(student);
                      }}
                      disabled={selected.length > 1}
                    >
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {selected.length} student{selected.length !== 1 ? 's' : ''}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog
        open={Boolean(editStudent)}
        onClose={() => setEditStudent(null)}
      >
        <DialogTitle>Edit Student</DialogTitle>
        <DialogContent>
          {editStudent && (
            <form>
              <TextField
                margin="dense"
                label="First Name"
                fullWidth
                defaultValue={editStudent.firstName}
              />
              <TextField
                margin="dense"
                label="Last Name"
                fullWidth
                defaultValue={editStudent.lastName}
              />
              <TextField
                margin="dense"
                label="Reading Level"
                fullWidth
                defaultValue={editStudent.readingLevel}
              />
              <TextField
                margin="dense"
                label="Grade Level"
                fullWidth
                defaultValue={editStudent.gradeLevel}
              />
            </form>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditStudent(null)}>Cancel</Button>
          <Button onClick={() => {
            if (editStudent) {
              onEdit(editStudent);
              setEditStudent(null);
            }
          }} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StudentList;
