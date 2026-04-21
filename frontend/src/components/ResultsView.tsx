import type { SimulationEntry } from "../types";
import { CodePanel } from "./CodePanel";
import { GraphPanel } from "./GraphPanel";
import { ReportPanel } from "./ReportPanel";

interface Props {
  simulation: SimulationEntry;
}

export const ResultsView = ({ simulation }: Props) => {
  return (
    <div className="space-y-6 pb-12">
      <ReportPanel report={simulation.report} />
      <GraphPanel data={simulation.simulationData} />
      <CodePanel code={simulation.simulationStepCode} />
    </div>
  );
};
