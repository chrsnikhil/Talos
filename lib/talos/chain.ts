import { Transaction } from "@mysten/sui/transactions"
import { client, keypair, PACKAGE_ID, POLICY_ID, REPUTATION_ID } from "./config"

export type SpendEvent = { tx: string; amount: number; protocol: string; remaining: number; timestampMs: number }

/** Read Icarus's SpendAuthorized events for this policy, oldest first. */
export async function readSpendEvents(limit = 50): Promise<SpendEvent[]> {
  const res = await client.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::agent_policy::SpendAuthorized` },
    order: "ascending",
    limit,
  })
  return res.data
    .filter((e) => (e.parsedJson as any)?.policy_id === POLICY_ID)
    .map((e) => {
      const d = e.parsedJson as any
      return { tx: e.id.txDigest, amount: Number(d.amount), protocol: d.protocol, remaining: Number(d.remaining), timestampMs: Number(e.timestampMs ?? 0) }
    })
}

/** Set of Icarus tx digests Daedalus has already rated (for this reputation ledger). */
export async function readRatedTxs(): Promise<Set<string>> {
  const res = await client.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::reputation::CriticRating` },
    order: "descending",
    limit: 200,
  })
  const s = new Set<string>()
  for (const e of res.data) {
    const d = e.parsedJson as any
    if (d?.reputation_id === REPUTATION_ID && d?.ref_tx) s.add(d.ref_tx)
  }
  return s
}

/** Daedalus writes a rating on-chain (must be the critic). */
export async function submitRating(score: number, verdict: string, refTx: string): Promise<{ digest: string; status?: string }> {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::reputation::submit_rating`,
    arguments: [tx.object(REPUTATION_ID), tx.pure.u8(score), tx.pure.string(verdict), tx.pure.string(refTx)],
  })
  const res = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx, options: { showEffects: true } })
  await client.waitForTransaction({ digest: res.digest })
  return { digest: res.digest, status: res.effects?.status?.status }
}

export async function readReputation(): Promise<{ total: number; avg: number }> {
  const o = await client.getObject({ id: REPUTATION_ID, options: { showContent: true } })
  const f = (o.data as any)?.content?.fields
  const total = Number(f?.total ?? 0)
  const sum = Number(f?.score_sum ?? 0)
  return { total, avg: total ? Math.round((sum * 100) / total) / 100 : 0 }
}

export type PolicyState = {
  remaining_budget: number
  per_tx_cap: number
  total_spent: number
  revoked: boolean
  expires_at_ms: number
}

/** Read the live AgentPolicy object state from chain. */
export async function readPolicy(): Promise<PolicyState> {
  const o = await client.getObject({ id: POLICY_ID, options: { showContent: true } })
  const f = (o.data as any)?.content?.fields
  if (!f) throw new Error("policy object not found / no content")
  return {
    remaining_budget: Number(f.remaining_budget),
    per_tx_cap: Number(f.per_tx_cap),
    total_spent: Number(f.total_spent),
    revoked: Boolean(f.revoked),
    expires_at_ms: Number(f.expires_at_ms),
  }
}

/** Call authorize_spend on-chain. Throws (aborts) if any policy bound is violated. */
export async function authorizeSpend(amount: number, protocol: string): Promise<{ digest: string; status?: string }> {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::agent_policy::authorize_spend`,
    arguments: [tx.object(POLICY_ID), tx.object("0x6"), tx.pure.u64(amount), tx.pure.string(protocol)],
  })
  const res = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  })
  await client.waitForTransaction({ digest: res.digest })
  return { digest: res.digest, status: res.effects?.status?.status }
}
