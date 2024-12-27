// src/components/PrivateRoute.tsx

import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { TeacherContext, useTeacher } from "../context/TeacherContext";

const PrivateRoute: React.FC = () => {
  const { teacher } = useTeacher(); // Use the custom hook
  return teacher ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
