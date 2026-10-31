import { createClerkClient } from "@clerk/backend";
import express, { type Express, type Request, type Response } from "express";
import Stripe from "stripe";
import { executeQuery } from "../db/execute.js";
import { db } from "../db/server.js";
import { guardQuery } from "../db/guard.js";
import type { QueryDescriptor } from "../db/types.js";
import { llmClient } from "../integrations/llm/client.js";
import { clerkUserId } from "./auth.js";

export function mountStripeWebhook(app: Express) {
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhook);
}

export function mountApi(app: Express) {
  app.post("/api/db", dbQuery);
  app.post("/api/billing/checkout", startCheckout);
  app.post("/api/llm", llmProxy);
  app.get("/api/fred", fredProxy);
  app.post("/api/fred", fredProxy);
}

async function dbQuery(req: Request, res: Response) {
  const body = req.body as QueryDescriptor;
  if (!body || typeof body.table !== "string" || typeof body.action !== "string") {
    res.status(400).json({ data: null, error: { message: "Invalid query" }, count: null });
    return;
  }
  const userId = await clerkUserId(req);
  const guarded = guardQuery(body, userId);
  if ("status" in guarded) {
    res.status(guarded.status).json({ data: null, error: { message: guarded.error }, count: null });
    return;
  }
  const result = await executeQuery(guarded, process.env.DATABASE_URL);
  res.json(result);
}

async function clerkEmail(userId: string): Promise<string> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return "";
  const clerk = createClerkClient({ secretKey });
  const user = await clerk.users.getUser(userId);
  return user.emailAddresses[0]?.emailAddress ?? "";
}

function priceEnv(name: string): string {
  return process.env[name] || process.env[`VITE_${name}`] || "";
}

function tierFromPrice(priceId: string): string {
  const entries: Array<[string, string]> = [
    [priceEnv("STRIPE_PRICE_PRO_MONTHLY"), "pro"],
    [priceEnv("STRIPE_PRICE_PRO_YEARLY"), "pro"],
    [priceEnv("STRIPE_PRICE_ENTERPRISE_MONTHLY"), "enterprise"],
    [priceEnv("STRIPE_PRICE_ENTERPRISE_YEARLY"), "enterprise"],
  ];
  for (const [id, tier] of entries) {
    if (id && id === priceId) return tier;
  }
  return "free";
}

function mapStatus(stripeStatus: string): string {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "active";
  if (stripeStatus === "canceled") return "canceled";
  if (stripeStatus === "past_due" || stripeStatus === "unpaid") return "past_due";
  return "inactive";
}

async function startCheckout(req: Request, res: Response) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    res.status(503).json({ error: "STRIPE_SECRET_KEY is not set" });
    return;
  }
  const userId = await clerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { priceId, successUrl, cancelUrl } = req.body || {};
  if (!priceId || typeof priceId !== "string") {
    res.status(400).json({ error: "priceId is required" });
    return;
  }

  const stripe = new Stripe(stripeKey);
  const existing = await db.from("user_profiles").select("id, stripe_customer_id, email").eq("id", userId).single();
  let customerId = (existing.data as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;
  const email = (existing.data as { email?: string } | null)?.email || await clerkEmail(userId);

  if (!existing.data) {
    const created = await db.from("user_profiles").insert({
      id: userId,
      email: email || `${userId}@users.clerk`,
      plan: "free",
      subscription_status: "inactive",
    }).select("id").single();
    if (created.error) {
      res.status(500).json({ error: created.error.message });
      return;
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: { clerk_user_id: userId },
    });
    customerId = customer.id;
    await db.from("user_profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl || "https://app.getstreetinsights.com/dashboard?checkout=success",
    cancel_url: cancelUrl || "https://app.getstreetinsights.com/pricing?checkout=cancelled",
    subscription_data: { metadata: { clerk_user_id: userId } },
  });
  res.json({ url: session.url });
}

async function stripeWebhook(req: Request, res: Response) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    res.status(503).json({ error: "Stripe webhook is not configured" });
    return;
  }
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }
  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    res.status(400).json({ error: message });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.mode === "subscription" && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
      const userId = subscription.metadata?.clerk_user_id || subscription.metadata?.supabase_user_id;
      if (userId) {
        const priceId = subscription.items.data[0]?.price?.id || "";
        await db.from("user_profiles").update({
          plan: tierFromPrice(priceId),
          subscription_status: "active",
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: subscription.id,
        }).eq("id", userId);
      }
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    const priceId = subscription.items.data[0]?.price?.id || "";
    const changes = {
      plan: tierFromPrice(priceId),
      subscription_status: mapStatus(subscription.status),
      stripe_subscription_id: subscription.id,
    };
    const userId = subscription.metadata?.clerk_user_id || subscription.metadata?.supabase_user_id;
    if (userId) {
      await db.from("user_profiles").update(changes).eq("id", userId);
    } else if (subscription.customer) {
      await db.from("user_profiles").update(changes).eq("stripe_customer_id", String(subscription.customer));
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    if (subscription.customer) {
      await db.from("user_profiles").update({
        plan: "free",
        subscription_status: "canceled",
        stripe_subscription_id: null,
      }).eq("stripe_customer_id", String(subscription.customer));
    }
  }

  res.json({ received: true });
}

async function llmProxy(req: Request, res: Response) {
  const userId = await clerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "You must be logged in to use LLM features" });
    return;
  }
  const { systemPrompt, userPrompt, temperature, maxTokens } = req.body || {};
  if (typeof systemPrompt !== "string" || typeof userPrompt !== "string") {
    res.status(400).json({ error: "systemPrompt and userPrompt are required" });
    return;
  }
  const started = Date.now();
  try {
    const result = await llmClient.chat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: typeof temperature === "number" ? temperature : undefined,
      maxTokens: typeof maxTokens === "number" ? maxTokens : undefined,
    });
    res.json({
      content: result.content,
      model: result.model,
      provider: result.provider,
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM request failed";
    res.status(502).json({ error: message });
  }
}

async function fredProxy(req: Request, res: Response) {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    res.status(503).json({ error: "FRED_API_KEY is not set" });
    return;
  }
  const source = req.method === "GET" ? req.query : (req.body || {});
  const seriesId = String(source.series_id || "");
  const endpoint = String(source.endpoint || "series/observations");
  if (!/^[A-Za-z0-9]+$/.test(seriesId) || !/^[A-Za-z0-9_/]+$/.test(endpoint)) {
    res.status(400).json({ error: "Invalid FRED series" });
    return;
  }
  const url = `https://api.stlouisfed.org/fred/${endpoint}?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&limit=1`;
  const response = await fetch(url);
  const data = await response.json();
  res.status(response.ok ? 200 : 502).json(data);
}
