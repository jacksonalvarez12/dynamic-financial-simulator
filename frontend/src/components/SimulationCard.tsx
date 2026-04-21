import type { SimulationEntry } from "../types";

interface Props {
  simulation: SimulationEntry;
  onClick: () => void;
}

export const SimulationCard = ({ simulation, onClick }: Props) => {
  const monthCount = simulation.simulationData.length;
  const buckets =
    simulation.simulationData.length > 0
      ? Object.keys(simulation.simulationData[0].values)
      : [];

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors group"
    >
      <h3 className="text-sm font-medium text-white group-hover:text-white truncate">
        {simulation.simulationName}
      </h3>
      <p className="text-xs text-gray-500 mt-1">
        {new Date(simulation.createdAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        <span>{monthCount} months</span>
        {buckets.length > 0 && (
          <span className="truncate">
            {buckets.slice(0, 3).join(", ")}
            {buckets.length > 3 ? "…" : ""}
          </span>
        )}
      </div>
    </button>
  );
};
