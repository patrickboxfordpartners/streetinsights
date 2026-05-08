/**
 * Empty State Component
 * Friendly empty states with actionable CTAs
 */

// @ts-nocheck
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 p-4 rounded-full bg-accent/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>

      {children}

      <div className="flex items-center gap-3">
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-4 py-2 bg-accent text-foreground rounded-lg font-medium text-sm hover:bg-accent/80 transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

// Pre-built empty states for common scenarios

interface WatchlistEmptyStateProps {
  onAddTicker: () => void;
  onViewPopular: () => void;
}

export function WatchlistEmptyState({ onAddTicker, onViewPopular }: WatchlistEmptyStateProps) {
  return (
    <EmptyState
      icon={({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )}
      title="Your Watchlist is Empty"
      description="Start tracking tickers to get personalized alerts and AI insights. Try adding NVDA, TSLA, or AMD to see them in action!"
      action={{ label: "Add Ticker", onClick: onAddTicker }}
      secondaryAction={{ label: "View Popular", onClick: onViewPopular }}
    />
  );
}

interface AlertsEmptyStateProps {
  onCreateAlert: () => void;
}

export function AlertsEmptyState({ onCreateAlert }: AlertsEmptyStateProps) {
  return (
    <EmptyState
      icon={({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )}
      title="No Alerts Configured"
      description="Set up alerts to get notified when tickers spike in mentions, AI agents change sentiment, or price targets are hit."
      action={{ label: "Create Alert", onClick: onCreateAlert }}
    >
      <div className="bg-accent/30 rounded-lg p-4 mb-6 max-w-md">
        <p className="text-xs text-muted-foreground">
          <strong>Pro tip:</strong> Combine mention spikes with AI consensus for high-signal alerts
        </p>
      </div>
    </EmptyState>
  );
}

interface PredictionsEmptyStateProps {
  onViewTickers: () => void;
}

export function PredictionsEmptyState({ onViewTickers }: PredictionsEmptyStateProps) {
  return (
    <EmptyState
      icon={({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )}
      title="No Predictions Yet"
      description="Predictions appear when our AI agents analyze ticker sentiment and social signals. Check back soon for insights!"
      action={{ label: "Explore Tickers", onClick: onViewTickers }}
    />
  );
}
