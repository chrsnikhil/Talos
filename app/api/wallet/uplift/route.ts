import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { users } from "@/lib/wallet/mongo";
import { fetchVenueApys } from "@/lib/wallet/yields-fetch";
import { computeUplift } from "@/lib/wallet/uplift";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // --- Auth ---
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ts = new Date().toISOString();

  // --- Resolve principal ---
  // Try to read from the user's vault record; accept ?principal= as override/fallback.
  let principal = 0;

  const qp = req.nextUrl.searchParams.get("principal");
  if (qp !== null) {
    const parsed = parseFloat(qp);
    if (Number.isFinite(parsed) && parsed >= 0) principal = parsed;
  } else {
    // Look up vault principal from DB/on-chain summary stored at registration time.
    // The full on-chain lookup lives in the vault route and is expensive; here we
    // read the cached principal from the user document if available, else 0.
    try {
      const u = await (await users()).findOne({ sub: session.sub });
      if (u) {
        // principal is stored in MIST (6 decimals for USDC on Sui)
        const rawPrincipal = u.principal ?? u.vaultPrincipal;
        if (rawPrincipal != null) {
          // Convert from MIST (1e6) to USDC
          principal = Number(rawPrincipal) / 1_000_000;
        }
      }
    } catch (err) {
      console.error("[uplift/route] Failed to load user vault principal:", err);
    }
  }

  // --- Fetch live venue APYs (shared helper, no route-calling-route) ---
  const { venues, best: bestKey, fallback } = await fetchVenueApys();

  // --- Compute uplift ---
  const uplift = computeUplift({ venues, principal });

  return NextResponse.json({
    ...uplift,
    venues,
    bestKey,
    principal,
    projected: true, // forward-looking projection from current APYs, not realized history
    fallback: fallback ?? false,
    ts,
  });
}
