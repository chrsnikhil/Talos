// Remove the flat grey studio backdrop from a portrait by flood-filling the
// connected background from the image borders, leaving the subject (and any
// grey enclosed by the subject's outline) intact.
// Usage: node scripts/cut-hero.mjs [srcRelToPublic] [outRelToPublic]
import sharp from "sharp"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(root, "public", process.argv[2] || "hero.png")
const OUT = path.join(root, "public", process.argv[3] || "hero-cut.png")

const img = sharp(SRC).ensureAlpha()
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info // C === 4

// Seed colour = average of the TOP corners only (the subject often fills the
// bottom corners, which would corrupt a 4-corner average).
const corners = [0, (W - 1) * C]
let sr = 0, sg = 0, sb = 0
for (const o of corners) { sr += data[o]; sg += data[o + 1]; sb += data[o + 2] }
const seed = { r: sr / corners.length, g: sg / corners.length, b: sb / corners.length }

const T_IN = 82    // dist below this → fully transparent
const T_EDGE = 124 // dist above this → keep opaque (flood stops)
const GRAY = 40    // max channel spread to still count as "grey" (rejects skin)

const dist = (i) => {
  const dr = data[i] - seed.r, dg = data[i + 1] - seed.g, db = data[i + 2] - seed.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}
const grayness = (i) => {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  return Math.max(r, g, b) - Math.min(r, g, b)
}

const visited = new Uint8Array(W * H)
const stack = []
const pushIf = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const p = y * W + x
  if (visited[p]) return
  visited[p] = 1
  stack.push(p)
}
// seed every border pixel
for (let x = 0; x < W; x++) { pushIf(x, 0); pushIf(x, H - 1) }
for (let y = 0; y < H; y++) { pushIf(0, y); pushIf(W - 1, y) }

let cleared = 0
while (stack.length) {
  const p = stack.pop()
  const i = p * C
  const d = dist(i)
  if (d >= T_EDGE || grayness(i) > GRAY) continue // boundary — stop here
  // within the background region
  if (d <= T_IN) data[i + 3] = 0
  else data[i + 3] = Math.round(((d - T_IN) / (T_EDGE - T_IN)) * 255) // feather
  cleared++
  const x = p % W, y = (p / W) | 0
  pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1)
}

await sharp(data, { raw: { width: W, height: H, channels: C } }).png().toFile(OUT)
console.log(`cleared ${cleared} px of ${W * H}; wrote ${path.relative(root, OUT)}`)
