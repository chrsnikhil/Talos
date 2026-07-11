"use client";

import { useCallback, useEffect, useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useManagedWallet } from "./use-managed-wallet";
import {
  buildCreatePolicy,
  buildCreateVault,
} from "./vault-tx";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultState {
  exists: boolean;
  address?: string;
  ownerCapId?: string;
  policyId?: string;
  vaultId?: string;
  idleUsdc?: string;
  principal?: string;
  revoked?: boolean;
  remainingBudget?: string;
  expiresAtMs?: string;
  owner?: string;
  agent?: string;
}

export interface UseVaultReturn {
  vault: VaultState | null;
  loading: boolean;
  busy: boolean;
  refresh: () => Promise<void>;
  execute: (tx: Transaction) => Promise<{ digest: string }>;
  createVault: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Talos agent address that is authorized to act on behalf of the vault. */
const TALOS_AGENT =
  "0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f";

const DEFAULT_BUDGET = BigInt(1_000_000_000); // policy budget in base units
const DEFAULT_PER_TX_CAP = BigInt(100_000_000);
const DEFAULT_PROTOCOLS = ["scallop", "navi", "kai"];
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Max polling attempts waiting for policy/vault to appear after tx finalization. */
const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2_000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVault(): UseVaultReturn {
  const { address } = useManagedWallet();
  const [vault, setVault] = useState<VaultState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Fetch vault state from the server and update local state. */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/vault");
      if (res.status === 401) {
        // Not signed in — a normal state (e.g. logged-out dashboard). Not an error.
        setVault({ exists: false });
        return;
      }
      if (!res.ok) {
        // Transient server/network error — keep last good state, don't throw
        // (this runs in a mount effect with no catch; a throw = unhandled rejection).
        console.warn("[useVault] vault fetch failed:", res.status);
        return;
      }
      const data: VaultState = await res.json();
      setVault(data);
    } catch (err) {
      console.warn("[useVault] vault fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount.
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Serialize a Transaction, POST it to /api/wallet/execute, and refresh vault
   * state. Throws on non-2xx with the server-provided error message.
   */
  const execute = useCallback(
    async (tx: Transaction): Promise<{ digest: string }> => {
      const txJson = tx.serialize();
      const res = await fetch("/api/wallet/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txJson }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (body as { error?: string }).error ??
            `execute failed: ${res.status}`
        );
      }

      // The route returns HTTP 200 even when the on-chain tx aborted (status
      // "failure"). Treat anything other than "success" as an error so the UI
      // never reports a failed transaction as complete.
      const { digest, status, error } = body as {
        digest: string;
        status?: string;
        error?: string;
      };
      if (status && status !== "success") {
        throw new Error(
          `transaction failed on-chain (${status})${error ? `: ${error}` : ""} — ${digest}`
        );
      }

      // Refresh vault state after every successful execution.
      await refresh();

      return { digest };
    },
    [refresh]
  );

  /**
   * Two-step vault creation — idempotent:
   *   - If a policyId already exists but no vault yet → skip to step 2.
   *   - If neither exists → step 1 (create policy) then step 2 (create vault).
   *   - If both exist → no-op.
   *
   * Prevents minting a duplicate AgentPolicy + OwnerCap on retry after step2
   * failure. Guards against double-runs with `busy`.
   */
  const createVault = useCallback(async () => {
    if (busy) return;
    if (!address) throw new Error("Wallet not connected");

    setBusy(true);
    try {
      // ── Pre-check: fetch current state to determine where to resume ───────
      const preRes = await fetch("/api/wallet/vault");
      const preData: VaultState = preRes.ok ? await preRes.json() : { exists: false };
      setVault(preData);

      // Already fully created — nothing to do.
      if (preData.exists && preData.policyId && preData.vaultId) return;

      let policyId: string | null = preData.policyId ?? null;

      if (!policyId) {
        // ── Step 1: create the agent policy ────────────────────────────────
        const policyTx = buildCreatePolicy({
          agent: TALOS_AGENT,
          budget: DEFAULT_BUDGET,
          perTxCap: DEFAULT_PER_TX_CAP,
          protocols: DEFAULT_PROTOCOLS,
          expiresAtMs: Date.now() + THIRTY_DAYS_MS,
        });

        await execute(policyTx);

        // ── Step 2: poll until policyId is visible on-chain ────────────────
        for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
          // Avoid redundant delay on first iteration.
          if (i > 0) await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

          const res = await fetch("/api/wallet/vault");
          if (res.ok) {
            const data: VaultState = await res.json();
            if (data.policyId) {
              policyId = data.policyId;
              setVault(data);
              break;
            }
          }
        }

        if (!policyId) {
          throw new Error(
            "Policy not found after creation — chain indexing may be delayed. " +
              "Refresh the page and try again."
          );
        }
      }

      // ── Step 3: create the vault (policyId is known) ─────────────────────
      const vaultTx = buildCreateVault({
        policyId,
        allowedPositions: [],
      });

      await execute(vaultTx);
    } finally {
      setBusy(false);
    }
  }, [busy, address, execute, refresh]);

  return { vault, loading, busy, refresh, execute, createVault };
}
