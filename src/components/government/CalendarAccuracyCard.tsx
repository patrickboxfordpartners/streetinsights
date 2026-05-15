import { Target } from "lucide-react";

interface CalendarAccuracyCardProps {
  accuracy: number | null;
}

export function CalendarAccuracyCard({ accuracy }: CalendarAccuracyCardProps) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Prediction Accuracy
        </span>
      </div>
      {accuracy !== null ? (
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono">{accuracy}</span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Collecting data. Accuracy will appear after events are validated.
        </p>
      )}
      <p className="text-[10px] text-muted-foreground mt-1">Rolling 20-event average</p>
    </div>
  );
}
