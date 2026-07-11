import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Transaction } from "@mysten/sui/transactions";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { loadKeypair } from "@/lib/wallet/store";
import { suiClient } from "@/lib/wallet/config";
import { isAllowed } from "@/lib/wallet/execute-allowlist";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const { txJson } = await req.json();
    if (typeof txJson !== "string") return NextResponse.json({ error: "bad request" }, { status: 400 });
    const tx = Transaction.from(txJson);
    const signer = await loadKeypair(session.sub);
    if (!isAllowed(tx, signer.toSuiAddress())) return NextResponse.json({ error: "target not allowed" }, { status: 403 });
    tx.setSenderIfNotSet(signer.toSuiAddress());
    const res = await suiClient.signAndExecuteTransaction({ signer, transaction: tx, options: { showEffects: true } });
    return NextResponse.json({
      digest: res.digest,
      status: res.effects?.status?.status,
      error: res.effects?.status?.error,
    });
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e);
    if (msg.includes("user not found")) return NextResponse.json({ error: "wallet not found" }, { status: 404 });
    console.error("[wallet/execute]", e);
    return NextResponse.json({ error: "execution failed" }, { status: 502 });
  }
}
