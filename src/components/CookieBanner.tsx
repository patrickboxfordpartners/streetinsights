import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "cookie_consent";

export function CookieBanner({ privacyPath = "/privacy" }: { privacyPath?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: "#fff", borderTop: "1px solid #e5e5e5",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
      padding: "16px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "16px", flexWrap: "wrap" as const,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <p style={{ fontSize: "13px", color: "#555", margin: 0, flex: 1, minWidth: "200px", lineHeight: "1.5" }}>
        We use cookies to improve your experience and analyze site usage.
        California residents: we do not sell your personal information.{" "}
        <Link to={privacyPath} style={{ color: "#2563eb", textDecoration: "underline" }}>
          Privacy Policy
        </Link>
      </p>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button onClick={decline} style={{
          padding: "8px 16px", borderRadius: "8px", border: "1px solid #e5e5e5",
          background: "#fff", color: "#555", fontSize: "13px",
          cursor: "pointer", fontFamily: "inherit",
        }}>
          Decline
        </button>
        <button onClick={accept} style={{
          padding: "8px 16px", borderRadius: "8px", border: "none",
          background: "#2563eb", color: "#fff", fontSize: "13px",
          fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          Accept
        </button>
      </div>
    </div>
  );
}
