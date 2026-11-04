/**
 * Server-side LLM router. API keys stay on the worker.
 */

import { llmClient } from "../integrations/llm/client.js";

interface LLMRequest {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

interface LLMResponse {
  content: string
  model: string
  provider: "xai" | "openai" | "anthropic" | "google"
  tokensUsed?: number
  latencyMs: number
}

export async function routeLLMRequest(
  request: LLMRequest,
  authToken?: string | null
): Promise<LLMResponse> {
  void authToken;
  const started = Date.now();
  const result = await llmClient.chat({
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt },
    ],
    temperature: request.temperature,
    maxTokens: request.maxTokens,
  });
  const provider = result.provider === "xai" || result.provider === "openai" || result.provider === "anthropic" || result.provider === "google"
    ? result.provider
    : "xai";
  return {
    content: result.content,
    model: result.model,
    provider,
    latencyMs: Date.now() - started,
  };
}

export function getAvailableProviders(): Array<{
  name: string
  model: string
  enabled: boolean
}> {
  return [
    { name: "xai", model: "grok-3-mini", enabled: true },
    { name: "openai", model: "gpt-4o-mini", enabled: true },
    { name: "anthropic", model: "claude-haiku-4-5-20251001", enabled: true },
    { name: "google", model: "gemini-1.5-pro", enabled: true },
  ]
}
