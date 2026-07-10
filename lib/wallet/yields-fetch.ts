/**
 * Shared DeFiLlama venue-APY fetch helper.
 * Imported by both the yields route and the uplift route to avoid
 * a route-calling-route dependency.
 */

export interface VenueApy {
  key: string;
  apy: number;
}

const VENUES: { key: string; llama: string[]; fallbackApy: number }[] = [
  { key: "scallop", llama: ["scallop-lend", "scallop"], fallbackApy: 5.4 },
  { key: "navi", llama: ["navi-lending", "navi-protocol"], fallbackApy: 6.2 },
  { key: "kai", llama: ["kai-finance"], fallbackApy: 5.2 },
];

export const FALLBACK_VENUES: VenueApy[] = VENUES.map(({ key, fallbackApy }) => ({
  key,
  apy: fallbackApy,
}));

export const FALLBACK_BEST = FALLBACK_VENUES.reduce((a, b) => (b.apy > a.apy ? b : a)).key;

export interface VenuesFetchResult {
  venues: VenueApy[];
  best: string;
  fallback?: boolean;
  ts: string;
}

/**
 * Fetches live USDC supply APYs for Sui venues from DeFiLlama.
 * Falls back to hardcoded values on error or insufficient data.
 */
export async function fetchVenueApys(): Promise<VenuesFetchResult> {
  const ts = new Date().toISOString();

  try {
    const res = await fetch("https://yields.llama.fi/pools", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`DeFiLlama responded ${res.status}`);

    const json: unknown = await res.json();
    const pools: unknown[] = (json as { data?: unknown[] })?.data ?? [];

    // Filter to Sui chain, USDC symbols only
    const suiUsdc = (pools as Record<string, unknown>[]).filter(
      (p) => p.chain === "Sui" && String(p.symbol ?? "").toUpperCase().includes("USDC"),
    );

    const venues: VenueApy[] = [];
    for (const { key, llama } of VENUES) {
      // Among matching pools, pick highest TVL
      const match = suiUsdc
        .filter((p) => llama.includes(p.project as string))
        .sort((a, b) => ((b.tvlUsd as number) ?? 0) - ((a.tvlUsd as number) ?? 0))[0];
      if (match?.apy != null) {
        venues.push({ key, apy: +Number(match.apy).toFixed(2) });
      }
    }

    if (venues.length < 2) {
      return { venues: FALLBACK_VENUES, best: FALLBACK_BEST, fallback: true, ts };
    }

    const best = venues.reduce((a, b) => (b.apy > a.apy ? b : a)).key;
    return { venues, best, ts };
  } catch (err) {
    console.error("[yields-fetch] DeFiLlama fetch failed:", err);
    return { venues: FALLBACK_VENUES, best: FALLBACK_BEST, fallback: true, ts };
  }
}
