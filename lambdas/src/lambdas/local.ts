import { config } from "dotenv";
import { handler } from "./input-review";

config({ path: "./.env.local" });

// @ts-ignore
handler({ body: JSON.stringify({ financialInput: "This is a test input!" }) });
