import { useState, useCallback } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:3001";

export function useBilling() {
  const [loading, setLoading] = useState(false);
  const { getToken, userId } = useClerkAuth();

  const startCheckout = useCallback(async function startCheckout(priceId: string) {
    if (!priceId) {
      console.error("[useBilling] No price ID provided");
      return;
    }

    setLoading(true);
    try {
      if (!userId) {
        window.location.href = `/sign-up?redirect=${encodeURIComponent(`/pricing?plan=${priceId}`)}`;
        return;
      }

      const token = await getToken();
      const response = await fetch(`${WORKER_URL}/api/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
        }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Checkout failed");
      }
      if (!data.url) {
        throw new Error("No checkout URL returned from server");
      }
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again";
      console.error("[useBilling] Full checkout error:", err);
      alert(`Checkout failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [getToken, userId]);

  return { startCheckout, loading };
}
