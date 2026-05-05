/**
 * Analytics utilities for tracking user engagement and conversions
 */

export interface DemoEngagementEvent {
  action: 'demo_start' | 'demo_complete' | 'demo_cta_signup' | 'demo_cta_dashboard' | 'demo_cta_replay' | 'demo_switch_stock';
  stock: string;
  progress?: number;
  outcome?: 'bullish' | 'bearish';
  from?: string;
  to?: string;
}

export interface ConversionEvent {
  action: 'signup_start' | 'signup_complete' | 'dashboard_first_visit' | 'alert_created' | 'prediction_tracked';
  source?: 'demo' | 'landing' | 'pricing' | 'organic';
  value?: number;
}

/**
 * Track demo engagement event
 */
export function trackDemoEngagement(event: DemoEngagementEvent) {
  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event.action, {
      stock: event.stock,
      progress: event.progress,
      outcome: event.outcome,
      from: event.from,
      to: event.to,
    });
  }

  // Log for debugging
  console.log('[Analytics] Demo engagement:', event);
}

/**
 * Track conversion event
 */
export function trackConversion(event: ConversionEvent) {
  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event.action, {
      source: event.source,
      value: event.value,
    });
  }

  // Log for debugging
  console.log('[Analytics] Conversion:', event);
}

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', (window as any).GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: title,
    });
  }
}

/**
 * Identify user (for conversion attribution)
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('set', { user_id: userId });
    if (traits) {
      (window as any).gtag('set', 'user_properties', traits);
    }
  }

  console.log('[Analytics] User identified:', userId, traits);
}
