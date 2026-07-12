// Pre-generate the onboarding agent's voice lines with ElevenLabs.
//
// NO live TTS in the app — this renders 15 static MP3s into
// public/audio/tour/step-0.mp3 … step-14.mp3, which the tour plays per step.
//
// Usage:
//   ELEVENLABS_API_KEY=sk_xxx node scripts/gen-tour-voice.mjs
// Optional:
//   ELEVENLABS_VOICE_ID=<voiceId>   (default below — grab one from your account)
//   ELEVENLABS_MODEL=eleven_multilingual_v2   (default; or eleven_turbo_v2_5)
//
// The spoken lines mirror the on-screen bubble copy in components/tour/tour-steps.ts
// (kept here so this script needs no TS import). Keep them in sync if copy changes.

import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

const KEY = process.env.ELEVENLABS_API_KEY
const VOICE = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB" // "Adam" (warm) — override freely
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2"

if (!KEY) {
  console.error("Missing ELEVENLABS_API_KEY. Usage: ELEVENLABS_API_KEY=sk_xxx node scripts/gen-tour-voice.mjs")
  process.exit(1)
}

// Spoken versions of each step (numbers spelled out, keyboard hint dropped).
const LINES = [
  "Hey — I'm Icarus, and I'll be running your vault. Give me thirty seconds and I'll show you around.",
  "This is us versus the boring protocols. See my line riding on top? That gap is yours to keep.",
  "Everything you've deposited, plus anything still sitting idle, lives right here.",
  "Drop some USDC in here and I'll put it to work in about thirty seconds. No pressure.",
  "Flip me off and I won't touch a thing. You're always the boss.",
  "This is the leash you keep me on. I can only spend what you allow — and the chain enforces it, not me.",
  "Emergency? Hit panic, and I pull everything back on-chain, instantly. Always your call.",
  "Your own wallet — no seed phrase to lose. There's even a hook to boss me around from Claude.",
  "Swing by here anytime to watch me and Daedalus rebalancing, live on mainnet.",
  "Curious why I moved your funds? I show my reasoning — and log every call to Walrus.",
  "This is exactly where your money is sitting right now, venue by venue.",
  "Don't just trust me — every move is proven on Sui. Go check.",
  "Budget, caps, expiry — the whole policy. All on-chain, all yours to set.",
  "Daedalus grades my every move. I earn your trust one good call at a time.",
  "You're all set. Deposit whenever you're ready, and I've got it from here.",
]

const OUT = join(process.cwd(), "public", "audio", "tour")
await mkdir(OUT, { recursive: true })

console.log(`Rendering ${LINES.length} lines · voice=${VOICE} · model=${MODEL}`)
for (let i = 0; i < LINES.length; i++) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: LINES[i],
      model_id: MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
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
console.log(`\nDone → public/audio/tour/  · commit the mp3s and deploy.`)
