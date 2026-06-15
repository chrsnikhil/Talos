import { NAVISDKClient, nUSDC } from "navi-sdk"

// Real lending on NAVI Protocol (Sui MAINNET) — the second real venue alongside
// Scallop. NAVI's native-USDC reserve (nUSDC) is exactly Circle USDC on Sui, so
// the agent supplies/redeems the same coin it holds. The SDK signs+executes with
// the agent keypair (built from TALOS_AGENT_KEY), so this only runs on mainnet.
let nav: NAVISDKClient | null = null
function account() {
  if (!nav) {
    nav = new NAVISDKClient({
      privateKeyList: [process.env.TALOS_AGENT_KEY as string],
      networkType: "mainnet",
      numberOfAccounts: 1,
    })
  }
  return nav.accounts[0]
}

type Res = { digest: string; status?: string }

/** Supply USDC to NAVI (real funds). amountUsdc in USDC (6 decimals). */
export async function depositUsdc(amountUsdc: number): Promise<Res> {
  const r: any = await account().depositToNavi(nUSDC, Math.round(amountUsdc * 1e6))
  return { digest: r?.digest, status: r?.effects?.status?.status }
}

/** Withdraw USDC from NAVI (real funds). amountUsdc in USDC (6 decimals). */
export async function withdrawUsdc(amountUsdc: number): Promise<Res> {
  const r: any = await account().withdraw(nUSDC, Math.round(amountUsdc * 1e6))
  return { digest: r?.digest, status: r?.effects?.status?.status }
}

/** Read the agent's current NAVI USDC supply position (underlying USDC).
 * getNAVIPortfolio is backed by an indexer that intermittently returns an empty/zero
 * map (lag), which would otherwise read as "no position". Retry a few times and only
 * trust a 0 once we've actually seen a populated map. */
export async function readUsdcPosition(): Promise<number | null> {
  let sawPopulated = false
  let lastErr = false
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const portfolio: Map<string, { supplyBalance: number; borrowBalance: number }> =
        await account().getNAVIPortfolio(undefined, false)
      if (portfolio.size > 0) sawPopulated = true
      for (const [name, bal] of portfolio.entries()) {
        // NAVI reports balances in 1e9 fixed-point regardless of token decimals.
        if (String(name).toUpperCase().includes("USDC") && Number(bal.supplyBalance) > 0) {
          return +(Number(bal.supplyBalance) / 1e9).toFixed(6)
        }
      }
    } catch {
      lastErr = true
    }
    // brief backoff before retrying the flaky indexer call
    await new Promise((r) => setTimeout(r, 600))
  }
  // Saw a real (populated) map every time with no USDC supply → genuinely 0.
  // Never got a usable response → null (unknown), so the dashboard can show "—" not "0".
  return sawPopulated ? 0 : lastErr ? null : 0
}
