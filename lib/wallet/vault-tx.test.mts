/**
 * Tests for vault-tx.ts transaction builders.
 *
 * Verifies that every MoveCall in each built Transaction targets PACKAGE_ID,
 * confirming the /api/wallet/execute allowlist will accept them (for MoveCall
 * commands). Non-MoveCall commands (SplitCoins, TransferObjects) are noted as
 * allowlist exceptions — see vault-tx.ts module comment for details.
 *
 * Run: pnpm exec tsx lib/wallet/vault-tx.test.mts
 */

import assert from "node:assert/strict";
import { Transaction } from "@mysten/sui/transactions";
import {
  buildCreatePolicy,
  buildCreateVault,
  buildDeposit,
  buildOwnerWithdrawUsdc,
  buildPanic,
  USDC_TYPE,
} from "./vault-tx.js";
import { PACKAGE_ID } from "./config.js";

// Dummy addresses / object IDs for building (no chain calls needed)
const AGENT = "0x" + "a".repeat(64);
const POLICY_ID = "0x" + "b".repeat(64);
const VAULT_ID = "0x" + "c".repeat(64);
const OWNER_CAP_ID = "0x" + "d".repeat(64);
const COIN_OBJ_ID = "0x" + "e".repeat(64);
const SENDER = "0x" + "f".repeat(64);

function getCommands(tx: Transaction) {
  return Transaction.from(tx.serialize()).getData().commands;
}

function assertAllMoveCallsTargetPackage(
  commands: ReturnType<typeof getCommands>,
  label: string
) {
  const moveCalls = commands.filter((c) => c.$kind === "MoveCall");
  assert.ok(moveCalls.length > 0, `${label}: expected at least one MoveCall`);
  for (const cmd of moveCalls) {
    if (cmd.$kind !== "MoveCall") continue;
    const pkg = cmd.MoveCall.package;
    assert.equal(
      pkg,
      PACKAGE_ID,
      `${label}: MoveCall targets ${pkg}, expected ${PACKAGE_ID}`
    );
  }
}

// ── buildCreatePolicy ────────────────────────────────────────────────────────
{
  const tx = buildCreatePolicy({
    agent: AGENT,
    budget: 1_000_000n,
    perTxCap: 100_000n,
    protocols: ["suilend", "scallop"],
    expiresAtMs: Date.now() + 86400_000,
  });
  const cmds = getCommands(tx);
  assertAllMoveCallsTargetPackage(cmds, "buildCreatePolicy");
  // Only MoveCall — no non-MoveCall commands expected
  const nonMove = cmds.filter((c) => c.$kind !== "MoveCall");
  assert.equal(
    nonMove.length,
    0,
    `buildCreatePolicy: unexpected non-MoveCall commands: ${nonMove.map((c) => c.$kind).join(", ")}`
  );
  console.log("buildCreatePolicy ok — commands:", cmds.map((c) => c.$kind));
}

// ── buildCreateVault ─────────────────────────────────────────────────────────
{
  const tx = buildCreateVault({
    policyId: POLICY_ID,
    allowedPositions: [],
  });
  const cmds = getCommands(tx);
  assertAllMoveCallsTargetPackage(cmds, "buildCreateVault");
  const nonMove = cmds.filter((c) => c.$kind !== "MoveCall");
  assert.equal(
    nonMove.length,
    0,
    `buildCreateVault: unexpected non-MoveCall commands: ${nonMove.map((c) => c.$kind).join(", ")}`
  );
  console.log("buildCreateVault ok — commands:", cmds.map((c) => c.$kind));
}

// ── buildDeposit ─────────────────────────────────────────────────────────────
{
  const tx = buildDeposit({
    vaultId: VAULT_ID,
    coinObjectId: COIN_OBJ_ID,
    amount: 500_000n,
  });
  const cmds = getCommands(tx);
  assertAllMoveCallsTargetPackage(cmds, "buildDeposit");
  // DESIGN NOTE: buildDeposit emits a SplitCoins command before the MoveCall.
  // This is a non-MoveCall PTB primitive. The execute allowlist must be extended
  // to permit SplitCoins (or the server can relax the check to: all MoveCalls
  // must target PACKAGE_ID, non-MoveCall primitives are fine).
  const splitCoins = cmds.filter((c) => c.$kind === "SplitCoins");
  if (splitCoins.length > 0) {
    console.warn(
      "buildDeposit DESIGN NOTE: contains SplitCoins command — allowlist must permit it"
    );
  }
  console.log("buildDeposit ok — commands:", cmds.map((c) => c.$kind));
}

// ── buildOwnerWithdrawUsdc ───────────────────────────────────────────────────
{
  const tx = buildOwnerWithdrawUsdc({
    vaultId: VAULT_ID,
    ownerCapId: OWNER_CAP_ID,
    amount: 200_000n,
    sender: SENDER,
  });
  const cmds = getCommands(tx);
  assertAllMoveCallsTargetPackage(cmds, "buildOwnerWithdrawUsdc");
  // DESIGN NOTE: contains a TransferObjects command to return the coin to the sender.
  // The current allowlist rejects non-MoveCall commands — Task 4 must extend it.
  const transfers = cmds.filter((c) => c.$kind === "TransferObjects");
  if (transfers.length > 0) {
    console.warn(
      "buildOwnerWithdrawUsdc DESIGN NOTE: contains TransferObjects command — " +
        "allowlist must permit self-transfers or a Move entry wrapper must be added"
    );
  }
  console.log(
    "buildOwnerWithdrawUsdc ok — commands:",
    cmds.map((c) => c.$kind)
  );
}

// ── buildPanic ───────────────────────────────────────────────────────────────
{
  const tx = buildPanic({
    policyId: POLICY_ID,
    vaultId: VAULT_ID,
    ownerCapId: OWNER_CAP_ID,
    amount: 1_000_000n,
    sender: SENDER,
  });
  const cmds = getCommands(tx);
  assertAllMoveCallsTargetPackage(cmds, "buildPanic");
  // Expect 2 MoveCalls: revoke + owner_withdraw_usdc
  const moveCalls = cmds.filter((c) => c.$kind === "MoveCall");
  assert.equal(moveCalls.length, 2, `buildPanic: expected 2 MoveCalls, got ${moveCalls.length}`);
  // DESIGN NOTE: same TransferObjects constraint as buildOwnerWithdrawUsdc
  const transfers = cmds.filter((c) => c.$kind === "TransferObjects");
  if (transfers.length > 0) {
    console.warn(
      "buildPanic DESIGN NOTE: contains TransferObjects command — " +
        "allowlist must permit self-transfers or a Move entry wrapper must be added"
    );
  }
  console.log("buildPanic ok — commands:", cmds.map((c) => c.$kind));
}

// ── USDC_TYPE sanity ─────────────────────────────────────────────────────────
assert.match(
  USDC_TYPE,
  /^0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC$/,
  "USDC_TYPE must match expected mainnet coin type"
);
console.log("USDC_TYPE ok:", USDC_TYPE);

console.log("\nAll vault-tx tests passed.");
