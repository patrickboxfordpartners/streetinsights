/**
 * Enroll a new Street Insights user in the drip-engine onboarding sequence.
 * Never throws and never blocks the caller; no-ops when unconfigured.
 * Env: DRIP_ENGINE_URL (https://drip-engine.vercel.app), DRIP_API_KEY
 * (per-product key minted by drip-engine scripts/drip-product.ts).
 */

const PRODUCT = "streetinsights";
const SEQUENCE = "onboarding";

export type EnrollOutcome = "skipped" | "enrolled" | "failed";

export async function enrollUserInOnboarding(input: {
  email: string;
  name?: string;
}): Promise<EnrollOutcome> {
  const url = process.env.DRIP_ENGINE_URL;
  const apiKey = process.env.DRIP_API_KEY;
  const email = input.email?.trim().toLowerCase();
  if (!url || !apiKey || !email) return "skipped";

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/drip/enqueue`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: PRODUCT,
        sequence: SEQUENCE,
        email,
        ...(input.name ? { name: input.name } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? "enrolled" : "failed";
  } catch (err) {
    console.error("drip-enroll failed (non-fatal):", err);
    return "failed";
  }
}

export interface EnsureProfileInput {
  id: string;
  email: string;
  name?: string;
}

/**
 * Create the user's profile row on first authenticated touch and start the
 * onboarding drip. The upsert result decides whether this is a genuinely
 * new user (drizzle-style client: { error } contract). Never throws.
 */
export async function ensureProfileAndEnroll(
  db: { from: (table: string) => { upsert: (row: Record<string, unknown>) => Promise<{ error: unknown }> } },
  profile: EnsureProfileInput
): Promise<EnrollOutcome> {
  const email = profile.email?.trim().toLowerCase();
  if (!email) return "skipped";

  const { error } = await db.from("user_profiles").upsert({
    id: profile.id,
    email,
    ...(profile.name ? { fullName: profile.name } : {}),
    plan: "free",
    subscription_status: "inactive",
  });

  if (error) {
    console.error("ensureProfileAndEnroll upsert failed (non-fatal):", error);
    return "failed";
  }

  return enrollUserInOnboarding({ email, name: profile.name });
}
