import type { AuthUser } from "aws-amplify/auth";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { InputView } from "../components/InputView";
import { ResultsView } from "../components/ResultsView";
import { Sidebar } from "../components/Sidebar";
import type { SimulationEntry, SimulationHistory } from "../types";

interface Props {
  user: AuthUser;
  onSignOut: () => void;
  history: SimulationHistory;
  setHistory: (h: SimulationHistory) => void;
}

export const SimulationPage = ({
  user: _user,
  onSignOut: _onSignOut,
  history,
  setHistory,
}: Props) => {
  const { simulationId } = useParams<{ simulationId: string }>();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"results" | "rerun">("results");

  const simulation = history.simulations.find((s) => s.id === simulationId);

  const handleSimulateSuccess = (entry: SimulationEntry) => {
    const idx = history.simulations.findIndex((s) => s.id === entry.id);
    if (idx >= 0) {
      const updated = [...history.simulations];
      updated[idx] = entry;
      setHistory({ simulations: updated });
    } else {
      setHistory({ simulations: [entry, ...history.simulations] });
    }
    setMode("results");
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar
        history={history}
        setHistory={setHistory}
        currentSimulationId={simulationId}
        onNewSimulation={() => navigate("/simulations")}
      />

      <main className="flex-1 overflow-y-auto">
        {!simulation ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Simulation not found.
          </div>
        ) : mode === "results" ? (
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-medium">
                  {simulation.simulationName}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(simulation.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setMode("rerun")}
                className="text-sm text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-500 hover:text-white transition-colors"
              >
                Edit &amp; Re-run
              </button>
            </div>
            <ResultsView simulation={simulation} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">Edit &amp; Re-run</h2>
              <button
                onClick={() => setMode("results")}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
            <InputView
              simulationId={simulation.id}
              initialInput={simulation.input}
              onSimulateSuccess={handleSimulateSuccess}
            />
          </div>
        )}
      </main>
    </div>
  );
};
