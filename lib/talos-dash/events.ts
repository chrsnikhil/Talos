export type AgentId = "icarus" | "daedalus"

export interface AgentEvent {
  id: string
  agent: AgentId
  type: string
  detail: string
  timestamp: number
  time: string
  /** Talos venue/station key this event should move a bot to (overrides EVENT_BEHAVIOR). */
  station?: string
  txHash?: string
  blobId?: string
  explorer?: string
}

export interface Apy { protocol: string; apy: number }
export interface Decision {
  n: number
  ts: string
  apys: Apy[]
  from: string
  action: string
  target: string
  amount: number
  reasoning: string
  by: string
  status?: string
  txDigest?: string | null
  blobId?: string | null
}
export interface Ev { type: string; tx: string; timestampMs: number; data: Record<string, any> }

export const EXPLORER = "https://suiscan.xyz/mainnet"
export const WALRUS = "https://aggregator.walrus-testnet.walrus.space/v1/blobs"

const VENUES = new Set(["scallop", "navi", "kai", "sui"])

function fmtTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function decisionToEvent(d: Decision): AgentEvent {
  const ts = Date.parse(d.ts) || 0
  const isRebal = d.action === "REBALANCE"
  const detail = isRebal
    ? `${d.amount} ${d.from}→${d.target}: ${d.reasoning}`
    : d.reasoning || "hold"
  return {
    id: `dec-${d.n}`,
    agent: "icarus",
    type: isRebal ? "REBALANCE" : "HOLD",
    detail,
    timestamp: ts,
    time: fmtTime(ts),
    station: isRebal && VENUES.has(d.target) ? d.target : undefined,
    txHash: d.txDigest ?? undefined,
    blobId: d.blobId ?? undefined,
    explorer: d.txDigest
      ? `${EXPLORER}/tx/${d.txDigest}`
      : d.blobId
        ? `${WALRUS}/${d.blobId}`
        : undefined,
  }
}

export function activityToEvent(e: Ev): AgentEvent {
  const d = e.data || {}
  let type = e.type
  let detail = ""
  let station: string | undefined
  let agent: AgentId = "icarus"
  switch (e.type) {
    case "SpendAuthorized":
      type = "SPEND"
      detail = `${d.amount} → ${d.protocol} · remaining ${d.remaining}`
      station = VENUES.has(d.protocol) ? d.protocol : "policy"
      break
    case "CriticRating":
      type = "RATING"
      agent = "daedalus"
      detail = `${d.score}/100 · ${d.verdict}`
      station = "policy"
      break
    case "PolicyCreated":
      detail = `budget ${d.budget} · per-tx ${d.per_tx_cap}`
      station = "policy"
      break
    case "ToppedUp":
      detail = `+${d.added} · remaining ${d.remaining}`
      station = "policy"
      break
    case "ExpiryExtended":
      detail = `new expiry ${d.new_expires_at_ms}`
      station = "policy"
      break
    case "PolicyRevoked":
      detail = "agent disabled by owner"
      station = "policy"
      break
    case "ReputationCreated":
      detail = "reputation ledger created"
      station = "policy"
      break
    default:
      detail = ""
  }
  return {
    id: `ev-${e.tx}-${e.type}`,
    agent,
    type,
    detail,
    timestamp: e.timestampMs || 0,
    time: fmtTime(e.timestampMs || 0),
    station,
    txHash: e.tx || undefined,
    explorer: e.tx ? `${EXPLORER}/tx/${e.tx}` : undefined,
  }
}

export function mergeEvents(decisions: Decision[], activity: Ev[]): AgentEvent[] {
  const out = new Map<string, AgentEvent>()
  for (const d of decisions) {
    const e = decisionToEvent(d)
    out.set(e.id, e)
  }
  for (const a of activity) {
    const e = activityToEvent(a)
    out.set(e.id, e)
  }
  return [...out.values()].sort((a, b) => a.timestamp - b.timestamp)
}
