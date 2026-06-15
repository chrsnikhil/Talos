import { Scallop } from "@scallop-io/sui-scallop-sdk"
import { client, keypair, AGENT_ADDRESS } from "./config"

// Real lending on Scallop (Sui MAINNET only). Read APY works without funds;
// deposit/withdraw move real USDC and require the mainnet address to hold USDC + SUI.
let scallop: Scallop | null = null
function sdk(): Scallop {
  if (!scallop) scallop = new Scallop({ networkType: "mainnet" })
  return scallop
}

/** Real Scallop USDC supply APY (percent). Read-only. */
export async function readUsdcApy(): Promise<number | null> {
  try {
    const q = await sdk().createScallopQuery()
    await q.init()
    const pools: any = await q.getMarketPools(["usdc"])
    const u = pools?.pools?.usdc ?? pools?.usdc
    if (u?.supplyApy == null) return null
    return +(Number(u.supplyApy) * 100).toFixed(2)
  } catch {
    return null
  }
}

/** Deposit USDC into Scallop (real funds). amountUsdc in USDC (6 decimals). */
export async function depositUsdc(amountUsdc: number): Promise<{ digest: string; status?: string }> {
  const builder = await sdk().createScallopBuilder()
  const tx = builder.createTxBlock()
  tx.setSender(AGENT_ADDRESS)
  await tx.depositQuick(Math.round(amountUsdc * 1e6), "usdc")
  const res = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx.txBlock as any,
    options: { showEffects: true },
  })
  await client.waitForTransaction({ digest: res.digest })
  return { digest: res.digest, status: res.effects?.status?.status }
}

/** Withdraw USDC from Scallop (real funds). amountUsdc in USDC (6 decimals). */
export async function withdrawUsdc(amountUsdc: number): Promise<{ digest: string; status?: string }> {
  const builder = await sdk().createScallopBuilder()
  const tx = builder.createTxBlock()
  tx.setSender(AGENT_ADDRESS)
  await tx.withdrawQuick(Math.round(amountUsdc * 1e6), "usdc")
  const res = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx.txBlock as any,
    options: { showEffects: true },
  })
  await client.waitForTransaction({ digest: res.digest })
  return { digest: res.digest, status: res.effects?.status?.status }
}

/** Read the agent's current Scallop USDC lending position (underlying USDC). */
export async function readUsdcPosition(): Promise<number | null> {
  try {
    const q = await sdk().createScallopQuery()
    await q.init()
    const lendings: any = await q.getLendings(["usdc"], AGENT_ADDRESS)
    const u = lendings?.usdc
    const amt = u?.suppliedCoin ?? u?.suppliedAmount
    return amt != null ? Number(amt) : null
  } catch {
    return null
  }
}
