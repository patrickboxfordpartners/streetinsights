/**
 * Breadcrumbs Component
 * Shows current page hierarchy for navigation context
 */

import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

export function Breadcrumbs() {
  const location = useLocation();
  const segments = getBreadcrumbSegments(location.pathname);

  if (segments.length <= 1) {
    // Don't show breadcrumbs on homepage
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {segment.label}
                </span>
              ) : (
                <Link
                  to={segment.href || "/dashboard"}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  {index === 0 && <Home className="h-3.5 w-3.5" />}
                  <span>{segment.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function getBreadcrumbSegments(pathname: string): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [
    { label: "Home", href: "/dashboard" },
  ];

  // Remove /dashboard prefix and split
  const path = pathname.replace(/^\/dashboard\/?/, "");
  if (!path) return [segments[0]]; // Just home

  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "tickers") {
    segments.push({ label: "Tickers", href: "/dashboard/tickers" });

    if (parts[1]) {
      // Ticker detail page
      segments.push({ label: parts[1].toUpperCase() });
    }
  } else if (parts[0] === "signals") {
    segments.push({ label: "Signals" });
  } else if (parts[0] === "alerts") {
    segments.push({ label: "Alerts" });
  } else if (parts[0] === "predictions") {
    segments.push({ label: "Predictions" });
  } else if (parts[0] === "settings") {
    segments.push({ label: "Settings", href: "/dashboard/settings" });

    if (parts[1] === "billing") {
      segments.push({ label: "Billing" });
    } else if (parts[1] === "api-keys") {
      segments.push({ label: "API Keys" });
    }
  } else if (parts[0] === "admin") {
    segments.push({ label: "Admin", href: "/dashboard/admin" });

    if (parts[1] === "users") {
      segments.push({ label: "Users" });
    } else if (parts[1] === "analytics") {
      segments.push({ label: "Analytics" });
    }
  }

  return segments;
}
