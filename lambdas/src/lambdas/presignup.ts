import { PreSignUpTriggerEvent } from "aws-lambda";

export const handler = async (
  event: PreSignUpTriggerEvent,
): Promise<PreSignUpTriggerEvent> => {
  const email = event.request.userAttributes.email ?? "";
  const allowlist = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());

  if (!allowlist.includes(email.toLowerCase())) {
    throw new Error("Access restricted.");
  }

  return event;
};
