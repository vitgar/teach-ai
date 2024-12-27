// src/components/Groups/GroupList.tsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Collapse,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridSelectionModel } from "@mui/x-data-grid";
import { useLocation, useSearchParams } from "react-router-dom";

import { Group } from "../../Types/Group";
import { GroupRequest } from "../../Types/GroupRequest";
import { Student } from "../../Types/Student";
import apiAxiosInstance from "../../utils/axiosInstance";
import { useTeacher } from "../../context/TeacherContext";
import GroupForm from "./GroupForm";
import AddRemoveStudentsDialog from "./AddRemoveStudentsDialog";

const GroupList: React.FC = () => {
  const { teacher } = useTeacher(); // Retrieve current teacher's data

  const location = useLocation();
  const { type } = location.state as { type?: string } || {};

  // Mapping origin to group type
  const originTypeMap: { [key: string]: string } = {
    "Guided Reading": "Guided Reading",
    "Intervention": "Intervention",
    "small-groups": "Small Groups",
    // Add more mappings as needed
  };

  // State Variables
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedGroup, setSelectedGroup] = useState<Group | undefined>(
    undefined
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isAssignStudentsOpen, setIsAssignStudentsOpen] =
    useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>([]); // Ensure this state is declared

  const [groupType, setGroupType] = useState<string | undefined>(undefined);
  const [formTitle, setFormTitle] = useState<string>(""); // New state for dynamic title

  // Fetch Groups
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await apiAxiosInstance.get<Group[]>("/api/groups");
      let fetchedGroups = response.data || [];

      // If origin is present, filter groups by type
      if (type) {
        const mappedType = originTypeMap[type];
        if (mappedType) {
          fetchedGroups = fetchedGroups.filter(
            (group) => group.type === mappedType
          );
        } else {
          console.warn(`No group type mapping found for origin: ${type}`);
        }
      }

      setGroups(fetchedGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setGroups([]);
      alert("Failed to fetch groups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch All Students
  const fetchAllStudents = async () => {
    try {
      const response = await apiAxiosInstance.get<Student[]>("/api/students");
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching all students:", error);
      alert("Failed to fetch students. Please try again.");
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchAllStudents();
  }, [type]); // Re-fetch groups if origin changes

  useEffect(() => {
    // If accessed via /add-group, show the add form
    if (location.pathname === '/add-group') {
      handleAddGroup();
    }
  }, [location.pathname]);

  // Handler Functions
  const handleAddGroup = () => {
    setFormMode("add");
    setSelectedGroup(undefined); // Clear selected group
    setSelectedGroupId(null); // Clear selected group ID
    setGroupType(type ? originTypeMap[type] || "General" : ""); // Set type based on origin or empty
    setFormTitle(type ? `Add ${originTypeMap[type] || "General"} Group` : "Add Group");
    setIsFormVisible(true);
  };

  const handleEditGroup = () => {
    const groupToEdit = groups.find((group) => group._id === selectedGroupId);
    if (groupToEdit) {
      setFormMode("edit");
      setSelectedGroup(groupToEdit); // Set the selected group with all its data
      setGroupType(groupToEdit.type); // Set the group type from the existing group
      setFormTitle(`Edit ${groupToEdit.name}`);
      setIsFormVisible(true);
    } else {
      console.error("Group not found for editing");
      alert("Selected group not found.");
    }
  };

  const handleDeleteGroup = () => {
    if (selectedGroupId) {
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteGroup = async () => {
    if (selectedGroupId) {
      try {
        await apiAxiosInstance.delete(`/api/groups/${selectedGroupId}`);
        setGroups((prevGroups) =>
          prevGroups.filter((g) => g._id !== selectedGroupId)
        );
        setSelectedGroupId(null);
        setIsDeleteDialogOpen(false);
        alert("Group deleted successfully.");
      } catch (error) {
        console.error("Error deleting group:", error);
        alert("Failed to delete group. Please try again.");
        setIsDeleteDialogOpen(false);
      }
    }
  };

  const cancelDeleteGroup = () => {
    setIsDeleteDialogOpen(false);
  };

  const handleSaveGroup = async (group: GroupRequest) => {
    console.log("Saving group:", group);
    try {
      if (formMode === "add") {
        const response = await apiAxiosInstance.post<Group>("/api/groups", group);
        setGroups((prevGroups) => [...prevGroups, response.data]);
        alert("Group added successfully.");
      } else if (selectedGroupId) {
        const response = await apiAxiosInstance.put<Group>(
          `/api/groups/${selectedGroupId}`,
          group
        );
        setGroups((prevGroups) =>
          prevGroups.map((g) => (g._id === selectedGroupId ? response.data : g))
        );
        alert("Group updated successfully.");
      }
      setIsFormVisible(false);
      setSelectedGroup(undefined);
      setSelectedGroupId(null);
      setGroupType(undefined);
      setFormTitle("");
      fetchGroups(); // Re-fetch groups to ensure updated data
    } catch (error: any) {
      console.error(
        "Error saving group:",
        error.response?.data || error.message
      );
      alert(
        `Error saving group: ${error.response?.data?.error || error.message}`
      );
    }
  };

  const handleCancel = () => {
    setIsFormVisible(false);
    setFormMode("add");
    setSelectedGroup(undefined);
    setSelectedGroupId(null);
    setGroupType(undefined);
    setFormTitle("");
  };

  // Handler to Open Assign Students Dialog
  const handleAssignStudents = async () => {
    if (selectedGroupId) {
      try {
        // Fetch existing group data
        const groupResponse = await apiAxiosInstance.get<Group>(
          `/api/groups/${selectedGroupId}`
        );
        const group: Group = groupResponse.data;
        setSelectedGroup(group);

        // Set selected students to those already in the group
        setSelectedStudentIds(group.students.map((student) => student._id!));

        setIsAssignStudentsOpen(true);
      } catch (error) {
        console.error("Error fetching group details:", error);
        alert("Failed to fetch group details. Please try again.");
      }
    }
  };

  // Handler to Toggle Student Selection
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Handler to Save Assigned Students
  const handleAssignStudentsSave = async (
    studentIds: string[],
    groupId: string
  ) => {
    try {
      if (groupId === "all") {
        // If "All Students" is selected, clear all students from the group
        await apiAxiosInstance.delete(
          `/api/groups/${selectedGroupId}/assign-students`
        );
        setGroups((prevGroups) =>
          prevGroups.map((g) =>
            g._id === selectedGroupId ? { ...g, students: [] } : g
          )
        );
        alert("All students removed from the group.");
      } else {
        // Assign selected students to the group
        await apiAxiosInstance.post(`/api/groups/${groupId}/assign-students`, {
          studentIds,
        });

        // Fetch the updated group
        const updatedGroupResponse = await apiAxiosInstance.get<Group>(
          `/api/groups/${groupId}`
        );
        const updatedGroup = updatedGroupResponse.data;

        setGroups((prevGroups) =>
          prevGroups.map((g) => (g._id === groupId ? updatedGroup : g))
        );
        alert("Students assigned successfully.");
      }
      setIsAssignStudentsOpen(false);
      setSelectedStudentIds([]);
      setSelectedGroup(undefined);
      fetchGroups(); // Re-fetch groups to ensure updated data
    } catch (error: any) {
      console.error(
        "Error assigning students:",
        error.response?.data || error.message
      );
      alert(
        `Error assigning students: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  };

  const handleAssignStudentsCancel = () => {
    setIsAssignStudentsOpen(false);
    setSelectedStudentIds([]);
  };

  // Handler for group selection changes in the dialog
  const handleGroupChange = (groupId: string) => {
    if (groupId === "all") {
      setSelectedStudentIds([]); // Uncheck all students
    } else {
      const group = groups.find((g) => g._id === groupId);
      if (group) {
        setSelectedStudentIds(group.students.map((s) => s._id!)); // Check students in the group
      } else {
        setSelectedStudentIds([]); // If group not found, uncheck all
      }
    }
  };

  // Define columns with GridColDef<Group>[]
  const columns: GridColDef<Group>[] = [
    { field: "name", headerName: "Name", width: 200 },
    { field: "description", headerName: "Description", width: 300 },
    { field: "type", headerName: "Type", width: 200 },
    {
      field: "studentCount",
      headerName: "Students",
      width: 150,
      valueGetter: (params) => params.row.students.length,
    },
  ];

  console.log("LOG GROUPS", groups);

  return (
    <Box>
      {/* Action Buttons */}
      <Box display="flex" justifyContent="flex-end" mt={2} gap={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddGroup}
          disabled={isFormVisible}
        >
          Add Group
        </Button>
        <Button
          variant="contained"
          sx={{
            backgroundColor: "green",
            "&:hover": { backgroundColor: "darkgreen" },
          }}
          onClick={handleEditGroup}
          disabled={!selectedGroupId || isFormVisible}
        >
          Edit Group
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteGroup}
          disabled={!selectedGroupId || isFormVisible}
        >
          Delete Group
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleAssignStudents}
          disabled={!selectedGroupId || isFormVisible}
        >
          Modify Students
        </Button>
      </Box>

      {/* Group Form */}
      <Collapse in={isFormVisible}>
        <GroupForm
          group={selectedGroup}
          onSave={handleSaveGroup}
          onCancel={handleCancel}
          groupType={groupType} // Pass the fixed group type
          formTitle={formTitle} // Pass the dynamic title
        />
      </Collapse>

      {/* DataGrid for Groups */}
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100vh"
        >
          <CircularProgress />
        </Box>
      ) : (
        <Box
          height={600}
          width="100%"
          mt={2}
          sx={{
            pointerEvents: isFormVisible ? "none" : "auto",
            opacity: isFormVisible ? 0.5 : 1,
          }}
        >
          <DataGrid<Group>
            rows={groups || []}
            columns={columns}
            getRowId={(row) => row._id} // Use '_id' as the unique identifier
            onSelectionModelChange={(newSelection: GridSelectionModel) => {
              if (!isFormVisible) {
                const selectedId = newSelection[0] as string;
                setSelectedGroupId(selectedId || null);
              }
            }}
            selectionModel={selectedGroupId ? [selectedGroupId] : []}
            isRowSelectable={() => !isFormVisible}
            // Removed 'disableMultipleSelection'
            // Removed 'checkboxSelection' for single selection
          />
        </Box>
      )}

      {/* Confirmation Dialog for Deletion */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={cancelDeleteGroup}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography id="alert-dialog-description">
            Are you sure you want to delete this group? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteGroup} color="inherit">
            Cancel
          </Button>
          <Button onClick={confirmDeleteGroup} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Remove Students Dialog */}
      <AddRemoveStudentsDialog
        open={isAssignStudentsOpen}
        onClose={handleAssignStudentsCancel}
        onSave={handleAssignStudentsSave}
        groups={groups}
        students={students}
        selectedStudentIds={selectedStudentIds}
        selectedGroup={selectedGroup}
        onToggleStudent={handleToggleStudent}
        onGroupChange={handleGroupChange} // Pass the handler
      />
    </Box>
  );
};

export default GroupList;
