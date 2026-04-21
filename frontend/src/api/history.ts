import { fetchAuthSession } from "aws-amplify/auth";
import type { SimulationHistory } from "../types";

const authHeader = async (): Promise<string> => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  return `Bearer ${token}`;
};

export const getHistory = async (): Promise<SimulationHistory> => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/history`, {
      headers: { Authorization: await authHeader() },
    });
    const body = await res.json();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}, ${JSON.stringify(body, null, 2)}`);
    }
    return body;
  } catch (err) {
    console.error(err);
    throw Error();
  }
};

export const renameSimulation = async (
  simulationId: string,
  simulationName: string,
): Promise<void> => {
  try {
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
    const body = await res.json();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}, ${JSON.stringify(body, null, 2)}`);
    }
  } catch (err) {
    console.error(err);
    throw Error();
  }
};

export const deleteSimulation = async (simulationId: string): Promise<void> => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/history/${simulationId}`,
      {
        method: "DELETE",
        headers: { Authorization: await authHeader() },
      },
    );
    const body = await res.json();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}, ${JSON.stringify(body, null, 2)}`);
    }
  } catch (err) {
    console.error(err);
    throw Error();
  }
};
