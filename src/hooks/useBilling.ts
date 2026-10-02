import { useState, useCallback } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { supabase } from "../integrations/supabase/client";

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
        console.log("[useBilling] No user found, redirecting to signup");
        window.location.href = `/sign-up?redirect=${encodeURIComponent(`/pricing?plan=${priceId}`)}`;
        return;
      }

      const token = await getToken({ template: "supabase" });
      console.log("[useBilling] Got Clerk token, calling stripe-checkout");

      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          priceId,
          successUrl: `${window.location.origin}/?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        console.error("[useBilling] Supabase function error:", error);
        throw error;
      }
      if (data?.error) {
        console.error("[useBilling] Edge function returned error:", data.error);
        throw new Error(data.error);
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error("[useBilling] No checkout URL returned:", data);
        throw new Error("No checkout URL returned from server");
      }
    } catch (err: any) {
      console.error("[useBilling] Full checkout error:", err);
      alert(`Checkout failed: ${err.message || "Please try again"}`);
    } finally {
      setLoading(false);
    }
  }, [getToken, userId]);

  return { startCheckout, loading };
}
