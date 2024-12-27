// src/components/GroupForm/utils/addGroupType.ts

import apiAxiosInstance from "../../../utils/axiosInstance";
import { GroupType } from "../hooks/useFetchGroupTypes";

/**
 * Adds a new group type to the server.
 * @param newType - The new group type to add.
 * @returns The newly created GroupType object.
 */
export const addGroupType = async (newType: string): Promise<GroupType> => {
  try {
    const response = await apiAxiosInstance.post<GroupType>("/group-types", {
      name: newType,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
