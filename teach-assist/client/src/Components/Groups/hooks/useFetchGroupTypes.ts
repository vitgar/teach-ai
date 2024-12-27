// src/components/GroupForm/hooks/useFetchGroupTypes.ts

import { useState, useEffect } from "react";
import apiAxiosInstance from "../../../utils/axiosInstance";

// Define the GroupType interface
export interface GroupType {
  _id: string;
  name: string;
  __v: number;
}

export const useFetchGroupTypes = () => {
  const [typeOptions, setTypeOptions] = useState<GroupType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(false);
  const [errorTypes, setErrorTypes] = useState<string | null>(null);

  const fetchGroupTypes = async () => {
    setLoadingTypes(true);
    try {
      const response = await apiAxiosInstance.get<GroupType[]>("/group-types");
      setTypeOptions(response.data);
      setLoadingTypes(false);
    } catch (error: any) {
      console.error("Error fetching group types:", error);
      setErrorTypes(error.message || "Failed to fetch group types.");
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    fetchGroupTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    typeOptions,
    loadingTypes,
    errorTypes,
    setTypeOptions,
    fetchGroupTypes,
  };
};
