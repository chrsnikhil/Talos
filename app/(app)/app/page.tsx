"use client";
import { useEffect, useState } from "react";
import SignIn from "@/components/wallet/sign-in";
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
    <main style={{ minHeight: "100vh", background: "#0d1319", color: "#e8eef7", fontFamily: "monospace", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <h1 style={{ letterSpacing: "-0.02em" }}>TALOS</h1>
      <SignIn />
      {address && (
        <section data-testid="wallet" style={{ textAlign: "center", opacity: 0.85 }}>
          <p>your embedded wallet</p>
          <code>{address}</code>
          <VaultPanel />
          <DashboardPanel />
        </section>
      )}
      {/* Unobtrusive replay button — always visible when signed in */}
      {address && (
        <button
          onClick={() => setShowWizard(true)}
          style={{
            position: "fixed",
            bottom: 18,
            right: 20,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#3a4a5a",
            padding: "4px 6px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8b98ab"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#3a4a5a"; }}
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
