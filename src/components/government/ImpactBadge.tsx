interface ImpactBadgeProps {
  magnitude: number | null;
  direction: string | null;
  size?: "sm" | "md";
}

export function ImpactBadge({ magnitude, direction, size = "md" }: ImpactBadgeProps) {
  if (magnitude === null) {
    return (
      <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded">
        Unscored
      </span>
    );
  }

  const colorMap = {
    low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    high: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const level = magnitude >= 7 ? "high" : magnitude >= 4 ? "medium" : "low";
  const colors = colorMap[level];

  const directionIcon =
    direction === "bullish" ? "↑" : direction === "bearish" ? "↓" : "↔";

  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded border ${colors} ${sizeClasses}`}>
      <span>{directionIcon}</span>
      <span>{magnitude}/10</span>
    </span>
  );
}
