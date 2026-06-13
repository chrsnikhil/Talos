/** Monochrome signature divider — the two agents flanking a hairline. */
export function SignatureDivider() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-10" aria-hidden="true">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="font-mono text-xs tracking-widest">ΙΚΑΡΟΣ</span>
        <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0" />
        <span className="flex-1 h-px bg-foreground/10" />
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/40 whitespace-nowrap">
          two agents · zero trust
        </span>
        <span className="flex-1 h-px bg-foreground/10" />
        <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0" />
        <span className="font-mono text-xs tracking-widest">ΔΑΙΔΑΛΟΣ</span>
      </div>
    </div>
  )
}
