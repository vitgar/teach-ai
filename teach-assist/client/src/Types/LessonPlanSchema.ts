export class LessonPlanSchema {
  "title": "string";
  "gradeLevel": "string";
  "subject": "string";
  "duration": "string";
  "objectives": [
    {
      id: "string";
      description: "string";
      importanceLevel: "string";
    }
  ];
  "materials": [
    {
      id: "string";
      name: "string";
      quantity: "string";
      optional: "boolean";
    }
  ];
  "activities": [
    {
      id: "string";
      title: "string";
      description: "string";
      type: "string";
      duration: "string";
      materialsNeeded: ["string"];
      steps: [
        {
          stepNumber: "integer";
          instruction: "string";
        }
      ];
    }
  ];
  "assessment": {
    type: "string";
    tools: [
      {
        id: "string";
        name: "string";
        criteria: "string";
      }
    ];
  };
  "differentiation": [
    {
      id: "string";
      strategy: "string";
      targetGroup: "string";
      description: "string";
    }
  ];
  "homework": {
    description: "string";
    dueDate: "string";
  };
  "extensions": [
    {
      id: "string";
      title: "string";
      description: "string";
    }
  ];
  "notes": "string";
  "type": "object";
  "properties": {};
  "required": [];
}
