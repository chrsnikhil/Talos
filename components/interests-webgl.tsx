"use client"

import { useRef, useState, useEffect, forwardRef, useImperativeHandle, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { toPng } from "html-to-image"
import { FaCode, FaEthereum, FaVideo, FaDumbbell, FaGamepad, FaBookOpen } from "react-icons/fa"
import { ChevronLeft, ChevronRight } from "lucide-react"

const interests = [
  { icon: FaEthereum, title: "Web3 & DeFi", description: "Exploring decentralized protocols, smart contracts, and the future of finance on-chain.", accent: "#25408F", sfx: "WHOA!" },
  { icon: FaCode, title: "Open Source", description: "Contributing to and building tools that empower the developer community worldwide.", accent: "#25408F", sfx: "FORK!" },
  { icon: FaVideo, title: "Content Creation", description: "Editing dynamic recaps and promo videos that capture the energy of hackathons and tech events.", accent: "#25408F", sfx: "CUT!" },
  { icon: FaDumbbell, title: "Fitness", description: "Discipline in the gym fuels clarity in code. Consistent training transformed my lifestyle and focus.", accent: "#D9251D", sfx: "PUMP!" },
  { icon: FaGamepad, title: "Gaming", description: "Competitive gaming sharpens strategy and reaction time — skills that translate directly to problem-solving.", accent: "#25408F", sfx: "GG!" },
  { icon: FaBookOpen, title: "Continuous Learning", description: "Always picking up new frameworks, languages, and paradigms to stay ahead of the curve.", accent: "#25408F", sfx: "LEVEL UP!" },
]

const PX_W = 480
const PX_H = 640
const PLANE_W = 1
const PLANE_H = PX_H / PX_W // 1.333
const TOTAL = interests.length + 1

// ── HTML page designs (rendered hidden, captured to textures) ──────────────
function CoverDesign() {
  return (
    <div style={{ width: PX_W, height: PX_H, background: "#25408F", position: "relative", overflow: "hidden", fontFamily: "var(--t-font-body)" }}>
      <div className="comic-halftone" style={{ position: "absolute", inset: 0, color: "#FBF9F4", opacity: 0.12 }} />
      <div style={{ position: "absolute", inset: 10, border: "2px solid rgba(251,249,244,0.55)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.3em", color: "rgba(251,249,244,0.7)", textTransform: "uppercase", marginBottom: 12 }}>Issue № 1</div>
        <div className="vl-display" style={{ fontSize: 78, lineHeight: 0.82, color: "#fff" }}>Interests</div>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.22em", color: "rgba(251,249,244,0.85)", textTransform: "uppercase", marginTop: 12 }}>Off the Court</div>
        <img src="/patch.png" alt="" crossOrigin="anonymous" style={{ width: 90, height: 90, marginTop: 28, borderRadius: "9999px", border: "2px solid #FBF9F4" }} />
      </div>
    </div>
  )
}

function InterestDesign({ it, num }: { it: (typeof interests)[number]; num: number }) {
  const Icon = it.icon
  return (
    <div style={{ width: PX_W, height: PX_H, background: "#FFFFFF", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "var(--t-font-body)" }}>
      <div style={{ position: "absolute", inset: 10, border: "2px solid #101820", zIndex: 6, pointerEvents: "none" }} />
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "3px solid #101820", overflow: "hidden" }}>
        <div className="comic-halftone" style={{ position: "absolute", inset: 0, color: it.accent, opacity: 0.22 }} />
        <div className="comic-burst" style={{ position: "absolute", inset: 0 }} />
        <Icon style={{ width: 120, height: 120, color: it.accent, position: "relative" }} />
        <div style={{ position: "absolute", top: 14, left: 14, padding: "2px 8px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: "#fff", border: "2px solid #101820", color: "#101820" }}>
          № {String(num).padStart(2, "0")}
        </div>
        <span className="vl-display" style={{ position: "absolute", bottom: 14, right: 14, fontSize: 22, padding: "2px 10px", color: "#fff", background: it.accent, border: "2px solid #101820", boxShadow: "3px 3px 0 0 #101820", transform: "rotate(-5deg)" }}>
          {it.sfx}
        </span>
      </div>
      <div style={{ padding: 26 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#101820", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: it.accent, border: "2px solid #101820", transform: "rotate(45deg)", display: "inline-block" }} />
          {it.title}
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.5, color: "#4A4F57" }}>{it.description}</div>
        <div style={{ marginTop: 18, fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#4A4F57" }}>{num} / {interests.length}</div>
      </div>
    </div>
  )
}

// ── Curl shader ────────────────────────────────────────────────────────────
const VERT = /* glsl */ `
  uniform float uFlip;
  uniform float uW;
  varying vec2 vUv;
  varying float vShade;
  const float PI = 3.141592653589793;
  void main() {
    vUv = uv;
    float d = position.x + uW * 0.5;          // 0 at spine (left), uW at right
    float angle = uFlip * PI;                  // 0 .. PI
    float c = cos(angle), s = sin(angle);
    float curl = sin(uFlip * PI) * 0.16 * sin((d / uW) * PI);
    vec3 p;
    p.x = -uW * 0.5 + d * c;
    p.z = -d * s + curl;
    p.y = position.y;
    vShade = clamp(1.0 - 0.4 * sin(uFlip * PI), 0.55, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`
const FRAG = /* glsl */ `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vec4 col = gl_FrontFacing ? texture2D(uFront, vUv) : texture2D(uBack, vec2(1.0 - vUv.x, vUv.y));
    col.rgb *= vShade;
    gl_FragColor = col;
  }
`

function makeMat(front: THREE.Texture, back: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { uFlip: { value: 0 }, uW: { value: PLANE_W }, uFront: { value: front }, uBack: { value: back } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
  })
}

type Flip = { dir: "next" | "prev"; leaf: number; beneath: number; target: number } | null

const Book = forwardRef<{ next: () => void; prev: () => void }, { textures: THREE.Texture[]; onPage: (p: number) => void }>(
  function Book({ textures, onPage }, ref) {
    const [current, setCurrent] = useState(0)
    const flipRef = useRef<Flip>(null)
    const progRef = useRef(0)
    const leafMat = useRef<THREE.ShaderMaterial | null>(null)
    const [, force] = useState(0)

    const paper = useMemo(() => {
      const c = document.createElement("canvas"); c.width = c.height = 4
      const ctx = c.getContext("2d")!; ctx.fillStyle = "#efece4"; ctx.fillRect(0, 0, 4, 4)
      const t = new THREE.CanvasTexture(c); return t
    }, [])

    useImperativeHandle(ref, () => ({
      next() {
        if (flipRef.current || current >= TOTAL - 1) return
        progRef.current = 0
        flipRef.current = { dir: "next", leaf: current, beneath: current + 1, target: 1 }
        leafMat.current = makeMat(textures[current], paper)
        force((n) => n + 1)
      },
      prev() {
        if (flipRef.current || current <= 0) return
        progRef.current = 1
        flipRef.current = { dir: "prev", leaf: current - 1, beneath: current, target: 0 }
        leafMat.current = makeMat(textures[current - 1], paper)
        force((n) => n + 1)
      },
    }))

    useFrame((_, dt) => {
      const f = flipRef.current
      if (!f || !leafMat.current) return
      const speed = 1.7
      progRef.current += (f.target - progRef.current) * Math.min(1, dt * speed * 2)
      if (Math.abs(f.target - progRef.current) < 0.012) {
        const committed = f.dir === "next" ? current + 1 : current - 1
        flipRef.current = null
        leafMat.current = null
        setCurrent(committed)
        onPage(committed)
        return
      }
      leafMat.current.uniforms.uFlip.value = progRef.current
    })

    const f = flipRef.current
    const beneathTex = f ? textures[f.beneath] : null
    const baseTex = textures[current]

    return (
      <>
        <ambientLight intensity={1} />
        {/* base / beneath page (flat) */}
        {f ? (
          <mesh position={[0, 0, -0.002]}>
            <planeGeometry args={[PLANE_W, PLANE_H, 1, 1]} />
            <meshBasicMaterial map={beneathTex!} toneMapped={false} />
          </mesh>
        ) : (
          <mesh>
            <planeGeometry args={[PLANE_W, PLANE_H, 1, 1]} />
            <meshBasicMaterial map={baseTex} toneMapped={false} />
          </mesh>
        )}
        {/* curl leaf */}
        {f && leafMat.current && (
          <mesh material={leafMat.current}>
            <planeGeometry args={[PLANE_W, PLANE_H, 48, 1]} />
          </mesh>
        )}
      </>
    )
  }
)

export default function InterestsWebGL() {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [textures, setTextures] = useState<THREE.Texture[] | null>(null)
  const [page, setPage] = useState(0)
  const bookRef = useRef<{ next: () => void; prev: () => void }>(null)

  useEffect(() => {
    let cancelled = false
    async function capture() {
      try {
        if (document.fonts?.ready) await document.fonts.ready
        await new Promise((r) => setTimeout(r, 120))
        const txs: THREE.Texture[] = []
        for (const el of refs.current) {
          if (!el) continue
          const dataUrl = await toPng(el, { pixelRatio: 2, width: PX_W, height: PX_H, cacheBust: true })
          const tex = await new Promise<THREE.Texture>((res) => {
            const img = new Image()
            img.onload = () => {
              const t = new THREE.Texture(img)
              t.colorSpace = THREE.SRGBColorSpace
              t.anisotropy = 8
              t.needsUpdate = true
              res(t)
            }
            img.src = dataUrl
          })
          txs.push(tex)
        }
        if (!cancelled) setTextures(txs)
      } catch (e) {
        console.error("page capture failed", e)
      }
    }
    capture()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-col items-center">
      {/* hidden capture source */}
      <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none", opacity: 0 }}>
        <div ref={(el) => { refs.current[0] = el }}><CoverDesign /></div>
        {interests.map((it, i) => (
          <div key={it.title} ref={(el) => { refs.current[i + 1] = el }}>
            <InterestDesign it={it} num={i + 1} />
          </div>
        ))}
      </div>

      {/* WebGL book */}
      <div className="w-full max-w-[440px] mx-auto" style={{ aspectRatio: `${PX_W} / ${PX_H}` }}>
        {textures ? (
          <Canvas camera={{ fov: 38, position: [0, 0, 2.35] }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
            <Book ref={bookRef} textures={textures} onPage={setPage} />
          </Canvas>
        ) : (
          <div className="w-full h-full" style={{ border: "3px solid var(--t-ink)", background: "var(--t-bg-card)" }} />
        )}
      </div>

      {/* controls */}
      <div className="flex items-center gap-5 mt-8">
        <button
          onClick={() => bookRef.current?.prev()}
          disabled={page === 0}
          aria-label="Previous page"
          className="vl-btn flex items-center justify-center w-12 h-12 disabled:opacity-35 disabled:pointer-events-none"
          style={{ background: "var(--t-bg-card)", color: "var(--t-ink)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-extrabold uppercase tracking-[0.2em] min-w-[80px] text-center" style={{ fontFamily: "var(--t-font-mono)", color: "var(--t-ink)" }}>
          {page === 0 ? "Cover" : `${page} / ${interests.length}`}
        </span>
        <button
          onClick={() => bookRef.current?.next()}
          disabled={page === TOTAL - 1}
          aria-label="Next page"
          className="vl-btn flex items-center justify-center w-12 h-12 disabled:opacity-35 disabled:pointer-events-none text-white"
          style={{ background: "var(--t-red)", borderColor: "var(--t-ink)" }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
