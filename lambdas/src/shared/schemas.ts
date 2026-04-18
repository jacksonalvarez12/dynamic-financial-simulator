import Joi from "joi";

// --- FinanceState ---

export const financeStateSchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "date must be in YYYY-MM format",
    }),
  values: Joi.object()
    .pattern(Joi.string(), Joi.number().required())
    .required(),
});

// --- LLM code gen response ---

export const codeGenResponseSchema = Joi.object({
  initialFinanceState: financeStateSchema.required(),
  durationYears: Joi.number().integer().min(0).max(100).required(),
  durationMonths: Joi.number().integer().min(0).max(11).required(),
  simulationStepCode: Joi.string().min(50).max(10000).required(),
});

// --- LLM review response ---

export const reviewLLMResponseSchema = Joi.object({
  status: Joi.string().valid("approved", "needs_clarification").required(),
  questions: Joi.when("status", {
    is: "needs_clarification",
    then: Joi.array().items(Joi.string()).min(1).required(),
    otherwise: Joi.forbidden(),
  }),
});

// --- Lambda request bodies ---

export const reviewRequestSchema = Joi.object({
  financialInput: Joi.string().min(20).max(5000).required(),
});

export const simulateRequestSchema = Joi.object({
  approvedInput: Joi.string().min(20).max(5000).required(),
  simulationId: Joi.string().uuid().required(),
  userId: Joi.any().forbidden(),
});

export const renameSimulationSchema = Joi.object({
  simulationName: Joi.string().min(1).max(100).required(),
});
