import React, { useState } from "react";
import axios from "axios";
import { TextField, Button, Box, SelectChangeEvent } from "@mui/material";
import { makeStyles } from "@mui/styles";
import apiAxiosInstance from "../../utils/axiosInstance";

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

const Students = () => {
  const classes = useStyles();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    studentId: "",
    readingLevel: "",
    intervention: "",
    interventionResults: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiAxiosInstance.post(
        "/api/students",
        formData
      );
      console.log("Student Info saved:", response.data);
      alert("Student added successfully");
    } catch (error) {
      console.error("There was an error adding the student!", error);
    }
  };

  return (
    <Box component="form" className={classes.form} onSubmit={handleSubmit}>
      <TextField
        label="First Name"
        name="firstName"
        variant="outlined"
        value={formData.firstName}
        onChange={handleChange}
        required
      />
      <TextField
        label="Last Name"
        name="lastName"
        variant="outlined"
        value={formData.lastName}
        onChange={handleChange}
        required
      />
      <TextField
        label="Student ID"
        name="studentId"
        variant="outlined"
        value={formData.studentId}
        onChange={handleChange}
        required
      />
      <TextField
        label="Reading Level"
        name="readingLevel"
        variant="outlined"
        value={formData.readingLevel}
        onChange={handleChange}
        required
      />
      <TextField
        label="Intervention"
        name="Intervention"
        variant="outlined"
        value={formData.intervention}
        onChange={handleChange}
      />
      <TextField
        label="Intervention Results"
        name="interventionResults"
        variant="outlined"
        value={formData.interventionResults}
        onChange={handleChange}
      />
      <Button type="submit" variant="contained" className={classes.button}>
        Add Student
      </Button>
    </Box>
  );
};

export default Students;
