import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { getHistory, putHistory } from "../shared/s3-client";
import { renameSimulationSchema } from "../shared/schemas";

function ok(body: unknown): APIGatewayProxyResultV2 {
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

function getSub(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  return event.requestContext.authorizer.jwt.claims.sub as string;
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const simulationId = event.pathParameters?.simulationId;
  const sub = getSub(event);

  try {
    // --- GET /history ---
    if (method === "GET") {
      const history = await getHistory(sub);
      return ok(history);
    }

    // --- DELETE /history/{simulationId} ---
    if (method === "DELETE") {
      if (!simulationId) return err(400, "Missing simulationId");

      const history = await getHistory(sub);
      const before = history.simulations.length;
      history.simulations = history.simulations.filter(
        (s) => s.id !== simulationId,
      );

      if (history.simulations.length === before) {
        return err(404, "Simulation not found");
      }

      await putHistory(sub, history);
      return ok({ deleted: simulationId });
    }

    // --- PATCH /history/{simulationId} ---
    if (method === "PATCH") {
      if (!simulationId) return err(400, "Missing simulationId");

      const body = JSON.parse(event.body ?? "{}");
      const { error, value } = renameSimulationSchema.validate(body);
      if (error) return err(400, error.message);

      const history = await getHistory(sub);
      const simulation = history.simulations.find((s) => s.id === simulationId);

      if (!simulation) return err(404, "Simulation not found");

      simulation.simulationName = value.simulationName;
      await putHistory(sub, history);
      return ok({ updated: simulationId });
    }

    return err(405, "Method not allowed");
  } catch (e: any) {
    console.error("history error:", e);
    return err(500, "Request failed. Please try again.");
  }
};
