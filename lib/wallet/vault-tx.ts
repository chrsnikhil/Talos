/**
 * Client-side transaction builders for the Talos vault package v2.
 *
 * Each function returns a `Transaction` (from @mysten/sui/transactions) that can
 * be serialized with `tx.serialize()` and POSTed to `/api/wallet/execute`.
 *
 * ALLOWLIST DESIGN NOTE (for Task 4 / execute):
 *   `owner_withdraw_usdc` and `buildPanic` call vault::owner_withdraw_usdc which
 *   returns a `Coin<USDC>` at the Move level. The PTB must transfer that coin back
 *   to the caller — but the current /api/wallet/execute allowlist only permits
 *   MoveCall commands targeting PACKAGE_ID, and a `transferObjects` command is NOT
 *   a MoveCall. Two options:
 *     (a) Extend the allowlist to also permit `transferObjects` where the recipient
 *         is the session wallet address (self-transfer, safe).
 *     (b) Add a Move entry fun in the vault module that withdraws and transfers in one
 *         call (no PTB transfer needed).
 *   This file implements option (a) — `transferObjects` to `tx.pure.address(sender)`
 *   — so it will FAIL the current allowlist. Task 4 must either extend the allowlist
 *   or the Move module must add an entry wrapper. This is flagged here so Task 4 can
 *   fix it before wiring the UI.
 */

import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID } from "./config";

/**
 * Native USDC on Sui mainnet.
 * Verified: https://suivision.xyz/coin/0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
 */
export const USDC_TYPE =
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

// ─── agent_policy::create_policy_entry ───────────────────────────────────────
// entry fun create_policy_entry(
//   agent: address,
//   budget: u64,
//   per_tx_cap: u64,
//   protocols: vector<String>,
//   expires_at_ms: u64,
//   ctx: &mut TxContext,
// )

export interface BuildCreatePolicyArgs {
  agent: string;
  budget: bigint | number;
  perTxCap: bigint | number;
  protocols: string[];
  expiresAtMs: bigint | number;
}

export function buildCreatePolicy(args: BuildCreatePolicyArgs): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::agent_policy::create_policy_entry`,
    arguments: [
      tx.pure.address(args.agent),
      tx.pure.u64(BigInt(args.budget)),
      tx.pure.u64(BigInt(args.perTxCap)),
      tx.pure.vector("string", args.protocols),
      tx.pure.u64(BigInt(args.expiresAtMs)),
    ],
  });
  return tx;
}

// ─── vault::create_vault<USDC> ───────────────────────────────────────────────
// public fun create_vault<S>(
//   policy: &AgentPolicy,
//   allowed: vector<TypeName>,
//   ctx: &mut TxContext,
// )
// Note: create_vault is `public fun`, not `entry fun`, so it cannot be called
// directly as a top-level PTB MoveCall without an entry wrapper. We call it via
// PTB MoveCall which is valid for `public fun`s on Sui — the PTB executor can
// call any public function.

export interface BuildCreateVaultArgs {
  /** Object ID of the shared AgentPolicy */
  policyId: string;
  /** Fully-qualified TypeNames of allowed lending positions, e.g. "0x...::scallop::sCoin" */
  allowedPositions: string[];
}

/** std::type_name::TypeName — the element type of the vault's `allowed` argument. */
const TYPE_NAME_TYPE = "0x1::type_name::TypeName";

export function buildCreateVault(args: BuildCreateVaultArgs): Transaction {
  const tx = new Transaction();
  // `allowed` is `vector<TypeName>`. TypeName is a Move struct, so it CANNOT be
  // passed as a pure argument (the VM rejects it with InvalidUsageOfPureArg).
  // Build the vector with MakeMoveVec instead. The UI always passes an empty
  // allow-list; non-empty TypeName entries can't be constructed client-side as
  // pure values, so that path is unsupported here.
  if (args.allowedPositions.length > 0) {
    throw new Error(
      "buildCreateVault: non-empty allowedPositions is not supported (TypeName cannot be a pure arg)"
    );
  }
  const allowed = tx.makeMoveVec({ type: TYPE_NAME_TYPE, elements: [] });
  tx.moveCall({
    target: `${PACKAGE_ID}::vault::create_vault`,
    typeArguments: [USDC_TYPE],
    arguments: [tx.object(args.policyId), allowed],
  });
  return tx;
}

// ─── vault::deposit<USDC> ────────────────────────────────────────────────────
// public fun deposit<S>(v: &mut Vault<S>, c: Coin<S>)
//
// The caller must pass the coin object to deposit. If `amount` is less than
// the full coin, the caller should split it before (or we split in this builder).
// We use `tx.splitCoins` to carve the exact amount from a USDC coin, then pass
// the resulting coin to `deposit`. splitCoins IS a non-MoveCall PTB command —
// however it is a built-in PTB primitive (not a Transfer), and the execute route
// allowlist may need to be extended to permit it alongside MoveCall.
// Record for Task 4: the allowlist must permit SplitCoins PTB commands.

export interface BuildDepositArgs {
  /** Object ID of the shared Vault<USDC> */
  vaultId: string;
  /** Object ID of a Coin<USDC> the user owns */
  coinObjectId: string;
  /** Amount in base USDC units (6 decimals) */
  amount: bigint | number;
}

export function buildDeposit(args: BuildDepositArgs): Transaction {
  const tx = new Transaction();
  const [depositCoin] = tx.splitCoins(tx.object(args.coinObjectId), [
    tx.pure.u64(BigInt(args.amount)),
  ]);
  tx.moveCall({
    target: `${PACKAGE_ID}::vault::deposit`,
    typeArguments: [USDC_TYPE],
    arguments: [tx.object(args.vaultId), depositCoin],
  });
  return tx;
}

// ─── vault::owner_withdraw_usdc<USDC> ────────────────────────────────────────
// public fun owner_withdraw_usdc<S>(
//   v: &mut Vault<S>,
//   cap: &OwnerCap,
//   amount: u64,
//   ctx: &mut TxContext,
// ): Coin<S>
//
// ALLOWLIST DESIGN NOTE: This function returns a Coin<S>. To deliver it to the
// user we must `transferObjects([coin], senderAddress)` in the same PTB. That
// transferObjects is a non-MoveCall command and WILL be rejected by the current
// /api/wallet/execute allowlist. See module-level note for resolution options.
// The builder is implemented correctly; Task 4 must fix the allowlist.

export interface BuildOwnerWithdrawUsdcArgs {
  /** Object ID of the shared Vault<USDC> */
  vaultId: string;
  /** Object ID of the OwnerCap owned by the user */
  ownerCapId: string;
  /** Amount to withdraw in base USDC units (6 decimals) */
  amount: bigint | number;
  /** Sender address — the withdrawn coin is transferred here */
  sender: string;
}

export function buildOwnerWithdrawUsdc(
  args: BuildOwnerWithdrawUsdcArgs
): Transaction {
  const tx = new Transaction();
  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::vault::owner_withdraw_usdc`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(args.vaultId),
      tx.object(args.ownerCapId),
      tx.pure.u64(BigInt(args.amount)),
    ],
  });
  // ⚠ Non-MoveCall command — will be rejected by current allowlist (see module note).
  tx.transferObjects([coin], tx.pure.address(args.sender));
  return tx;
}

// ─── buildPanic: revoke + full withdraw in one PTB ───────────────────────────
// Calls:
//   1. agent_policy::revoke(&mut AgentPolicy, &OwnerCap)
//   2. vault::owner_withdraw_usdc<USDC>(&mut Vault, &OwnerCap, amount, ctx) — amount = full idle balance
//
// Because we cannot read the vault's idle balance at tx-build time without a
// chain query, the caller must supply `amount`. If amount = 0 the Move call will
// return an empty Coin (value 0) which is still transferred to be safe; callers
// should query idle balance from Task 2's API before calling buildPanic.
//
// ALLOWLIST NOTE: same transferObjects constraint as buildOwnerWithdrawUsdc applies.

export interface BuildPanicArgs {
  /** Object ID of the shared AgentPolicy */
  policyId: string;
  /** Object ID of the shared Vault<USDC> */
  vaultId: string;
  /** Object ID of the OwnerCap owned by the user */
  ownerCapId: string;
  /** Full idle USDC balance to withdraw (query from /api/wallet/vault first) */
  amount: bigint | number;
  /** Sender address — the withdrawn coin is transferred here */
  sender: string;
}

export function buildPanic(args: BuildPanicArgs): Transaction {
  const tx = new Transaction();

  // Step 1: revoke the policy (owner kill-switch)
  tx.moveCall({
    target: `${PACKAGE_ID}::agent_policy::revoke`,
    arguments: [tx.object(args.policyId), tx.object(args.ownerCapId)],
  });

  // Step 2: withdraw all idle USDC from the vault
  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::vault::owner_withdraw_usdc`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(args.vaultId),
      tx.object(args.ownerCapId),
      tx.pure.u64(BigInt(args.amount)),
    ],
  });

  // ⚠ Non-MoveCall command — will be rejected by current allowlist (see module note).
  tx.transferObjects([coin], tx.pure.address(args.sender));
  return tx;
}
