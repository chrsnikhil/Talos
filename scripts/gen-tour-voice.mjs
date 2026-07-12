// Pre-generate the onboarding agent's voice lines with ElevenLabs (Eleven v3).
//
// NO live TTS in the app — this renders 15 static MP3s into
// public/audio/tour/step-0.mp3 … step-14.mp3, which the tour plays per step.
//
// Realism (per ElevenLabs v3 docs / audio-tags guide):
//   • model_id "eleven_v3" — the most expressive model.
//   • Inline [audio tags] ([warmly], [excited], [curious], [serious], …) direct
//     emotion & delivery. They are interpreted, not spoken. Used sparingly.
//   • Natural stability (0.5) — balanced, stays in-character, still responsive
//     to tags. (0.0 = Creative/expressive-but-unstable, 1.0 = Robust/flat.)
//   • Natural punctuation (em-dashes, commas, ellipses) for human pacing.
//   • high similarity_boost keeps a distinctive character voice consistent.
//
// Usage:
//   ELEVENLABS_API_KEY=sk_xxx ELEVENLABS_VOICE_ID=<voiceId> node scripts/gen-tour-voice.mjs
// Optional: ELEVENLABS_MODEL (default eleven_v3), ELEVENLABS_STABILITY (default 0.5)
//
// Spoken lines mirror the on-screen bubble copy in components/tour/tour-steps.ts
// (same words, plus delivery tags). Keep in sync if the copy changes.

import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

const KEY = process.env.ELEVENLABS_API_KEY
const VOICE = process.env.ELEVENLABS_VOICE_ID
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_v3"
const STABILITY = process.env.ELEVENLABS_STABILITY ? Number(process.env.ELEVENLABS_STABILITY) : 0.5

if (!KEY) {
  console.error("Missing ELEVENLABS_API_KEY.")
  process.exit(1)
}
if (!VOICE) {
  console.error("Missing ELEVENLABS_VOICE_ID (grab it from the ElevenLabs dashboard: Voices → the voice → Copy voice ID).")
  process.exit(1)
}

// Professional, straightforward demo script — same words as the on-screen
// captions. Clean, even, polite read: no theatrical audio tags, punctuation
// carries the (calm) pacing.
const LINES = [
  "Welcome to Talos. I'll walk you through your dashboard and how everything works.",
  "This chart compares my performance against each lending protocol. I continuously route your funds to the highest-yielding venue.",
  "Here is your vault balance — your deposited USDC, along with any idle funds.",
  "To begin, deposit USDC here. I'll put it to work across Scallop, Navi, and Kai within about thirty seconds.",
  "You can pause or resume me at any time. While paused, I take no action on your funds.",
  "My activity is bounded by an on-chain policy. I can only operate within the limits you set.",
  "In an emergency, this control returns all of your funds on-chain, immediately.",
  "This is your embedded, non-custodial wallet. You can also connect me to Claude using the provided endpoint.",
  "The live view shows every action the agents take, in real time.",
  "Here you can review the reasoning behind each rebalance. Every decision is recorded to Walrus.",
  "The portfolio view shows exactly where your capital is allocated right now.",
  "Every action is verifiable on-chain. You can confirm each transaction on Sui.",
  "This is your full policy: budget, per-transaction limits, approved protocols, and expiry.",
  "Each decision is independently scored by a critic agent, building a track record over time.",
  "That completes the overview. You can deposit whenever you're ready. Thank you.",
]

const OUT = join(process.cwd(), "public", "audio", "tour")
await mkdir(OUT, { recursive: true })

console.log(`Rendering ${LINES.length} lines · voice=${VOICE} · model=${MODEL} · stability=${STABILITY}`)
for (let i = 0; i < LINES.length; i++) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: LINES[i],
      model_id: MODEL,
      voice_settings: { stability: STABILITY, similarity_boost: 0.9, use_speaker_boost: true },
    }),
  })
  if (!res.ok) {
    console.error(`✗ step-${i} failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(join(OUT, `step-${i}.mp3`), buf)
  console.log(`✓ step-${i}.mp3 (${(buf.length / 1024).toFixed(1)} KB)`)
}
console.log(`\nDone → public/audio/tour/  · listen, then I'll commit + deploy.`)
