import { inngest } from "../client.js";
import { runGeneratePredictionsWorkflow } from "../../mastra/workflows/generate-predictions.js";

export const generatePredictions = inngest.createFunction(
  {
    id: "generate-predictions",
    name: "Generate ML price movement predictions",
    triggers: [{ cron: "0 6 * * *" }], // 6 AM daily, before market open
  },
  async ({ step }) => {
    const predictionDate = new Date().toISOString();

    // Mastra workflow handles the full pipeline:
    // load-config → fetch-tickers → generate-predictions → store → trigger-alerts
    const { result, high_confidence_predictions } = await step.run(
      "mastra-generate-predictions",
      () => runGeneratePredictionsWorkflow(predictionDate)
    );

    if (high_confidence_predictions.length > 0) {
      await step.sendEvent("trigger-ml-prediction-alerts", {
        name: "ml-predictions/high-confidence",
        data: { predictions: high_confidence_predictions },
      });
    }

    return result ?? { message: "Workflow completed" };
  }
);
