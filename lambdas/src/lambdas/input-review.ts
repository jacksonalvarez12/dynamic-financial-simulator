import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { invokeBedrock, parseLLMJson } from "../shared/bedrock-client";
import {
  reviewRequestSchema,
  reviewLLMResponseSchema,
} from "../shared/schemas";
import { ReviewLLMResponse, ReviewResponse } from "../shared/types";

const SYSTEM_PROMPT = `You are a financial planning assistant reviewing a user's financial profile for completeness.
Your job is to identify significant gaps that would prevent an accurate multi-decade simulation.
Look for missing income sources, unclear savings vehicles, unspecified time horizons, missing expense categories, etc.

Respond ONLY with a JSON object in this exact shape:
{
  "status": "approved" | "needs_clarification",
  "questions": ["question 1", "question 2"]
}

Include "questions" only when status is "needs_clarification". Omit it entirely when approved.
Do not include preamble, markdown fences, or any text outside the JSON object.`;

function ok(body: ReviewResponse): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function err(statusCode: number, message: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message }),
  };
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    // --- Parse and validate request body ---
    const body = JSON.parse(event.body ?? "{}");
    const { error, value } = reviewRequestSchema.validate(body);
    if (error) {
      return err(400, error.message);
    }

    // --- Call Bedrock ---
    const raw = await invokeBedrock(SYSTEM_PROMPT, value.financialInput);

    // --- Parse and validate LLM response ---
    const parsed = parseLLMJson<ReviewLLMResponse>(raw);
    const { error: llmError, value: llmValue } =
      reviewLLMResponseSchema.validate(parsed);
    if (llmError) {
      throw new Error(`LLM returned unexpected shape: ${llmError.message}`);
    }

    return ok(llmValue);
  } catch (e: any) {
    console.error("inputReview error:", e);
    return err(500, "Review failed. Please try again.");
  }
};
