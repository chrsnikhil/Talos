import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";
import { PACKAGE_ID } from "./config";

/**
 * Permitted PTB command kinds and their allowlist rules:
 *
 *   SplitCoins      — always allowed (no funds leave the wallet)
 *   MergeCoins      — always allowed (consolidates coins, no transfer)
 *   MakeMoveVec     — always allowed (builds a vector argument)
 *   MoveCall        — allowed only when targeting PACKAGE_ID
 *   TransferObjects — allowed ONLY when the recipient resolves to signerAddress
 *
 * All other command kinds are REJECTED. The function FAILS CLOSED: if a
 * TransferObjects recipient cannot be conclusively resolved to signerAddress,
 * it returns false.
 *
 * Shape confirmed against @mysten/sui@1.45.2: getData().commands is
 *   EnumOutputShapeWithKeys<...>[]  where each element carries $kind plus a
 *   same-named property with the command payload.
 */
export function isAllowed(tx: Transaction, signerAddress: string): boolean {
  const data = tx.getData();
  const cmds = data.commands ?? [];
  if (cmds.length === 0) return false;

  for (const c of cmds) {
    const kind = (c as { $kind?: string }).$kind;

    if (kind === "SplitCoins" || kind === "MergeCoins" || kind === "MakeMoveVec") {
      // Safe PTB primitives — no value leaves the wallet.
      continue;
    }

    if (kind === "MoveCall") {
      const mc = (c as { MoveCall?: { package?: string } }).MoveCall;
      if (mc?.package !== PACKAGE_ID) return false;
      continue;
    }

    if (kind === "TransferObjects") {
      // Fail-closed: resolve the recipient to a concrete address and verify it
      // is exactly the session signer's address. Any ambiguity → reject.
      const to = (c as { TransferObjects?: { address?: { $kind?: string; Input?: number } } })
        .TransferObjects?.address;

      // The recipient MUST be a direct Input reference (not a computed Result).
      if (!to || to.$kind !== "Input" || typeof to.Input !== "number") return false;

      const inputIdx = to.Input;
      const input = (data.inputs ?? [])[inputIdx] as
        | { $kind?: string; Pure?: { bytes?: string } }
        | undefined;

      // The input MUST be a Pure value containing exactly 32 bytes.
      if (!input || input.$kind !== "Pure" || typeof input.Pure?.bytes !== "string") return false;

      let decoded: Uint8Array;
      try {
        decoded = fromBase64(input.Pure.bytes);
      } catch {
        return false;
      }

      if (decoded.length !== 32) return false;

      const recipientHex = "0x" + Buffer.from(decoded).toString("hex");

      // Normalise both addresses to lowercase for comparison.
      if (recipientHex.toLowerCase() !== signerAddress.toLowerCase()) return false;

      continue;
    }

    // Unknown command kind — reject.
    return false;
  }

  return true;
}
