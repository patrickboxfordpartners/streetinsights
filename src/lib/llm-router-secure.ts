/**
 * Secure Multi-LLM Router (Client-Side)
 * Proxies all LLM requests through Supabase Edge Function
 * API keys are never exposed to the client
 */

import { supabase } from '../integrations/supabase/client'

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

/**
 * Route LLM request through secure server-side proxy.
 * Accepts an auth token (from Clerk) to authenticate with the edge function.
 */
export async function routeLLMRequest(
  request: LLMRequest,
  authToken?: string | null
): Promise<LLMResponse> {
  try {
    if (!authToken) {
      throw new Error('You must be logged in to use LLM features')
    }

    const { data, error } = await supabase.functions.invoke('llm-proxy', {
      body: request,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (error) {
      throw new Error(`LLM Proxy error: ${error.message}`)
    }

    if (!data || !data.content) {
      throw new Error('Invalid response from LLM proxy')
    }

    return data as LLMResponse
  } catch (error: any) {
    console.error('[LLM Router] Error:', error)
    throw error
  }
}

/**
 * Get list of available providers (client-side placeholder)
 * Actual provider availability is determined server-side
 */
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
