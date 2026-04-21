import { fetchAuthSession } from "aws-amplify/auth";
import type { SimulateResponse } from "../types";

export const runSimulation = async (
  approvedInput: string,
  simulationId: string,
): Promise<SimulateResponse> => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    const res = await fetch(`${import.meta.env.VITE_API_URL}/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ approvedInput, simulationId }),
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
