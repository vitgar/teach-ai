const Joi = require("joi");

// Validation Schema for Next Steps
const nextStepsSchema = Joi.object({
  nextSteps: Joi.string().required(),
  resources: Joi.string().allow(""),
  groupId: Joi.string().required(),
  date: Joi.date().iso().required(),
  nextStepsType: Joi.string().valid("GuidedReading").required(),
  teacherId: Joi.string().required(),
});

// Function to validate next steps
function validateNextSteps(data) {
  return nextStepsSchema.validate(data);
}

module.exports = { validateNextSteps }; 