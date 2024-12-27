import { SelectChangeEvent } from "@mui/material";

export interface GroupDropdownProps {
  groups: string[];
  selectedGroup: string;
  onSelectGroup: (event: SelectChangeEvent<string>) => void;
}
