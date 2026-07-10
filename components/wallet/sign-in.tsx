"use client";
import { useManagedWallet } from "@/lib/wallet/use-managed-wallet";

export default function SignIn() {
  const { address, email, loading, refresh } = useManagedWallet();
  if (loading) return <span style={{ fontFamily: "monospace", color: "#8b98ab" }}>…</span>;
  if (address) {
    return (
      <div style={{ fontFamily: "monospace", color: "#e8eef7" }}>
        <span title={email ?? ""}>{address.slice(0, 6)}…{address.slice(-4)}</span>
        <button style={{ marginLeft: 12 }} onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); refresh(); }}>
          sign out
        </button>
      </div>
    );
  }
  return (
    <a href="/api/auth/google"
       style={{ fontFamily: "monospace", padding: "10px 18px", border: "2px solid #28d391", color: "#28d391", textDecoration: "none" }}>
      Sign in with Google
    </a>
  );
}
