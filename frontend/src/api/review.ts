import { fetchAuthSession } from "aws-amplify/auth";
import type { ReviewResponse } from "../types";

export const reviewInput = async (
  financialInput: string,
): Promise<ReviewResponse> => {
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

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
