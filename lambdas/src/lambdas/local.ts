import { handler } from "./input-review";

// @ts-ignore
handler({ body: JSON.stringify({ financialInput: "This is a test input!" }) });
