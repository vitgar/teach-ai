// src/components/Auth/Register.tsx

import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { TextField, Button, Typography, Container, Box } from "@mui/material";

import axios from "axios";
import { TeacherContext, useTeacher } from "../context/TeacherContext";

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gradeLevel: string;
  subject: string;
  standards: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    gradeLevel: "",
    subject: "",
    standards: "",
  });

  const [error, setError] = useState<string | null>(null);
  const { teacher, setTeacher } = useTeacher(); // Use the custom hook
  const navigate = useNavigate();

  const {
    firstName,
    lastName,
    email,
    password,
    gradeLevel,
    subject,
    standards,
  } = formData;

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Reset error message
    try {
      const res = await axios.post("/auth/register", formData);
      const { token } = res.data;

      // Save token to localStorage
      localStorage.setItem("token", token);

      // Fetch authenticated teacher's data
      const teacherRes = await axios.get("/auth");
      setTeacher(teacherRes.data);

      // Redirect to dashboard or home
      navigate("/dashboard");
    } catch (err) {
      // Type-safe error handling
      if (axios.isAxiosError(err)) {
        if (
          err.response &&
          err.response.data &&
          typeof err.response.data.error === "string"
        ) {
          setError(err.response.data.error);
        } else {
          setError("An unexpected error occurred.");
        }
      } else {
        setError("An unexpected error occurred.");
      }
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100vh"
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Register
        </Typography>
        <form onSubmit={onSubmit} style={{ width: "100%" }}>
          <TextField
            label="First Name"
            name="firstName"
            value={firstName}
            onChange={onChange}
            variant="outlined"
            margin="normal"
            required
            fullWidth
          />
          <TextField
            label="Last Name"
            name="lastName"
            value={lastName}
            onChange={onChange}
            variant="outlined"
            margin="normal"
            required
            fullWidth
          />
          <TextField
            label="Email"
            name="email"
            value={email}
            onChange={onChange}
            variant="outlined"
            margin="normal"
            required
            fullWidth
            type="email"
          />
          <TextField
            label="Password"
            name="password"
            value={password}
            onChange={onChange}
            variant="outlined"
            margin="normal"
            required
            fullWidth
            type="password"
          />
          <TextField
            label="Grade Level"
            name="gradeLevel"
            value={gradeLevel}
            onChange={onChange}
            variant="outlined"
            margin="normal"
            required
            fullWidth
          />
          <TextField
            label="Subject"
            name="subject"
            value={subject}
            onChange={onChange}
            variant="outlined"
            margin="normal"
            required
            fullWidth
          />
          <TextField
            label="Standards"
            name="standards"
            value={standards}
            onChange={onChange}
            variant="outlined"
            margin="normal"
            required
            fullWidth
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ marginTop: 2 }}
          >
            Register
          </Button>
        </form>
        <Box mt={2}>
          <Typography variant="body2">
            Already have an account? <a href="/login">Login</a>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Register;
