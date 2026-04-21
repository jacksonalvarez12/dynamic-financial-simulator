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

export type ReviewResponse = {
  status: "approved" | "needs_clarification";
  questions?: string[];
};

export type SimulateResponse = {
  simulationData: FinanceState[];
  report: string;
  simulationStepCode: string;
  durationMonths: number;
};
