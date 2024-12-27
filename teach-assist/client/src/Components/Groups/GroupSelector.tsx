import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import React from "react";


const GroupSelector = ({ onGroupChange }: { onGroupChange: (selectedOption: SelectChangeEvent<string>) => void }) => {
  // Replace with your group data fetching logic
  const groups = [
    { value: "group1", label: "Group 1" },
    { value: "group2", label: "Group 2" },
  ];
  const [selectedGroup, setSelectedGroup] = React.useState("");
  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedGroup(event.target.value);
    onGroupChange(event);
  };

  return (
    <div className="container">
      <Select
        onChange={handleChange}
        displayEmpty
        fullWidth
        style={{ width: "99%" }}
        value={selectedGroup}
      >
        <MenuItem value="" disabled>
          Select a group...
        </MenuItem>
        {groups.map((group) => (
          <MenuItem key={group.value} value={group.value}>
            {group.label}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
};
export default GroupSelector;
