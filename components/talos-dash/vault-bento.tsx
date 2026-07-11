"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import { useManagedWallet } from "@/lib/wallet/use-managed-wallet"
import { useVault } from "@/lib/wallet/use-vault"
import { useAgent } from "@/lib/wallet/use-agent"
import { buildDeposit, buildOwnerWithdrawUsdc, buildPanic, USDC_TYPE } from "@/lib/wallet/vault-tx"

const EXPLORER = "https://suiscan.xyz/mainnet"
const reader = new SuiClient({ url: getFullnodeUrl("mainnet") })

// ─── formatting ────────────────────────────────────────────────────────────────
const fmtUsdc = (raw: string | number | undefined) => {
  if (raw === undefined || raw === null) return "0.00"
  const n = Number(raw)
  return Number.isFinite(n) ? (n / 1_000_000).toFixed(2) : "0.00"
}
const trunc = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—")

// ─── shared cell shell (matches the /dashboard panel language) ──────────────────
function Cell({
  title,
  children,
  className = "",
  bodyClass = "p-5",
}: {
  title?: string
  children: React.ReactNode
  className?: string
  bodyClass?: string
}) {
  return (
    <div className={`border-2 border-border ${className}`}>
      {title && (
        <div className="border-b-2 border-border px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  )
}

function TxLink({ digest }: { digest: string }) {
  return (
    <a
      href={`${EXPLORER}/tx/${digest}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block break-all font-mono text-[10px] text-accent hover:underline"
    >
      tx: {digest.slice(0, 10)}…{digest.slice(-6)}
    </a>
  )
}

// ─── venue APY mini-bars (dashboard aesthetic) ──────────────────────────────────
type Uplift = {
  bestApy: number
  baselineApy: number
  upliftPct: number
  upliftUsdPerYear: number
  best: string
  baseline: string
  venues: { key: string; apy: number }[]
  principal: number
  projected: boolean
}

// ────────────────────────────────────────────────────────────────────────────────
// Signed-out: a single sign-in cell in the dashboard aesthetic.
// ────────────────────────────────────────────────────────────────────────────────
function SignInCell() {
  return (
    <Cell title="// EMBEDDED VAULT" className="col-span-full" bodyClass="px-6 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <div className="font-pixel text-3xl">
          NO SEED PHRASE<span className="text-accent">.</span>
        </div>
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          Sign in with Google and Talos mints you a non-custodial wallet. Deposit USDC — the agents
          chase the best yield across Scallop, Navi &amp; Kai, bounded by an on-chain policy. You hold
          the PANIC kill-switch.
        </p>
        <a
          href="/api/auth/google"
          className="group relative mt-2 inline-flex items-center gap-2.5 overflow-hidden border-2 border-accent bg-black px-7 py-3 font-mono text-sm font-bold uppercase tracking-wider text-accent transition-colors duration-500 hover:text-background"
        >
          <span className="absolute inset-0 -translate-x-full bg-accent transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0" />
          <span className="relative z-10 flex items-center gap-2.5">
            <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 11v2.6h4.3c-.2 1.1-1.3 3.2-4.3 3.2-2.6 0-4.7-2.1-4.7-4.8S9.4 7.2 12 7.2c1.5 0 2.5.6 3 1.1l2-2C15.7 4.9 14 4.2 12 4.2 7.7 4.2 4.2 7.7 4.2 12s3.5 7.8 7.8 7.8c4.5 0 7.5-3.2 7.5-7.6 0-.5 0-.9-.1-1.2H12z" />
            </svg>
            Sign in with Google
          </span>
        </a>
      </div>
    </Cell>
  )
}

// ────────────────────────────────────────────────────────────────────────────────
// Main bento
// ────────────────────────────────────────────────────────────────────────────────
export function VaultBento() {
  const { address, email, loading: walletLoading, refresh: refreshWallet } = useManagedWallet()
  const { vault, loading, busy, execute, createVault, refresh } = useVault()
  const { paused, loading: agentLoading, toggle } = useAgent()

  const [uplift, setUplift] = useState<Uplift | null>(null)
  const [walletUsdc, setWalletUsdc] = useState<{ total: number; coinId: string | null }>({ total: 0, coinId: null })

  // Deposit / withdraw form state
  const [depositAmt, setDepositAmt] = useState("")
  const [withdrawAmt, setWithdrawAmt] = useState("")
  const [panicConfirm, setPanicConfirm] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [digest, setDigest] = useState<string | null>(null)

  // Load yield-uplift analytics (best-effort)
  useEffect(() => {
    if (!address) return
    let dead = false
    fetch("/api/wallet/uplift")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !dead && d && setUplift(d))
      .catch(() => {})
    return () => {
      dead = true
    }
  }, [address, vault?.idleUsdc])

  // Read the user's spendable USDC coins client-side so deposit needs only an amount.
  const loadWalletUsdc = useCallback(async () => {
    if (!address) return
    try {
      const coins = await reader.getCoins({ owner: address, coinType: USDC_TYPE })
      let total = 0n
      let biggest: { id: string; bal: bigint } | null = null
      for (const c of coins.data) {
        const bal = BigInt(c.balance)
        total += bal
        if (!biggest || bal > biggest.bal) biggest = { id: c.coinObjectId, bal }
      }
      setWalletUsdc({ total: Number(total), coinId: biggest?.id ?? null })
    } catch {
      /* ignore */
    }
  }, [address])

  useEffect(() => {
    loadWalletUsdc()
  }, [loadWalletUsdc, vault?.idleUsdc])

  const idle = vault?.idleUsdc
  const canPanic = vault?.exists && !vault?.revoked

  async function run(build: () => ReturnType<typeof buildDeposit>, after?: () => void) {
    setErr(null)
    setDigest(null)
    try {
      const res = await execute(build())
      setDigest(res.digest)
      after?.()
      await Promise.all([refresh(), loadWalletUsdc()])
    } catch (e: unknown) {
      setErr(String((e as Error)?.message ?? e))
    }
  }

  const handleDeposit = () => {
    const amt = parseFloat(depositAmt)
    if (!Number.isFinite(amt) || amt <= 0) return setErr("Enter a valid USDC amount.")
    if (!walletUsdc.coinId) return setErr("No USDC in your wallet — send some to your address first.")
    if (amt * 1_000_000 > walletUsdc.total) return setErr("Amount exceeds your wallet USDC balance.")
    run(
      () =>
        buildDeposit({
          vaultId: vault!.vaultId!,
          coinObjectId: walletUsdc.coinId!,
          amount: BigInt(Math.round(amt * 1_000_000)),
        }),
      () => setDepositAmt(""),
    )
  }

  const handleWithdraw = () => {
    const amt = parseFloat(withdrawAmt)
    if (!Number.isFinite(amt) || amt <= 0) return setErr("Enter a valid USDC amount.")
    run(
      () =>
        buildOwnerWithdrawUsdc({
          vaultId: vault!.vaultId!,
          ownerCapId: vault!.ownerCapId!,
          amount: BigInt(Math.round(amt * 1_000_000)),
          sender: vault!.owner!,
        }),
      () => setWithdrawAmt(""),
    )
  }

  const handlePanic = () => {
    if (!panicConfirm) return setPanicConfirm(true)
    run(
      () =>
        buildPanic({
          policyId: vault!.policyId!,
          vaultId: vault!.vaultId!,
          ownerCapId: vault!.ownerCapId!,
          amount: BigInt(idle && idle !== "" ? idle : "0"),
          sender: vault!.owner!,
        }),
      () => setPanicConfirm(false),
    )
  }

  // ── Not signed in ──
  if (walletLoading) {
    return <div className="py-16 text-center text-xs uppercase tracking-widest text-muted-foreground">connecting…</div>
  }
  if (!address) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <SignInCell />
      </div>
    )
  }

  // ── Signed in, no vault yet ──
  if (!loading && vault && !vault.exists) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Cell title="// EMBEDDED WALLET" className="col-span-full" bodyClass="px-6 py-10">
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
            <div className="font-pixel text-2xl">Welcome<span className="text-accent">.</span></div>
            <p className="font-mono text-xs text-muted-foreground">
              Your non-custodial wallet is <span className="text-foreground">{trunc(address)}</span>. Create your
              vault to start earning — it deploys an on-chain policy the agents can never exceed.
            </p>
            <button
              onClick={() => createVault().catch((e) => setErr(String(e?.message ?? e)))}
              disabled={busy}
              className="border-2 border-accent px-6 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-background disabled:opacity-40"
            >
              {busy ? "creating…" : "Create your vault"}
            </button>
            {err && <p className="font-mono text-[11px] text-red-400">{err}</p>}
          </div>
        </Cell>
      </div>
    )
  }

  const disableAll = busy || loading

  // ── Signed in, vault exists — the bento ──
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Idle balance — hero cell */}
      <Cell title="// VAULT BALANCE" className="col-span-2 lg:col-span-2">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-pixel text-5xl leading-none text-accent">{fmtUsdc(idle)}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">idle USDC</div>
          </div>
          <div className="text-right">
            <div className="font-pixel text-2xl leading-none">{fmtUsdc(vault?.principal)}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">principal</div>
          </div>
        </div>
      </Cell>

      {/* Agent status + toggle */}
      <Cell title="// AGENT" className="col-span-1">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 ${paused ? "bg-amber-400" : "animate-blink bg-accent"}`} />
            <span className="font-pixel text-lg">{paused ? "PAUSED" : "RUNNING"}</span>
          </div>
          <button
            onClick={toggle}
            disabled={agentLoading}
            className={`border-2 px-4 py-1.5 text-[11px] uppercase tracking-widest transition-colors disabled:opacity-40 ${
              paused
                ? "border-accent text-accent hover:bg-accent hover:text-background"
                : "border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-background"
            }`}
          >
            {agentLoading ? "…" : paused ? "Start" : "Stop"}
          </button>
        </div>
      </Cell>

      {/* Policy */}
      <Cell title="// POLICY" className="col-span-1">
        <div className="flex flex-col gap-3">
          <div>
            <div className={`font-pixel text-lg ${vault?.revoked ? "text-red-400" : "text-accent"}`}>
              {vault?.revoked ? "REVOKED" : "ACTIVE"}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">status</div>
          </div>
          <div>
            <div className="font-mono text-sm">{fmtUsdc(vault?.remainingBudget)} USDC</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">budget left</div>
          </div>
        </div>
      </Cell>

      {/* Yield uplift */}
      <Cell title="// YIELD UPLIFT" className="col-span-2">
        {uplift ? (
          <div className="flex items-end justify-between">
            <div>
              <div className="font-pixel text-4xl leading-none text-accent">
                {uplift.upliftPct >= 0 ? "+" : ""}
                {uplift.upliftPct.toFixed(2)}
                <span className="text-lg text-muted-foreground"> pp</span>
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                vs a single venue{" "}
                <span className="text-amber-400">{uplift.projected ? "· projected" : ""}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-foreground">
                {uplift.upliftUsdPerYear > 0 ? `~$${uplift.upliftUsdPerYear.toFixed(2)}/yr` : "deposit to see $"}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                best {uplift.best || "—"} · {uplift.bestApy?.toFixed(2)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">loading analytics…</div>
        )}
      </Cell>

      {/* Wallet address */}
      <Cell title="// WALLET" className="col-span-2 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <code className="block truncate font-mono text-xs text-foreground" title={address}>
              {address}
            </code>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground" title={email ?? ""}>
              non-custodial · {walletUsdc.total > 0 ? `${fmtUsdc(walletUsdc.total)} USDC in wallet` : "no USDC in wallet"}
            </div>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" })
              refreshWallet()
            }}
            className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            sign out
          </button>
        </div>
      </Cell>

      {/* Venue APY compare */}
      <Cell title="// LIVE VENUE APY" className="col-span-2 lg:col-span-2">
        {uplift?.venues?.length ? (
          <div className="flex flex-col gap-2">
            {uplift.venues.map((v) => {
              const max = Math.max(...uplift.venues.map((x) => x.apy), 0.01)
              const best = v.key === uplift.best
              return (
                <div key={v.key} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-mono text-[11px] uppercase text-muted-foreground">{v.key}</span>
                  <div className="h-3 flex-1 overflow-hidden border border-border bg-black/30">
                    <div
                      className={`h-full ${best ? "bg-accent" : "bg-muted-foreground/40"}`}
                      style={{ width: `${Math.max(4, (v.apy / max) * 100)}%` }}
                    />
                  </div>
                  <span className={`w-14 shrink-0 text-right font-mono text-[11px] ${best ? "text-accent" : "text-foreground"}`}>
                    {v.apy.toFixed(2)}%
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">loading venues…</div>
        )}
      </Cell>

      {/* Deposit */}
      <Cell title="// DEPOSIT" className="col-span-1">
        <div className="flex flex-col gap-2">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="USDC amount"
            value={depositAmt}
            onChange={(e) => setDepositAmt(e.target.value)}
            disabled={disableAll}
            className="w-full border border-border bg-black/30 px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-accent"
          />
          <button
            onClick={handleDeposit}
            disabled={disableAll}
            className="border-2 border-accent px-3 py-1.5 text-[11px] uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-background disabled:opacity-40"
          >
            {busy ? "…" : "Deposit"}
          </button>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
            avail: {fmtUsdc(walletUsdc.total)}
          </span>
        </div>
      </Cell>

      {/* Withdraw */}
      <Cell title="// WITHDRAW" className="col-span-1">
        <div className="flex flex-col gap-2">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="USDC amount"
            value={withdrawAmt}
            onChange={(e) => setWithdrawAmt(e.target.value)}
            disabled={disableAll}
            className="w-full border border-border bg-black/30 px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-accent"
          />
          <button
            onClick={handleWithdraw}
            disabled={disableAll}
            className="border-2 border-border px-3 py-1.5 text-[11px] uppercase tracking-widest text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
          >
            {busy ? "…" : "Withdraw"}
          </button>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">idle: {fmtUsdc(idle)}</span>
        </div>
      </Cell>

      {/* Panic */}
      <Cell title="// EMERGENCY" className="col-span-full">
        <div className="flex h-full flex-col justify-between gap-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {panicConfirm ? "revokes policy + withdraws ALL funds" : "one-tap kill-switch"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePanic}
              disabled={disableAll || !canPanic}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-40 ${
                panicConfirm ? "bg-red-600 ring-2 ring-white" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {busy ? "executing…" : panicConfirm ? "CONFIRM PANIC" : "PANIC"}
            </button>
            {panicConfirm && (
              <button
                onClick={() => setPanicConfirm(false)}
                disabled={disableAll}
                className="border border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                cancel
              </button>
            )}
          </div>
        </div>
      </Cell>

      {/* Status line */}
      {(err || digest) && (
        <Cell className="col-span-full" bodyClass="px-4 py-3">
          {err && <p className="font-mono text-[11px] text-red-400">{err}</p>}
          {digest && <TxLink digest={digest} />}
        </Cell>
      )}
    </div>
  )
}
