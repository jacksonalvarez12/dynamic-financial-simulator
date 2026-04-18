import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { SimulationHistory } from "./types";

const client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const BUCKET = process.env.S3_BUCKET!;

export async function getHistory(sub: string): Promise<SimulationHistory> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `users/${sub}/history.json`,
    });

    const response = await client.send(command);
    const body = await response.Body?.transformToString("utf-8");

    if (!body) {
      return { simulations: [] };
    }

    return JSON.parse(body) as SimulationHistory;
  } catch (err: any) {
    // First time this user has used the app
    if (err?.name === "NoSuchKey") {
      return { simulations: [] };
    }
    throw err;
  }
}

export async function putHistory(
  sub: string,
  history: SimulationHistory,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `users/${sub}/history.json`,
    Body: JSON.stringify(history, null, 2),
    ContentType: "application/json",
  });

  await client.send(command);
}
