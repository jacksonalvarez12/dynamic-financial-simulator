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

type Phase = "idle" | "reviewing" | "questions" | "simulating" | "error";

const MAX_REVIEW_ATTEMPTS = 3;

export const InputView = ({
  simulationId,
  initialInput = "",
  onSimulateSuccess,
}: Props) => {
  const [input, setInput] = useState(initialInput);
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<string[]>([]);
  const [reviewAttempts, setReviewAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const simulate = async (approvedInput: string) => {
    setPhase("simulating");
    try {
      const response = await runSimulation(approvedInput, simulationId);
      const entry: SimulationEntry = {
        id: simulationId,
        simulationName: `Simulation — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        createdAt: new Date().toISOString(),
        input: approvedInput,
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

  const submit = async () => {
    const text = input.trim();

    if (reviewAttempts >= MAX_REVIEW_ATTEMPTS) {
      await simulate(text);
      return;
    }

    setPhase("reviewing");
    try {
      const result = await reviewInput(text);
      if (result.status === "approved") {
        await simulate(text);
      } else {
        setQuestions(result.questions ?? []);
        setReviewAttempts((n) => n + 1);
        setPhase("questions");
      }
    } catch {
      setErrorMessage(
        "Review failed. Please check your connection and try again.",
      );
      setPhase("error");
    }
  };

  if (phase === "simulating") {
    return <LoadingView />;
  }

  const attemptsRemaining = MAX_REVIEW_ATTEMPTS - reviewAttempts;
  const forceMode = reviewAttempts >= MAX_REVIEW_ATTEMPTS;

  return (
    <div className="space-y-5">
      {phase === "questions" && questions.length > 0 && (
        <div className="bg-gray-900 border border-yellow-800/50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-yellow-400">
            A few things need clarification
            {attemptsRemaining > 0 && (
              <span className="text-yellow-600 font-normal ml-2">
                ({attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""}{" "}
                remaining before forced proceed)
              </span>
            )}
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

      {forceMode && (
        <div className="bg-gray-900 border border-blue-800/50 rounded-xl p-3">
          <p className="text-sm text-blue-400">
            Maximum review attempts reached — your input will be sent to
            simulation as-is.
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
          disabled={phase === "reviewing"}
          placeholder="e.g. I'm 28, earn $95k/year, max my 401k, rent for $1800/month, have $20k in savings, and plan to buy a home in 5 years..."
          rows={10}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500 disabled:opacity-50 transition-colors"
        />
      </div>

      <button
        onClick={submit}
        disabled={!input.trim() || phase === "reviewing"}
        className="w-full bg-white text-gray-900 font-medium py-2.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {phase === "reviewing"
          ? "Reviewing…"
          : forceMode
            ? "Run Simulation"
            : phase === "questions"
              ? "Resubmit"
              : "Submit"}
      </button>
    </div>
  );
};
