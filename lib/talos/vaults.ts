/**
 * Active-vault enumerator for the multi-user swarm.
 *
 * Queries VaultCreated events on package v2 for vaults whose `agent` matches
 * the swarm's agent address, cross-checks that the bound AgentPolicy is still
 * active (not revoked, not expired), and optionally joins to Mongo `users` to
 * resolve the owner address to a user `sub` (needed for pause checks in Task 3).
 *
 * Design decisions:
 * - Descending page scan, capped at MAX_PAGES * PAGE_SIZE events, matching the
 *   pattern used by readSpendEvents in chain.ts.
 * - Dedupes by vault_id (a vault can only be created once, but defensive).
 * - Policy liveness checked via getObject — drops vaults with revoked or expired policies.
 *   The same getObject call also reads per_tx_cap and remaining_budget from the policy.
 * - currentVenue is inferred from the vault's dynamic fields: if the vault holds a
 *   SCALLOP_USDC position key it is in "scallop"; if it holds a yUSDC key it is in "kai".
 *   If neither dynamic field is present the vault is idle (all USDC) and defaults to
 *   "scallop" (the lowest-risk venue — agent will find and chase a better APY as usual).
 *   This is best-effort: RPC errors fall back to "scallop" with a warning.
 * - Mongo join is best-effort: if the DB is unreachable, sub stays undefined and
 *   the swarm continues (paused users simply won't be paused, a safe degradation).
 * - Any error in the whole function returns [] and logs — never throws into the swarm loop.
 */

import { SuiClient, type EventId } from "@mysten/sui/client"
import { PACKAGE_ID, AGENT_ADDRESS } from "./config"
import { users } from "../wallet/mongo"

// The default fullnode (geo-load-balanced) routes some regions to a replica that hasn't
// indexed the newer v2 `vault` module — returning 0 VaultCreated events AND policy/vault
// objects with empty content — so the swarm would see "no active vaults" even when funded
// ones exist. Read ALL vault/policy state for the enumerator from a dedicated,
// consistently-indexed endpoint (override with TALOS_EVENT_RPC). The flagship loop keeps
// the default RPC untouched. If this endpoint is down the scan returns [] that tick (safe —
// multi-user no-ops, flagship unaffected).
const VAULT_RPC = process.env.TALOS_EVENT_RPC || "https://sui-mainnet-endpoint.blockvision.org"
const vaultRpc = new SuiClient({ url: VAULT_RPC })

/** getObject with backoff — the free RPC endpoint can 429 under the parallel read burst. */
async function getObjRetry(id: string, tries = 3): Promise<Awaited<ReturnType<typeof vaultRpc.getObject>>> {
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await vaultRpc.getObject({ id, options: { showContent: true } })
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, 350 * (i + 1)))
    }
  }
  throw last
}

// Position coin type suffixes used to identify which venue a vault is currently in.
// These are the Move type names stored as dynamic-field keys (PosKey { t: TypeName }).
// Full type strings match vault-exec.ts constants.
const SCALLOP_SUSDC_TYPENAME =
  "0x55588ffc90718301696fd5497a7b6e82c0f86c15d58e41fc9750a24329ee2523::scallop_usdc::SCALLOP_USDC"
// Kai yUSDC typename — the "struct_tag" RPC returns uses the package::module::type form
// and may include type params; we match by substring to be robust across SDK versions.
const KAI_YUSDC_TYPENAME_FRAGMENT = "kai"

// Safe conservative defaults for policy limits if the RPC read fails.
const DEFAULT_CHUNK = Number(process.env.TALOS_CHUNK ?? 100)
const DEFAULT_PER_TX_CAP = DEFAULT_CHUNK
const DEFAULT_REMAINING_BUDGET = DEFAULT_CHUNK * 10

export type VaultRef = {
  vaultId: string
  policyId: string
  owner: string
  sub?: string
  /** The venue key ("scallop" | "kai") that the vault currently holds a position in,
   *  or the idle default ("scallop") when no lending position is open. */
  currentVenue: string
  /** AgentPolicy.per_tx_cap read from chain. Falls back to DEFAULT_PER_TX_CAP on error. */
  perTxCap: number
  /** AgentPolicy.remaining_budget read from chain. Falls back to DEFAULT_REMAINING_BUDGET on error. */
  remainingBudget: number
  /** Vault.principal (total USDC ever deposited, base units). 0 = never funded → the
   *  multi-user cycle skips it (nothing to manage). Falls back to 0 on RPC error. */
  principal: number
}

const PAGE_SIZE = 50
const MAX_PAGES = 20

export async function listActiveVaults(): Promise<VaultRef[]> {
  try {
    // --- 1. Collect all VaultCreated events for this agent, deduped by vault_id ---
    const seen = new Map<string, { policyId: string; owner: string }>()
    let cursor: EventId | null | undefined = undefined
    let pagesFetched = 0

    while (pagesFetched < MAX_PAGES) {
      const res = await vaultRpc.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::vault::VaultCreated` },
        order: "descending",
        limit: PAGE_SIZE,
        cursor: cursor ?? undefined,
      })

      for (const e of res.data) {
        const d = e.parsedJson as {
          vault_id: string
          owner: string
          agent: string
          policy_id: string
        }
        if (!d || d.agent !== AGENT_ADDRESS) continue
        if (!seen.has(d.vault_id)) {
          seen.set(d.vault_id, { policyId: d.policy_id, owner: d.owner })
        }
      }

      pagesFetched++
      if (!res.hasNextPage || !res.nextCursor) break
      cursor = res.nextCursor
    }

    if (seen.size === 0) return []

    // --- 2. Cross-check each policy is still active; also read per_tx_cap + remaining_budget ---
    const now = Date.now()
    const liveEntries: Array<{
      vaultId: string
      policyId: string
      owner: string
      perTxCap: number
      remainingBudget: number
    }> = []

    await Promise.all(
      Array.from(seen.entries()).map(async ([vaultId, { policyId, owner }]) => {
        try {
          const obj = await getObjRetry(policyId)
          const f = (obj.data as any)?.content?.fields
          if (!f) return // object missing or wrong type — skip
          const revoked: boolean = Boolean(f.revoked)
          const expiresAtMs: number = Number(f.expires_at_ms)
          if (revoked || expiresAtMs <= now) return // inactive — drop
          // Read policy limits — fall back to safe defaults if the field is missing/NaN
          const perTxCap = Number(f.per_tx_cap) || DEFAULT_PER_TX_CAP
          const remainingBudget = Number(f.remaining_budget) || DEFAULT_REMAINING_BUDGET
          liveEntries.push({ vaultId, policyId, owner, perTxCap, remainingBudget })
        } catch (err) {
          // Transient RPC error for this policy — skip it, don't fail the rest
          console.warn(`[vaults] getObject(${policyId}) failed:`, err)
        }
      }),
    )

    if (liveEntries.length === 0) return []

    // --- 3. Best-effort Mongo join: owner address → sub ---
    let ownerToSub = new Map<string, string>()
    try {
      const col = await users()
      const ownerAddresses = liveEntries.map((e) => e.owner)
      const docs = await col.find({ address: { $in: ownerAddresses } }).toArray()
      for (const doc of docs) {
        if (doc.address && doc.sub) ownerToSub.set(doc.address, doc.sub)
      }
    } catch (err) {
      // Mongo unavailable — sub stays undefined, swarm continues without pause checks
      console.warn("[vaults] Mongo join failed (sub will be undefined):", err)
    }

    // --- 4. Infer currentVenue from vault dynamic fields ---
    // The vault stores lending-position balances as dynamic fields keyed by PosKey { t: TypeName }.
    // We enumerate the vault's dynamic fields and match the type name to a venue key.
    // - SCALLOP_USDC type → "scallop"
    // - Any type containing "kai" (the yUSDC module path) → "kai"
    // - No matching position field (idle vault) → "scallop" (conservative default)
    const vaultToVenue = new Map<string, string>()
    const vaultToPrincipal = new Map<string, number>()
    await Promise.all(
      liveEntries.map(async ({ vaultId }) => {
        try {
          const dfs = await vaultRpc.getDynamicFields({ parentId: vaultId })
          let venue = "scallop" // idle default
          for (const df of dfs.data) {
            const typeName: string =
              typeof df.name?.value === "object" && df.name.value !== null
                ? String((df.name.value as any).t ?? "")
                : String(df.name?.value ?? "")
            if (typeName.includes(SCALLOP_SUSDC_TYPENAME)) {
              venue = "scallop"
              break
            }
            if (typeName.toLowerCase().includes(KAI_YUSDC_TYPENAME_FRAGMENT)) {
              venue = "kai"
              break
            }
          }
          vaultToVenue.set(vaultId, venue)
        } catch (err) {
          // Best-effort: RPC error — default to "scallop", log and continue
          console.warn(`[vaults] getDynamicFields(${vaultId}) failed, defaulting currentVenue to "scallop":`, err)
          vaultToVenue.set(vaultId, "scallop")
        }

        // Read the vault's principal so the multi-user cycle can skip never-funded vaults.
        try {
          const obj = await getObjRetry(vaultId)
          const vf = (obj.data as any)?.content?.fields
          vaultToPrincipal.set(vaultId, Number(vf?.principal ?? 0) || 0)
        } catch (err) {
          console.warn(`[vaults] getObject(${vaultId}) for principal failed, defaulting to 0:`, err)
          vaultToPrincipal.set(vaultId, 0)
        }
      }),
    )

    return liveEntries.map(({ vaultId, policyId, owner, perTxCap, remainingBudget }) => ({
      vaultId,
      policyId,
      owner,
      sub: ownerToSub.get(owner),
      currentVenue: vaultToVenue.get(vaultId) ?? "scallop",
      perTxCap,
      remainingBudget,
      principal: vaultToPrincipal.get(vaultId) ?? 0,
    }))
  } catch (err) {
    console.error("[vaults] listActiveVaults error — returning []:", err)
    return []
  }
}
