// src/components/GroupForm/hooks/useGroupForm.ts

import { useState, useEffect } from "react";
import { Group } from "../../../Types/Group";
import { SelectChangeEvent } from "@mui/material";
import { GroupType } from "./useFetchGroupTypes"; // Ensure correct import path

interface UseGroupFormProps {
  group?: Group;
  typeOptions: GroupType[]; // Now typed as GroupType[]
}

interface FormData {
  name: string;
  description: string;
  type: string;
}

export const useGroupForm = ({ group, typeOptions }: UseGroupFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    name: group?.name || "",
    description: group?.description || "",
    type: group?.type || "",
  });

  const [customType, setCustomType] = useState<string>(group?.type || "");
  const [isCustomType, setIsCustomType] = useState<boolean>(false);

  useEffect(() => {
    if (group && !typeOptions.some((type) => type.name === group.type)) {
      setIsCustomType(true);
      setCustomType(group.type);
    } else {
      setIsCustomType(false);
      setCustomType("");
    }
  }, [group, typeOptions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTypeChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    if (value === "custom") {
      setIsCustomType(true);
      setFormData((prev) => ({
        ...prev,
        type: "",
      }));
    } else {
      setIsCustomType(false);
      setCustomType("");
      setFormData((prev) => ({
        ...prev,
        type: value,
      }));
    }
  };

  const handleCustomTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomType(value);
    setFormData((prev) => ({
      ...prev,
      type: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: group?.name || "",
      description: group?.description || "",
      type: group?.type || "",
    });
    setCustomType("");
    setIsCustomType(false);
  };

  return {
    formData,
    customType,
    isCustomType,
    handleChange,
    handleTypeChange,
    handleCustomTypeChange,
    resetForm,
  };
};
