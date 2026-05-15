interface EventFiltersProps {
  range: string;
  onRangeChange: (range: "1d" | "3d" | "7d" | "30d") => void;
  category: string;
  onCategoryChange: (category: string) => void;
  minMagnitude: number;
  onMinMagnitudeChange: (min: number) => void;
}

const RANGES = [
  { value: "1d", label: "24h" },
  { value: "3d", label: "3d" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
] as const;

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "fed_treasury", label: "Fed/Treasury" },
  { value: "white_house_congress", label: "Congress" },
  { value: "regulatory", label: "Regulatory" },
];

export function EventFilters({
  range,
  onRangeChange,
  category,
  onCategoryChange,
  minMagnitude,
  onMinMagnitudeChange,
}: EventFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date range */}
      <div className="flex items-center bg-accent rounded-md p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => onRangeChange(r.value)}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              range === r.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Category */}
      <div className="flex items-center bg-accent rounded-md p-0.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => onCategoryChange(c.value)}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              category === c.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Magnitude filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Min impact:</span>
        <select
          value={minMagnitude}
          onChange={(e) => onMinMagnitudeChange(Number(e.target.value))}
          className="text-xs bg-accent border border-border rounded px-2 py-1"
        >
          <option value={0}>All</option>
          <option value={4}>4+</option>
          <option value={7}>7+ only</option>
        </select>
      </div>
    </div>
  );
}
