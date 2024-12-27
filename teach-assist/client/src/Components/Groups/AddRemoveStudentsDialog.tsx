// src/components/GroupList/AddRemoveStudentsDialog.tsx

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { Student } from "../../Types/Student";
import { Group } from "../../Types/Group";

interface AddRemoveStudentsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (studentIds: string[], groupId: string) => void;
  groups: Group[];
  students: Student[];
  selectedStudentIds: string[];
  selectedGroup?: Group;
  onToggleStudent: (studentId: string) => void;
  onGroupChange: (groupId: string) => void; // New prop
}

const AddRemoveStudentsDialog: React.FC<AddRemoveStudentsDialogProps> = ({
  open,
  onClose,
  onSave,
  groups,
  students,
  selectedStudentIds,
  selectedGroup,
  onToggleStudent,
  onGroupChange,
}) => {
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>("all"); // 'all' represents All Students

  React.useEffect(() => {
    if (selectedGroup) {
      setSelectedGroupId(selectedGroup._id);
    } else {
      setSelectedGroupId("all");
    }
  }, [selectedGroup, open]);

  const handleGroupChange = (
    event: SelectChangeEvent<string>,
    child: React.ReactNode
  ) => {
    const newGroupId = event.target.value;
    setSelectedGroupId(newGroupId);
    onGroupChange(newGroupId); // Notify parent about the change
  };

  const handleSave = () => {
    if (selectedGroupId === "all") {
      // Pass 'all' as groupId to indicate clearing all students
      onSave([], "all");
    } else {
      onSave(selectedStudentIds, selectedGroupId);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="add-remove-students-dialog-title"
    >
      <DialogTitle id="add-remove-students-dialog-title">
        Add/Remove Students from Group
      </DialogTitle>
      <DialogContent>
        <Box mt={2}>
          {/* Group Dropdown */}
          <Box mb={2}>
            <FormControl fullWidth>
              <InputLabel id="group-select-label">Select Group</InputLabel>
              <Select<string>
                labelId="group-select-label"
                value={selectedGroupId}
                label="Select Group"
                onChange={handleGroupChange} // Correctly typed handler
              >
                <MenuItem key="all" value="all">
                  <em>All Students</em>
                </MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group._id} value={group._id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Students List */}
          {students.length === 0 ? (
            <Typography>
              No students available
              {selectedGroupId !== "all" ? " for the selected group." : "."}
            </Typography>
          ) : (
            <List>
              {students.map((student) => (
                <ListItem key={student._id} dense>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedStudentIds.includes(student._id!)}
                        onChange={() => onToggleStudent(student._id!)}
                        color="primary"
                      />
                    }
                    label={`${student.firstName} ${student.lastName}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          disabled={
            selectedStudentIds.length === 0 && selectedGroupId !== "all"
          }
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddRemoveStudentsDialog;
