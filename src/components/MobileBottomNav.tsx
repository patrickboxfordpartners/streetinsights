/**
 * Mobile Bottom Navigation
 * Quick access to main sections on mobile
 */

import { NavLink } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Bell, Radio } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, end: true },
  { name: "Signals", href: "/dashboard/signals", icon: Radio },
  { name: "Tickers", href: "/dashboard/tickers", icon: TrendingUp },
  { name: "Alerts", href: "/dashboard/alerts", icon: Bell },
];

export function MobileBottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t safe-area-bottom">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
