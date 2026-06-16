export function BlinkDot({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 bg-[var(--accent-color)] animate-blink ${className}`}
    />
  )
}
