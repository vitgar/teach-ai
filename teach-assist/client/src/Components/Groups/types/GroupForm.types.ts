// src/components/GroupForm/types/GroupForm.types.ts

import { Group } from "../../../Types/Group";
import { GroupRequest } from "../../../Types/GroupRequest";

export interface GroupFormProps {
  group?: Group; // The group to edit; undefined when adding a new group
  onSave: (group: GroupRequest) => void; // Function to handle saving the group
  onCancel: () => void; // Function to handle cancelling the form
}
