/**
 * Yahoo Finance API Client (browser-safe)
 * Proxies all data fetching through the worker's /api/quotes and /api/technicals
 * endpoints, which use the Node.js yahoo-finance2 package server-side.
 */

const WORKER_URL =
  typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_WORKER_URL
    ? (import.meta as any).env.VITE_WORKER_URL
    : "";

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  pe: number;
  eps: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export interface Fundamentals {
  symbol: string;
  marketCap: number;
  peRatio: number;
  forwardPE: number;
  trailingEps: number;
  forwardEps: number;
  bookValue: number;
  priceToBook: number;
  revenue: number;
  revenuePerShare: number;
  profitMargin: number;
  operatingMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  grossMargins: number;
  ebitdaMargins: number;
}

class YahooFinanceClient {
  async getQuote(symbol: string): Promise<StockQuote | null> {
    if (!WORKER_URL) return null;
    try {
      const res = await fetch(`${WORKER_URL}/api/quotes?symbols=${symbol}`);
      if (!res.ok) return null;
      const data: any[] = await res.json();
      const q = data[0];
      if (!q) return null;
      return {
        symbol: q.symbol,
        price: q.price ?? 0,
        change: q.change ?? 0,
        changePercent: q.changePercent ?? 0,
        dayLow: q.dayLow ?? 0,
        dayHigh: q.dayHigh ?? 0,
        yearHigh: q.yearHigh ?? 0,
        yearLow: q.yearLow ?? 0,
        marketCap: q.marketCap ?? 0,
        volume: q.volume ?? 0,
        avgVolume: q.avgVolume ?? 0,
        open: q.open ?? 0,
        previousClose: q.previousClose ?? 0,
        pe: q.pe ?? 0,
        eps: q.eps ?? 0,
        fiftyDayAvg: q.fiftyDayAvg ?? 0,
        twoHundredDayAvg: q.twoHundredDayAvg ?? 0,
      };
    } catch {
      return null;
    }
  }

  async getHistoricalPrices(
    symbol: string,
    startDate: Date,
    _endDate: Date = new Date()
  ): Promise<HistoricalPrice[]> {
    if (!WORKER_URL) return [];
    try {
      const res = await fetch(`${WORKER_URL}/api/technicals/${symbol}`);
      if (!res.ok) return [];
      const data = await res.json();
      const bars: any[] = data.bars ?? [];
      // Filter to requested date range
      const from = startDate.toISOString().split("T")[0];
      return bars
        .filter((b) => b.date >= from)
        .map((b) => ({
          date: b.date,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume,
          adjClose: b.close,
        }));
    } catch {
      return [];
    }
  }

  async getFundamentals(symbol: string): Promise<Fundamentals | null> {
    if (!WORKER_URL) return null;
    try {
      const res = await fetch(`${WORKER_URL}/api/quotes?symbols=${symbol}`);
      if (!res.ok) return null;
      const data: any[] = await res.json();
      const q = data[0];
      if (!q) return null;
      // /api/quotes returns the fields that yahoo-finance2 quote() provides.
      // Ratios not in quote() default to 0 — fundamentals panel handles nulls gracefully.
      return {
        symbol: q.symbol,
        marketCap: q.marketCap ?? 0,
        peRatio: q.pe ?? 0,
        forwardPE: q.forwardPE ?? 0,
        trailingEps: q.eps ?? 0,
        forwardEps: q.forwardEps ?? 0,
        bookValue: q.bookValue ?? 0,
        priceToBook: q.priceToBook ?? 0,
        revenue: q.revenue ?? 0,
        revenuePerShare: q.revenuePerShare ?? 0,
        profitMargin: q.profitMargins ?? 0,
        operatingMargin: q.operatingMargins ?? 0,
        returnOnAssets: q.returnOnAssets ?? 0,
        returnOnEquity: q.returnOnEquity ?? 0,
        debtToEquity: q.debtToEquity ?? 0,
        currentRatio: q.currentRatio ?? 0,
        quickRatio: q.quickRatio ?? 0,
        grossMargins: q.grossMargins ?? 0,
        ebitdaMargins: q.ebitdaMargins ?? 0,
      };
    } catch {
      return null;
    }
  }

  async getEarnings(_symbol: string) {
    return null;
  }

  async search(_query: string) {
    return [];
  }
}

export const yahooFinanceClient = new YahooFinanceClient();
