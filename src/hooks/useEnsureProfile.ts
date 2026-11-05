import { useEffect, useRef } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:3001";

/**
 * Fire /api/profile/ensure once per signed-in session: creates the user's
 * profile row if missing and enrolls them in the onboarding drip. Failures
 * are logged and never block the UI.
 */
export function useEnsureProfile() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useClerkAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || firedRef.current) return;
    firedRef.current = true;

    (async () => {
      try {
        const token = await getToken();
        await fetch(`${WORKER_URL}/api/profile/ensure`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email: user.emailAddresses[0]?.emailAddress ?? "",
            name: user.fullName ?? undefined,
          }),
        });
      } catch (err) {
        console.error("[useEnsureProfile] failed (non-fatal):", err);
      }
    })();
  }, [isLoaded, isSignedIn, user, getToken]);
}
