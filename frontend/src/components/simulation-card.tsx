import { useEffect, useRef, useState } from "react";
import type { SimulationEntry } from "../types";

interface Props {
  simulation: SimulationEntry;
  onClick: () => void;
  onRename?: (newName: string) => void;
}

export const SimulationCard = ({ simulation, onClick, onRename }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(simulation.simulationName);
  const inputRef = useRef<HTMLInputElement>(null);

  const monthCount = simulation.simulationData.length;
  const buckets =
    simulation.simulationData.length > 0
      ? Object.keys(simulation.simulationData[0].values)
      : [];

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(simulation.simulationName);
    setIsEditing(true);
  };

  const commit = () => {
    const trimmed = editName.trim();
    setIsEditing(false);
    if (trimmed && trimmed !== simulation.simulationName) {
      onRename?.(trimmed);
    }
  };

  return (
    <div
      onClick={() => !isEditing && onClick()}
      className="group relative text-left w-full bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors cursor-pointer"
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setIsEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-gray-800 text-white text-sm font-medium rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-sm font-medium text-white truncate flex-1"
            onDoubleClick={startEdit}
            title={simulation.simulationName}
          >
            {simulation.simulationName}
          </h3>
          {onRename && (
            <button
              onClick={startEdit}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-200 transition-all text-xs flex-shrink-0"
              title="Rename"
            >
              ✎
            </button>
          )}
        </div>
      )}
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
    </div>
  );
};
