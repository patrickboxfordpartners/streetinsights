import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../integrations/supabase/client';

interface OnboardingState {
  isFirstVisit: boolean;
  hasSeenWelcome: boolean;
  hasSeenTour: boolean;
  hasTrackedTickers: boolean;
  loading: boolean;
}

/**
 * Track user onboarding state
 * Detects first-time dashboard visits and tracks onboarding progress
 */
export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    isFirstVisit: false,
    hasSeenWelcome: false,
    hasSeenTour: false,
    hasTrackedTickers: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({
        isFirstVisit: false,
        hasSeenWelcome: true,
        hasSeenTour: true,
        hasTrackedTickers: false,
        loading: false,
      });
      return;
    }

    loadOnboardingState();
  }, [user]);

  async function loadOnboardingState() {
    if (!user) return;

    try {
      // Check if user has any tracked tickers
      const { data: trackedTickers } = await supabase
        .from('user_ticker_tracking')
        .select('ticker_id')
        .eq('user_id', user.id)
        .limit(1);

      const hasTrackedTickers = (trackedTickers?.length ?? 0) > 0;

      // Check localStorage for onboarding flags
      const hasSeenWelcome = localStorage.getItem('onboarding_welcome_seen') === 'true';
      const hasSeenTour = localStorage.getItem('onboarding_tour_seen') === 'true';

      // First visit = no tickers and hasn't seen welcome
      const isFirstVisit = !hasTrackedTickers && !hasSeenWelcome;

      setState({
        isFirstVisit,
        hasSeenWelcome,
        hasSeenTour,
        hasTrackedTickers,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  function markWelcomeSeen() {
    localStorage.setItem('onboarding_welcome_seen', 'true');
    setState(prev => ({ ...prev, hasSeenWelcome: true, isFirstVisit: false }));
  }

  function markTourSeen() {
    localStorage.setItem('onboarding_tour_seen', 'true');
    setState(prev => ({ ...prev, hasSeenTour: true }));
  }

  async function addSampleTickers() {
    if (!user) return;

    try {
      // Get NVDA, TSLA, AAPL ticker IDs
      const { data: tickers } = await supabase
        .from('tickers')
        .select('id, symbol')
        .in('symbol', ['NVDA', 'TSLA', 'AAPL']);

      if (!tickers || tickers.length === 0) return;

      // Add to user tracking
      const trackingRows = tickers.map(ticker => ({
        user_id: user.id,
        ticker_id: ticker.id,
        alert_enabled: true,
        alert_threshold: 50, // Alert on 50% spike
      }));

      await supabase
        .from('user_ticker_tracking')
        .insert(trackingRows);

      setState(prev => ({ ...prev, hasTrackedTickers: true }));

      return tickers.map(t => t.symbol);
    } catch (error) {
      console.error('Failed to add sample tickers:', error);
      throw error;
    }
  }

  return {
    ...state,
    markWelcomeSeen,
    markTourSeen,
    addSampleTickers,
  };
}
