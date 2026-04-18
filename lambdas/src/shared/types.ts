export type FinanceState = {
  date: string; // 'YYYY-MM'
  values: { [bucket: string]: number };
};

export type SimulationEntry = {
  id: string;
  simulationName: string;
  createdAt: string;
  input: string;
  simulationData: FinanceState[];
  report: string;
  simulationStepCode: string;
};

export type SimulationHistory = {
  simulations: SimulationEntry[];
};

// --- Lambda request/response types ---

export type ReviewRequest = {
  financialInput: string;
};

export type ReviewResponse = {
  status: "approved" | "needs_clarification";
  questions?: string[];
};

export type SimulateRequest = {
  approvedInput: string;
  simulationId: string;
};

export type SimulateResponse = {
  simulationData: FinanceState[];
  report: string;
  simulationStepCode: string;
  durationMonths: number;
};

// Shape the LLM must return for code generation
export type CodeGenLLMResponse = {
  initialFinanceState: FinanceState;
  durationYears: number;
  durationMonths: number;
  simulationStepCode: string;
};

// Shape the LLM must return for gap analysis
export type ReviewLLMResponse = {
  status: "approved" | "needs_clarification";
  questions?: string[];
};
