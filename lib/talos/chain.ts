import { Transaction } from "@mysten/sui/transactions"
import { client, keypair, PACKAGE_ID, POLICY_ID } from "./config"

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
