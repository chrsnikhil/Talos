"use client";

import { useState, type CSSProperties } from "react";
import { useVault } from "@/lib/wallet/use-vault";
import { useAgent } from "@/lib/wallet/use-agent";
import {
  buildDeposit,
  buildOwnerWithdrawUsdc,
  buildPanic,
} from "@/lib/wallet/vault-tx";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatUsdc(raw: string | undefined): string {
  if (raw === undefined || raw === null) return "—";
  const n = Number(raw);
  if (isNaN(n)) return "—";
  return (n / 1_000_000).toFixed(6) + " USDC";
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "#0d1319",
    border: "1px solid #1e2d3d",
    padding: "24px 28px",
    fontFamily: "monospace",
    color: "#e8eef7",
    maxWidth: 480,
    width: "100%",
    marginTop: 24,
  } as CSSProperties,

  label: {
    color: "#8b98ab",
    fontSize: 12,
    marginBottom: 2,
  } as CSSProperties,

  value: {
    color: "#e8eef7",
    fontSize: 14,
    marginBottom: 12,
  } as CSSProperties,

  accentValue: {
    color: "#28d391",
    fontSize: 14,
    marginBottom: 12,
    fontWeight: "bold",
  } as CSSProperties,

  divider: {
    borderTop: "1px solid #1e2d3d",
    margin: "16px 0",
  } as CSSProperties,

  input: {
    background: "#0d1319",
    border: "1px solid #1e2d3d",
    color: "#e8eef7",
    fontFamily: "monospace",
    padding: "6px 10px",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box" as const,
    marginBottom: 8,
    outline: "none",
  } as CSSProperties,

  btn: {
    background: "transparent",
    border: "1px solid #28d391",
    color: "#28d391",
    fontFamily: "monospace",
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
    marginTop: 4,
  } as CSSProperties,

  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  } as CSSProperties,

  agentStatus: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    padding: "8px 12px",
    border: "1px solid #1e2d3d",
    background: "#0a0f15",
  } as CSSProperties,

  agentStatusRunning: {
    color: "#28d391",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: "0.08em",
    flex: 1,
  } as CSSProperties,

  agentStatusPaused: {
    color: "#f2b64c",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: "0.08em",
    flex: 1,
  } as CSSProperties,

  agentBtn: {
    background: "transparent",
    border: "1px solid #28d391",
    color: "#28d391",
    fontFamily: "monospace",
    padding: "4px 12px",
    fontSize: 12,
    cursor: "pointer",
  } as CSSProperties,

  agentBtnStop: {
    background: "transparent",
    border: "1px solid #f2b64c",
    color: "#f2b64c",
    fontFamily: "monospace",
    padding: "4px 12px",
    fontSize: 12,
    cursor: "pointer",
  } as CSSProperties,

  panicBtn: {
    background: "#ff2020",
    border: "none",
    color: "#fff",
    fontFamily: "monospace",
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 8,
    letterSpacing: "0.05em",
  } as CSSProperties,

  confirmPanicBtn: {
    background: "#ff2020",
    border: "2px solid #fff",
    color: "#fff",
    fontFamily: "monospace",
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 8,
    letterSpacing: "0.05em",
  } as CSSProperties,

  error: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 8,
  } as CSSProperties,

  digestLink: {
    color: "#28d391",
    fontSize: 12,
    marginTop: 8,
    wordBreak: "break-all" as const,
  } as CSSProperties,

  sectionTitle: {
    color: "#8b98ab",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    marginBottom: 10,
  } as CSSProperties,
};

// ─── VaultPanel ───────────────────────────────────────────────────────────────

export default function VaultPanel() {
  const { vault, loading, busy, execute, createVault } = useVault();
  const { paused, loading: agentLoading, toggle } = useAgent();

  // Deposit state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositCoinId, setDepositCoinId] = useState("");
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositDigest, setDepositDigest] = useState<string | null>(null);

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawDigest, setWithdrawDigest] = useState<string | null>(null);

  // Panic state
  const [panicConfirm, setPanicConfirm] = useState(false);
  const [panicError, setPanicError] = useState<string | null>(null);
  const [panicDigest, setPanicDigest] = useState<string | null>(null);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading && !vault) {
    return (
      <div style={S.card}>
        <span style={{ color: "#8b98ab" }}>loading vault…</span>
      </div>
    );
  }

  // ── Create vault ─────────────────────────────────────────────────────────────
  if (!vault?.exists) {
    return (
      <div style={S.card}>
        <p style={{ color: "#8b98ab", marginBottom: 16, fontSize: 13 }}>
          No vault found for this wallet.
        </p>
        <button
          style={{
            ...S.btn,
            ...(busy ? S.btnDisabled : {}),
          }}
          disabled={busy}
          onClick={() => createVault()}
        >
          {busy ? "creating…" : "Create your vault"}
        </button>
      </div>
    );
  }

  // ── Vault card ───────────────────────────────────────────────────────────────

  async function handleDeposit() {
    setDepositError(null);
    setDepositDigest(null);
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError("Enter a valid USDC amount.");
      return;
    }
    if (!depositCoinId.trim()) {
      setDepositError("Enter a USDC coin object ID.");
      return;
    }
    try {
      const result = await execute(
        buildDeposit({
          vaultId: vault.vaultId!,
          coinObjectId: depositCoinId.trim(),
          amount: BigInt(Math.round(amount * 1_000_000)),
        })
      );
      setDepositDigest(result.digest);
      setDepositAmount("");
      setDepositCoinId("");
    } catch (e: unknown) {
      setDepositError(String((e as Error)?.message ?? e));
    }
  }

  async function handleWithdraw() {
    setWithdrawError(null);
    setWithdrawDigest(null);
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError("Enter a valid USDC amount.");
      return;
    }
    try {
      const result = await execute(
        buildOwnerWithdrawUsdc({
          vaultId: vault.vaultId!,
          ownerCapId: vault.ownerCapId!,
          amount: BigInt(Math.round(amount * 1_000_000)),
          sender: vault.owner!,
        })
      );
      setWithdrawDigest(result.digest);
      setWithdrawAmount("");
    } catch (e: unknown) {
      setWithdrawError(String((e as Error)?.message ?? e));
    }
  }

  async function handlePanic() {
    if (!panicConfirm) {
      setPanicConfirm(true);
      return;
    }
    setPanicError(null);
    setPanicDigest(null);
    try {
      const result = await execute(
        buildPanic({
          policyId: vault.policyId!,
          vaultId: vault.vaultId!,
          ownerCapId: vault.ownerCapId!,
          amount: BigInt(vault.idleUsdc && vault.idleUsdc !== "" ? vault.idleUsdc : "0"),
          sender: vault.owner!,
        })
      );
      setPanicDigest(result.digest);
      setPanicConfirm(false);
    } catch (e: unknown) {
      setPanicError(String((e as Error)?.message ?? e));
      setPanicConfirm(false);
    }
  }

  const disableAll = busy;

  return (
    <div style={S.card}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ ...S.label, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          TALOS VAULT
        </p>
      </div>

      {/* ── Agent control ── */}
      <div style={S.agentStatus}>
        {paused ? (
          <span style={S.agentStatusPaused}>❚❚ PAUSED</span>
        ) : (
          <span style={S.agentStatusRunning}>● RUNNING</span>
        )}
        <button
          style={{
            ...(paused ? S.agentBtn : S.agentBtnStop),
            ...(agentLoading ? S.btnDisabled : {}),
          }}
          disabled={agentLoading}
          onClick={toggle}
        >
          {agentLoading ? "…" : paused ? "Start" : "Stop"}
        </button>
      </div>

      {/* ── Vault stats ── */}
      <div>
        <p style={S.label}>Idle USDC</p>
        <p style={S.accentValue}>{formatUsdc(vault.idleUsdc)}</p>

        <p style={S.label}>Principal</p>
        <p style={S.value}>{formatUsdc(vault.principal)}</p>

        <p style={S.label}>Policy status</p>
        <p style={{ ...S.value, color: vault.revoked ? "#ff6b6b" : "#28d391" }}>
          {vault.revoked ? "REVOKED" : "active"}
        </p>

        <p style={S.label}>Remaining budget</p>
        <p style={S.value}>{formatUsdc(vault.remainingBudget)}</p>
      </div>

      <div style={S.divider} />

      {/* ── Deposit section ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={S.sectionTitle}>Deposit</p>

        <input
          style={S.input}
          type="number"
          min="0"
          step="any"
          placeholder="USDC amount"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          disabled={disableAll}
        />
        <input
          style={S.input}
          type="text"
          placeholder="USDC coin object ID"
          value={depositCoinId}
          onChange={(e) => setDepositCoinId(e.target.value)}
          disabled={disableAll}
        />

        <button
          style={{ ...S.btn, ...(disableAll ? S.btnDisabled : {}) }}
          disabled={disableAll}
          onClick={handleDeposit}
        >
          {busy ? "…" : "Deposit"}
        </button>

        {depositError && <p style={S.error}>{depositError}</p>}
        {depositDigest && (
          <p style={S.digestLink}>
            tx:{" "}
            <a
              href={`https://suiscan.xyz/mainnet/tx/${depositDigest}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#28d391" }}
            >
              {depositDigest.slice(0, 12)}…{depositDigest.slice(-6)}
            </a>
          </p>
        )}
      </div>

      <div style={S.divider} />

      {/* ── Withdraw section ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={S.sectionTitle}>Withdraw</p>

        <input
          style={S.input}
          type="number"
          min="0"
          step="any"
          placeholder="USDC amount"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          disabled={disableAll}
        />

        <button
          style={{ ...S.btn, ...(disableAll ? S.btnDisabled : {}) }}
          disabled={disableAll}
          onClick={handleWithdraw}
        >
          {busy ? "…" : "Withdraw"}
        </button>

        {withdrawError && <p style={S.error}>{withdrawError}</p>}
        {withdrawDigest && (
          <p style={S.digestLink}>
            tx:{" "}
            <a
              href={`https://suiscan.xyz/mainnet/tx/${withdrawDigest}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#28d391" }}
            >
              {withdrawDigest.slice(0, 12)}…{withdrawDigest.slice(-6)}
            </a>
          </p>
        )}
      </div>

      <div style={S.divider} />

      {/* ── Panic section ── */}
      <div>
        <p style={S.sectionTitle}>Emergency</p>

        {!panicConfirm ? (
          <button
            style={{ ...S.panicBtn, ...(disableAll ? S.btnDisabled : {}) }}
            disabled={disableAll}
            onClick={handlePanic}
          >
            PANIC
          </button>
        ) : (
          <div>
            <p style={{ color: "#ff6b6b", fontSize: 12, marginBottom: 8 }}>
              Are you sure? This will revoke the policy and withdraw ALL funds.
            </p>
            <button
              style={{ ...S.confirmPanicBtn, ...(disableAll ? S.btnDisabled : {}) }}
              disabled={disableAll}
              onClick={handlePanic}
            >
              {busy ? "executing…" : "CONFIRM PANIC"}
            </button>
            <button
              style={{ ...S.btn, marginLeft: 10 }}
              disabled={disableAll}
              onClick={() => setPanicConfirm(false)}
            >
              cancel
            </button>
          </div>
        )}

        {panicError && <p style={S.error}>{panicError}</p>}
        {panicDigest && (
          <p style={S.digestLink}>
            tx:{" "}
            <a
              href={`https://suiscan.xyz/mainnet/tx/${panicDigest}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#28d391" }}
            >
              {panicDigest.slice(0, 12)}…{panicDigest.slice(-6)}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
