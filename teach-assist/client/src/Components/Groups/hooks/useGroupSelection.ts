import { SelectChangeEvent } from "@mui/material";
import { useState } from "react";

export const useGroupSelection = (initialGroup: string) => {
  const [selectedGroup, setSelectedGroup] = useState(initialGroup);

  const handleSelectGroup = (event: SelectChangeEvent<string>) => {
    setSelectedGroup(event.target.value);
  };

  return { selectedGroup, handleSelectGroup };
};
