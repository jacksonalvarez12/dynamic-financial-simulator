import { useState } from "react";
import { reviewInput } from "../api/review";
import { runSimulation } from "../api/simulate";
import type { SimulationEntry } from "../types";
import { LoadingView } from "./loading-view";

interface Props {
  simulationId: string;
  initialInput?: string;
  onSimulateSuccess: (entry: SimulationEntry) => void;
  onCancel?: () => void;
}

type Phase = "idle" | "reviewing" | "reviewed" | "questions" | "simulating" | "error";

export const InputView = ({
  simulationId,
  initialInput = "I'm 24, have 27,000 in savings (Roth IRA), and am planning to retire when im 57. I plan on putting 1500 a month in the ira, and withdrawing 4% annually in retirement. Assume 9% market returns",
  // initialInput = "",
  onSimulateSuccess,
}: Props) => {
  const [input, setInput] = useState(initialInput);
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const inFlight = phase === "reviewing" || phase === "simulating";

  const handleReview = async () => {
    const text = input.trim();
    setPhase("reviewing");
    setErrorMessage("");
    try {
      const result = await reviewInput(text);
      if (result.status === "approved") {
        setQuestions([]);
        setPhase("reviewed");
      } else {
        setQuestions(result.questions ?? []);
        setPhase("questions");
      }
    } catch {
      setErrorMessage("Review failed. Please check your connection and try again.");
      setPhase("error");
    }
  };

  const handleSimulate = async () => {
    const text = input.trim();
    setPhase("simulating");
    setErrorMessage("");
    try {
      const response = await runSimulation(text, simulationId);
      const entry: SimulationEntry = {
        id: simulationId,
        simulationName: `Simulation — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        createdAt: new Date().toISOString(),
        input: text,
        simulationData: response.simulationData,
        report: response.report,
        simulationStepCode: response.simulationStepCode,
      };
      onSimulateSuccess(entry);
    } catch {
      setErrorMessage("Simulation failed. Please try again.");
      setPhase("error");
    }
  };

  if (phase === "simulating") {
    return <LoadingView />;
  }

  return (
    <div className="space-y-5">
      {phase === "questions" && questions.length > 0 && (
        <div className="bg-gray-900 border border-yellow-800/50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-yellow-400">
            A few things need clarification
          </p>
          <ul className="space-y-1.5">
            {questions.map((q, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-yellow-600 flex-shrink-0">•</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === "reviewed" && (
        <div className="bg-gray-900 border border-green-800/50 rounded-xl p-3">
          <p className="text-sm text-green-400">
            Input looks good — ready to simulate.
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-3">
          <p className="text-sm text-red-300">{errorMessage}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Describe your financial situation
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={inFlight}
          placeholder="e.g. I'm 28, earn $95k/year, max my 401k, rent for $1800/month, have $20k in savings, and plan to buy a home in 5 years..."
          rows={10}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500 disabled:opacity-50 transition-colors"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleReview}
          disabled={!input.trim() || inFlight}
          className="flex-1 bg-gray-800 text-white font-medium py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm border border-gray-700"
        >
          {phase === "reviewing" ? "Reviewing…" : "Review"}
        </button>
        <button
          onClick={handleSimulate}
          disabled={!input.trim() || inFlight}
          className="flex-1 bg-white text-gray-900 font-medium py-2.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
        >
          Simulate
        </button>
      </div>
    </div>
  );
};
