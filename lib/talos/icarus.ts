import { AGENT_ADDRESS } from "./config"
import { readPolicy, authorizeSpend } from "./chain"
import { getApys } from "./yields"
import { decide, decideWithLLM } from "./decide"
import { storeDecision } from "./walrus"
import { placeRealOrder, deepbookEnabled } from "./deepbook"
import { depositUsdc as scallopDeposit, withdrawUsdc as scallopWithdraw } from "./scallop"
import { depositUsdc as naviDeposit, withdrawUsdc as naviWithdraw } from "./navi"
import { depositUsdc as kaiDeposit, withdrawUsdc as kaiWithdraw } from "./kai"

const CHUNK = Number(process.env.TALOS_CHUNK ?? 100) // size of a single rebalance, in budget units

// Real lending venues (mainnet only). Each protocol key maps to deposit/withdraw of
// real USDC. A rebalance withdraws from the venue it leaves and supplies into the one
// it enters. Every market the agent surveys (see yields.ts) is a real venue here — there
// are no signal-only markets. Enabled by TALOS_LENDING=1 (TALOS_SCALLOP=1 is an alias).
type Venue = { deposit: (n: number) => Promise<{ digest: string; status?: string }>; withdraw: (n: number) => Promise<{ digest: string; status?: string }> }
const VENUES: Record<string, Venue> = {
  scallop: { deposit: scallopDeposit, withdraw: scallopWithdraw },
  navi: { deposit: naviDeposit, withdraw: naviWithdraw },
  kai: { deposit: kaiDeposit, withdraw: kaiWithdraw },
}
const LENDING_ENABLED = process.env.TALOS_LENDING === "1" || process.env.TALOS_SCALLOP === "1"
const USDC_CHUNK = Number(process.env.TALOS_USDC_CHUNK ?? 0.5) // real USDC per rebalance

let current = process.env.TALOS_START_PROTOCOL ?? "scallop"

/** One Icarus cycle: sense → think → act (on-chain, policy-gated) → record (Walrus). */
export async function runCycle(n: number): Promise<void> {
  const policy = await readPolicy()
  const apys = await getApys()
  const ts = new Date().toISOString()

  if (policy.revoked) {
    console.log(`[#${n}] policy REVOKED by owner — Icarus is disabled. Holding.`)
    return
  }
  if (Date.now() >= policy.expires_at_ms) {
    console.log(`[#${n}] policy EXPIRED. Holding.`)
    return
  }

  const decision = (await decideWithLLM(current, apys, policy, CHUNK)) ?? decide(current, apys, policy, CHUNK)
  const feed = apys.map((a) => `${a.protocol} ${a.apy}%`).join(" · ")
  const move = decision.action === "REBALANCE" ? `${decision.amount} → ${decision.target}` : "—"
  console.log(`[#${n}] ${feed}  ⇒ ${decision.action} ${move}  (${decision.by}: ${decision.reasoning})`)

  let digest: string | null = null
  let status: string | undefined
  let deepbookDigest: string | null = null
  let lendingDigest: string | null = null
  if (decision.action === "REBALANCE" && decision.amount > 0) {
    try {
      const r = await authorizeSpend(decision.amount, decision.target)
      digest = r.digest
      status = r.status
      if (status === "success") {
        const from = current
        current = decision.target
        console.log(`   ✓ on-chain authorize_spend ${digest}  (remaining ≈ ${policy.remaining_budget - decision.amount})`)

        // lending leg: move real USDC between venues (mainnet), gated by the policy
        // authorize above. Withdraw from the venue we leave, then supply into the new one.
        // Only ever fire for a genuine cross-venue move — a target equal to the current
        // venue is a no-op and must never trigger a stray deposit (defense-in-depth on top
        // of decide()'s grounding check).
        if (LENDING_ENABLED && from !== decision.target) {
          if (VENUES[from]) {
            try {
              const w = await VENUES[from].withdraw(USDC_CHUNK)
              lendingDigest = w.digest
              console.log(`   ✓ real ${from} withdraw ${w.digest}  (${USDC_CHUNK} USDC, ${w.status})`)
            } catch (e: any) {
              console.log(`   ✗ ${from} withdraw failed: ${String(e?.message ?? e).split("\n")[0]}`)
            }
          }
          if (VENUES[decision.target]) {
            try {
              const d = await VENUES[decision.target].deposit(USDC_CHUNK)
              lendingDigest = d.digest
              console.log(`   ✓ real ${decision.target} deposit ${d.digest}  (${USDC_CHUNK} USDC, ${d.status})`)
            } catch (e: any) {
              console.log(`   ✗ ${decision.target} deposit failed: ${String(e?.message ?? e).split("\n")[0]}`)
            }
          }
        }

        // swap leg: place a real DeepBook order on-chain
        if (deepbookEnabled()) {
          try {
            const o = await placeRealOrder()
            if (o?.status === "success") {
              deepbookDigest = o.digest
              console.log(`   ✓ real DeepBook order ${o.digest}  (swap leg)`)
            } else if (o) {
              console.log(`   ✗ DeepBook order status: ${o.status}`)
            }
          } catch (e: any) {
            console.log(`   ✗ DeepBook order failed: ${String(e?.message ?? e).split("\n")[0]}`)
          }
        }
      } else {
        console.log(`   ✗ on-chain status: ${status}`)
      }
    } catch (e: any) {
      console.log(`   ✗ authorize_spend rejected on-chain: ${String(e?.message ?? e).split("\n")[0]}`)
    }
  }

  const blobId = await storeDecision({ ts, agent: AGENT_ADDRESS, apys, decision, txDigest: digest, deepbookDigest, lendingDigest, status })
  if (blobId) console.log(`   ↳ decision stored on Walrus: ${blobId}`)
}
