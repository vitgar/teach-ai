// src/index.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { TeacherProvider } from "./context/TeacherContext";
import CssBaseline from "@mui/material/CssBaseline"; // Import CssBaseline for consistent styling
import "./index.css";

const theme = createTheme({
  // Customize your theme here if needed
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <TeacherProvider>
          <App />
        </TeacherProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
