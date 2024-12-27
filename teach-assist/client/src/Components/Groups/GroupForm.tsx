// src/components/Groups/GroupForm.tsx

import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { GroupRequest } from "../../Types/GroupRequest";
import { Group } from "../../Types/Group";
import apiAxiosInstance from "../../utils/axiosInstance";

interface GroupType {
  _id: string;
  name: string;
}

interface GroupFormProps {
  group?: Group;
  onSave: (group: GroupRequest) => void;
  onCancel: () => void;
  formTitle?: string;
  groupType?: string;
}

const GroupForm: React.FC<GroupFormProps> = ({
  group,
  onSave,
  onCancel,
  formTitle,
  groupType,
}) => {
  // State variables
  const [name, setName] = useState<string>(group?.name || "");
  const [description, setDescription] = useState<string>(group?.description || "");
  const [type, setType] = useState<string>(group?.type || groupType || "");
  const [groupTypes, setGroupTypes] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Update form when group prop changes
  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description);
      setType(group.type);
    } else {
      setName("");
      setDescription("");
      setType(groupType || "");
    }
  }, [group, groupType]);

  // Fetch group types
  useEffect(() => {
    const fetchGroupTypes = async () => {
      try {
        const response = await apiAxiosInstance.get<GroupType[]>("/api/group-types");
        setGroupTypes(response.data);
      } catch (error) {
        console.error("Error fetching group types:", error);
      }
    };
    fetchGroupTypes();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      alert("Please select or enter a group type");
      return;
    }

    setLoading(true);
    try {
      // If type is not in existing group types, create it
      if (!groupTypes.some(gt => gt.name === type)) {
        const response = await apiAxiosInstance.post<GroupType>("/api/group-types", { name: type });
        setGroupTypes(prev => [...prev, response.data]);
      }

      // Save the group
      const groupData: GroupRequest = {
        name,
        description,
        type,
      };
      onSave(groupData);
    } catch (error) {
      console.error("Error saving group:", error);
      alert("Failed to save group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "16px",
        marginTop: "16px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <Typography variant="h6" gutterBottom>
        {formTitle || "Add Group"}
      </Typography>

      <TextField
        label="Group Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        required
        margin="normal"
      />

      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        multiline
        rows={4}
        margin="normal"
      />

      <Autocomplete
        value={type}
        onChange={(event: any, newValue: string | null) => {
          setType(newValue || "");
        }}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        options={groupTypes.map(gt => gt.name)}
        freeSolo
        renderInput={(params) => (
          <TextField
            {...params}
            label="Group Type"
            required
            margin="normal"
            helperText="Select an existing type or enter a new one"
          />
        )}
      />

      <Box mt={2} display="flex" justifyContent="flex-end" gap={2}>
        <Button onClick={onCancel} color="inherit">
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Save"}
        </Button>
      </Box>
    </Box>
  );
};

export default GroupForm;
