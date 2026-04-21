import type { AuthUser } from "aws-amplify/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { InputView } from "../components/InputView";
import { SimulationGrid } from "../components/SimulationGrid";
import type { SimulationEntry, SimulationHistory } from "../types";

interface Props {
  user: AuthUser;
  onSignOut: () => void;
  history: SimulationHistory;
  setHistory: (h: SimulationHistory) => void;
}

export const SimulationListPage = ({
  user,
  onSignOut,
  history,
  setHistory,
}: Props) => {
  const navigate = useNavigate();
  const [showInput, setShowInput] = useState(false);
  // Stable per-session ID for the "new simulation" slot; resets if user cancels and re-opens
  const [newSimulationId] = useState(() => uuidv4());

  const handleSimulateSuccess = (entry: SimulationEntry) => {
    setHistory({ simulations: [entry, ...history.simulations] });
    navigate(`/simulations/${entry.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">
          Dynamic Finance Simulator
        </h1>
        <button
          onClick={onSignOut}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {!showInput ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">Your Simulations</h2>
              <button
                onClick={() => setShowInput(true)}
                className="bg-white text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                + New Simulation
              </button>
            </div>
            <SimulationGrid
              simulations={history.simulations}
              onSelect={(id) => navigate(`/simulations/${id}`)}
            />
          </>
        ) : (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">New Simulation</h2>
              <button
                onClick={() => setShowInput(false)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
            <InputView
              simulationId={newSimulationId}
              onSimulateSuccess={handleSimulateSuccess}
            />
          </div>
        )}
      </main>
    </div>
  );
};
