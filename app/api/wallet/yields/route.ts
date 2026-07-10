import { NextResponse } from "next/server";
export const runtime = "nodejs";

// DeFiLlama project names for each venue (first match by TVL wins)
const VENUES: { key: string; llama: string[]; fallbackApy: number }[] = [
  { key: "scallop", llama: ["scallop-lend", "scallop"], fallbackApy: 5.4 },
  { key: "navi", llama: ["navi-lending", "navi-protocol"], fallbackApy: 6.2 },
  { key: "kai", llama: ["kai-finance"], fallbackApy: 5.2 },
];

const FALLBACK_VENUES = VENUES.map(({ key, fallbackApy }) => ({ key, apy: fallbackApy }));
const FALLBACK_BEST = FALLBACK_VENUES.reduce((a, b) => (b.apy > a.apy ? b : a)).key;

export async function GET() {
  const ts = new Date().toISOString();

  try {
    const res = await fetch("https://yields.llama.fi/pools", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`DeFiLlama responded ${res.status}`);

    const json: any = await res.json();
    const pools: any[] = json?.data ?? [];

    // Filter to Sui chain, USDC symbols only
    const suiUsdc = pools.filter(
      (p) => p.chain === "Sui" && String(p.symbol ?? "").toUpperCase().includes("USDC"),
    );

    const venues: { key: string; apy: number }[] = [];
    for (const { key, llama } of VENUES) {
      // Among matching pools, pick highest TVL
      const match = suiUsdc
        .filter((p) => llama.includes(p.project))
        .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))[0];
      if (match?.apy != null) {
        venues.push({ key, apy: +Number(match.apy).toFixed(2) });
      }
    }

    if (venues.length < 2) {
      // Not enough data — return fallback
      return NextResponse.json({ venues: FALLBACK_VENUES, best: FALLBACK_BEST, fallback: true, ts });
    }

    const best = venues.reduce((a, b) => (b.apy > a.apy ? b : a)).key;
    return NextResponse.json({ venues, best, ts });
  } catch (err) {
    console.error("[yields/route] DeFiLlama fetch failed:", err);
    return NextResponse.json({ venues: FALLBACK_VENUES, best: FALLBACK_BEST, fallback: true, ts });
  }
}
