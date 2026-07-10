"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { Sparkline } from "@/components/dash/sparkline"
import { BarCompare, type BarItem } from "@/components/dash/bar-compare"
import { useVault } from "@/lib/wallet/use-vault"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface VenueApy {
  key: string
  apy: number
}

interface UpliftData {
  bestApy: number
  baselineApy: number
  upliftPct: number
  upliftUsdPerYear: number
  best: string
  baseline: string
  venues: VenueApy[]
  principal: number
  projected: boolean
  fallback: boolean
  ts: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatUsdc(raw: string | undefined): string {
  if (raw === undefined || raw === null) return "—"
  const n = Number(raw)
  if (isNaN(n)) return "—"
  return (n / 1_000_000).toFixed(2) + " USDC"
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—"
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Builds a short synthetic APY series around the current best APY, plausible
 * but not real data. Used when no time-series history is available.
 * The series has 24 points, roughly representing hourly samples over a day.
 */
function syntheticApySeries(bestApy: number): number[] {
  const base = bestApy
  const noise = [
    0, -0.04, -0.02, 0.01, 0.05, 0.03, -0.01, 0.02, 0.06, 0.04, 0.01, -0.03,
    -0.02, 0.02, 0.04, 0.03, -0.01, 0.01, 0.02, 0.05, 0.03, -0.02, 0.01, 0,
  ]
  return noise.map((d) => Math.max(0, +(base + d).toFixed(3)))
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const GREEN = "#28d391"
const BLUE = "#3b9eff"
const AMBER = "#f2b64c"
const MUTED = "#8b98ab"
const BG = "#0d1319"
const BORDER = "#1e2d3d"

const S = {
  panel: {
    background: BG,
    border: `1px solid ${BORDER}`,
    padding: "24px 28px",
    fontFamily: "monospace",
    color: "#e8eef7",
    maxWidth: 520,
    width: "100%",
    marginTop: 24,
  } as CSSProperties,

  sectionTitle: {
    color: MUTED,
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    marginBottom: 12,
    marginTop: 0,
  } as CSSProperties,

  divider: {
    borderTop: `1px solid ${BORDER}`,
    margin: "20px 0",
  } as CSSProperties,

  headlineNumber: {
    color: GREEN,
    fontSize: 32,
    fontWeight: "bold",
    margin: 0,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  } as CSSProperties,

  headlineSub: {
    color: "#c4cdd8",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 0,
    lineHeight: 1.4,
  } as CSSProperties,

  projectedTag: {
    display: "inline-block",
    background: AMBER + "22",
    color: AMBER,
    border: `1px solid ${AMBER}44`,
    borderRadius: 2,
    fontSize: 9,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    padding: "1px 5px",
    marginLeft: 8,
    verticalAlign: "middle",
  } as CSSProperties,

  fallbackTag: {
    display: "inline-block",
    background: MUTED + "22",
    color: MUTED,
    border: `1px solid ${MUTED}44`,
    borderRadius: 2,
    fontSize: 9,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    padding: "1px 5px",
    marginLeft: 6,
    verticalAlign: "middle",
  } as CSSProperties,

  label: {
    color: MUTED,
    fontSize: 11,
    marginBottom: 2,
    marginTop: 0,
  } as CSSProperties,

  value: {
    color: "#e8eef7",
    fontSize: 13,
    marginBottom: 0,
    marginTop: 0,
  } as CSSProperties,

  accentValue: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 0,
    marginTop: 0,
  } as CSSProperties,

  row: {
    display: "flex",
    gap: 24,
    flexWrap: "wrap" as const,
    marginBottom: 16,
  } as CSSProperties,

  col: {
    flex: "1 1 120px",
  } as CSSProperties,

  loading: {
    color: MUTED,
    fontSize: 12,
    padding: "8px 0",
  } as CSSProperties,

  error: {
    color: "#ff6b6b",
    fontSize: 11,
    padding: "4px 0",
  } as CSSProperties,

  sparkLabel: {
    color: MUTED,
    fontSize: 9,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    marginBottom: 4,
    marginTop: 0,
  } as CSSProperties,
}

// ─── DashboardPanel ────────────────────────────────────────────────────────────

export default function DashboardPanel() {
  const { vault } = useVault()

  const [uplift, setUplift] = useState<UpliftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const res = await fetch("/api/wallet/uplift")
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error ?? `uplift fetch failed: ${res.status}`)
        }
        const data: UpliftData = await res.json()
        if (!cancelled) setUplift(data)
      } catch (e: unknown) {
        if (!cancelled) setFetchError(String((e as Error)?.message ?? e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.panel}>
        <p style={S.sectionTitle}>TALOS DASHBOARD</p>
        <p style={S.loading}>loading…</p>
      </div>
    )
  }

  // ── Error (auth or network) ────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div style={S.panel}>
        <p style={S.sectionTitle}>TALOS DASHBOARD</p>
        <p style={S.error}>{fetchError}</p>
      </div>
    )
  }

  if (!uplift) return null

  // ── Derived values ─────────────────────────────────────────────────────────

  // Bar compare items — mark best venue green
  const barItems: BarItem[] = (uplift.venues ?? []).map((v) => ({
    label: v.key,
    value: v.apy,
    highlight: v.key === uplift.best,
  }))

  // Synthetic APY sparkline series (labeled as such)
  const sparkData = syntheticApySeries(uplift.bestApy)

  // Vault idle USDC: prefer vault hook data (most up-to-date), fallback to uplift principal
  const idleUsdcRaw = vault?.idleUsdc
  const idleDisplay = idleUsdcRaw !== undefined
    ? formatUsdc(idleUsdcRaw)
    : uplift.principal > 0
      ? formatUsd(uplift.principal)
      : "—"

  const upliftDisplay = uplift.upliftPct > 0
    ? `+${uplift.upliftPct.toFixed(2)} pp`
    : uplift.upliftPct === 0
      ? "0.00 pp"
      : `${uplift.upliftPct.toFixed(2)} pp`

  const perYearDisplay = uplift.upliftUsdPerYear > 0
    ? `~${formatUsd(uplift.upliftUsdPerYear)}/yr`
    : uplift.principal > 0 ? "~$0.00/yr" : "(deposit to see $)"

  return (
    <div style={S.panel}>
      <p style={S.sectionTitle}>TALOS DASHBOARD</p>

      {/* ── Headline uplift ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={S.headlineNumber}>
          {upliftDisplay}
          <span style={S.projectedTag}>projected</span>
          {uplift.fallback && <span style={S.fallbackTag}>est</span>}
        </p>
        <p style={S.headlineSub}>
          Talos is earning you{" "}
          <span style={{ color: GREEN }}>{upliftDisplay}</span>{" "}
          ({perYearDisplay}) more than a single venue
        </p>
      </div>

      <div style={S.divider} />

      {/* ── Venue APY bar compare ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={S.sectionTitle}>USDC SUPPLY APY — LIVE VENUES</p>
        {barItems.length > 0 ? (
          <BarCompare
            items={barItems}
            barWidth={220}
            rowHeight={30}
            formatValue={(v) => `${v.toFixed(2)}%`}
          />
        ) : (
          <p style={S.label}>no venue data</p>
        )}
      </div>

      <div style={S.divider} />

      {/* ── Vault balance + uplift stats ── */}
      <div style={{ ...S.row, marginBottom: 20 }}>
        <div style={S.col}>
          <p style={S.label}>Vault idle USDC</p>
          <p style={S.accentValue}>{idleDisplay}</p>
        </div>
        <div style={S.col}>
          <p style={S.label}>Best venue APY</p>
          <p style={S.accentValue}>{uplift.bestApy.toFixed(2)}% ({uplift.best || "—"})</p>
        </div>
        <div style={S.col}>
          <p style={S.label}>Baseline APY</p>
          <p style={S.value}>{uplift.baselineApy.toFixed(2)}% ({uplift.baseline || "—"})</p>
        </div>
      </div>

      {/* ── APY sparkline ── */}
      <div>
        <p style={S.sparkLabel}>
          live APY (sampled){" "}
          <span style={{ color: MUTED, fontStyle: "italic" }}>— synthetic series around current best</span>
        </p>
        <Sparkline data={sparkData} color={BLUE} height={52} />
        <p style={{ ...S.label, marginTop: 4, fontSize: 9 }}>
          best venue: {uplift.best || "—"} · {uplift.bestApy.toFixed(2)}% APY
        </p>
      </div>
    </div>
  )
}
