# Talos Vault — self-audit (2026-07-10)

## Covered by tests
- Only the policy's agent can borrow (EUnauthorizedAgent).
- Borrowing bounded by per_tx_cap (EOverPerTxCap) and idle balance (EInsufficientIdle).
- Only allowlisted position types can enter the vault (EPositionNotAllowed).
- Only the matching OwnerCap can withdraw (ENotOwner).
- Revoke (panic freeze) and expiry both lock the agent out (ERevoked, EExpired).
- Withdrawing an absent position aborts (ENoSuchPosition).

## Reviewed by inspection
- BorrowReceipt has no abilities → a borrow cannot be dropped/stored; the PTB must call a
  return_* that consumes it, so funds/positions cannot leave the vault→venue→vault loop.
- Vault has `key` only (no `store`) → cannot be wrapped/transferred out of shared ownership.
- Arithmetic: principal decrement is floored at 0; balance split aborts on underflow natively.

## Known / accepted limitations (documented for judges)
- No on-chain value check that a returned position is worth the borrowed USDC (needs an
  oracle). Contained by: protocol allowlist, position-type allowlist, small per-policy caps,
  and Daedalus scoring every move. Oracle value-check is future hardening.
- Owner escape hatch on a dead agent yields the raw sCoin (redeem off-chain), by design.
- Cap asymmetry: the SUPPLY leg (`borrow_for_supply`) is bounded by `per_tx_cap` + idle
  balance, but the UNWIND leg (`borrow_position`) passes `amount = 0` to `assert_active`, so
  `per_tx_cap` does NOT bound how much a position unwind can move — it is contained only by
  the position-type allowlist and off-chain critic scoring.
