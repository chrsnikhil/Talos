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
 * - Mongo join is best-effort: if the DB is unreachable, sub stays undefined and
 *   the swarm continues (paused users simply won't be paused, a safe degradation).
 * - Any error in the whole function returns [] and logs — never throws into the swarm loop.
 */

import type { EventId } from "@mysten/sui/client"
import { client, PACKAGE_ID, AGENT_ADDRESS } from "./config"
import { users } from "../wallet/mongo"

export type VaultRef = {
  vaultId: string
  policyId: string
  owner: string
  sub?: string
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
      const res = await client.queryEvents({
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

    // --- 2. Cross-check each policy is still active ---
    const now = Date.now()
    const liveEntries: Array<{ vaultId: string; policyId: string; owner: string }> = []

    await Promise.all(
      Array.from(seen.entries()).map(async ([vaultId, { policyId, owner }]) => {
        try {
          const obj = await client.getObject({ id: policyId, options: { showContent: true } })
          const f = (obj.data as any)?.content?.fields
          if (!f) return // object missing or wrong type — skip
          const revoked: boolean = Boolean(f.revoked)
          const expiresAtMs: number = Number(f.expires_at_ms)
          if (revoked || expiresAtMs <= now) return // inactive — drop
          liveEntries.push({ vaultId, policyId, owner })
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

    return liveEntries.map(({ vaultId, policyId, owner }) => ({
      vaultId,
      policyId,
      owner,
      sub: ownerToSub.get(owner),
    }))
  } catch (err) {
    console.error("[vaults] listActiveVaults error — returning []:", err)
    return []
  }
}
