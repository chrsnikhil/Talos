import { VAULTS, Amount } from "@kunalabs-io/kai"
import { Transaction } from "@mysten/sui/transactions"
import { client, keypair, AGENT_ADDRESS } from "./config"

// Real lending on Kai Finance (Sui MAINNET) — the third real venue alongside
// Scallop and NAVI. Kai's native `USDC` single-asset vault accepts exactly Circle
// USDC on Sui (0xdba34672…::usdc::USDC), so the agent supplies/redeems the same coin
// it holds. Depositing mints the vault's yield-bearing token (yUSDC) to the agent;
// withdrawing burns it back to USDC. Kai's SDK builds a Transaction that we sign+
// execute with the agent keypair (built from TALOS_AGENT_KEY) against our own client,
// so this only runs on mainnet. We force Kai onto our single @mysten/sui 1.45.2
// (pnpm override) so the coinWithBalance build resolver is shared — no dual-copy clash.
const vault = VAULTS.USDC // native Circle USDC single-asset vault

type Res = { digest: string; status?: string }

async function sign(tx: Transaction): Promise<Res> {
  const r = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  })
  return { digest: r.digest, status: r.effects?.status?.status }
}

/** Supply USDC to Kai (real funds). amountUsdc in USDC (6 decimals). */
export async function depositUsdc(amountUsdc: number): Promise<Res> {
  const tx = new Transaction()
  await vault.depositFromWallet(tx, AGENT_ADDRESS, Amount.fromInt(Math.round(amountUsdc * 1e6), 6))
  return sign(tx)
}

/** Withdraw USDC from Kai (real funds). amountUsdc in USDC (6 decimals). */
export async function withdrawUsdc(amountUsdc: number): Promise<Res> {
  const tx = new Transaction()
  await vault.withdrawToWalletT(
    client,
    tx,
    AGENT_ADDRESS,
    Amount.fromInt(Math.round(amountUsdc * 1e6), 6),
    vault.getStrategies(),
  )
  return sign(tx)
}

/** Read the agent's current Kai USDC supply position (underlying USDC). */
export async function readUsdcPosition(): Promise<number | null> {
  try {
    const [state, ytBal] = await Promise.all([
      vault.fetch(client),
      client.getBalance({ owner: AGENT_ADDRESS, coinType: vault.YT.typeName }),
    ])
    const yt = BigInt(ytBal.totalBalance)
    if (yt === 0n) return 0
    // underlying = yUSDC held × (vault's total available USDC ÷ yUSDC supply)
    let totalAvailable = state.freeBalance.value
    for (const strategy of state.strategies.contents) totalAvailable += strategy.value.borrowed
    const ytSupply = state.lpTreasury.totalSupply.value
    if (ytSupply === 0n) return 0
    const underlying = (yt * totalAvailable) / ytSupply
    return +(Number(underlying) / 1e6).toFixed(6)
  } catch {
    return null
  }
}
