import type { SimulationEntry } from "../types";
import { SimulationCard } from "./SimulationCard";

interface Props {
  simulations: SimulationEntry[];
  onSelect: (id: string) => void;
}

export const SimulationGrid = ({ simulations, onSelect }: Props) => {
  const sorted = [...simulations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-500 text-sm">No simulations yet.</p>
        <p className="text-gray-600 text-xs mt-1">
          Click "New Simulation" to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((sim) => (
        <SimulationCard
          key={sim.id}
          simulation={sim}
          onClick={() => onSelect(sim.id)}
        />
      ))}
    </div>
  );
};
