"use client"

import { useCallback, useEffect, useState } from "react"
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useManagedWallet } from "@/lib/wallet/use-managed-wallet"
import { useVault } from "@/lib/wallet/use-vault"
import { useAgent } from "@/lib/wallet/use-agent"
import { buildDeposit, buildOwnerWithdrawUsdc, buildPanic, USDC_TYPE } from "@/lib/wallet/vault-tx"

const EXPLORER = "https://suiscan.xyz/mainnet"
const reader = new SuiClient({ url: getFullnodeUrl("mainnet") })

// chart palette — mirrors app/dashboard/page.tsx
const ACCENT = "#3b97fb"
const GRID = "#2e3440"
const TICK = "#8a93a6"
const VENUE_COLORS: Record<string, string> = {
  scallop: "#8a93a6",
  navi: "#5b6472",
  kai: "#c0c6d0",
}

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

// Tooltip for the performance chart (dashboard aesthetic).
function PerfTip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="border-2 border-border bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-widest">
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span>{typeof p.value === "number" ? p.value.toFixed(2) : "—"}%</span>
        </div>
      ))}
    </div>
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

// Rolling client-side performance series: one point per uplift poll.
type PerfPoint = { t: number; scallop?: number; navi?: number; kai?: number; agent?: number }

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
  const [series, setSeries] = useState<PerfPoint[]>([])
  const [walletUsdc, setWalletUsdc] = useState<{ total: number; coinId: string | null }>({ total: 0, coinId: null })

  // Deposit / withdraw form state
  const [depositAmt, setDepositAmt] = useState("")
  const [withdrawAmt, setWithdrawAmt] = useState("")
  const [panicConfirm, setPanicConfirm] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [digest, setDigest] = useState<string | null>(null)

  // Claude MCP connector state. Claude web connects via OAuth using just the URL — no
  // token to paste. The static-token path is kept as an "advanced" option for API/CLI.
  const [mcpUrl, setMcpUrl] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mcp, setMcp] = useState<{ url: string; header: string } | null>(null)
  const [mcpBusy, setMcpBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  useEffect(() => {
    setMcpUrl(`${window.location.origin}/api/mcp/mcp`)
  }, [])
  const genMcp = async () => {
    setMcpBusy(true)
    try {
      const r = await fetch("/api/wallet/mcp-token", { method: "POST" })
      const b = await r.json()
      if (r.ok) setMcp({ url: b.url, header: `Bearer ${b.token}` })
    } finally {
      setMcpBusy(false)
    }
  }
  const revokeMcp = async () => {
    setMcpBusy(true)
    try {
      await fetch("/api/wallet/mcp-token", { method: "DELETE" })
      setMcp(null)
    } finally {
      setMcpBusy(false)
    }
  }
  const copy = (label: string, v: string) => {
    navigator.clipboard?.writeText(v)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

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

  // Append a rolling performance point each time uplift updates. Muted venue lines
  // (scallop/navi/kai) + a bold AGENT line = uplift.bestApy (the APY the swarm captures
  // by always chasing the best venue). Capped to the last ~40 points.
  useEffect(() => {
    if (!uplift) return
    const byKey = new Map(uplift.venues.map((v) => [v.key, v.apy]))
    const point: PerfPoint = {
      t: Date.now(),
      scallop: byKey.get("scallop"),
      navi: byKey.get("navi"),
      kai: byKey.get("kai"),
      agent: uplift.bestApy,
    }
    setSeries((prev) => [...prev, point].slice(-40))
  }, [uplift])

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

  // Poll vault state so balance/budget stay live and self-heal a stale first read
  // (the route silently defaults to 0 if a single policy/vault RPC read hiccups).
  useEffect(() => {
    if (!address) return
    const id = setInterval(() => {
      refresh()
    }, 8000)
    return () => clearInterval(id)
  }, [address, refresh])

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

  const holding = uplift?.best || vault?.position?.venue || "—"

  // ── Signed in, vault exists — MISSION CONTROL ──
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* ══ LEFT: performance line chart (hero) ══ */}
      <Cell
        title="// PERFORMANCE — AGENT vs VENUES"
        className="lg:col-span-3"
        bodyClass="flex h-full flex-col p-4"
      >
        <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          agent tracks the best venue · currently holding{" "}
          <span className="text-accent">{holding}</span>
        </p>
        <div className="min-h-[280px] flex-1">
          {series.length < 2 ? (
            <div className="flex h-full min-h-[280px] items-center justify-center text-center text-[10px] uppercase tracking-widest text-muted-foreground">
              collecting live data…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={280}>
              <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis
                  stroke={GRID}
                  tick={{ fill: TICK, fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickFormatter={(v: number) => `${v.toFixed(1)}`}
                  width={40}
                  unit="%"
                />
                <Tooltip content={<PerfTip />} cursor={{ stroke: ACCENT, strokeOpacity: 0.3 }} />
                <Legend
                  wrapperStyle={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="scallop"
                  name="scallop"
                  stroke={VENUE_COLORS.scallop}
                  strokeWidth={1}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="navi"
                  name="navi"
                  stroke={VENUE_COLORS.navi}
                  strokeWidth={1}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="kai"
                  name="kai"
                  stroke={VENUE_COLORS.kai}
                  strokeWidth={1}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="agent"
                  name="agent"
                  stroke={ACCENT}
                  strokeWidth={2.5}
                  dot={{ fill: ACCENT, r: 2 }}
                  activeDot={{ r: 4, fill: ACCENT, stroke: "transparent" }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Cell>

      {/* ══ RIGHT: compact control stack ══ */}
      <div className="flex flex-col gap-3 lg:col-span-2">
        {/* Balance */}
        <Cell title="// VAULT BALANCE" bodyClass="p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-pixel text-4xl leading-none text-accent">{fmtUsdc(idle)}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">idle USDC</div>
            </div>
            <div className="text-right">
              <div className="font-pixel text-xl leading-none">{fmtUsdc(vault?.principal)}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">principal</div>
            </div>
          </div>
          {vault?.position && (
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-2">
              <span className="h-1.5 w-1.5 animate-blink bg-accent" />
              <span className="font-mono text-[11px] text-foreground">
                {fmtUsdc(vault.position.deployed)} in {vault.position.venue}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">· earning</span>
            </div>
          )}
        </Cell>

        {/* Yield uplift · Agent · Policy — tight three-row grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Yield uplift */}
          <Cell title="// UPLIFT" bodyClass="p-3">
            {uplift ? (
              <>
                <div className="font-pixel text-2xl leading-none text-accent">
                  {uplift.upliftPct >= 0 ? "+" : ""}
                  {uplift.upliftPct.toFixed(1)}
                  <span className="text-xs text-muted-foreground"> pp</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {uplift.upliftUsdPerYear > 0 ? `~$${uplift.upliftUsdPerYear.toFixed(0)}/yr` : "deposit to see $"}
                </div>
              </>
            ) : (
              <div className="text-[10px] text-muted-foreground">loading…</div>
            )}
          </Cell>

          {/* Agent */}
          <Cell title="// AGENT" bodyClass="p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 ${paused ? "bg-amber-400" : "animate-blink bg-accent"}`} />
                <span className="font-pixel text-sm">{paused ? "OFF" : "ON"}</span>
              </div>
              <button
                onClick={toggle}
                disabled={agentLoading}
                className={`border-2 px-2 py-1 text-[10px] uppercase tracking-widest transition-colors disabled:opacity-40 ${
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
          <Cell title="// POLICY" bodyClass="p-3">
            <div className={`font-pixel text-sm ${vault?.revoked ? "text-red-400" : "text-accent"}`}>
              {vault?.revoked ? "REVOKED" : "ACTIVE"}
            </div>
            <div className="mt-1 font-mono text-[10px] text-foreground">{fmtUsdc(vault?.remainingBudget)}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">budget left</div>
          </Cell>
        </div>

        {/* Deposit + Withdraw */}
        <div className="grid grid-cols-2 gap-3">
          <Cell title="// DEPOSIT" bodyClass="p-3">
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
                className="border-2 border-accent px-3 py-1.5 text-[10px] uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-background disabled:opacity-40"
              >
                {busy ? "…" : "Deposit"}
              </button>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                avail: {fmtUsdc(walletUsdc.total)}
              </span>
            </div>
          </Cell>

          <Cell title="// WITHDRAW" bodyClass="p-3">
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
                className="border-2 border-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
              >
                {busy ? "…" : "Withdraw"}
              </button>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">idle: {fmtUsdc(idle)}</span>
            </div>
          </Cell>
        </div>

        {/* PANIC / EMERGENCY */}
        <Cell title="// EMERGENCY" bodyClass="p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {panicConfirm ? "revokes policy + withdraws ALL" : "one-tap kill-switch"}
            </p>
            <div className="flex items-center gap-2">
              {panicConfirm && (
                <button
                  onClick={() => setPanicConfirm(false)}
                  disabled={disableAll}
                  className="border border-border px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  cancel
                </button>
              )}
              <button
                onClick={handlePanic}
                disabled={disableAll || !canPanic}
                className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-40 ${
                  panicConfirm ? "bg-red-600 ring-2 ring-white" : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {busy ? "…" : panicConfirm ? "CONFIRM" : "PANIC"}
              </button>
            </div>
          </div>
        </Cell>

        {/* Wallet + MCP connector */}
        <Cell title="// WALLET · CLAUDE (MCP)" bodyClass="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <code className="block truncate font-mono text-[11px] text-foreground" title={address}>
                {trunc(address)}
              </code>
              <div className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground" title={email ?? ""}>
                non-custodial · {walletUsdc.total > 0 ? `${fmtUsdc(walletUsdc.total)} USDC` : "no USDC"}
              </div>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" })
                refreshWallet()
              }}
              className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              sign out
            </button>
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-2">
            <code className="min-w-0 flex-1 truncate border border-border bg-black/30 px-2 py-1 font-mono text-[10px] text-foreground">
              {mcpUrl}
            </code>
            <button
              onClick={() => copy("URL", mcpUrl)}
              className="shrink-0 border-2 border-accent px-2 py-1 text-[9px] uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-background"
            >
              {copied === "URL" ? "copied" : "copy"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={revokeMcp}
              disabled={mcpBusy}
              className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-red-400 disabled:opacity-40"
            >
              disconnect all
            </button>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">·</span>
            <button
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? "hide" : "advanced"}: api/cli token
            </button>
          </div>

          {showAdvanced && (
            <div className="flex flex-col gap-2 border-t border-border pt-2">
              <p className="text-[9px] leading-relaxed text-muted-foreground">
                For API/CLI clients that accept a static bearer token (Claude web uses OAuth above, not this).
              </p>
              {!mcp ? (
                <button
                  onClick={genMcp}
                  disabled={mcpBusy}
                  className="w-fit border border-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  {mcpBusy ? "…" : "Generate token"}
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {[
                    { label: "URL", value: mcp.url },
                    { label: "Header  ·  Authorization", value: mcp.header },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-32 shrink-0 text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
                      <code className="min-w-0 flex-1 truncate border border-border bg-black/30 px-2 py-1 font-mono text-[10px] text-foreground">
                        {value}
                      </code>
                      <button
                        onClick={() => copy(label, value)}
                        className="shrink-0 border border-border px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                      >
                        {copied === label ? "copied" : "copy"}
                      </button>
                    </div>
                  ))}
                  <span className="text-[9px] uppercase tracking-widest text-amber-400">keep this token private · full read + pause access</span>
                </div>
              )}
            </div>
          )}
        </Cell>

        {/* Status line */}
        {(err || digest) && (
          <Cell bodyClass="px-3 py-2">
            {err && <p className="font-mono text-[11px] text-red-400">{err}</p>}
            {digest && <TxLink digest={digest} />}
          </Cell>
        )}
      </div>
    </div>
  )
}
