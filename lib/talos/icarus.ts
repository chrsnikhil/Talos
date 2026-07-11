import { AGENT_ADDRESS, PACKAGE_ID } from "./config"
import { readPolicy, authorizeSpend } from "./chain"
import { getApys } from "./yields"
import { decide, decideWithLLM } from "./decide"
import { storeDecision } from "./walrus"
import { appendDecision } from "./feed"
import { placeRealOrder, deepbookEnabled } from "./deepbook"
import { depositUsdc as scallopDeposit, withdrawUsdc as scallopWithdraw } from "./scallop"
import { depositUsdc as naviDeposit, withdrawUsdc as naviWithdraw } from "./navi"
import { depositUsdc as kaiDeposit, withdrawUsdc as kaiWithdraw } from "./kai"
import { depositUsdc as heliosDeposit, withdrawUsdc as heliosWithdraw } from "./sevenk"
import { listActiveVaults } from "./vaults"
import { isPaused } from "./paused"
import { rebalanceVault, SUPPORTED_VENUES } from "./vault-exec"

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
  // Volatile rotation venue: USDC↔SUI swaps via 7k (see sevenk.ts). Only ever a
  // rebalance target when TALOS_HELIOS=1 surfaces SUI's momentum in the survey.
  sui: { deposit: heliosDeposit, withdraw: heliosWithdraw },
}
const LENDING_ENABLED = process.env.TALOS_LENDING === "1" || process.env.TALOS_SCALLOP === "1"
const USDC_CHUNK = Number(process.env.TALOS_USDC_CHUNK ?? 0.5) // real USDC per rebalance

let current = process.env.TALOS_START_PROTOCOL ?? "scallop"

// Dry-run: sense + think + record, but never sign/move funds. Lets the swarm run
// locally (heartbeat + cycles + live brain) with no agent key and zero fund risk.
const DRY_RUN = process.env.TALOS_DRY_RUN === "1"

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

  const positionBefore = current
  const decision = (await decideWithLLM(current, apys, policy, CHUNK)) ?? decide(current, apys, policy, CHUNK)
  const feed = apys.map((a) => `${a.protocol} ${a.apy}%`).join(" · ")
  const move = decision.action === "REBALANCE" ? `${decision.amount} → ${decision.target}` : "—"
  console.log(`[#${n}] ${feed}  ⇒ ${decision.action} ${move}  (${decision.by}: ${decision.reasoning})`)

  let digest: string | null = null
  let status: string | undefined
  let deepbookDigest: string | null = null
  let lendingDigest: string | null = null
  if (decision.action === "REBALANCE" && decision.amount > 0 && DRY_RUN) {
    status = "dry-run"
    current = decision.target
    console.log(`   ~ DRY_RUN — would authorize_spend ${decision.amount} → ${decision.target} (no tx sent)`)
  } else if (decision.action === "REBALANCE" && decision.amount > 0) {
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

  // Skip the Walrus publish in dry-run — it's a slow external write we don't need
  // locally, and blocking on it would stall the heartbeat.
  const blobId = DRY_RUN ? null : await storeDecision({ ts, agent: AGENT_ADDRESS, apys, decision, txDigest: digest, deepbookDigest, lendingDigest, status })
  if (blobId) console.log(`   ↳ decision stored on Walrus: ${blobId}`)

  // Mirror the decision into the local feed so the dashboard can stream Icarus's reasoning
  // (HOLDs included — they never hit the chain). Newest-last; the API reverses for display.
  appendDecision({
    n,
    ts,
    apys,
    from: positionBefore,
    action: decision.action,
    target: decision.target,
    amount: decision.amount,
    reasoning: decision.reasoning,
    by: decision.by,
    status,
    txDigest: digest,
    blobId,
  })
}

// Package v2 address — vault rebalances are only executed when the swarm is running
// against v2. On the current VM (v1), multi-user enumeration runs but rebalances are
// skipped, so the live track record is preserved and nothing changes until v2 is deployed.
const V2_PACKAGE_ID = "0x9c49978732d2e8cb38f0744f825bc1d5431f34582811bfef6b099c785a22031f"
const MULTI_USER_ENABLED = PACKAGE_ID === V2_PACKAGE_ID

/**
 * Multi-user Icarus cycle: iterate every active user vault once per tick.
 *
 * - Shared APY read (one fetch serves all vaults).
 * - Each vault: skip if the user has paused; decide per vault; rebalance if
 *   action=REBALANCE and the target venue is composable into the hot-potato PTB
 *   (SUPPORTED_VENUES). If the best venue isn't supported, constrain the decision
 *   to the best supported venue or HOLD — never attempt an unsupported venue.
 * - Every vault decision is stored on Walrus and appended to the feed regardless
 *   of whether a rebalance fires — this preserves the reasoning audit trail.
 * - One vault's failure never kills the tick: errors are caught per-vault.
 * - If listActiveVaults() returns [], this is a cheap no-op — no APY fetch needed.
 * - Gated on MULTI_USER_ENABLED (TALOS_PACKAGE_ID === v2). When running against v1
 *   the cycle enumerates vaults and logs decisions but skips actual rebalances.
 */
export async function runMultiUserCycle(n: number): Promise<void> {
  if (DRY_RUN) {
    console.log(`[multi-user #${n}] DRY_RUN — skipping user-vault rebalances.`)
    return
  }
  const vaults = await listActiveVaults()
  if (vaults.length === 0) {
    console.log(`[multi-user #${n}] no active vaults — skipping.`)
    return
  }

  const ts = new Date().toISOString()
  // Shared APY read — done ONCE for all vaults in this tick.
  const apys = await getApys()
  const feed = apys.map((a) => `${a.protocol} ${a.apy}%`).join(" · ")
  console.log(`[multi-user #${n}] ${vaults.length} vault(s) · ${feed}`)

  for (const v of vaults) {
    // Pause check: skip if the vault owner has paused their agent.
    // sub undefined means no Mongo record found — do NOT skip (safe degradation).
    if (v.sub && (await isPaused(v.sub))) {
      console.log(`  [vault ${v.vaultId.slice(0, 10)}…] owner ${v.owner.slice(0, 10)}… PAUSED — skipping.`)
      continue
    }

    // Never-funded vault (principal 0) — nothing to manage. Skip quietly so empty
    // vaults don't churn the feed or produce failed-rebalance noise.
    if (!v.principal || v.principal === 0) {
      continue
    }

    // Build the policy view from the real on-chain values read by listActiveVaults.
    // perTxCap and remainingBudget come from the vault's AgentPolicy object (already
    // fetched during liveness check). Falls back to safe conservative defaults if RPC failed.
    const policyView = { remaining_budget: v.remainingBudget, per_tx_cap: v.perTxCap }

    // Decide — per vault, using this vault's current venue (not the flagship agent's).
    // v.currentVenue is inferred from the vault's dynamic fields (see vaults.ts).
    const vaultCurrent = v.currentVenue
    let rawDecision = (await decideWithLLM(vaultCurrent, apys, policyView, v.perTxCap)) ?? decide(vaultCurrent, apys, policyView, v.perTxCap)

    // Constrain the executable target to SUPPORTED_VENUES.
    // If the decided venue is not vault-composable, find the best supported one
    // that still beats the current position by the threshold, else HOLD.
    if (rawDecision.action === "REBALANCE" && !SUPPORTED_VENUES.has(rawDecision.target)) {
      // Find the highest-APY supported venue that clears the threshold vs current.
      const curApy = apys.find((a) => a.protocol === vaultCurrent)?.apy ?? 0
      const bestSupported = [...apys]
        .filter((a) => SUPPORTED_VENUES.has(a.protocol) && a.protocol !== vaultCurrent)
        .sort((a, b) => b.apy - a.apy)[0]
      const THRESHOLD_PP = Number(process.env.TALOS_THRESHOLD_PP ?? 0.25)
      if (bestSupported && bestSupported.apy - curApy >= THRESHOLD_PP) {
        rawDecision = {
          ...rawDecision,
          target: bestSupported.protocol,
          reasoning: `${rawDecision.reasoning} [constrained from ${rawDecision.target} to best supported: ${bestSupported.protocol}]`,
        }
      } else {
        rawDecision = {
          action: "HOLD",
          target: vaultCurrent,
          amount: 0,
          reasoning: `${rawDecision.target} is not vault-composable and no supported venue clears the threshold — holding`,
          by: rawDecision.by,
        }
      }
    }

    const move = rawDecision.action === "REBALANCE" ? `${rawDecision.amount} → ${rawDecision.target}` : "—"
    console.log(`  [vault ${v.vaultId.slice(0, 10)}…] ⇒ ${rawDecision.action} ${move}  (${rawDecision.by}: ${rawDecision.reasoning})`)

    let digest: string | null = null
    let status: string | undefined

    if (rawDecision.action === "REBALANCE" && rawDecision.amount > 0) {
      if (!MULTI_USER_ENABLED) {
        // Running against v1 — log intent but do not move funds.
        console.log(`  [vault ${v.vaultId.slice(0, 10)}…] MULTI_USER_ENABLED=false (v1 package) — rebalance skipped.`)
      } else {
        try {
          const r = await rebalanceVault(v, rawDecision)
          digest = r.digest
          status = r.status
          console.log(`  [vault ${v.vaultId.slice(0, 10)}…] ✓ rebalanceVault ${digest}  (${status})`)
        } catch (e: any) {
          // One vault's failure must not kill the tick — log and continue.
          console.log(`  [vault ${v.vaultId.slice(0, 10)}…] ✗ rebalanceVault failed: ${String(e?.message ?? e).split("\n")[0]}`)
        }
      }
    }

    // Store decision on Walrus + append to feed.
    // Isolated in their own try/catch: a Walrus or feed write failure must not
    // prevent the remaining vaults in this tick from being processed (Fix I-2).
    try {
      const blobId = await storeDecision({
        ts,
        vaultId: v.vaultId,
        owner: v.owner,
        sub: v.sub,
        apys,
        decision: rawDecision,
        txDigest: digest,
        status,
      })
      if (blobId) console.log(`  [vault ${v.vaultId.slice(0, 10)}…] ↳ decision stored on Walrus: ${blobId}`)

      // Append to the feed (HOLDs included — preserves reasoning audit trail).
      appendDecision({
        n,
        ts,
        apys,
        from: vaultCurrent,
        action: rawDecision.action,
        target: rawDecision.target,
        amount: rawDecision.amount,
        reasoning: `[vault ${v.vaultId.slice(0, 10)}…] ${rawDecision.reasoning}`,
        by: rawDecision.by,
        status,
        txDigest: digest,
        blobId,
      })
    } catch (auditErr: any) {
      // Audit-write failure is non-fatal: log and continue to the next vault.
      console.warn(
        `  [vault ${v.vaultId.slice(0, 10)}…] ✗ audit write failed (Walrus/feed): ${String(auditErr?.message ?? auditErr).split("\n")[0]}`,
      )
    }
  }
}
