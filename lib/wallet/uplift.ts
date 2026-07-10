/**
 * Pure yield-uplift computation.
 * bestApy    = max APY across venues (the venue the agent rotates into)
 * baselineApy = median APY (fairer baseline than min; represents naive single-venue hold)
 * upliftPct  = bestApy - baselineApy (percentage points)
 * upliftUsdPerYear = principal_usdc * upliftPct / 100
 *
 * All values are zero when venues is empty or principal is zero.
 * This is a projection from current live APYs, not realized history.
 */

export interface VenueApy {
  key: string;
  apy: number;
}

export interface UpliftInput {
  venues: VenueApy[];
  /** Principal in USDC (human-readable, e.g. 1000.00) */
  principal: number;
}

export interface UpliftResult {
  bestApy: number;
  baselineApy: number;
  upliftPct: number;
  upliftUsdPerYear: number;
  best: string;
  baseline: string;
}

/**
 * Computes the yield uplift the Talos agent delivers over a naive single-venue hold.
 * Safe with empty venues input — returns all-zeros.
 */
export function computeUplift({ venues, principal }: UpliftInput): UpliftResult {
  const ZERO: UpliftResult = {
    bestApy: 0,
    baselineApy: 0,
    upliftPct: 0,
    upliftUsdPerYear: 0,
    best: "",
    baseline: "",
  };

  if (!venues || venues.length === 0) return ZERO;

  // Sort ascending by apy to find median
  const sorted = [...venues].sort((a, b) => a.apy - b.apy);

  // Best: the venue with the highest APY (agent target)
  const bestVenue = sorted[sorted.length - 1];

  // Median: middle element (lower-middle for even count)
  const medianIdx = Math.floor((sorted.length - 1) / 2);
  const baselineVenue = sorted[medianIdx];

  const bestApy = bestVenue.apy;
  const baselineApy = baselineVenue.apy;
  const upliftPct = +(bestApy - baselineApy).toFixed(4);

  // Guard divide-by-zero / negative principal
  const upliftUsdPerYear =
    principal > 0 && upliftPct > 0 ? +(principal * (upliftPct / 100)).toFixed(4) : 0;

  return {
    bestApy,
    baselineApy,
    upliftPct,
    upliftUsdPerYear,
    best: bestVenue.key,
    baseline: baselineVenue.key,
  };
}
