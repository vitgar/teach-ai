import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  SelectChangeEvent,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import apiAxiosInstance from "../../utils/axiosInstance";

// TOTO: SHOW TEACHER INFORMATION, GIVE OPTION TO EDIT, THIS WILL BE THE PROFILE PAGE
//CREATE A PROFILE ICON AND REMOVE THIS ELEMENT FROM THE LEFT MENU AND ADD IT TO THE TOP RIGHT CORNER
//CREATE A PROFILE PAGE FOR THE TEACHER
//MAKE GRADE LEVE OPTIONAL, MAYBE ADD A LIST OF GRADE LEVELS WHERE  THE TEACHER CAN SELECT THE GRADE LEVELS TAUGHT
// ADD SUBJECTS TAUGHT BY TEACHER, MAYBE A LIST WITH OPTIONS THAT THE TEACHER CAN SELECT FROM
// ADD A PROFILE PICTURE
// ADD A BIOGRAPHY
// ADD A LIST OF STUDENTS TAUGHT BY TEACHER
// ADD A LIST OF TESTS
// MAYBE THE FOLLOWING CAN BE ADDED TO THE PROFILE
// ADD A LIST OF PARENTS OF STUDENTS TAUGHT BY TEACHER
// ADD A LIST OF ASSIGNMENTS

// ADD A LIST OF ATTENDANCE
// ADD A LIST OF BEHAVIOR

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

const TeacherInfoForm = () => {
  const classes = useStyles();
  const [teacherInfo, setTeacherInfo] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    address: "",
    schoolDistrict: "",
    gradeLevel: "",
    schoolAddress: "",
    email: "",
    phone: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target;
    setTeacherInfo({
      ...teacherInfo,
      [name as string]: value,
    });
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setTeacherInfo({
      ...teacherInfo,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiAxiosInstance.post(
        "http://localhost:5000/teachers",
        teacherInfo
      );
      console.log("Teacher Info saved:", response.data);
    } catch (error) {
      console.error("There was an error saving the teacher info!", error);
    }
  };

  return (
    <Box component="form" className={classes.form} onSubmit={handleSubmit}>
      <TextField
        label="First Name"
        name="firstName"
        variant="outlined"
        value={teacherInfo.firstName}
        onChange={handleChange}
        required
      />
      <TextField
        label="Middle Initial"
        name="middleInitial"
        variant="outlined"
        value={teacherInfo.middleInitial}
        onChange={handleChange}
      />
      <TextField
        label="Last Name"
        name="lastName"
        variant="outlined"
        value={teacherInfo.lastName}
        onChange={handleChange}
        required
      />
      <TextField
        label="Address"
        name="address"
        variant="outlined"
        value={teacherInfo.address}
        onChange={handleChange}
        required
      />
      <TextField
        label="School District"
        name="schoolDistrict"
        variant="outlined"
        value={teacherInfo.schoolDistrict}
        onChange={handleChange}
        required
      />
      <FormControl variant="outlined" required>
        <InputLabel>Grade Level</InputLabel>
        <Select
          name="gradeLevel"
          value={teacherInfo.gradeLevel}
          onChange={handleSelectChange}
          label="Grade Level"
        >
          <MenuItem value="Kindergarten">Kindergarten</MenuItem>
          <MenuItem value="1st Grade">1st Grade</MenuItem>
          <MenuItem value="2nd Grade">2nd Grade</MenuItem>
          <MenuItem value="3rd Grade">3rd Grade</MenuItem>
          <MenuItem value="4th Grade">4th Grade</MenuItem>
          <MenuItem value="5th Grade">5th Grade</MenuItem>
          <MenuItem value="6th Grade">6th Grade</MenuItem>
          <MenuItem value="7th Grade">7th Grade</MenuItem>
          <MenuItem value="8th Grade">8th Grade</MenuItem>
          <MenuItem value="9th Grade">9th Grade</MenuItem>
          <MenuItem value="10th Grade">10th Grade</MenuItem>
          <MenuItem value="11th Grade">11th Grade</MenuItem>
          <MenuItem value="12th Grade">12th Grade</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="School Address"
        name="schoolAddress"
        variant="outlined"
        value={teacherInfo.schoolAddress}
        onChange={handleChange}
        required
      />
      <TextField
        label="Email"
        name="email"
        variant="outlined"
        value={teacherInfo.email}
        onChange={handleChange}
        required
      />
      <TextField
        label="Phone"
        name="phone"
        variant="outlined"
        value={teacherInfo.phone}
        onChange={handleChange}
        required
      />
      <Button type="submit" variant="contained" className={classes.button}>
        Submit
      </Button>
    </Box>
  );
};

export default TeacherInfoForm;
