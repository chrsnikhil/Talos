// Regression tests for the /api/wallet/execute allowlist (pure — no network).
// Run: node --import tsx lib/wallet/execute-allowlist.test.ts
import assert from "node:assert/strict";
import { Transaction } from "@mysten/sui/transactions";
import { isAllowed } from "./execute-allowlist";
import { buildDeposit, buildOwnerWithdrawUsdc, buildPanic } from "./vault-tx";

const ID = "0x" + "1".repeat(64);
const ME = "0x" + "2".repeat(64);
const OTHER = "0x" + "3".repeat(64);

// Legitimate vault operations for the signer are allowed.
assert.equal(isAllowed(buildDeposit({ vaultId: ID, coinObjectId: ID, amount: 1_000_000 }), ME), true, "deposit allowed");
assert.equal(isAllowed(buildOwnerWithdrawUsdc({ vaultId: ID, ownerCapId: ID, amount: 0, sender: ME }), ME), true, "withdraw allowed");
assert.equal(isAllowed(buildPanic({ policyId: ID, vaultId: ID, ownerCapId: ID, amount: 0, sender: ME }), ME), true, "panic allowed");

// SECURITY: a withdraw that transfers to any address other than the signer is REJECTED.
assert.equal(
  isAllowed(buildOwnerWithdrawUsdc({ vaultId: ID, ownerCapId: ID, amount: 0, sender: OTHER }), ME),
  false,
  "transfer to a non-signer must be rejected",
);

// An empty transaction is rejected (fail-closed).
assert.equal(isAllowed(new Transaction(), ME), false, "empty tx rejected");

// A MoveCall to any package other than PACKAGE_ID is rejected.
{
  const tx = new Transaction();
  tx.moveCall({ target: `0x${"b".repeat(64)}::mod::fn`, arguments: [] });
  assert.equal(isAllowed(tx, ME), false, "foreign-package MoveCall rejected");
}

// A bare TransferObjects to the signer with a gas-coin source is still gated by the
// recipient check; sending to OTHER must fail.
{
  const tx = new Transaction();
  const [c] = tx.splitCoins(tx.gas, [tx.pure.u64(1n)]);
  tx.transferObjects([c], tx.pure.address(OTHER));
  assert.equal(isAllowed(tx, ME), false, "split+transfer to other rejected");
}

console.log("execute-allowlist ok");
