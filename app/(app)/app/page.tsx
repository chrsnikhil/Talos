"use client";
import SignIn from "@/components/wallet/sign-in";
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
          <p style={{ marginTop: 12, color: "#28d391" }}>vault UI mounts here (todo 7)</p>
        </section>
      )}
    </main>
  );
}
