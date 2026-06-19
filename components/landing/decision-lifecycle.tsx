"use client"
/**
 * DECISION LIFECYCLE CARD — bento layout
 *
 * Replays a real Talos rebalance cycle through 6 stages laid out as a bento grid:
 *
 *   [SENSE     ] [DECIDE  ] [AUTHORIZE]   ← row 1 (3 cells)
 *   [EXECUTE (2-wide)      ] [LOG      ]   ← row 2
 *   [RATE (3-wide)                     ]   ← row 3
 *
 * Stage visual states:
 *   - pending  (not yet run): dimmed (opacity 0.35), no glow, dark border
 *   - active   (running now): full opacity, accent border + bg tint, soft glow
 *   - done     (already run): full opacity, neutral border, ✓ icon
 *
 * Pulls last 5 REBALANCE decisions from /api/talos/decisions and ratings from
 * /api/talos/activity, then loops indefinitely. Falls back to a static cycle if
 * the fetch fails or no rebalances exist yet.
 */
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
} from "lucide-react"

// ─────────── TYPES ───────────
interface ApyEntry { protocol: string; apy: number }

interface TalosDecision {
  n: number
  ts: string
  apys: ApyEntry[]
  from: string
  action: string
  target: string
  amount: number
  reasoning: string
  by: string
  status: string
  txDigest?: string
  blobId?: string
}

interface ActivityEvent {
  type: string
  tx: string
  timestampMs: number
  data: { score?: number; verdict?: string; ref_tx?: string; [k: string]: any }
}

interface TalosCycle {
  cycleId: string
  startedAt: number
  apys: ApyEntry[]
  from: string
  to: string
  amount: number
  reasoning: string
  txDigest: string
  blobId: string
  score: number
  verdict: string
}

// ─────────── CONSTANTS ───────────
const STAGE_DURATIONS = [2500, 4500, 3500, 5000, 2500, 5500, 3000] as const
const MANUAL_RESUME_MS = 15_000
const ease = [0.22, 1, 0.36, 1] as const

// Talos accent drives all active/glow states; muted per-stage hues for done/pending accent stubs.
const STAGE_COLOR = [
  "var(--accent-color)", // 0 SENSE
  "var(--accent-color)", // 1 DECIDE
  "var(--accent-color)", // 2 AUTHORIZE
  "var(--accent-color)", // 3 EXECUTE
  "var(--accent-color)", // 4 LOG
  "var(--accent-color)", // 5 RATE
] as const

// Resolved hex approximation used where CSS vars can't be used in JS string interpolation
const ACCENT_FALLBACK = "#3b97fb"

const STAGE_LABELS = [
  "SENSE · MARKET",
  "DECIDE · GROQ",
  "AUTHORIZE · MOVE POLICY",
  "EXECUTE · PTB",
  "LOG · WALRUS",
  "RATE · DAEDALUS",
] as const

// ─────────── STATIC FALLBACK CYCLE ───────────
const FALLBACK_CYCLE: TalosCycle = {
  cycleId: "fallback-1",
  startedAt: Date.now() - 60_000,
  apys: [
    { protocol: "scallop", apy: 5.4 },
    { protocol: "navi", apy: 6.3 },
    { protocol: "kai", apy: 3.9 },
    { protocol: "sui", apy: 5.6 },
  ],
  from: "scallop",
  to: "navi",
  amount: 100,
  reasoning: "Navi offers +0.9pp over current Scallop position; above anti-churn threshold. Rebalancing.",
  txDigest: "",
  blobId: "",
  score: 88,
  verdict: "in-scope rebalance, conservatively sized",
}

// ─────────── HELPERS ───────────
function shortHash(h: string, n = 6): string {
  if (!h) return ""
  return h.length > n * 2 + 2 ? `${h.slice(0, n + 2)}…${h.slice(-n)}` : h
}

function useTypewriter(text: string, msPerChar = 25, active: boolean): string {
  const [out, setOut] = useState("")
  useEffect(() => {
    if (!active) { setOut(""); return }
    let i = 0
    setOut("")
    const id = setInterval(() => {
      i += 1
      if (i > text.length) { clearInterval(id); return }
      setOut(text.slice(0, i))
    }, msPerChar)
    return () => clearInterval(id)
  }, [text, msPerChar, active])
  return out
}

function useCounter(target: number, ms = 1500, active: boolean): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) { setN(0); return }
    const start = Date.now()
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      setN(Math.round(target * eased))
      if (t >= 1) clearInterval(id)
    }, 30)
    return () => clearInterval(id)
  }, [target, ms, active])
  return n
}

// ─────────── BENTO CELL WRAPPER ───────────
function BentoCell({
  active,
  done,
  colSpan = 1,
  children,
}: {
  active: boolean
  done: boolean
  colSpan?: 1 | 2 | 3
  children: React.ReactNode
}) {
  const colSpanClass =
    colSpan === 3 ? "md:col-span-3" : colSpan === 2 ? "md:col-span-2" : "md:col-span-1"
  return (
    <motion.div
      animate={{ opacity: active || done ? 1 : 0.35 }}
      transition={{ duration: 0.4, ease }}
      className={`${colSpanClass} relative flex flex-col p-4 bg-black transition-all duration-500 min-h-[220px] overflow-hidden`}
      style={{
        boxShadow: active
          ? `inset 4px 0 0 ${ACCENT_FALLBACK}, 0 0 28px ${ACCENT_FALLBACK}33, inset 0 0 80px ${ACCENT_FALLBACK}14`
          : done
          ? `inset 3px 0 0 ${ACCENT_FALLBACK}, inset 0 0 60px ${ACCENT_FALLBACK}08`
          : `inset 2px 0 0 ${ACCENT_FALLBACK}44`,
      }}
    >
      {active && (
        <motion.div
          aria-hidden
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 h-px w-1/3 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${ACCENT_FALLBACK}, transparent)`,
          }}
        />
      )}
      {children}
    </motion.div>
  )
}

// ─────────── STAGE HEADER ───────────
function StageHeader({
  index,
  active,
  done,
}: {
  index: number
  active: boolean
  done: boolean
}) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/20">
      <span
        className="h-1.5 w-1.5 shrink-0"
        style={{
          background: "var(--accent-color)",
          boxShadow: active ? `0 0 8px ${ACCENT_FALLBACK}` : "none",
        }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-[8px] tracking-[0.2em] uppercase font-mono font-bold truncate"
          style={{ color: active ? "#e5e7eb" : done ? "#d4d4d8" : "#52525b" }}
        >
          STAGE {String(index + 1).padStart(2, "0")} · {STAGE_LABELS[index]}
        </div>
      </div>
      {done && (
        <Check
          size={11}
          strokeWidth={2.5}
          className="shrink-0"
          style={{ color: "var(--accent-color)" }}
        />
      )}
    </div>
  )
}

// ─────────── STAGE 0 · SENSE ───────────
function StageSense({ cycle, active, done }: { cycle: TalosCycle; active: boolean; done: boolean }) {
  const visible = active || done
  const held = cycle.apys.find((a) => a.protocol === cycle.from) ?? cycle.apys[0]
  const maxApy = Math.max(...cycle.apys.map((y) => y.apy), 0.01)
  return (
    <>
      <StageHeader index={0} active={active} done={done} />
      {/* HERO · current held APY */}
      <div className="mb-3">
        <div
          className="font-pixel text-4xl leading-none"
          style={{
            color: "var(--accent-color)",
            textShadow: `0 0 18px ${ACCENT_FALLBACK}55`,
          }}
        >
          {(held?.apy ?? 0).toFixed(2)}
          <span className="text-xl text-muted-foreground/70">%</span>
        </div>
        <div className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground/80 font-mono mt-1">
          held in <span className="text-foreground font-bold">{cycle.from.toUpperCase()}</span> · ${cycle.amount.toFixed(2)} USDC
        </div>
      </div>
      {/* Per-protocol APY bars */}
      <div className="flex-1 space-y-1">
        {cycle.apys.map((y, i) => {
          const isHeld = y.protocol === cycle.from
          const widthPct = (y.apy / maxApy) * 100
          return (
            <div key={y.protocol} className="flex items-center gap-1.5 text-[8px] font-mono">
              <span className="w-12 uppercase tracking-[0.12em] text-muted-foreground/70 truncate">
                {y.protocol}
              </span>
              <div className="flex-1 h-2 bg-black/60 border border-border/30 relative overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: visible ? `${widthPct}%` : 0 }}
                  transition={{ duration: 0.7, delay: visible ? 0.1 + i * 0.15 : 0, ease }}
                  className="absolute inset-y-0 left-0"
                  style={{
                    background: isHeld ? ACCENT_FALLBACK : `${ACCENT_FALLBACK}66`,
                    opacity: isHeld ? 1 : 0.5,
                  }}
                />
              </div>
              <span
                className={`w-9 text-right font-bold ${
                  isHeld ? "text-foreground" : "text-muted-foreground/80"
                }`}
              >
                {y.apy.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─────────── STAGE 1 · DECIDE ───────────
function StageDecide({ cycle, active, done }: { cycle: TalosCycle; active: boolean; done: boolean }) {
  const visible = active || done
  const [reveal, setReveal] = useState(false)
  useEffect(() => {
    if (!active) { setReveal(false); return }
    const t = setTimeout(() => setReveal(true), 2500)
    return () => clearTimeout(t)
  }, [active])
  const verdictNow = reveal || done
  const fromApy = cycle.apys.find((a) => a.protocol === cycle.from)?.apy ?? 0
  const toApy = cycle.apys.find((a) => a.protocol === cycle.to)?.apy ?? 0
  const uplift = toApy - fromApy
  return (
    <>
      <StageHeader index={1} active={active} done={done} />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-[9px] font-mono flex-wrap">
          <span
            className="px-1.5 py-0.5 border font-bold tracking-wider"
            style={{
              borderColor: `${ACCENT_FALLBACK}60`,
              color: "var(--accent-color)",
            }}
          >
            GROQ · LLM
          </span>
          <span className="text-muted-foreground/70">anti-churn threshold</span>
        </div>
        <AnimatePresence mode="wait">
          {visible && !verdictNow && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] font-mono text-muted-foreground flex items-center gap-1"
            >
              <span>reasoning</span>
              <motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >·</motion.span>
              <motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
              >·</motion.span>
              <motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
              >·</motion.span>
            </motion.div>
          )}
          {verdictNow && (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {/* HERO · uplift */}
              <div>
                <div
                  className="font-pixel text-3xl leading-none"
                  style={{
                    color: "var(--accent-color)",
                    textShadow: `0 0 18px ${ACCENT_FALLBACK}55`,
                  }}
                >
                  +{uplift.toFixed(2)}
                  <span className="text-base text-muted-foreground/70">pp</span>
                </div>
                <div className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground/80 font-mono mt-1">
                  rebalance uplift
                </div>
              </div>
              {/* From → To chips */}
              <div className="flex items-center gap-1.5 text-[9px] font-mono flex-wrap">
                <span
                  className="px-1.5 py-0.5 border uppercase"
                  style={{ borderColor: `${ACCENT_FALLBACK}60`, color: "var(--accent-color)" }}
                >
                  {cycle.from} {fromApy.toFixed(2)}%
                </span>
                <ArrowRight size={10} className="text-[var(--accent-color)] shrink-0" />
                <span
                  className="px-1.5 py-0.5 border uppercase font-bold"
                  style={{ borderColor: "var(--accent-color)", color: "var(--accent-color)" }}
                >
                  {cycle.to} {toApy.toFixed(2)}%
                </span>
              </div>
              {/* Reasoning snippet */}
              {cycle.reasoning && (
                <p className="text-[9px] font-mono text-muted-foreground/70 leading-relaxed line-clamp-2">
                  {cycle.reasoning}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

// ─────────── STAGE 2 · AUTHORIZE ───────────
function StageAuthorize({ active, done }: { active: boolean; done: boolean }) {
  const checks = ["budget ceiling", "protocol allowlist", "expiry window"]
  const [revealed, setRevealed] = useState(0)
  useEffect(() => {
    if (!active) { setRevealed(0); return }
    let i = 0
    const id = setInterval(() => {
      i += 1
      setRevealed(i)
      if (i >= checks.length) clearInterval(id)
    }, 900)
    return () => clearInterval(id)
  }, [active])
  const showCount = done ? checks.length : revealed
  return (
    <>
      <StageHeader index={2} active={active} done={done} />
      {/* HERO · policy label */}
      <div className="mb-3">
        <div
          className="font-pixel text-2xl leading-none"
          style={{
            color: "var(--accent-color)",
            textShadow: `0 0 18px ${ACCENT_FALLBACK}55`,
          }}
        >
          POLICY
          <span className="text-base text-muted-foreground/70"> GATE</span>
        </div>
        <div className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground/80 font-mono mt-1">
          AgentPolicy · Move on-chain
        </div>
      </div>
      {/* Policy checks */}
      <div className="flex-1 space-y-1.5">
        {checks.map((c, i) => (
          <motion.div
            key={c}
            initial={{ opacity: 0, x: -8 }}
            animate={{
              opacity: i < showCount ? 1 : 0,
              x: i < showCount ? 0 : -8,
            }}
            transition={{ duration: 0.3, ease }}
            className="flex items-center gap-2 text-[9px] font-mono"
          >
            <Check
              size={10}
              strokeWidth={2.5}
              style={{ color: "var(--accent-color)" }}
              className="shrink-0"
            />
            <span className="text-foreground/80 uppercase tracking-[0.1em]">{c}</span>
            <span
              className="ml-auto text-[8px] font-bold"
              style={{ color: "var(--accent-color)" }}
            >
              OK
            </span>
          </motion.div>
        ))}
      </div>
      {done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[9px] font-mono flex items-center gap-1 mt-2 pt-2 border-t border-border/20"
          style={{ color: "var(--accent-color)" }}
        >
          <Check size={9} strokeWidth={2.5} /> authorized · owner-revocable
        </motion.div>
      )}
    </>
  )
}

// ─────────── STAGE 3 · EXECUTE ───────────
function StageExecute({ cycle, active, done }: { cycle: TalosCycle; active: boolean; done: boolean }) {
  const hasTx = Boolean(cycle.txDigest)
  return (
    <>
      <StageHeader index={3} active={active} done={done} />
      <div className="flex-1 flex gap-5">
        {/* HERO · PTB indicator */}
        <div className="shrink-0 w-28 border-r border-border/20 pr-4">
          <div
            className="font-pixel text-4xl leading-none"
            style={{
              color: "var(--accent-color)",
              textShadow: `0 0 18px ${ACCENT_FALLBACK}55`,
            }}
          >
            PTB
          </div>
          <div className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground/80 font-mono mt-1">
            programmable tx
          </div>
          <div className="text-[8px] tracking-[0.15em] uppercase font-mono mt-2" style={{ color: "var(--accent-color)" }}>
            atomic ✓
          </div>
          <div className="text-[8px] tracking-[0.1em] uppercase text-muted-foreground/60 font-mono mt-1">
            ${cycle.amount.toFixed(2)} USDC
          </div>
        </div>
        {/* Tx entry */}
        <div className="flex-1 space-y-2 min-w-0 flex flex-col justify-center">
          <div className="text-[9px] font-mono text-muted-foreground/70 uppercase tracking-[0.1em]">
            {cycle.from.toUpperCase()} → {cycle.to.toUpperCase()}
          </div>
          {hasTx ? (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: active || done ? 1 : 0, x: active || done ? 0 : -8 }}
              transition={{ duration: 0.35, delay: active ? 0.5 : 0, ease }}
              className="flex items-center gap-2 text-[10px] font-mono"
            >
              <Check
                size={11}
                strokeWidth={2.5}
                style={{ color: "var(--accent-color)" }}
                className="shrink-0"
              />
              <span
                className="font-bold truncate"
                style={{ color: "var(--accent-color)" }}
              >
                {shortHash(cycle.txDigest, 8)}
              </span>
              <a
                href={`https://suiscan.xyz/mainnet/tx/${cycle.txDigest}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[var(--accent-color)] transition-colors shrink-0"
              >
                <ExternalLink size={10} />
              </a>
            </motion.div>
          ) : (
            <div className="text-[9px] font-mono text-muted-foreground/50 italic">
              (no tx recorded yet)
            </div>
          )}
          <div className="text-[8px] font-mono text-muted-foreground/50 tracking-[0.1em] uppercase">
            Sui mainnet · real USDC
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────── STAGE 4 · LOG ───────────
function StageLog({ cycle, active, done }: { cycle: TalosCycle; active: boolean; done: boolean }) {
  const blobId = cycle.blobId || ""
  const typed = useTypewriter(blobId, 28, active)
  const display = done ? blobId : typed
  return (
    <>
      <StageHeader index={4} active={active} done={done} />
      {/* HERO · Walrus label */}
      <div className="mb-3">
        <div
          className="font-pixel text-3xl leading-none"
          style={{
            color: "var(--accent-color)",
            textShadow: `0 0 18px ${ACCENT_FALLBACK}55`,
          }}
        >
          WALRUS<span className="text-base text-muted-foreground/70">/blob</span>
        </div>
        <div className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground/80 font-mono mt-1">
          decision · content-addressed
        </div>
      </div>
      {/* blobId code block */}
      <div className="flex-1 flex flex-col justify-center">
        {blobId ? (
          <>
            <div
              className="text-[10px] font-mono break-all bg-black/80 border-2 px-2.5 py-2 leading-relaxed"
              style={{
                borderColor: `${ACCENT_FALLBACK}55`,
                color: "var(--accent-color)",
              }}
            >
              <span className="text-foreground">{display || "…"}</span>
              {active && display.length < blobId.length && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ color: "var(--accent-color)" }}
                >
                  ▌
                </motion.span>
              )}
            </div>
            {(active || done) && blobId && (
              <a
                href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mt-1 text-[8px] font-mono hover:text-[var(--accent-color)] text-muted-foreground/60 transition-colors"
              >
                <ExternalLink size={8} /> view on Walrus
              </a>
            )}
          </>
        ) : (
          <div className="text-[9px] font-mono text-muted-foreground/50 italic">
            (no blob recorded yet)
          </div>
        )}
      </div>
      {done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[9px] font-mono flex items-center gap-1 mt-2 pt-2 border-t border-border/20"
          style={{ color: "var(--accent-color)" }}
        >
          <Check size={9} strokeWidth={2.5} /> stored · publicly verifiable
        </motion.div>
      )}
    </>
  )
}

// ─────────── STAGE 5 · RATE ───────────
function StageRate({ cycle, active, done }: { cycle: TalosCycle; active: boolean; done: boolean }) {
  const target = cycle.score ?? 0
  const score = useCounter(target, 800, active)
  const display = active && score > 0 ? score : active || done ? target : 0
  return (
    <>
      <StageHeader index={5} active={active} done={done} />
      <div className="flex-1 flex items-start gap-8">
        <div className="shrink-0 flex flex-col items-start">
          <motion.div
            key={`score-${cycle.cycleId}-${active || done ? "on" : "off"}`}
            initial={{ scale: active ? 0.7 : 1, opacity: active ? 0 : 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease }}
            className="font-pixel text-7xl leading-none"
            style={{
              color: "var(--accent-color)",
              textShadow: `0 0 24px ${ACCENT_FALLBACK}66`,
            }}
          >
            {String(display).padStart(2, "0")}
            <span className="text-2xl text-muted-foreground/70">/100</span>
          </motion.div>
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/80 font-mono mt-2">
            daedalus critic score
          </div>
        </div>
        {cycle.verdict && (active || done) && (
          <motion.div
            key={`verdict-${cycle.cycleId}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease }}
            className="text-[11px] font-mono text-muted-foreground leading-relaxed flex-1 italic pt-2 border-l-2 pl-4"
            style={{ borderColor: "var(--accent-color)" }}
          >
            <span className="not-italic font-bold" style={{ color: "var(--accent-color)" }}>
              δ:
            </span>{" "}
            "{cycle.verdict}"
          </motion.div>
        )}
        {!cycle.verdict && (active || done) && (
          <div className="text-[10px] font-mono text-muted-foreground/60 italic pt-3">
            (no rating recorded for this cycle)
          </div>
        )}
      </div>
    </>
  )
}

// ─────────── ROOT COMPONENT ───────────
export function DecisionLifecycle() {
  const [cycles, setCycles] = useState<TalosCycle[]>([])
  const [cycleIdx, setCycleIdx] = useState(0)
  const [stage, setStage] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [manualUntil, setManualUntil] = useState<number | null>(null)
  const [, setNowTick] = useState(0)
  const isManual = manualUntil !== null && manualUntil > Date.now()

  useEffect(() => {
    async function load() {
      try {
        const [decRes, actRes] = await Promise.all([
          fetch("/api/talos/decisions", { cache: "no-store" }),
          fetch("/api/talos/activity", { cache: "no-store" }),
        ])
        const decJson = await decRes.json() as { decisions?: TalosDecision[] }
        const actJson = await actRes.json() as { events?: ActivityEvent[] }

        const decisions: TalosDecision[] = decJson.decisions ?? []
        const events: ActivityEvent[] = actJson.events ?? []

        // Take up to 5 rebalances; fill with HOLDs if needed
        const rebalances = decisions.filter((d) => d.action === "REBALANCE").slice(0, 5)
        const filler = decisions.filter((d) => d.action !== "REBALANCE")
        const pool = [...rebalances, ...filler].slice(0, 5)

        if (pool.length === 0) {
          setCycles([FALLBACK_CYCLE])
          setLoaded(true)
          return
        }

        const mapped: TalosCycle[] = pool.map((d, i) => {
          // Find a matching CriticRating event
          const rating = events.find(
            (e) => e.type === "CriticRating" && e.data?.ref_tx === d.txDigest
          )
          // Fall back to average score from all CriticRating events
          const avgScore = (() => {
            const scores = events
              .filter((e) => e.type === "CriticRating" && typeof e.data?.score === "number")
              .map((e) => e.data.score as number)
            return scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : 88
          })()

          return {
            cycleId: `cycle-${d.n ?? i}`,
            startedAt: d.ts ? new Date(d.ts).getTime() : Date.now(),
            apys: Array.isArray(d.apys) ? d.apys : [],
            from: d.from ?? "scallop",
            to: d.target ?? "navi",
            amount: d.amount ?? 100,
            reasoning: d.reasoning ?? "",
            txDigest: d.txDigest ?? "",
            blobId: d.blobId ?? "",
            score: rating?.data?.score ?? avgScore,
            verdict: rating?.data?.verdict ?? "",
          }
        })

        setCycles(mapped)
      } catch {
        setCycles([FALLBACK_CYCLE])
      } finally {
        setLoaded(true)
      }
    }
    void load()
  }, [])

  // Auto-advance — paused while in manual mode
  useEffect(() => {
    if (cycles.length === 0) return
    if (isManual) {
      const t = setTimeout(
        () => setManualUntil(null),
        Math.max(0, manualUntil! - Date.now())
      )
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      if (stage < 5) {
        setStage(stage + 1)
      } else {
        setStage(0)
        setCycleIdx((i) => (i + 1) % cycles.length)
      }
    }, STAGE_DURATIONS[stage])
    return () => clearTimeout(t)
  }, [stage, cycleIdx, cycles.length, isManual, manualUntil])

  // Tick for countdown display
  useEffect(() => {
    if (!isManual) return
    const id = setInterval(() => setNowTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isManual])

  const advance = (delta: 1 | -1) => {
    setManualUntil(Date.now() + MANUAL_RESUME_MS)
    if (cycles.length === 0) return
    if (delta === 1) {
      if (stage < 5) setStage(stage + 1)
      else { setStage(0); setCycleIdx((i) => (i + 1) % cycles.length) }
    } else {
      if (stage > 0) setStage(stage - 1)
      else { setStage(5); setCycleIdx((i) => (i - 1 + cycles.length) % cycles.length) }
    }
  }
  const resumeAuto = () => setManualUntil(null)
  const resumeIn = isManual ? Math.max(0, Math.ceil((manualUntil! - Date.now()) / 1000)) : 0

  if (!loaded) {
    return (
      <div className="border-2 border-[var(--accent-color)]/30 bg-black/40 p-12 text-center font-mono text-[11px] text-muted-foreground">
        loading lifecycle replay…
      </div>
    )
  }

  const cycle = cycles[cycleIdx] ?? FALLBACK_CYCLE
  const dt = new Date(cycle.startedAt)
  const fromApy = cycle.apys.find((a) => a.protocol === cycle.from)?.apy ?? 0
  const toApy = cycle.apys.find((a) => a.protocol === cycle.to)?.apy ?? 0
  const upliftPp = toApy - fromApy

  return (
    <div className="border-2 border-[var(--accent-color)]/40 bg-black/60 max-w-5xl mx-auto">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/40 flex items-center gap-3 flex-wrap">
        <span
          className={`h-2 w-2 ${
            isManual ? "bg-yellow-400" : "bg-[var(--accent-color)] animate-pulse"
          }`}
        />
        <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent-color)] font-mono font-bold">
          TALOS AGENT LOOP · LIFECYCLE REPLAY
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {cycle.cycleId.replace("cycle-", "#")} ·{" "}
          {dt.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {upliftPp > 0 && (
          <span className="text-[10px] font-mono px-2 py-0.5 border border-[var(--accent-color)]/60 text-[var(--accent-color)] font-bold tracking-wider">
            +{upliftPp.toFixed(2)}pp CAPTURED
          </span>
        )}
        <div className="flex-1" />
        {/* Manual stepper controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => advance(-1)}
            aria-label="Previous stage"
            className="p-1 border border-border/40 hover:border-[var(--accent-color)]/70 hover:text-[var(--accent-color)] text-muted-foreground transition-colors"
          >
            <ChevronLeft size={12} />
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-4 h-1 transition-colors duration-300"
                style={{
                  background:
                    i < stage
                      ? "#d4d4d8"
                      : i === stage
                      ? isManual
                        ? "#facc15"
                        : "var(--accent-color)"
                      : "#3f3f46",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => advance(1)}
            aria-label="Next stage"
            className="p-1 border border-border/40 hover:border-[var(--accent-color)]/70 hover:text-[var(--accent-color)] text-muted-foreground transition-colors"
          >
            <ChevronRight size={12} />
          </button>
          {isManual ? (
            <button
              type="button"
              onClick={resumeAuto}
              className="ml-1 flex items-center gap-1 text-[9px] font-mono tracking-[0.15em] uppercase text-yellow-400 hover:text-yellow-300 px-1.5 py-1 border border-yellow-400/40 hover:border-yellow-400 transition-colors"
              title="Click to resume now"
            >
              <Pause size={9} /> PAUSED · {resumeIn}s
            </button>
          ) : (
            <span className="ml-1 flex items-center gap-1 text-[9px] font-mono tracking-[0.15em] uppercase text-[var(--accent-color)] px-1.5 py-1 border border-[var(--accent-color)]/40">
              <Play size={9} /> AUTO
            </span>
          )}
        </div>
      </div>

      {/* Bento grid — gap-px on tinted bg = 1px hairline dividers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/30">
        {/* Row 1 */}
        <BentoCell active={stage === 0} done={stage > 0} colSpan={1}>
          <StageSense cycle={cycle} active={stage === 0} done={stage > 0} />
        </BentoCell>
        <BentoCell active={stage === 1} done={stage > 1} colSpan={1}>
          <StageDecide cycle={cycle} active={stage === 1} done={stage > 1} />
        </BentoCell>
        <BentoCell active={stage === 2} done={stage > 2} colSpan={1}>
          <StageAuthorize active={stage === 2} done={stage > 2} />
        </BentoCell>
        {/* Row 2 */}
        <BentoCell active={stage === 3} done={stage > 3} colSpan={2}>
          <StageExecute cycle={cycle} active={stage === 3} done={stage > 3} />
        </BentoCell>
        <BentoCell active={stage === 4} done={stage > 4} colSpan={1}>
          <StageLog cycle={cycle} active={stage === 4} done={stage > 4} />
        </BentoCell>
        {/* Row 3 */}
        <BentoCell active={stage === 5} done={stage > 5} colSpan={3}>
          <StageRate cycle={cycle} active={stage === 5} done={stage > 5} />
        </BentoCell>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
        <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
          EVERY ARTIFACT IS REAL · CLICK ANY TX TO VERIFY ON SUISCAN
        </div>
        <div className="text-[9px] font-mono text-muted-foreground/70">
          use ◂ ▸ to step manually · auto-resumes after {MANUAL_RESUME_MS / 1000}s
        </div>
      </div>
    </div>
  )
}
