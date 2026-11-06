// Vercel entrypoint for the Street Insights worker.
// Wraps the same Express app as worker.ts (local dev entrypoint) and adapts
// it to a serverless request handler. Fluid Compute keeps this warm across
// requests, so the in-module quote/technicals caches still help.
import app from "../worker.js";

export default app;
