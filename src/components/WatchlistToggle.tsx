/**
 * Watchlist Toggle Button
 * Add/remove tickers from watchlist with toast feedback
 */

import { Star } from "lucide-react";
import { useWatchlist } from "../hooks/useWatchlist";
import { useToast } from "./Toast";
import { cn } from "../lib/utils";

interface WatchlistToggleProps {
  tickerId: string;
  tickerSymbol: string;
  className?: string;
}

export function WatchlistToggle({ tickerId, tickerSymbol, className }: WatchlistToggleProps) {
  const { watchlist, toggle } = useWatchlist();
  const { showToast } = useToast();
  const isWatched = watchlist.has(tickerId);

  const handleToggle = async () => {
    try {
      await toggle(tickerId);

      if (isWatched) {
        showToast("info", `Removed ${tickerSymbol} from watchlist`);
      } else {
        showToast("success", `Added ${tickerSymbol} to watchlist`);
      }
    } catch (error: any) {
      showToast("error", error.message || "Failed to update watchlist");
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "p-2 rounded-md transition-colors",
        isWatched
          ? "text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
        className
      )}
      aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star className={cn("h-5 w-5", isWatched && "fill-yellow-500")} />
    </button>
  );
}
