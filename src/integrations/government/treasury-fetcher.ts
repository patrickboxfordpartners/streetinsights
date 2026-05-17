import type { GovernmentEventFetcher } from "./types.js";

const TREASURY_AUCTIONS_URL =
  "https://www.treasurydirect.gov/TA_WS/securities/announced?format=json&pagesize=20";

interface TreasuryAuction {
  cusip: string;
  issueDate: string;
  auctionDate: string;
  securityType: string;
  securityTerm: string;
  offeringAmount: number;
  maturingAmount: number;
  announcementDate: string;
}

export const treasuryFetcher: GovernmentEventFetcher = {
  name: "Treasury",
  async fetch() {
    try {
      const res = await fetch(TREASURY_AUCTIONS_URL, {
        headers: { "User-Agent": "market-signals/1.0", Accept: "application/json" },
      });
      if (!res.ok) {
        console.error("[treasury-fetcher] HTTP", res.status);
        return [];
      }

      const auctions: TreasuryAuction[] = await res.json();
      const now = new Date();

      return auctions
        .filter((a) => new Date(a.auctionDate) >= now)
        .map((a) => {
          const amount = a.offeringAmount
            ? `$${(a.offeringAmount / 1_000_000_000).toFixed(1)}B`
            : "";

          return {
            title: `Treasury ${a.securityTerm} ${a.securityType} Auction${amount ? ` (${amount})` : ""}`,
            description: `CUSIP: ${a.cusip}. Offering amount: ${amount}. Maturing: $${((a.maturingAmount || 0) / 1_000_000_000).toFixed(1)}B.`,
            event_type: "treasury_auction" as const,
            source_category: "fed_treasury" as const,
            event_date: new Date(a.auctionDate).toISOString(),
            all_day: true,
            source_url: "https://www.treasurydirect.gov/auctions/upcoming/",
            source_feed: "treasury_auctions_api",
            external_id: `treasury-${a.cusip}-${a.auctionDate}`,
            related_topics: ["bond_market", "interest_rates", "government_debt"],
          };
        });
    } catch (e) {
      console.error("[treasury-fetcher] error:", e);
      return [];
    }
  },
};
