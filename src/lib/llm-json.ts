export function repairJson(raw: string): string {
  let s = raw.trim();

  const fenceMatch = s.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m);
  if (fenceMatch) {
    s = fenceMatch[1].trim();
  }

  s = s.replace(/,(\s*[}\]])/g, "$1");

  const opens = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
  const braces = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;

  for (let i = 0; i < opens; i++) s += "]";
  for (let i = 0; i < braces; i++) s += "}";

  return s;
}

export function parseLLMJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    try {
      return JSON.parse(repairJson(raw)) as T;
    } catch {
      console.warn("[llm-json] Failed to parse LLM JSON output, using fallback:", raw.slice(0, 200));
      return fallback;
    }
  }
}

export async function withCoverageRetry<T>(
  fn: () => Promise<string>,
  validate: (result: T) => boolean,
  fallback: T,
  maxRetries = 1
): Promise<T> {
  let lastResult = fallback;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const raw = await fn();
    const parsed = parseLLMJson<T>(raw, fallback);
    if (validate(parsed)) {
      return parsed;
    }
    lastResult = parsed;
  }

  return lastResult;
}
