import { Transaction } from "@mysten/sui/transactions"
import { DeepBookClient } from "@mysten/deepbook-v3"
import { client, keypair, AGENT_ADDRESS } from "./config"

const BM = process.env.TALOS_BALANCE_MANAGER || ""
// DEEP/SUI is a whitelisted testnet pool → 0% fee, no DEEP token needed.
const POOL = "DEEP_SUI"

export function deepbookEnabled(): boolean {
  return !!BM
}

function makeDb() {
  return new DeepBookClient({
    client,
    address: AGENT_ADDRESS,
    env: "testnet",
    balanceManagers: BM ? { MANAGER_1: { address: BM } } : undefined,
  })
}

/**
 * Place a real, on-chain DeepBook limit order from the agent — the "swap leg"
 * of a rebalance. A low bid for DEEP backed by the manager's SUI: it rests on
 * the book as a genuine order (whitelisted pool, no DEEP fee). Non-fatal.
 */
export async function placeRealOrder(): Promise<{ digest: string; status?: string } | null> {
  if (!BM) return null
  const db = makeDb()
  const tx = new Transaction()
  tx.add(
    db.deepBook.placeLimitOrder({
      poolKey: POOL,
      balanceManagerKey: "MANAGER_1",
      clientOrderId: String(Date.now()),
      price: 0.001, // SUI per DEEP — far below market, rests (won't fill)
      quantity: 10, // pool minSize is 10 DEEP; ~0.01 SUI locked at this bid
      isBid: true,
      payWithDeep: false, // whitelisted pool
    }),
  )
  const res = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx, options: { showEffects: true } })
  await client.waitForTransaction({ digest: res.digest })
  return { digest: res.digest, status: res.effects?.status?.status }
}

export async function readMid(): Promise<number | null> {
  try {
    return await makeDb().midPrice(POOL)
  } catch {
    return null
  }
}
