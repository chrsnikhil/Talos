// Hand-drawn-style SVG shapes used as floating decorations across sections.
// All take a className so size/color/animation are controlled by the caller.

interface DoodleProps {
  className?: string
  style?: React.CSSProperties
}

export function StarDoodle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M24 2 L29 19 L46 24 L29 29 L24 46 L19 29 L2 24 L19 19 Z"
        fill="currentColor"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SparkleDoodle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M20 4 C21 13 27 19 36 20 C27 21 21 27 20 36 C19 27 13 21 4 20 C13 19 19 13 20 4 Z"
        fill="currentColor"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SquiggleDoodle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 80 24" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M3 12 C10 2 16 2 23 12 C30 22 36 22 43 12 C50 2 56 2 63 12 C70 22 76 22 77 18"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function RingDoodle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="6" />
    </svg>
  )
}

export function ArrowDoodle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M8 8 C20 36 32 46 54 50 M54 50 L40 50 M54 50 L52 36"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BoltDoodle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 32 48" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M18 2 L4 28 L14 28 L11 46 L28 18 L17 18 Z"
        fill="currentColor"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
