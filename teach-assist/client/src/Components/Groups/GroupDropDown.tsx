// GroupDropDown.tsx
import React from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";
import { Group } from "@/Types/Group";

// type Group = {
//   _id: string;
//   name: string;
//   type: string;
// };

interface GroupDropdownProps {
  groups: Group[];
  selectedGroupId: string | null;
  onSelectGroup: (event: SelectChangeEvent<string>) => void;
}

export const GroupDropdown: React.FC<GroupDropdownProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
}) => {
  return (
    <FormControl variant="outlined">
      <InputLabel id="group-select-label">Select Group</InputLabel>
      <Select
        labelId="group-select-label"
        value={selectedGroupId || ""}
        onChange={onSelectGroup}
        label="Select Group"
      >
        {groups.map((group) => (
          <MenuItem key={group._id} value={group._id}>
            {group.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
