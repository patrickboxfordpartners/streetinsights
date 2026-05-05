/**
 * Economic Data Integration
 * Fetch macro indicators from FRED, World Bank, and IMF APIs
 */

export interface EconomicIndicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  date: string;
  source: "fred" | "worldbank" | "imf";
  category: "rates" | "inflation" | "employment" | "gdp" | "sentiment" | "markets";
}

export interface MacroOverview {
  fedFundsRate: EconomicIndicator | null;
  cpi: EconomicIndicator | null;
  unemploymentRate: EconomicIndicator | null;
  gdpGrowth: EconomicIndicator | null;
  sp500: EconomicIndicator | null;
  vix: EconomicIndicator | null;
  lastUpdated: string;
}

// FRED API Configuration
const FRED_API_KEY = import.meta.env.VITE_FRED_API_KEY;
const FRED_BASE_URL = "https://api.stlouisfed.org/fred";

// Common FRED series IDs
const FRED_SERIES = {
  FED_FUNDS_RATE: "DFF", // Daily Federal Funds Effective Rate
  CPI: "CPIAUCSL", // Consumer Price Index for All Urban Consumers
  UNEMPLOYMENT: "UNRATE", // Unemployment Rate
  GDP: "A191RL1Q225SBEA", // Real GDP Growth (quarterly)
  SP500: "SP500", // S&P 500 Index
  VIX: "VIXCLS", // CBOE Volatility Index
  PCE: "PCE", // Personal Consumption Expenditures
  RETAIL_SALES: "RSXFS", // Retail Sales
  HOUSING_STARTS: "HOUST", // Housing Starts
  INDUSTRIAL_PRODUCTION: "INDPRO", // Industrial Production Index
};

/**
 * Fetch a single series from FRED
 */
async function fetchFREDSeries(
  seriesId: string,
  name: string,
  category: EconomicIndicator["category"]
): Promise<EconomicIndicator | null> {
  if (!FRED_API_KEY) {
    console.warn("[economic-data] FRED API key not configured");
    return null;
  }

  try {
    const url = `${FRED_BASE_URL}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.observations || data.observations.length === 0) {
      return null;
    }

    const latest = data.observations[0];

    return {
      id: seriesId,
      name,
      value: parseFloat(latest.value),
      unit: getUnitForSeries(seriesId),
      date: latest.date,
      source: "fred",
      category,
    };
  } catch (error: any) {
    console.error(`[economic-data] Error fetching ${seriesId}:`, error.message);
    return null;
  }
}

/**
 * Get unit/format for a series
 */
function getUnitForSeries(seriesId: string): string {
  const units: Record<string, string> = {
    DFF: "%",
    CPIAUCSL: "Index",
    UNRATE: "%",
    A191RL1Q225SBEA: "%",
    SP500: "Points",
    VIXCLS: "Index",
    PCE: "Billions $",
    RSXFS: "Millions $",
    HOUST: "Thousands",
    INDPRO: "Index",
  };
  return units[seriesId] || "";
}

/**
 * Fetch macro economic overview (key indicators)
 */
export async function fetchMacroOverview(): Promise<MacroOverview> {
  const [fedFunds, cpi, unemployment, gdp, sp500, vix] = await Promise.all([
    fetchFREDSeries(FRED_SERIES.FED_FUNDS_RATE, "Fed Funds Rate", "rates"),
    fetchFREDSeries(FRED_SERIES.CPI, "CPI (Inflation)", "inflation"),
    fetchFREDSeries(FRED_SERIES.UNEMPLOYMENT, "Unemployment Rate", "employment"),
    fetchFREDSeries(FRED_SERIES.GDP, "Real GDP Growth", "gdp"),
    fetchFREDSeries(FRED_SERIES.SP500, "S&P 500", "markets"),
    fetchFREDSeries(FRED_SERIES.VIX, "VIX (Volatility)", "sentiment"),
  ]);

  return {
    fedFundsRate: fedFunds,
    cpi,
    unemploymentRate: unemployment,
    gdpGrowth: gdp,
    sp500,
    vix,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch detailed economic indicators by category
 */
export async function fetchEconomicIndicatorsByCategory(
  category: EconomicIndicator["category"]
): Promise<EconomicIndicator[]> {
  const categoryMap: Record<EconomicIndicator["category"], Array<[string, string]>> = {
    rates: [
      [FRED_SERIES.FED_FUNDS_RATE, "Fed Funds Rate"],
    ],
    inflation: [
      [FRED_SERIES.CPI, "Consumer Price Index"],
      [FRED_SERIES.PCE, "Personal Consumption Expenditures"],
    ],
    employment: [
      [FRED_SERIES.UNEMPLOYMENT, "Unemployment Rate"],
    ],
    gdp: [
      [FRED_SERIES.GDP, "Real GDP Growth"],
    ],
    sentiment: [
      [FRED_SERIES.VIX, "VIX Volatility Index"],
    ],
    markets: [
      [FRED_SERIES.SP500, "S&P 500 Index"],
    ],
  };

  const series = categoryMap[category] || [];

  const results = await Promise.all(
    series.map(([id, name]) => fetchFREDSeries(id, name, category))
  );

  return results.filter((r): r is EconomicIndicator => r !== null);
}

/**
 * Fetch historical data for a series (for charting)
 */
export async function fetchHistoricalSeries(
  seriesId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; value: number }>> {
  if (!FRED_API_KEY) {
    console.warn("[economic-data] FRED API key not configured");
    return [];
  }

  try {
    const url = `${FRED_BASE_URL}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.observations || [])
      .filter((obs: any) => obs.value !== ".")
      .map((obs: any) => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }));
  } catch (error: any) {
    console.error(`[economic-data] Error fetching historical ${seriesId}:`, error.message);
    return [];
  }
}

/**
 * Get economic context for AI analysis
 */
export async function getEconomicContextForAI(): Promise<string> {
  const macro = await fetchMacroOverview();

  const parts: string[] = ["Current Economic Environment:"];

  if (macro.fedFundsRate) {
    parts.push(
      `- Federal Funds Rate: ${macro.fedFundsRate.value.toFixed(2)}% (as of ${macro.fedFundsRate.date})`
    );
  }

  if (macro.cpi) {
    parts.push(`- CPI Inflation: ${macro.cpi.value.toFixed(1)} (as of ${macro.cpi.date})`);
  }

  if (macro.unemploymentRate) {
    parts.push(
      `- Unemployment Rate: ${macro.unemploymentRate.value.toFixed(1)}% (as of ${macro.unemploymentRate.date})`
    );
  }

  if (macro.gdpGrowth) {
    parts.push(
      `- Real GDP Growth: ${macro.gdpGrowth.value.toFixed(2)}% (as of ${macro.gdpGrowth.date})`
    );
  }

  if (macro.vix) {
    parts.push(`- Market Volatility (VIX): ${macro.vix.value.toFixed(2)} (as of ${macro.vix.date})`);
  }

  return parts.join("\n");
}
