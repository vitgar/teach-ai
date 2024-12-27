import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
} from "@mui/material";
import { Period } from "../../Types/Period";
import { makeStyles } from "@mui/styles";

interface PeriodFormProps {
  period?: Period;
  onSave: (period: Period) => Promise<void>;
  onCancel: () => void;
}

const useStyles = makeStyles((theme: any) => ({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxWidth: "600px",
    margin: "auto",
    padding: "16px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#1976d2",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#115293",
    },
  },
}));

const PeriodForm: React.FC<PeriodFormProps> = ({
  period,
  onSave,
  onCancel,
}) => {
  const classes = useStyles();
  const [formData, setFormData] = useState<Period>({
    _id: "",
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    gradeLevels: [],
    daysOfWeek: [],
    subject: "",
    roomNumber: "",
  });

  useEffect(() => {
    if (period) {
      setFormData({
        ...period,
      });
    } else {
      // Reset form data when adding a new period
      setFormData({
        _id: "",
        name: "",
        description: "",
        startTime: "",
        endTime: "",
        gradeLevels: [],
        daysOfWeek: [],
        subject: "",
        roomNumber: "",
      });
    }
  }, [period]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSelectChange = (
    e: SelectChangeEvent<string[]>,
    field: string
  ) => {
    const value = e.target.value as string[];
    setFormData((prevData) => ({ ...prevData, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const gradeLevelOptions = [
    "K",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ];
  const daysOfWeekOptions = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];

  return (
    <Box component="form" className={classes.form} onSubmit={handleSubmit}>
      <TextField
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        fullWidth
        required
        margin="normal"
      />
      <TextField
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Start Time"
        name="startTime"
        type="time"
        value={formData.startTime}
        onChange={handleChange}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="End Time"
        name="endTime"
        type="time"
        value={formData.endTime}
        onChange={handleChange}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />
      <FormControl fullWidth margin="normal">
        <InputLabel id="grade-levels-label">Grade Levels</InputLabel>
        <Select
          label="grade-levels-label"
          multiple
          value={formData.gradeLevels}
          onChange={(e) => handleSelectChange(e, "gradeLevels")}
          renderValue={(selected) => (selected as string[]).join(", ")}
        >
          {gradeLevelOptions.map((grade) => (
            <MenuItem key={grade} value={grade}>
              <Checkbox checked={formData.gradeLevels.includes(grade)} />
              <span>{grade}</span>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth margin="normal">
        <InputLabel id="days-of-week-label">Days of the Week</InputLabel>
        <Select
          label="days-of-week-label"
          multiple
          value={formData.daysOfWeek}
          onChange={(e) => handleSelectChange(e, "daysOfWeek")}
          renderValue={(selected) => (selected as string[]).join(", ")}
        >
          {daysOfWeekOptions.map((day) => (
            <MenuItem key={day} value={day}>
              <Checkbox checked={formData.daysOfWeek.includes(day)} />
              <span>{day}</span>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Subject"
        name="subject"
        value={formData.subject}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Room Number"
        name="roomNumber"
        value={formData.roomNumber}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <Box display="flex" justifyContent="flex-end" mt={2} gap={2}>
        <Button variant="contained" color="primary" type="submit">
          Save
        </Button>
        <Button variant="contained" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default PeriodForm;
