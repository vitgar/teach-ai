import React, { useState, useEffect } from "react";
import { Box, Button, Collapse, CircularProgress } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import axios from "axios";
import PeriodForm from "./PeriodForm";
import { Period } from "../../Types/Period";
import apiAxiosInstance from "../../utils/axiosInstance";

const PeriodList: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedPeriod, setSelectedPeriod] = useState<Period | undefined>(
    undefined
  );

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const response = await apiAxiosInstance.get(
        "http://localhost:5000/periods"
      );
      setPeriods(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching periods:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleAddPeriod = () => {
    setFormMode("add");
    setSelectedPeriod(undefined);
    setIsFormVisible(true);
  };

  const handleEditPeriod = () => {
    const periodToEdit = periods.find(
      (period) => period._id === selectedPeriodId
    );
    if (periodToEdit) {
      setFormMode("edit");
      setSelectedPeriod(periodToEdit);
      setIsFormVisible(true);
    } else {
      console.error("Period not found for editing");
    }
  };

  const handleDeletePeriod = async () => {
    if (selectedPeriodId) {
      try {
        await apiAxiosInstance.delete(
          `http://localhost:5000/periods/${selectedPeriodId}`
        );
        setPeriods((prevPeriods) =>
          prevPeriods.filter((p) => p._id !== selectedPeriodId)
        );
        setSelectedPeriodId(null);
      } catch (error) {
        console.error("Error deleting period:", error);
      }
    }
  };

  const handleSavePeriod = async (period: Period) => {
    try {
      if (formMode === "add") {
        // Exclude _id when adding a new period
        const { _id, ...periodData } = period;
        const response = await apiAxiosInstance.post(
          "http://localhost:5000/periods",
          periodData
        );
        setPeriods((prevPeriods) => [...prevPeriods, response.data]);
      } else {
        // Edit existing period
        const response = await apiAxiosInstance.put(
          `http://localhost:5000/periods/${period._id}`,
          period
        );
        setPeriods((prevPeriods) =>
          prevPeriods.map((p) => (p._id === period._id ? response.data : p))
        );
      }
      setIsFormVisible(false);
    } catch (error) {
      console.error("Error saving period:", error);
    }
  };

  const handleCancel = () => {
    setIsFormVisible(false);
  };

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", width: 150 },
    { field: "description", headerName: "Description", width: 200 },
    { field: "startTime", headerName: "Start Time", width: 120 },
    { field: "endTime", headerName: "End Time", width: 120 },
    {
      field: "gradeLevels",
      headerName: "Grade Levels",
      width: 150,
      valueGetter: (params: { row: Period }) => {
        const gradeLevels = params.row?.gradeLevels;
        return Array.isArray(gradeLevels) ? gradeLevels.join(", ") : "";
      },
    },
    {
      field: "daysOfWeek",
      headerName: "Days of Week",
      width: 150,
      valueGetter: (params: { row: Period }) => {
        const daysOfWeek = params.row?.daysOfWeek;
        return Array.isArray(daysOfWeek) ? daysOfWeek.join(", ") : "";
      },
    },
    { field: "subject", headerName: "Subject", width: 150 },
    { field: "roomNumber", headerName: "Room Number", width: 150 },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mt={2} gap={2}>
        <Button variant="contained" color="primary" onClick={handleAddPeriod}>
          Add Period
        </Button>
        <Button
          variant="contained"
          sx={{
            backgroundColor: "green",
            "&:hover": { backgroundColor: "darkgreen" },
          }}
          onClick={handleEditPeriod}
          disabled={!selectedPeriodId}
        >
          Edit Period
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeletePeriod}
          disabled={!selectedPeriodId}
        >
          Delete Period
        </Button>
      </Box>
      <Collapse in={isFormVisible}>
        <PeriodForm
          period={selectedPeriod}
          onSave={handleSavePeriod}
          onCancel={handleCancel}
        />
      </Collapse>
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
        <Box height={600} width="100%" mt={2}>
          <DataGrid<Period>
            rows={periods}
            columns={columns}
            getRowId={(row) => row._id!}
            onSelectionModelChange={(newSelection) => {
              setSelectedPeriodId(
                newSelection.length > 0 ? (newSelection[0] as string) : null
              );
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default PeriodList;
