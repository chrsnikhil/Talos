import { AGENT_ADDRESS } from "./config"
import { readPolicy, authorizeSpend } from "./chain"
import { getApys } from "./yields"
import { decide, decideWithClaude } from "./decide"
import { storeDecision } from "./walrus"

const CHUNK = Number(process.env.TALOS_CHUNK ?? 100) // size of a single rebalance, in budget units

let current = process.env.TALOS_START_PROTOCOL ?? "suilend"

/** One Icarus cycle: sense → think → act (on-chain, policy-gated) → record (Walrus). */
export async function runCycle(n: number): Promise<void> {
  const policy = await readPolicy()
  const apys = getApys()
  const ts = new Date().toISOString()

  if (policy.revoked) {
    console.log(`[#${n}] policy REVOKED by owner — Icarus is disabled. Holding.`)
    return
  }
  if (Date.now() >= policy.expires_at_ms) {
    console.log(`[#${n}] policy EXPIRED. Holding.`)
    return
  }

  const decision = (await decideWithClaude(current, apys, policy, CHUNK)) ?? decide(current, apys, policy, CHUNK)
  const feed = apys.map((a) => `${a.protocol} ${a.apy}%`).join(" · ")
  const move = decision.action === "REBALANCE" ? `${decision.amount} → ${decision.target}` : "—"
  console.log(`[#${n}] ${feed}  ⇒ ${decision.action} ${move}  (${decision.by}: ${decision.reasoning})`)

  let digest: string | null = null
  let status: string | undefined
  if (decision.action === "REBALANCE" && decision.amount > 0) {
    try {
      const r = await authorizeSpend(decision.amount, decision.target)
      digest = r.digest
      status = r.status
      if (status === "success") {
        current = decision.target
        console.log(`   ✓ on-chain authorize_spend ${digest}  (remaining ≈ ${policy.remaining_budget - decision.amount})`)
      } else {
        console.log(`   ✗ on-chain status: ${status}`)
      }
    } catch (e: any) {
      console.log(`   ✗ authorize_spend rejected on-chain: ${String(e?.message ?? e).split("\n")[0]}`)
    }
  }

  const blobId = await storeDecision({ ts, agent: AGENT_ADDRESS, apys, decision, txDigest: digest, status })
  if (blobId) console.log(`   ↳ decision stored on Walrus: ${blobId}`)
}
