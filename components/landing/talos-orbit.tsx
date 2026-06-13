/**
 * Talos signature mark — two nodes (Icarus + Daedalus) orbiting concentric rings.
 * Pure static SVG with a cheap GPU transform spin (no per-frame canvas work),
 * so it's effectively free vs. the old ASCII canvas shapes.
 */
export function TalosOrbit({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      {/* concentric rings */}
      <circle cx="100" cy="100" r="94" strokeOpacity="0.1" />
      <circle cx="100" cy="100" r="66" strokeOpacity="0.16" />
      <circle cx="100" cy="100" r="38" strokeOpacity="0.24" />

      {/* faint orbit guide ticks */}
      <line x1="100" y1="2" x2="100" y2="14" strokeOpacity="0.12" />
      <line x1="100" y1="186" x2="100" y2="198" strokeOpacity="0.12" />
      <line x1="2" y1="100" x2="14" y2="100" strokeOpacity="0.12" />
      <line x1="186" y1="100" x2="198" y2="100" strokeOpacity="0.12" />

      {/* core */}
      <circle cx="100" cy="100" r="3" fill="currentColor" stroke="none" fillOpacity="0.45" />

      {/* Icarus — outer node */}
      <g className="motion-safe:animate-[spin_38s_linear_infinite]" style={{ transformOrigin: "100px 100px" }}>
        <circle cx="100" cy="6" r="5" fill="currentColor" stroke="none" />
        <circle cx="100" cy="6" r="10" strokeOpacity="0.25" />
      </g>

      {/* Daedalus — inner node, counter-orbit */}
      <g className="motion-safe:animate-[spin_24s_linear_infinite_reverse]" style={{ transformOrigin: "100px 100px" }}>
        <circle cx="100" cy="34" r="4" fill="currentColor" stroke="none" fillOpacity="0.7" />
      </g>
    </svg>
  )
}
