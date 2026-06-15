import { writeFileSync, readFileSync, existsSync } from "fs"
import type { Apy } from "./yields"

// A small, local ring buffer of the swarm's most recent decisions, written each tick by
// Icarus. The on-chain events (SpendAuthorized, CriticRating) only ever capture REBALANCEs
// — but most ticks are HOLDs, and those carry the agent's live reasoning. This feed makes
// that reasoning visible to the dashboard ("AGENT THOUGHTS") without spamming the chain.
// Gitignored runtime state; capped so it can't grow unbounded.

const FEED_FILE = process.env.TALOS_DECISIONS_FILE ?? ".talos-decisions.json"
const MAX = 60

export type DecisionRecord = {
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

export function appendDecision(rec: DecisionRecord) {
  try {
    let arr: DecisionRecord[] = []
    if (existsSync(FEED_FILE)) {
      try {
        const parsed = JSON.parse(readFileSync(FEED_FILE, "utf8"))
        if (Array.isArray(parsed)) arr = parsed
      } catch {
        /* corrupt/partial file — start fresh */
      }
    }
    arr.push(rec)
    if (arr.length > MAX) arr = arr.slice(arr.length - MAX)
    writeFileSync(FEED_FILE, JSON.stringify(arr, null, 2))
  } catch (e: any) {
    console.error("could not persist decision feed:", e?.message ?? e)
  }
}
