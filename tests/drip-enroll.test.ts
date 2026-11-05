/**
 * Unit tests for src/lib/drip-enroll.ts (onboarding standard fix).
 * Run: npx tsx tests/drip-enroll.test.ts
 * Minimal assert-based harness (repo has no test framework installed).
 *
 * The module posts to the drip-engine /api/drip/enqueue endpoint when
 * DRIP_ENGINE_URL + DRIP_API_KEY are configured, never throws, never
 * blocks the caller, and no-ops (returns "skipped") when unconfigured.
 */
import { strict as assert } from "node:assert";
import path from "node:path";

let passed = 0;
const failures: string[] = [];

function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn()
    .then(() => {
      passed++;
      console.log(`  ok  ${name}`);
    })
    .catch((e: unknown) => {
      failures.push(name);
      console.error(`  FAIL ${name}: ${e instanceof Error ? e.message : e}`);
    });
}

const MODULE_PATH = path.resolve(import.meta.dirname, "../src/lib/drip-enroll.ts");
let importNonce = 0;
let activeFetchCalls: Array<{ url: string; body: string; headers: Record<string, string> }> = [];

async function loadModule(env: Record<string, string | undefined>, fetchCalls: typeof activeFetchCalls) {
  delete process.env.DRIP_ENGINE_URL;
  delete process.env.DRIP_API_KEY;
  Object.assign(process.env, env);
  // The fetch stub stays installed until the next loadModule call so the
  // module under test resolves globalThis.fetch at call time.
  activeFetchCalls = fetchCalls;
  globalThis.fetch = (async (input: unknown, init?: unknown) => {
    const url = String(input);
    const body = typeof (init as RequestInit | undefined)?.body === "string"
      ? (init as RequestInit).body
      : "";
    const headers = ((init as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
    activeFetchCalls.push({ url, body, headers });
    const ok = (body as string).includes("fail@example.com") ? false : true;
    return {
      ok,
      status: ok ? 200 : 500,
      text: async () => (ok ? '{"ok":true}' : '{"error":"nope"}'),
    } as Response;
  }) as typeof fetch;
  importNonce += 1;
  const mod = await import(`${MODULE_PATH}?v=${importNonce}`);
  return mod as { enrollUserInOnboarding: (input: { email: string; name?: string }) => Promise<string> };
}

async function main() {
  await test("no-ops when DRIP_ENGINE_URL is unset", async () => {
    const calls: typeof activeFetchCalls = [];
    const mod = await loadModule({ DRIP_API_KEY: "key" }, calls);
    assert.equal(await mod.enrollUserInOnboarding({ email: "a@example.com" }), "skipped");
    assert.equal(calls.length, 0);
  });

  await test("no-ops when DRIP_API_KEY is unset", async () => {
    const calls: typeof activeFetchCalls = [];
    const mod = await loadModule({ DRIP_ENGINE_URL: "https://x" }, calls);
    assert.equal(await mod.enrollUserInOnboarding({ email: "a@example.com" }), "skipped");
    assert.equal(calls.length, 0);
  });

  await test("no-ops when email is missing or blank", async () => {
    const calls: typeof activeFetchCalls = [];
    const mod = await loadModule(
      { DRIP_ENGINE_URL: "https://x", DRIP_API_KEY: "key" },
      calls
    );
    assert.equal(await mod.enrollUserInOnboarding({ email: "" }), "skipped");
    assert.equal(await mod.enrollUserInOnboarding({ email: "  " }), "skipped");
    assert.equal(calls.length, 0);
  });

  await test("posts to /api/drip/enqueue with bearer key and payload", async () => {
    const calls: typeof activeFetchCalls = [];
    const mod = await loadModule(
      { DRIP_ENGINE_URL: "https://drip.example", DRIP_API_KEY: "secret-key" },
      calls
    );
    assert.equal(await mod.enrollUserInOnboarding({ email: "A@Example.com", name: "Ann" }), "enrolled");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://drip.example/api/drip/enqueue");
    assert.equal(calls[0].headers.Authorization, "Bearer secret-key");
    const payload = JSON.parse(calls[0].body);
    assert.equal(payload.product, "streetinsights");
    assert.equal(payload.sequence, "onboarding");
    assert.equal(payload.email, "a@example.com");
  });

  await test("returns failed on non-ok response without throwing", async () => {
    const calls: typeof activeFetchCalls = [];
    const mod = await loadModule(
      { DRIP_ENGINE_URL: "https://drip.example", DRIP_API_KEY: "key" },
      calls
    );
    assert.equal(await mod.enrollUserInOnboarding({ email: "fail@example.com" }), "failed");
  });

  await test("ensureProfileAndEnroll creates profile once and fires drip enrollment", async () => {
    const calls: typeof activeFetchCalls = [];
    const mod = await loadModule(
      { DRIP_ENGINE_URL: "https://drip.example", DRIP_API_KEY: "key" },
      calls
    );
    const inserted: Array<Record<string, unknown>> = [];
    const fakeDb = {
      from: (table: string) => ({
        upsert: (row: Record<string, unknown>) => {
          inserted.push({ table, ...row });
          return Promise.resolve({ error: null });
        },
      }),
    };
    const outcome = await (mod as { ensureProfileAndEnroll: (db: unknown, profile: { id: string; email: string; name?: string }) => Promise<string> })
      .ensureProfileAndEnroll(fakeDb, { id: "user_1", email: "New@Example.com", name: "New User" });
    assert.equal(outcome, "enrolled");
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0].table, "user_profiles");
    assert.equal(inserted[0].id, "user_1");
    assert.equal(inserted[0].email, "new@example.com");
    assert.equal(calls.length, 1);
    assert.equal((JSON.parse(calls[0].body) as { email: string }).email, "new@example.com");
  });

  await test("ensureProfileAndEnroll skips drip when env unconfigured but still upserts", async () => {
    const calls: typeof activeFetchCalls = [];
    const mod = await loadModule({}, calls);
    const inserted: Array<Record<string, unknown>> = [];
    const fakeDb = {
      from: (table: string) => ({
        upsert: (row: Record<string, unknown>) => {
          inserted.push({ table, ...row });
          return Promise.resolve({ error: null });
        },
      }),
    };
    const outcome = await (mod as { ensureProfileAndEnroll: (db: unknown, profile: { id: string; email: string; name?: string }) => Promise<string> })
      .ensureProfileAndEnroll(fakeDb, { id: "user_2", email: "b@example.com" });
    assert.equal(outcome, "skipped");
    assert.equal(inserted.length, 1);
    assert.equal(calls.length, 0);
  });

  const summary = `passed=${passed} failed=${failures.length}`;
  if (failures.length > 0) {
    console.error(summary);
    process.exit(1);
  }
  console.log(summary);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
