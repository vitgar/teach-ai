import apiAxiosInstance from "../../../utils/axiosInstance";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

export const getGroupTypes = async () => {
  try {
    const response = await apiAxiosInstance.get(`${API_BASE_URL}/group-types`);
    return response.data;
  } catch (error) {
    console.error("Error fetching group types:", error);
    throw error;
  }
};

export const addGroupType = async (name: string) => {
  try {
    const response = await apiAxiosInstance.post(
      `${API_BASE_URL}/group-types`,
      {
        name,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error adding group type:", error);
    throw error;
  }
};

export const updateGroupType = async (id: string, name: string) => {
  try {
    const response = await apiAxiosInstance.put(
      `${API_BASE_URL}/group-types/${id}`,
      {
        name,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating group type:", error);
    throw error;
  }
};

export const deleteGroupType = async (id: string) => {
  try {
    const response = await apiAxiosInstance.delete(
      `${API_BASE_URL}/group-types/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting group type:", error);
    throw error;
  }
};
