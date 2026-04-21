import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteSimulation, renameSimulation } from "../api/history";
import type { SimulationHistory } from "../types";

interface Props {
  history: SimulationHistory;
  setHistory: (h: SimulationHistory) => void;
  currentSimulationId: string | undefined;
  onNewSimulation: () => void;
}

interface ToastState {
  message: string;
  id: number;
}

export const Sidebar = ({
  history,
  setHistory,
  currentSimulationId,
  onNewSimulation,
}: Props) => {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = [...history.simulations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const showToast = (message: string) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3000);
  };

  const startRename = (
    id: string,
    currentName: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(currentName);
  };

  const commitRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    const prev = history.simulations;
    const updated = prev.map((s) =>
      s.id === id ? { ...s, simulationName: trimmed } : s,
    );
    setHistory({ simulations: updated });
    setEditingId(null);

    try {
      await renameSimulation(id, trimmed);
    } catch {
      setHistory({ simulations: prev });
      showToast("Rename failed. Please try again.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this simulation?")) return;

    const prev = history.simulations;
    setHistory({ simulations: prev.filter((s) => s.id !== id) });

    if (currentSimulationId === id) {
      navigate("/simulations");
    }

    try {
      await deleteSimulation(id);
    } catch {
      setHistory({ simulations: prev });
      showToast("Delete failed. Please try again.");
    }
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-3 border-b border-gray-800 flex flex-col gap-1">
        <button
          onClick={() => navigate("/simulations")}
          className="w-full text-left text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <span>⌂</span>
          <span>Home</span>
        </button>
        <button
          onClick={onNewSimulation}
          className="w-full text-left text-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Simulation
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {sorted.length === 0 && (
          <p className="text-xs text-gray-600 px-4 py-3">No simulations yet.</p>
        )}
        {sorted.map((sim) => {
          const isActive = sim.id === currentSimulationId;
          const isEditing = editingId === sim.id;

          return (
            <div
              key={sim.id}
              onClick={() => !isEditing && navigate(`/simulations/${sim.id}`)}
              className={`group relative flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
                isActive ? "bg-gray-800" : "hover:bg-gray-800/60"
              }`}
            >
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitRename(sim.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(sim.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-gray-700 text-white text-sm rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <p
                    onDoubleClick={(e) =>
                      startRename(sim.id, sim.simulationName, e)
                    }
                    title={sim.simulationName}
                    className="text-sm text-gray-200 truncate"
                  >
                    {sim.simulationName}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(sim.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              {!isEditing && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                  <button
                    onClick={(e) => startRename(sim.id, sim.simulationName, e)}
                    className="text-gray-500 hover:text-gray-200 transition-colors text-xs px-1 py-0.5 rounded"
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => handleDelete(sim.id, e)}
                    className="text-gray-500 hover:text-red-400 transition-colors text-xs px-1 py-0.5 rounded"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {toast && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-900/80 border border-red-700 text-red-200 text-xs rounded-lg px-3 py-2 z-50">
          {toast.message}
        </div>
      )}
    </aside>
  );
};
