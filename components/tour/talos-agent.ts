// Self-contained port of the REAL demo agent (talos-demo/index.html `Bot` class)
// for the onboarding tour. Plain three.js — no react-three-fiber. Client-only:
// nothing here touches the DOM/window at module scope; everything happens inside
// createTalosAgent(), which is only called from a "use client" component.

import * as THREE from "three"

/* ───────────────────────────── palette / utils ───────────────────────────── */
const OUTLINE = 0x0a0a0a
const GREEN = 0x28d391
const CORAL = 0xe0805c

const clampN = (v: number, m: number) => Math.max(-m, Math.min(m, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/* toon 5-step gradient — hard inked shadow floor, snappy lit faces.
   Lazily built (and safely rebuildable after dispose — three re-uploads). */
let GMAP: THREE.DataTexture | null = null
function gradientMap(): THREE.DataTexture {
  if (GMAP) return GMAP
  const gdata = new Uint8Array([
    72, 72, 72, 255, 118, 118, 118, 255, 168, 168, 168, 255, 216, 216, 216, 255,
    255, 255, 255, 255,
  ])
  GMAP = new THREE.DataTexture(gdata, 5, 1, THREE.RGBAFormat)
  GMAP.minFilter = GMAP.magFilter = THREE.NearestFilter
  GMAP.needsUpdate = true
  return GMAP
}
const mat = (c: number) =>
  new THREE.MeshToonMaterial({ color: c, gradientMap: gradientMap() })

/* outlined voxel box */
function obox(
  p: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  c: number,
  x: number,
  y: number,
  z: number,
  rz = 0,
  ol = true,
  olC = OUTLINE,
  olT = 0.035,
): THREE.Mesh {
  const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c))
  f.position.set(x, y, z)
  if (rz) f.rotation.z = rz
  p.add(f)
  if (ol) {
    const o = new THREE.Mesh(
      new THREE.BoxGeometry(w + olT, h + olT, d + olT),
      new THREE.MeshBasicMaterial({ color: olC, side: THREE.BackSide }),
    )
    o.position.set(x, y, z)
    if (rz) o.rotation.z = rz
    p.add(o)
  }
  return f
}

/* glow sprite */
let GLOW: THREE.CanvasTexture | null = null
function glowTex(): THREE.CanvasTexture {
  if (GLOW) return GLOW
  const cv = document.createElement("canvas")
  cv.width = cv.height = 128
  const x = cv.getContext("2d")!
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 62)
  g.addColorStop(0, "rgba(255,255,255,1)") // tight hot spot
  g.addColorStop(0.1, "rgba(255,255,255,1)")
  g.addColorStop(0.17, "rgba(255,255,255,.58)") // exponential-ish falloff
  g.addColorStop(0.28, "rgba(255,255,255,.30)")
  g.addColorStop(0.45, "rgba(255,255,255,.14)")
  g.addColorStop(0.65, "rgba(255,255,255,.055)")
  g.addColorStop(0.85, "rgba(255,255,255,.015)")
  g.addColorStop(1, "rgba(255,255,255,0)")
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  GLOW = new THREE.CanvasTexture(cv)
  return GLOW
}
function glowSprite(color: number, s: number, o = 0.8): THREE.Sprite {
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex(),
      color,
      transparent: true,
      opacity: o,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  sp.scale.setScalar(s)
  return sp
}

/* soft contact-shadow blob */
let SHADOWTEX: THREE.CanvasTexture | null = null
function shadowTex(): THREE.CanvasTexture {
  if (SHADOWTEX) return SHADOWTEX
  const cv = document.createElement("canvas")
  cv.width = cv.height = 128
  const x = cv.getContext("2d")!
  const g = x.createRadialGradient(64, 64, 6, 64, 64, 62)
  g.addColorStop(0, "rgba(0,0,0,0.6)")
  g.addColorStop(0.45, "rgba(0,0,0,0.34)")
  g.addColorStop(0.78, "rgba(0,0,0,0.1)")
  g.addColorStop(1, "rgba(0,0,0,0)")
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  SHADOWTEX = new THREE.CanvasTexture(cv)
  return SHADOWTEX
}
function softShadow(
  parent: THREE.Object3D,
  size = 3.2,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, opacity: 0.32, depthWrite: false }),
  )
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.02
  parent.add(m)
  return m
}

/* mouth shapes + named expressions */
type MouthShape = "smile" | "grin" | "open" | "flat" | "tiny"
export type ExpressionName =
  | "happy"
  | "excited"
  | "thinking"
  | "alert"
  | "proud"
  | "celebrate"

/* per-frame cues (set code writes, update consumes+decays) */
type Cue = {
  y: number
  squash: number
  earL: number
  earR: number
  eyes: number
  excite: number
  lean: number
  face: number | null
  spin: number
}

/* ─────────────────────────────── the Bot rig ─────────────────────────────── */
class Bot {
  g: THREE.Group
  torso: THREE.Group
  pivot: THREE.Group
  legs: THREE.Group[]
  earL: THREE.Group
  earR: THREE.Group
  eyeG: THREE.Group
  core: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>
  coreGlow: THREE.Sprite
  tip: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>
  tipGlow: THREE.Sprite
  shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  mouth: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  mouthTex: THREE.CanvasTexture
  private mouthCtx: CanvasRenderingContext2D
  private mouthShape: MouthShape | null = null
  baseScale: number
  tx = 0
  tz = 0
  prevX = 0
  prevZ = 0
  // Resting yaw ≈ 0 faces the camera (+Z side holds the visor/eyes/core; the
  // camera sits on +Z). +0.22 rad adds a slight turn toward screen-center so a
  // bottom-left-parked agent reads as peeking around the corner.
  springHead = 0.22
  headV = 0
  gait = 0
  sSpeed = 0
  prevSpeed = 0
  fwdAccS = 0
  earLag = 0
  moveBlend = 0
  groundY = 0
  blinkOff: number
  cue: Cue

  constructor(parent: THREE.Object3D, color: number, scale = 1.7) {
    const g = new THREE.Group()
    const EYE = 0x171310,
      OLB = 0.11,
      INK = 0x1b2129,
      VISOR = 0x10151c
    const shade = (c: number, f: number) => new THREE.Color(c).multiplyScalar(f).getHex()
    const torso = new THREE.Group()
    g.add(torso)
    /* legs — dark hip joint, colored limb, dark boot */
    this.legs = []
    ;[-0.3, -0.1, 0.1, 0.3].forEach((x) => {
      const lg = new THREE.Group()
      lg.position.set(x, 0.26, 0)
      obox(lg, 0.16, 0.06, 0.16, INK, 0, 0, 0, 0, false)
      obox(lg, 0.13, 0.26, 0.4, color, 0, -0.13, 0, 0, true, OUTLINE, OLB)
      obox(lg, 0.16, 0.08, 0.43, 0x232a36, 0, -0.25, 0.01, 0, true, OUTLINE, 0.06)
      g.add(lg)
      this.legs.push(lg)
    })
    /* body mass — base band → core block → crown cap (tapered helmet silhouette) */
    obox(torso, 0.96, 0.14, 0.54, shade(color, 0.72), 0, 0.31, 0, 0, true, OUTLINE, 0.07)
    obox(torso, 0.9, 0.6, 0.5, color, 0, 0.62, 0, 0, true, OUTLINE, OLB)
    obox(torso, 0.98, 0.14, 0.56, shade(color, 0.86), 0, 0.93, 0, 0, true, OUTLINE, 0.08)
    /* integrated dark visor, panel seams framing it, back vents */
    obox(torso, 0.66, 0.32, 0.05, VISOR, 0, 0.66, 0.24, 0, true, OUTLINE, 0.045)
    obox(torso, 0.02, 0.42, 0.012, shade(color, 0.6), -0.39, 0.64, 0.252, 0, false)
    obox(torso, 0.02, 0.42, 0.012, shade(color, 0.6), 0.39, 0.64, 0.252, 0, false)
    ;[0.74, 0.64, 0.54].forEach((vy) => obox(torso, 0.3, 0.045, 0.02, INK, 0, vy, -0.252, 0, false))
    /* chest core light */
    obox(torso, 0.2, 0.18, 0.03, VISOR, 0, 0.4, 0.252, 0, false)
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.04),
      new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.95 }),
    )
    core.position.set(0, 0.4, 0.272)
    torso.add(core)
    const coreGlow = glowSprite(GREEN, 0.32, 0.35)
    coreGlow.position.set(0, 0.4, 0.3)
    torso.add(coreGlow)
    this.core = core
    this.coreGlow = coreGlow
    /* ears — colored fin + darker outer inset */
    this.earL = new THREE.Group()
    this.earL.position.set(-0.53, 0.64, 0)
    obox(this.earL, 0.11, 0.3, 0.34, color, 0, 0, 0, 0, true, OUTLINE, OLB)
    obox(this.earL, 0.03, 0.18, 0.22, shade(color, 0.6), -0.05, 0, 0, 0, false)
    torso.add(this.earL)
    this.earR = new THREE.Group()
    this.earR.position.set(0.53, 0.64, 0)
    obox(this.earR, 0.11, 0.3, 0.34, color, 0, 0, 0, 0, true, OUTLINE, OLB)
    obox(this.earR, 0.03, 0.18, 0.22, shade(color, 0.6), 0.05, 0, 0, 0, false)
    torso.add(this.earR)
    /* eyes — bright blocks glowing inside the visor */
    this.eyeG = new THREE.Group()
    this.eyeG.position.set(0, 0.66, 0.271)
    torso.add(this.eyeG)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf2f7ff })
    ;[-0.185, 0.185].forEach((ex) => {
      // slightly larger + pushed a touch forward so the eyes read clearly
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.2, 0.02), eyeMat)
      e.position.set(ex, 0, 0.02)
      this.eyeG.add(e)
      const eg = glowSprite(0x9fd0ff, 0.32, 0.42)
      eg.position.set(ex, 0, 0.04)
      this.eyeG.add(eg)
    })
    /* mouth — canvas-textured plane on the visor, redrawn per expression
       (same pattern as the demo's board(): <canvas> → CanvasTexture → redraw) */
    const mCv = document.createElement("canvas")
    mCv.width = 128
    mCv.height = 64
    this.mouthCtx = mCv.getContext("2d")!
    this.mouthTex = new THREE.CanvasTexture(mCv)
    this.mouth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.12),
      new THREE.MeshBasicMaterial({
        map: this.mouthTex,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.mouth.position.set(0, 0.52, 0.272)
    torso.add(this.mouth)
    this.setMouth("smile")
    /* antenna — collar, mast, lit tip */
    obox(torso, 0.1, 0.035, 0.1, shade(color, 0.86), 0, 1.0, 0, 0, false)
    obox(torso, 0.05, 0.22, 0.05, EYE, 0, 1.06, 0, 0, false)
    this.tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.11, 0.11),
      new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.9 }),
    )
    this.tip.position.set(0, 1.17, 0)
    torso.add(this.tip)
    this.tipGlow = glowSprite(GREEN, 0.55, 0.5)
    this.tipGlow.position.copy(this.tip.position)
    torso.add(this.tipGlow)

    /* ── lab coat — an OPEN white coat worn over the lower torso. Two front
       panels wrap the sides/back and leave a center-front gap (x ∈ ~[−0.07,
       0.07]) so the green chest core shows between them; small rz-tilted lapels
       form a V at the top of the opening. Everything on the front face stays at
       y ≤ ~0.51 so the mouth (y0.52) / visor (y0.66) remain fully visible; only
       the shoulder yokes at the far sides (x≈±0.41) rise above that line. ── */
    const COAT = 0xeceff5 // coat white
    const SEAM = 0xdbe2ec // light grey — inner-edge seams / shadow
    const STITCH = 0x9fb0c4 // mid grey — pocket stitching, buttons
    /* front panels — wrap side+back, inner edges at x ±0.07 (core gap) */
    obox(torso, 0.42, 0.42, 0.58, COAT, -0.28, 0.29, 0, 0, true, OUTLINE, 0.05)
    obox(torso, 0.42, 0.42, 0.58, COAT, 0.28, 0.29, 0, 0, true, OUTLINE, 0.05)
    /* inner-edge seams — slightly darker strips so the opening reads */
    obox(torso, 0.035, 0.4, 0.015, SEAM, -0.09, 0.29, 0.295, 0, false)
    obox(torso, 0.035, 0.4, 0.015, SEAM, 0.09, 0.29, 0.295, 0, false)
    /* lapels — tilted outward to a V; tops at y≈0.50, below the mouth line */
    obox(torso, 0.09, 0.18, 0.03, COAT, -0.135, 0.4, 0.3, 0.42, true, OUTLINE, 0.03)
    obox(torso, 0.09, 0.18, 0.03, COAT, 0.135, 0.4, 0.3, -0.42, true, OUTLINE, 0.03)
    /* shoulder yokes — over the shoulder tops at the far sides, clear of the
       visor (which ends at x ±0.33) */
    obox(torso, 0.16, 0.1, 0.54, COAT, -0.41, 0.57, 0, 0, true, OUTLINE, 0.04)
    obox(torso, 0.16, 0.1, 0.54, COAT, 0.41, 0.57, 0, 0, true, OUTLINE, 0.04)
    /* waist flare — slightly wider hem band, split to keep the opening */
    obox(torso, 0.46, 0.09, 0.62, COAT, -0.28, 0.12, 0, 0, true, OUTLINE, 0.045)
    obox(torso, 0.46, 0.09, 0.62, COAT, 0.28, 0.12, 0, 0, true, OUTLINE, 0.045)
    /* breast pocket + stitched hem line + green pen (on its right panel) */
    obox(torso, 0.16, 0.13, 0.02, COAT, -0.29, 0.28, 0.3, 0, true, OUTLINE, 0.025)
    obox(torso, 0.16, 0.02, 0.012, STITCH, -0.29, 0.335, 0.312, 0, false)
    obox(torso, 0.025, 0.09, 0.02, GREEN, -0.25, 0.36, 0.305, 0, false)
    /* buttons down the left panel's placket */
    obox(torso, 0.05, 0.05, 0.02, STITCH, 0.11, 0.34, 0.3, 0, false)
    obox(torso, 0.05, 0.05, 0.02, STITCH, 0.11, 0.21, 0.3, 0, false)

    this.torso = torso
    this.g = g
    this.baseScale = scale
    g.scale.setScalar(scale)
    this.pivot = new THREE.Group()
    this.pivot.add(g)
    parent.add(this.pivot)
    /* shadow — soft radial blob, shrinks + fades as the bot lifts off */
    this.shadow = softShadow(parent)
    /* locomotion state */
    this.blinkOff = Math.random() * 3
    this.cue = { y: 0, squash: 0, earL: 0, earR: 0, eyes: 1, excite: 0, lean: 0, face: null, spin: 0 }
  }

  setPos(x: number, z: number) {
    this.tx = x
    this.tz = z
  }

  /* redraw the mouth canvas for a shape (no-op if unchanged) */
  setMouth(shape: MouthShape) {
    if (shape === this.mouthShape) return
    this.mouthShape = shape
    const x = this.mouthCtx
    x.clearRect(0, 0, 128, 64)
    x.strokeStyle = "#f2f7ff"
    x.fillStyle = "#f2f7ff"
    x.lineWidth = 9
    x.lineCap = "round"
    x.beginPath()
    if (shape === "smile") {
      // upward arc — corners up, middle down (canvas y grows downward)
      x.arc(64, 4, 34, 0.28 * Math.PI, 0.72 * Math.PI)
      x.stroke()
    } else if (shape === "grin") {
      // bigger arc, closed + filled = slightly open grin
      x.arc(64, 0, 42, 0.24 * Math.PI, 0.76 * Math.PI)
      x.closePath()
      x.fill()
      x.stroke()
    } else if (shape === "open") {
      // small filled "o" — surprised
      x.ellipse(64, 30, 13, 17, 0, 0, Math.PI * 2)
      x.fill()
    } else if (shape === "flat") {
      x.moveTo(46, 30)
      x.lineTo(82, 30)
      x.stroke()
    } else {
      // tiny — short pondering line
      x.moveTo(58, 32)
      x.lineTo(69, 32)
      x.stroke()
    }
    this.mouthTex.needsUpdate = true
  }

  update(t: number, dt: number) {
    const sm = (b: number) => 1 - Math.pow(1 - b, dt * 60),
      c = this.cue
    this.pivot.position.x = this.tx
    this.pivot.position.z = this.tz
    const dtc = Math.max(dt, 1e-4)
    const ivx = (this.tx - this.prevX) / dtc,
      ivz = (this.tz - this.prevZ) / dtc
    this.prevX = this.tx
    this.prevZ = this.tz
    const speed = Math.hypot(ivx, ivz)
    this.sSpeed = lerp(this.sSpeed, speed, sm(0.2))
    this.fwdAccS = lerp(this.fwdAccS, (this.sSpeed - this.prevSpeed) / dtc, sm(0.12))
    this.prevSpeed = this.sSpeed
    const moving = speed > 0.05
    let headTgt = this.springHead
    if (moving) headTgt = Math.atan2(ivx, ivz)
    else if (c.face != null) headTgt = c.face
    const hd = Math.atan2(Math.sin(headTgt - this.springHead), Math.cos(headTgt - this.springHead))
    this.headV += (hd * 46 - this.headV * 9.5) * dt
    this.springHead += this.headV * dt
    this.pivot.rotation.y = this.springHead + c.spin
    this.moveBlend = lerp(this.moveBlend, moving ? 1 : 0, sm(0.12))
    this.gait += this.sSpeed * dt * 2.1
    const gs = Math.sin(this.gait)
    const hop =
      Math.abs(gs) * 0.3 * this.moveBlend + Math.sin(t * 2 + this.blinkOff) * 0.045 * (1 - this.moveBlend)
    this.g.position.y = this.groundY + hop + c.y
    this.legs.forEach((lg, i) => {
      lg.rotation.x = Math.sin(this.gait + (i % 2) * Math.PI) * 0.58 * this.moveBlend
    })
    this.torso.rotation.x =
      clampN(0.03 + this.sSpeed * 0.022 + this.fwdAccS * 0.006, 0.3) * this.moveBlend +
      (1 - this.moveBlend) * 0.01 +
      c.lean
    this.torso.rotation.z = clampN(-this.headV * 0.05, 0.13)
    this.earLag = lerp(this.earLag, clampN(this.headV * 0.09, 0.5), sm(0.09))
    this.earL.rotation.z =
      0.13 * gs * this.moveBlend + 0.03 * Math.sin(t * 1.7 + this.blinkOff) + this.earLag + c.earL
    this.earR.rotation.z =
      -0.13 * gs * this.moveBlend - 0.03 * Math.sin(t * 1.7 + this.blinkOff) + this.earLag + c.earR
    const bc = (t + this.blinkOff) % 3.4,
      blink = bc < 0.13 ? Math.sin((bc / 0.13) * Math.PI) : 0
    this.eyeG.scale.y = (1 - 0.85 * blink) * c.eyes
    this.eyeG.position.x = clampN(-this.headV * 0.02, 0.06)
    const tipP = 1 + (0.15 + c.excite * 0.4) * Math.sin(t * (3.2 + c.excite * 6))
    this.tip.scale.setScalar(tipP)
    this.tipGlow.scale.setScalar(0.55 * tipP * (1 + c.excite * 0.7))
    this.tipGlow.material.opacity = 0.44 + 0.55 * (tipP - 1)
    const corePulse = 0.5 + 0.5 * Math.sin(t * 2.6 + this.blinkOff)
    this.coreGlow.material.opacity = 0.26 + 0.16 * corePulse
    this.core.material.opacity = 0.82 + 0.14 * corePulse
    const strideSS = 1 + 0.07 * -Math.cos(this.gait * 2) * this.moveBlend
    const sy = strideSS * (1 - c.squash)
    const sxz = (2 - strideSS) * (1 + c.squash * 0.9)
    const breath = 1 + 0.012 * Math.sin(t * 2.1 + this.blinkOff) * (1 - this.moveBlend)
    this.g.scale.set(
      this.baseScale * sxz * breath,
      this.baseScale * sy * breath,
      this.baseScale * (1 + 0.05 * this.moveBlend),
    )
    /* shadow */
    this.shadow.position.x = this.tx
    this.shadow.position.z = this.tz
    const lift = Math.max(0, this.g.position.y - this.groundY)
    this.shadow.scale.setScalar(Math.max(0.45, 1 - Math.min(0.4, lift * 0.3)))
    this.shadow.material.opacity = 0.32 - Math.min(0.16, lift * 0.12)
    /* reset cues */
    c.y = 0
    c.squash = 0
    c.earL = 0
    c.earR = 0
    c.eyes = 1
    c.excite = 0
    c.lean = 0
    c.face = null
    c.spin = 0
  }

  worldPos(): THREE.Vector3 {
    const v = new THREE.Vector3()
    this.pivot.getWorldPosition(v)
    return v
  }
}

/* ───────────────────────────── public factory ────────────────────────────── */
export type TalosAgentHandle = {
  hop: () => void
  setExpression: (name: ExpressionName) => void
  dispose: () => void
}

export function createTalosAgent(canvas: HTMLCanvasElement): TalosAgentHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  // Transparent scene — no background, no fog; the page shows through.
  const scene = new THREE.Scene()

  // Framed to fit the WHOLE agent (head-to-toe, ears + antenna included)
  // with generous margin so nothing is clipped by the canvas edges.
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50)
  camera.position.set(0, 1.15, 4.8)
  camera.lookAt(0, 0.9, 0)

  /* lights — warm key, cool hemi, blue rim (Talos studio look) */
  scene.add(new THREE.AmbientLight(0xf4f0e8, 0.4))
  scene.add(new THREE.HemisphereLight(0xbdd8f0, 0x1d2430, 0.45))
  const kl = new THREE.DirectionalLight(0xffe9c8, 1.5)
  kl.position.set(10, 20, 12)
  scene.add(kl)
  const rim = new THREE.DirectionalLight(0x3b9eff, 0.35)
  rim.position.set(-14, 9, -10)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0x8ab6ff, 0.14)
  fill.position.set(0, -6, 9)
  scene.add(fill)

  const bot = new Bot(scene, CORAL)
  bot.setPos(0, 0)

  const size = () => {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  size()
  const ro = new ResizeObserver(size)
  ro.observe(canvas)

  // Hop cue — a short decaying arc fed into bot.cue each frame (cues reset on
  // every update, so we re-drive them until the hop envelope runs out).
  const HOP_DUR = 0.55
  let hopT = -1 // remaining time; <0 = inactive

  /* ── expression system — layers on TOP of the base idle (blink, ear sway,
     breath, pulses all stay). Cues are written every frame before update();
     eye/core tweaks that update() would overwrite are applied after it. ── */
  let expr: ExpressionName = "happy"

  const applyExpressionCues = (t: number) => {
    const c = bot.cue
    switch (expr) {
      case "happy": // calm friendly default — gentle extra bob
        bot.setMouth("smile")
        c.y += 0.012 * Math.sin(t * 2.3)
        break
      case "excited": // "feed me!" — grin, antenna flare, eager bouncing
        bot.setMouth("grin")
        c.excite = Math.max(c.excite, 0.95)
        c.y += 0.05 * Math.abs(Math.sin(t * 4.6))
        c.earL += 0.14
        c.earR -= 0.14
        break
      case "thinking": // pondering — tiny mouth, head dipped, ears cocked
        bot.setMouth("tiny")
        c.lean += 0.06
        c.earL += 0.09
        c.earR += 0.03
        break
      case "alert": // attentive/serious — stiffen back, antenna flicker
        bot.setMouth("open")
        c.lean -= 0.09
        c.excite = Math.max(c.excite, 0.35 + 0.65 * Math.abs(Math.sin(t * 8.5)))
        break
      case "proud": // confident — chin up, steady antenna glow
        bot.setMouth("smile")
        c.lean -= 0.07
        c.excite = Math.max(c.excite, 0.25)
        break
      case "celebrate": // outro — repeated hops, antenna flare, waggling ears
        bot.setMouth("grin")
        c.excite = Math.max(c.excite, 1)
        c.y += 0.16 * Math.abs(Math.sin(t * 4.2))
        c.earL += 0.1 * Math.sin(t * 6)
        c.earR -= 0.1 * Math.sin(t * 6)
        break
    }
  }

  const applyExpressionFace = () => {
    // update() just wrote eyeG.scale.y from blink×cue — multiply so the blink
    // still fully closes the eyes; scale.x / position.y aren't touched by it.
    const eg = bot.eyeG
    let sx = 1
    let syMul = 1
    let ey = 0
    if (expr === "excited") {
      sx = 1.15
      syMul = 1.1 // slightly wide
    } else if (expr === "thinking") {
      syMul = 0.78 // squint
      ey = 0.02 // eyes drift up — pondering
    } else if (expr === "alert") {
      sx = 1.3
      syMul = 1.3 // WIDE and round
    } else if (expr === "celebrate") {
      syMul = 0.55 // happy squint
      ey = 0.015
    }
    eg.scale.x = sx
    eg.scale.y *= syMul
    // eyeG's base height is 0.66 (set in the constructor); ey is a small
    // expression offset. Must add to the base — assigning ey alone teleports
    // the eyes down into the body (they vanish from the visor).
    eg.position.y = 0.66 + ey
    if (expr === "proud") {
      // chest core brighter (update() sets base opacity every frame)
      bot.core.material.opacity = Math.min(1, bot.core.material.opacity + 0.18)
      bot.coreGlow.material.opacity = Math.min(1, bot.coreGlow.material.opacity + 0.14)
    }
  }

  let raf = 0
  let disposed = false
  let last: number | null = null
  let elapsed = 0
  const loop = (now: number) => {
    if (disposed) return
    if (last == null) last = now
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    elapsed += dt
    if (hopT > 0) {
      const p = 1 - hopT / HOP_DUR // 0→1 over the hop
      bot.cue.y = 0.35 * Math.sin(p * Math.PI) // rise + land
      bot.cue.squash = p > 0.85 ? 0.12 * Math.sin(((p - 0.85) / 0.15) * Math.PI) : 0
      bot.cue.excite = 1 - p
      hopT -= dt
    }
    applyExpressionCues(elapsed)
    bot.update(elapsed, dt)
    applyExpressionFace()
    renderer.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return {
    hop() {
      if (!disposed) hopT = HOP_DUR
    },
    setExpression(name: ExpressionName) {
      expr = name
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      // The traverse below reaches the mouth too (it's a torso child): its
      // PlaneGeometry, MeshBasicMaterial and CanvasTexture map all get disposed.
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const m = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material
        const mats = Array.isArray(m) ? m : m ? [m] : []
        mats.forEach((mm) => {
          const anyM = mm as THREE.Material & {
            map?: THREE.Texture | null
            gradientMap?: THREE.Texture | null
          }
          anyM.map?.dispose()
          anyM.gradientMap?.dispose()
          mm.dispose()
        })
      })
      renderer.dispose()
      // Rebuild the shared texture caches fresh on the next open (RUN ONBOARDING
      // reopens the tour) rather than relying on re-upload of a disposed texture.
      GMAP = GLOW = SHADOWTEX = null
    },
  }
}
