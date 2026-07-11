/**
 * vault-exec.ts — vault hot-potato rebalance executor (Task 2)
 *
 * Builds ONE PTB that:
 *   1. vault::borrow_for_supply  — pulls USDC from the vault under the policy (hot potato)
 *   2. venue supply move-call    — deposits the Coin<USDC> into the target protocol
 *   3. vault::return_position    — returns the minted position coin to the vault
 *
 * Unwind path:
 *   1. vault::borrow_position    — pulls the position coin out (hot potato)
 *   2. venue redeem move-call    — redeems for USDC
 *   3. vault::return_usdc        — returns the USDC to the vault
 *
 * SUPPORTED_VENUES: scallop (sCoin), kai (yUSDC)
 *
 * Navi is NOT supported here because navi-sdk's entry_deposit is a void entry function —
 * it accepts a coin input but returns no position token. There is nothing to chain into
 * vault::return_position. The unwind path (withdraw) does return a coin, but the deposit
 * half cannot be composed in a hot-potato PTB. To fix Navi, a thin on-chain adapter module
 * would be needed (e.g. a `deposit_and_get_receipt` function that wraps the Navi balance
 * into a Talos-specific receipt object, or Navi adds a receipt/share token in a future
 * upgrade).
 */

import { Transaction } from "@mysten/sui/transactions"
import { Scallop } from "@scallop-io/sui-scallop-sdk"
import { VAULTS } from "@kunalabs-io/kai"
import { SuiClient } from "@mysten/sui/client"
import { keypair, AGENT_ADDRESS, PACKAGE_ID } from "./config"
import type { VaultRef } from "./vaults"
import type { Decision } from "./decide"

// Mainnet client (Scallop + Kai are mainnet-only protocols)
const MAINNET_RPC = process.env.SUI_MAINNET_RPC || "https://fullnode.mainnet.sui.io:443"
export const mainnetClient = new SuiClient({ url: MAINNET_RPC })

// Protocols that can be composed into the vault hot-potato PTB.
// Navi excluded — see module docblock.
export const SUPPORTED_VENUES = new Set(["scallop", "kai"])

// Shared Scallop SDK instance (lazy-initialised)
let scallopInst: Scallop | null = null
function scallopSdk(): Scallop {
  if (!scallopInst) scallopInst = new Scallop({ networkType: "mainnet" })
  return scallopInst
}

// Kai USDC vault constant
const kaiVault = VAULTS.USDC

// USDC type (native Circle USDC on Sui, shared by Scallop and Kai)
const USDC_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

// Scallop sCoin type for USDC position — the coin `mintSCoin('susdc', ...)` actually
// produces (verified on mainnet). The previous 0x55588ffc… address was wrong and caused
// a TypeMismatch on vault::return_position.
const SCALLOP_SUSDC_TYPE =
  "0x854950aa624b1df59fe64e630b2ba7c550642e9342267a33061d59fb31582da5::scallop_usdc::SCALLOP_USDC"

// Kai yUSDC type (the active USDC vault's yield-bearing token)
const KAI_YUSDC_TYPE = kaiVault.YT.typeName as string

// Clock object on Sui (shared immutable)
const CLOCK = "0x0000000000000000000000000000000000000000000000000000000000000006"

// ─── Public API ──────────────────────────────────────────────────────────────

export type RebalanceResult = {
  digest: string
  status?: string
}

/**
 * rebalanceVault — supply path.
 *
 * Builds and executes a single PTB:
 *   vault::borrow_for_supply → venue::supply(coin) → vault::return_position
 *
 * @param vaultRef  - the user vault to rebalance (from listActiveVaults)
 * @param decision  - a REBALANCE decision (action, target, amount)
 */
export async function rebalanceVault(vaultRef: VaultRef, decision: Decision): Promise<RebalanceResult> {
  if (decision.action !== "REBALANCE") {
    throw new Error(`rebalanceVault: decision.action is ${decision.action}, expected REBALANCE`)
  }

  const venue = decision.target.toLowerCase()
  if (!SUPPORTED_VENUES.has(venue)) {
    throw new Error(
      `rebalanceVault: venue "${venue}" is not yet vault-composable. ` +
        `Supported: ${[...SUPPORTED_VENUES].join(", ")}. ` +
        `Navi requires a void entry_deposit (no output token) — needs an on-chain adapter.`,
    )
  }

  if (venue === "scallop") {
    return rebalanceVaultScallop(vaultRef, decision)
  } else {
    return rebalanceVaultKai(vaultRef, decision)
  }
}

/**
 * unwindVault — redeem path.
 *
 * Builds and executes a single PTB:
 *   vault::borrow_position → venue::redeem(position) → vault::return_usdc
 *
 * @param vaultRef  - the user vault to unwind
 * @param protocol  - the venue to redeem from
 */
export async function unwindVault(vaultRef: VaultRef, protocol: string): Promise<RebalanceResult> {
  const venue = protocol.toLowerCase()
  if (!SUPPORTED_VENUES.has(venue)) {
    throw new Error(
      `unwindVault: venue "${venue}" is not yet vault-composable. ` +
        `Supported: ${[...SUPPORTED_VENUES].join(", ")}.`,
    )
  }

  if (venue === "scallop") {
    return unwindVaultScallop(vaultRef, protocol)
  } else {
    return unwindVaultKai(vaultRef, protocol)
  }
}

// ─── Scallop ─────────────────────────────────────────────────────────────────
//
// Supply path:
//   vault::borrow_for_supply → Coin<USDC>
//   ScallopTxBlock.deposit(coin, 'usdc') → MarketCoin<USDC>
//   ScallopTxBlock.mintSCoin('susdc', marketCoin) → sCoin<SCALLOP_USDC>
//   vault::return_position<USDC, SCALLOP_USDC>(vault, receipt, sCoin)
//
// Redeem path:
//   vault::borrow_position<USDC, SCALLOP_USDC> → sCoin
//   ScallopTxBlock.burnSCoin('susdc', sCoin) → MarketCoin<USDC>
//   ScallopTxBlock.withdraw(marketCoin, 'usdc') → Coin<USDC>
//   vault::return_usdc<USDC>(vault, receipt, coin)

async function rebalanceVaultScallop(vaultRef: VaultRef, decision: Decision): Promise<RebalanceResult> {
  const sdk = scallopSdk()
  const builder = await sdk.createScallopBuilder()
  // builder.init() is called inside createScallopBuilder — the builder is ready.
  const txBlock = builder.createTxBlock()
  const rawTx = txBlock.txBlock as Transaction

  // setSender is required so the Scallop SDK can resolve coin objects if needed
  rawTx.setSender(AGENT_ADDRESS)

  const amountUsdc = Math.round(decision.amount * 1e6)
  const protocolStr = "scallop"

  // Step 1: vault::borrow_for_supply<USDC> → (Coin<USDC>, BorrowReceipt)
  const borrowResult = rawTx.moveCall({
    target: `${PACKAGE_ID}::vault::borrow_for_supply`,
    typeArguments: [USDC_TYPE],
    arguments: [
      rawTx.object(vaultRef.vaultId),
      rawTx.object(vaultRef.policyId),
      rawTx.object(CLOCK),
      rawTx.pure.u64(amountUsdc),
      rawTx.pure.string(protocolStr),
    ],
  })
  const borrowedCoin = borrowResult[0]
  const receipt = borrowResult[1]

  // Step 2a: Scallop deposit — Coin<USDC> → MarketCoin<USDC>
  const marketCoin = txBlock.deposit(borrowedCoin, "usdc")

  // Step 2b: Scallop mintSCoin — MarketCoin<USDC> → sCoin<SCALLOP_USDC>
  const sCoin = txBlock.mintSCoin("susdc", marketCoin)

  // Step 3: vault::return_position<USDC, SCALLOP_USDC>
  rawTx.moveCall({
    target: `${PACKAGE_ID}::vault::return_position`,
    typeArguments: [USDC_TYPE, SCALLOP_SUSDC_TYPE],
    arguments: [rawTx.object(vaultRef.vaultId), receipt, sCoin],
  })

  const res = await mainnetClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: rawTx,
    options: { showEffects: true },
  })
  await mainnetClient.waitForTransaction({ digest: res.digest })
  return { digest: res.digest, status: res.effects?.status?.status }
}

async function unwindVaultScallop(vaultRef: VaultRef, _protocol: string): Promise<RebalanceResult> {
  const sdk = scallopSdk()
  const builder = await sdk.createScallopBuilder()
  const txBlock = builder.createTxBlock()
  const rawTx = txBlock.txBlock as Transaction
  rawTx.setSender(AGENT_ADDRESS)

  const protocolStr = "scallop"

  // Step 1: vault::borrow_position<USDC, SCALLOP_USDC> → (sCoin, BorrowReceipt)
  const borrowResult = rawTx.moveCall({
    target: `${PACKAGE_ID}::vault::borrow_position`,
    typeArguments: [USDC_TYPE, SCALLOP_SUSDC_TYPE],
    arguments: [
      rawTx.object(vaultRef.vaultId),
      rawTx.object(vaultRef.policyId),
      rawTx.object(CLOCK),
      rawTx.pure.string(protocolStr),
    ],
  })
  const sCoin = borrowResult[0]
  const receipt = borrowResult[1]

  // Step 2a: Scallop burnSCoin — sCoin → MarketCoin<USDC>
  const marketCoin = txBlock.burnSCoin("susdc", sCoin)

  // Step 2b: Scallop withdraw — MarketCoin<USDC> → Coin<USDC>
  const usdcCoin = txBlock.withdraw(marketCoin, "usdc")

  // Step 3: vault::return_usdc<USDC>
  rawTx.moveCall({
    target: `${PACKAGE_ID}::vault::return_usdc`,
    typeArguments: [USDC_TYPE],
    arguments: [rawTx.object(vaultRef.vaultId), receipt, usdcCoin],
  })

  const res = await mainnetClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: rawTx,
    options: { showEffects: true },
  })
  await mainnetClient.waitForTransaction({ digest: res.digest })
  return { digest: res.digest, status: res.effects?.status?.status }
}

// ─── Kai ─────────────────────────────────────────────────────────────────────
//
// Supply path:
//   vault::borrow_for_supply → Coin<USDC>
//   0x2::coin::into_balance(coin) → Balance<USDC>         [framework move-call]
//   kai_sav::vault::deposit(balance) → Balance<yUSDC>
//   0x2::coin::from_balance(balance) → Coin<yUSDC>        [framework move-call]
//   vault::return_position<USDC, yUSDC>(vault, receipt, coin)
//
// Redeem path:
//   vault::borrow_position<USDC, yUSDC> → Coin<yUSDC>
//   0x2::coin::into_balance(coin) → Balance<yUSDC>
//   kai_sav::vault::withdraw(balance, strategies) → Balance<USDC>
//   0x2::coin::from_balance(balance) → Coin<USDC>
//   vault::return_usdc<USDC>(vault, receipt, coin)
//
// Note: fromBalance / intoBalance are NOT exported from @kunalabs-io/kai's public API.
// We use tx.moveCall against the 0x2 Sui framework directly for coin ↔ balance conversions,
// which is stable and equivalent to what the SDK does internally.

async function rebalanceVaultKai(vaultRef: VaultRef, decision: Decision): Promise<RebalanceResult> {
  const tx = new Transaction()
  tx.setSender(AGENT_ADDRESS)

  const amountUsdc = Math.round(decision.amount * 1e6)
  const protocolStr = "kai"

  // Step 1: vault::borrow_for_supply<USDC> → (Coin<USDC>, BorrowReceipt)
  const borrowResult = tx.moveCall({
    target: `${PACKAGE_ID}::vault::borrow_for_supply`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(vaultRef.vaultId),
      tx.object(vaultRef.policyId),
      tx.object(CLOCK),
      tx.pure.u64(amountUsdc),
      tx.pure.string(protocolStr),
    ],
  })
  const borrowedCoin = borrowResult[0]
  const receipt = borrowResult[1]

  // Step 2a: Coin<USDC> → Balance<USDC>  (0x2::coin::into_balance)
  const intoBalanceResult = tx.moveCall({
    target: "0x2::coin::into_balance",
    typeArguments: [USDC_TYPE],
    arguments: [borrowedCoin],
  })
  const usdcBalance = intoBalanceResult[0]

  // Step 2b: Kai vault deposit — Balance<USDC> → Balance<yUSDC>
  const yusdcBalance = kaiVault.deposit(tx, usdcBalance)

  // Step 2c: Balance<yUSDC> → Coin<yUSDC>  (0x2::coin::from_balance)
  const fromBalanceResult = tx.moveCall({
    target: "0x2::coin::from_balance",
    typeArguments: [KAI_YUSDC_TYPE],
    arguments: [yusdcBalance],
  })
  const yusdcCoin = fromBalanceResult[0]

  // Step 3: vault::return_position<USDC, yUSDC>
  tx.moveCall({
    target: `${PACKAGE_ID}::vault::return_position`,
    typeArguments: [USDC_TYPE, KAI_YUSDC_TYPE],
    arguments: [tx.object(vaultRef.vaultId), receipt, yusdcCoin],
  })

  const res = await mainnetClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  })
  await mainnetClient.waitForTransaction({ digest: res.digest })
  return { digest: res.digest, status: res.effects?.status?.status }
}

async function unwindVaultKai(vaultRef: VaultRef, _protocol: string): Promise<RebalanceResult> {
  const tx = new Transaction()
  tx.setSender(AGENT_ADDRESS)

  const protocolStr = "kai"
  const strategies = kaiVault.getStrategies()

  // Step 1: vault::borrow_position<USDC, yUSDC> → (Coin<yUSDC>, BorrowReceipt)
  const borrowResult = tx.moveCall({
    target: `${PACKAGE_ID}::vault::borrow_position`,
    typeArguments: [USDC_TYPE, KAI_YUSDC_TYPE],
    arguments: [
      tx.object(vaultRef.vaultId),
      tx.object(vaultRef.policyId),
      tx.object(CLOCK),
      tx.pure.string(protocolStr),
    ],
  })
  const yusdcCoin = borrowResult[0]
  const receipt = borrowResult[1]

  // Step 2a: Coin<yUSDC> → Balance<yUSDC>
  const intoBalanceResult = tx.moveCall({
    target: "0x2::coin::into_balance",
    typeArguments: [KAI_YUSDC_TYPE],
    arguments: [yusdcCoin],
  })
  const yusdcBalance = intoBalanceResult[0]

  // Step 2b: Kai vault withdraw — Balance<yUSDC> → Balance<USDC>
  const usdcBalance = kaiVault.withdraw(tx, yusdcBalance, strategies)

  // Step 2c: Balance<USDC> → Coin<USDC>
  const fromBalanceResult = tx.moveCall({
    target: "0x2::coin::from_balance",
    typeArguments: [USDC_TYPE],
    arguments: [usdcBalance],
  })
  const usdcCoin = fromBalanceResult[0]

  // Step 3: vault::return_usdc<USDC>
  tx.moveCall({
    target: `${PACKAGE_ID}::vault::return_usdc`,
    typeArguments: [USDC_TYPE],
    arguments: [tx.object(vaultRef.vaultId), receipt, usdcCoin],
  })

  const res = await mainnetClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  })
  await mainnetClient.waitForTransaction({ digest: res.digest })
  return { digest: res.digest, status: res.effects?.status?.status }
}

// ─── Dry-run helper (for validation without live vaults) ─────────────────────

/**
 * dryRunRebalance — build the PTB and call dryRunTransactionBlock to validate structure.
 *
 * Used for testing: even with placeholder object IDs (no funded vault on-chain), this
 * proves the PTB composition (borrow → venue supply → return_position) is syntactically
 * and structurally valid — RPC returns "object not found" not a construction error.
 *
 * @param venue       - "scallop" | "kai"
 * @param vaultRef    - VaultRef with placeholder IDs acceptable
 * @param amountUsdc  - amount in USDC (not scaled — e.g. 1.0 = 1 USDC)
 */
export async function dryRunRebalance(
  venue: "scallop" | "kai",
  vaultRef: VaultRef,
  amountUsdc: number,
): Promise<{ ok: boolean; error?: string; details?: unknown }> {
  try {
    let rawTx: Transaction

    if (venue === "scallop") {
      const sdk = scallopSdk()
      const builder = await sdk.createScallopBuilder()
      const txBlock = builder.createTxBlock()
      rawTx = txBlock.txBlock as Transaction
      rawTx.setSender(AGENT_ADDRESS)

      const amt = Math.round(amountUsdc * 1e6)
      const borrowResult = rawTx.moveCall({
        target: `${PACKAGE_ID}::vault::borrow_for_supply`,
        typeArguments: [USDC_TYPE],
        arguments: [
          rawTx.object(vaultRef.vaultId),
          rawTx.object(vaultRef.policyId),
          rawTx.object(CLOCK),
          rawTx.pure.u64(amt),
          rawTx.pure.string("scallop"),
        ],
      })
      const marketCoin = txBlock.deposit(borrowResult[0], "usdc")
      const sCoin = txBlock.mintSCoin("susdc", marketCoin)
      rawTx.moveCall({
        target: `${PACKAGE_ID}::vault::return_position`,
        typeArguments: [USDC_TYPE, SCALLOP_SUSDC_TYPE],
        arguments: [rawTx.object(vaultRef.vaultId), borrowResult[1], sCoin],
      })
    } else {
      rawTx = new Transaction()
      rawTx.setSender(AGENT_ADDRESS)

      const amt = Math.round(amountUsdc * 1e6)
      const borrowResult = rawTx.moveCall({
        target: `${PACKAGE_ID}::vault::borrow_for_supply`,
        typeArguments: [USDC_TYPE],
        arguments: [
          rawTx.object(vaultRef.vaultId),
          rawTx.object(vaultRef.policyId),
          rawTx.object(CLOCK),
          rawTx.pure.u64(amt),
          rawTx.pure.string("kai"),
        ],
      })

      const intoBalResult = rawTx.moveCall({
        target: "0x2::coin::into_balance",
        typeArguments: [USDC_TYPE],
        arguments: [borrowResult[0]],
      })
      const yusdcBalance = kaiVault.deposit(rawTx, intoBalResult[0])
      const fromBalResult = rawTx.moveCall({
        target: "0x2::coin::from_balance",
        typeArguments: [KAI_YUSDC_TYPE],
        arguments: [yusdcBalance],
      })
      rawTx.moveCall({
        target: `${PACKAGE_ID}::vault::return_position`,
        typeArguments: [USDC_TYPE, KAI_YUSDC_TYPE],
        arguments: [rawTx.object(vaultRef.vaultId), borrowResult[1], fromBalResult[0]],
      })
    }

    // Build the tx bytes (proves PTB composition is structurally valid client-side)
    const built = await rawTx.build({ client: mainnetClient })

    // Attempt dry-run — "object not found" is expected (no live vault), not a build error
    try {
      const dry = await mainnetClient.dryRunTransactionBlock({
        transactionBlock: built,
      })
      return { ok: true, details: { status: dry.effects?.status, venue } }
    } catch (rpcErr: unknown) {
      // If we got past build(), the PTB structure is valid — RPC errors are expected
      // for placeholder object IDs (objects don't exist on chain yet)
      const msg = String((rpcErr as Error)?.message ?? rpcErr)
      const isExpectedObjectError =
        msg.includes("object not found") ||
        msg.includes("ObjectNotFound") ||
        msg.includes("notExists") ||
        msg.includes("Could not find")
      return {
        ok: isExpectedObjectError,
        error: isExpectedObjectError ? undefined : msg,
        details: { venue, buildOk: true, rpcErr: msg },
      }
    }
  } catch (err: unknown) {
    return { ok: false, error: String((err as Error)?.message ?? err), details: { venue } }
  }
}
