// Regression tests for the vault transaction builders (pure — no network).
// Run: node --import tsx lib/wallet/vault-tx.test.ts
import assert from "node:assert/strict";
import {
  buildCreateVault,
  buildDeposit,
  buildOwnerWithdrawUsdc,
  buildPanic,
  USDC_TYPE,
} from "./vault-tx";

const ID = "0x" + "1".repeat(64);
const ADDR = "0x" + "2".repeat(64);

const kinds = (tx: { getData(): { commands?: { $kind: string }[] } }): string[] =>
  (tx.getData().commands ?? []).map((c) => c.$kind);

// ── BUG-A regression ────────────────────────────────────────────────────────
// create_vault's `allowed: vector<TypeName>` MUST be built with MakeMoveVec.
// If it regresses to `tx.pure.vector(...)`, the VM rejects the tx with
// CommandArgumentError InvalidUsageOfPureArg — caught here by the absence of a
// MakeMoveVec command.
{
  const tx = buildCreateVault({ policyId: ID, allowedPositions: [] });
  const ks = kinds(tx);
  assert.ok(ks.includes("MakeMoveVec"), "create_vault must build `allowed` with MakeMoveVec, not a pure arg");
  // Defaults to the composable venue position types → 2 type_name::get + 1 create_vault.
  // A vault created with an EMPTY allow-list can never hold a position (EPositionNotAllowed).
  assert.ok(
    ks.filter((k) => k === "MoveCall").length >= 3,
    "create_vault must build allowed TypeNames via type_name::get + the create call",
  );
}

// ── deposit: split the coin, then supply ────────────────────────────────────
{
  const ks = kinds(buildDeposit({ vaultId: ID, coinObjectId: ID, amount: 1_000_000 }));
  assert.ok(ks.includes("SplitCoins"), "deposit must split the exact amount");
  assert.ok(ks.includes("MoveCall"), "deposit must call vault::deposit");
}

// ── withdraw + panic: return the coin to the owner ──────────────────────────
{
  const wd = kinds(buildOwnerWithdrawUsdc({ vaultId: ID, ownerCapId: ID, amount: 0, sender: ADDR }));
  assert.ok(wd.includes("TransferObjects"), "withdraw must transfer the coin back to the owner");

  const pn = kinds(buildPanic({ policyId: ID, vaultId: ID, ownerCapId: ID, amount: 0, sender: ADDR }));
  assert.ok(pn.filter((k) => k === "MoveCall").length >= 2, "panic must revoke AND withdraw (>=2 MoveCalls)");
  assert.ok(pn.includes("TransferObjects"), "panic must transfer the withdrawn coin to the owner");
}

assert.ok(USDC_TYPE.includes("::usdc::USDC"), "USDC type sanity");

console.log("vault-tx ok");
