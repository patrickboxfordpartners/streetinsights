const US_MARKET_HOLIDAYS_2026: string[] = [
  "2026-05-25",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-11-27",
  "2026-12-25",
];

export function isUSMarketOpen(date?: Date): boolean {
  const d = date ?? new Date();
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  return !US_MARKET_HOLIDAYS_2026.includes(dateStr);
}

export function assertMarketOpen(): void {
  if (!isUSMarketOpen()) {
    throw new Error("MARKET_CLOSED");
  }
}
