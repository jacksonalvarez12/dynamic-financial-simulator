import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const MODEL_ID = "openai.gpt-oss-120b-1:0";

type BedrockMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function invokeBedrock(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096,
  temperature = 0.7,
): Promise<string> {
  const messages: BedrockMessage[] = [{ role: "user", content: userMessage }];

  // GPT models on Bedrock use the openai messages format
  const payload = {
    model: MODEL_ID,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_completion_tokens: maxTokens,
    temperature: temperature,
  };

  const GUARDRAIL_ID = process.env.BEDROCK_GUARDRAIL_ID;
  const GUARDRAIL_VERSION = process.env.BEDROCK_GUARDRAIL_VERSION;
  if (!GUARDRAIL_ID || !GUARDRAIL_VERSION) {
    throw new Error(
      "BEDROCK_GUARDRAIL_ID and BEDROCK_GUARDRAIL_VERSION must be set",
    );
  }

  console.log(
    `Bedrock guardrail id and version: ${GUARDRAIL_ID}, ${GUARDRAIL_VERSION}`,
  );

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    guardrailIdentifier: GUARDRAIL_ID,
    guardrailVersion: GUARDRAIL_VERSION,
    trace: "ENABLED",
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(Buffer.from(response.body).toString("utf-8"));

  // OpenAI response format on Bedrock
  const text = responseBody?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Bedrock returned an empty response");
  }

  console.log("Bedrock response:", text);
  return text;
}

export function parseLLMJson<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(stripped) as T;
}

export function parseLLMString(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return stripped;
}
