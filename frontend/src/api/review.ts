import { fetchAuthSession } from "aws-amplify/auth";
import type { ReviewResponse } from "../types";

export const reviewInput = async (
  financialInput: string,
): Promise<ReviewResponse> => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    const res = await fetch(`${import.meta.env.VITE_API_URL}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ financialInput }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw Error(`HTTP ${res.status}, ${JSON.stringify(body, null, 2)}`);
    }
    return body;
  } catch (err) {
    console.error(err);
    throw Error();
  }
};
