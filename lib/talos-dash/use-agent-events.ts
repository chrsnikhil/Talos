"use client"

import { useSyncExternalStore } from "react"
import { mergeEvents, type AgentEvent, type Decision, type Ev } from "./events"

const POLL_INTERVAL_MS = 1500
const HISTORY_CAP = 500
const EMPTY: AgentEvent[] = []

let history: AgentEvent[] = EMPTY
const seen = new Set<string>()
const listeners = new Set<() => void>()
let pollTimer: ReturnType<typeof setInterval> | null = null
let inflight = false

function notify() {
  for (const l of listeners) l()
}

async function poll() {
  if (typeof window === "undefined" || inflight) return
  inflight = true
  try {
    const [dRes, aRes] = await Promise.all([
      fetch("/api/talos/decisions", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/talos/activity", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
    const decisions: Decision[] = dRes?.decisions ?? []
    const activity: Ev[] = aRes?.events ?? []
    const merged = mergeEvents(decisions, activity)
    let added = false
    let next = history
    for (const e of merged) {
      if (seen.has(e.id)) continue
      seen.add(e.id)
      next = next.length >= HISTORY_CAP ? [...next.slice(1), e] : [...next, e]
      added = true
    }
    if (added) {
      history = next
      notify()
    }
  } finally {
    inflight = false
  }
}

function start() {
  if (pollTimer) return
  poll()
  pollTimer = setInterval(poll, POLL_INTERVAL_MS)
}

function stop() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (listeners.size === 1) start()
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0) stop()
  }
}

function getSnapshot() {
  return history
}
function getServerSnapshot() {
  return EMPTY
}

/** Shared live event feed (ascending by time). Optional `limit` returns the newest N. */
export function useAgentEvents(limit?: number): AgentEvent[] {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (limit && all.length > limit) return all.slice(all.length - limit)
  return all
}
