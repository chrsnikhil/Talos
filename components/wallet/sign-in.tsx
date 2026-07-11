"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BlinkDot } from "@/components/talos-dash/blink-dot";
import { useManagedWallet } from "@/lib/wallet/use-managed-wallet";

const ease = [0.22, 1, 0.36, 1] as const;

/** Monochrome Google "G" that inherits currentColor so it inverts with the CTA hover fill. */
function GoogleMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 11v2.6h4.3c-.2 1.1-1.3 3.2-4.3 3.2-2.6 0-4.7-2.1-4.7-4.8S9.4 7.2 12 7.2c1.5 0 2.5.6 3 1.1l2-2C15.7 4.9 14 4.2 12 4.2 7.7 4.2 4.2 7.7 4.2 12s3.5 7.8 7.8 7.8c4.5 0 7.5-3.2 7.5-7.6 0-.5 0-.9-.1-1.2H12z" />
    </svg>
  );
}

/**
 * Full-screen signed-out hero — landing-page aesthetic (Dither background lives on
 * the /app page behind this). Presents the "Sign in with Google" CTA that starts the
 * managed-wallet OAuth flow at /api/auth/google.
 */
export default function SignInHero() {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-12">
      {/* Top-left section label — mirrors the landing hero */}
      <div className="absolute top-10 left-6 lg:left-12 hidden sm:flex items-center gap-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {"// SECTION: ACCESS"}
        </span>
        <div className="w-16 border-t border-border" />
        <BlinkDot />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">002</span>
      </div>

      {/* Single container fade-in — one opacity animation; plain children can never
          get stuck invisible (avoids FOUC if a per-element animation frame is dropped). */}
      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, delay: 0.1, ease }}
        className="flex flex-col items-center text-center gap-4"
      >
        {/* Wordmark */}
        <h1 className="font-pixel text-[2.75rem] sm:text-7xl lg:text-8xl tracking-[-0.04em] sm:tracking-tight text-foreground select-none">
          TALOS<span className="text-[var(--accent-color)]">.</span>
        </h1>

        {/* Badge */}
        <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.25em] uppercase text-[var(--accent-color)] border border-[var(--accent-color)]/40 px-4 py-1.5">
          <span className="font-bold">ICARUS · DAEDALUS</span>
          <span className="h-3 w-px bg-[var(--accent-color)]/40" />
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 bg-[var(--accent-color)] animate-pulse" />
            LIVE · SUI MAINNET
          </span>
        </div>

        {/* Divider — transform-only draw-in (no opacity, always paints) */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease }}
          className="w-full max-w-xl border-t-2 border-foreground origin-left my-3"
        />

        {/* Tagline */}
        <div className="flex flex-col items-center gap-3 max-w-2xl">
          <p className="font-pixel text-2xl sm:text-3xl lg:text-4xl text-foreground leading-[1.1] tracking-tight">
            YOUR EMBEDDED VAULT<span className="text-[var(--accent-color)]">.</span>
            <br />
            <span className="text-[var(--accent-color)]">NO SEED PHRASE</span>
            <span className="text-foreground">.</span>
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed max-w-lg">
            Sign in and Talos mints you a non-custodial wallet.
            <br className="hidden sm:inline" />
            <span className="text-foreground"> Deposit USDC — two agents chase the best yield across Scallop, Navi &amp; Kai, bounded by an on-chain policy.</span>
          </p>
        </div>

        {/* Google CTA — landing slide-fill button */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <a
            href="/api/auth/google"
            className="group relative inline-flex items-center bg-black text-[var(--accent-color)] text-sm font-mono tracking-wider uppercase overflow-hidden cursor-pointer px-7 py-3 border-2 border-[var(--accent-color)] hover:text-background transition-colors duration-500"
          >
            <span className="absolute inset-0 bg-[var(--accent-color)] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
            <span className="relative z-10 flex items-center gap-2.5 font-bold">
              <GoogleMark />
              Sign in with Google
              <ArrowRight size={14} strokeWidth={2} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </a>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">
            Non-custodial · Encrypted key · PANIC anytime
          </p>
        </div>
      </motion.div>
    </section>
  );
}

/**
 * Compact signed-in account chip for the app header: live dot + truncated address +
 * sign-out. Same mono / accent-border language as the navbar.
 */
export function AccountPill() {
  const { address, email, loading, refresh } = useManagedWallet();

  if (loading) return <span className="font-mono text-xs text-muted-foreground">…</span>;
  if (!address) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2 border border-[var(--accent-color)]/40 px-3 py-1.5 font-mono text-xs text-[var(--accent-color)]">
        <span className="h-1.5 w-1.5 bg-[var(--accent-color)] animate-pulse" />
        <span title={email ?? ""}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </span>
      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          refresh();
        }}
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        sign out
      </button>
    </div>
  );
}
