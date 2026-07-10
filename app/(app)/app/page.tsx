"use client";
import SignIn from "@/components/wallet/sign-in";
import VaultPanel from "@/components/wallet/vault-panel";
import DashboardPanel from "@/components/wallet/dashboard-panel";
import { useManagedWallet } from "@/lib/wallet/use-managed-wallet";

export default function AppHome() {
  const { address } = useManagedWallet();
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
    </main>
  );
}
