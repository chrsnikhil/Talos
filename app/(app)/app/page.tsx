"use client";
import { useEffect, useState } from "react";
import Dither from "@/components/Dither";
import SignInHero, { AccountPill } from "@/components/wallet/sign-in";
import VaultPanel from "@/components/wallet/vault-panel";
import DashboardPanel from "@/components/wallet/dashboard-panel";
import { useManagedWallet } from "@/lib/wallet/use-managed-wallet";
import { OnboardingWizard } from "@/components/wizard/onboarding-wizard";

export default function AppHome() {
  const { address } = useManagedWallet();
  const [showWizard, setShowWizard] = useState(false);

  // SSR-safe: only touch localStorage inside effect
  useEffect(() => {
    if (address && localStorage.getItem("talos_onboarded") === null) {
      setShowWizard(true);
    }
  }, [address]);

  return (
    <main className="relative min-h-screen text-foreground">
      {/* Animated dithered wave background — same as the landing page */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Dither
          waveColor={[0.12549019607843137, 0.3607843137254902, 0.44313725490196076]}
          disableAnimation={false}
          enableMouseInteraction={false}
          mouseRadius={0.6}
          colorNum={3}
          pixelSize={2}
          waveAmplitude={0.35}
          waveFrequency={10}
          waveSpeed={0.05}
          pixelRatio={0.4}
        />
        {/* Heavier overlay when signed in so the data panels stay legible */}
        <div className={`absolute inset-0 ${address ? "bg-background/80" : "bg-background/62"}`} />
        {/* Centered vignette so the whole hero column stays legible over any Dither wave frame */}
        {!address && (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 58% 62% at 50% 50%, hsl(var(--background) / 0.92), transparent 80%)",
            }}
          />
        )}
      </div>

      <div className="relative z-10">
        {/* ── Signed out: landing-style hero ── */}
        {!address && <SignInHero />}

        {/* ── Signed in: branded shell + panels ── */}
        {address && (
          <div className="min-h-screen">
            <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-border bg-background/85 px-5 py-4">
              <a href="/" className="flex items-center gap-2">
                <span className="font-pixel text-xl tracking-tight">
                  TALOS<span className="text-[var(--accent-color)]">.</span>
                </span>
                <span className="text-[10px] tracking-widest text-muted-foreground">/APP</span>
              </a>
              <AccountPill />
            </header>

            <div className="mx-auto flex w-full max-w-xl flex-col items-stretch gap-2 px-4 py-10">
              <div className="mb-2 flex items-center gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {"// EMBEDDED WALLET"}
                </span>
                <div className="h-px flex-1 border-t border-border" />
              </div>

              <section
                data-testid="wallet"
                className="glass-card px-6 py-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Your non-custodial address
                </p>
                <code className="mt-1 block break-all font-mono text-xs text-foreground">
                  {address}
                </code>
              </section>

              <VaultPanel />
              <DashboardPanel />
            </div>
          </div>
        )}
      </div>

      {/* Unobtrusive replay button — always visible when signed in */}
      {address && (
        <button
          onClick={() => setShowWizard(true)}
          className="fixed bottom-4 right-5 z-30 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          Replay intro
        </button>
      )}

      {showWizard && (
        <OnboardingWizard
          onDone={() => {
            localStorage.setItem("talos_onboarded", "1");
            setShowWizard(false);
          }}
        />
      )}
    </main>
  );
}
