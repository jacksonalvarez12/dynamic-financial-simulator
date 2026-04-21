import { fetchAuthSession } from "aws-amplify/auth";
import type { SimulationHistory } from "../types";

const authHeader = async (): Promise<string> => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  return `Bearer ${token}`;
};

export const getHistory = async (): Promise<SimulationHistory> => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/history`, {
    headers: { Authorization: await authHeader() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export const renameSimulation = async (
  simulationId: string,
  simulationName: string,
): Promise<void> => {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/history/${simulationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeader(),
      },
      body: JSON.stringify({ simulationName }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
};

export const deleteSimulation = async (simulationId: string): Promise<void> => {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/history/${simulationId}`,
    {
      method: "DELETE",
      headers: { Authorization: await authHeader() },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
};
