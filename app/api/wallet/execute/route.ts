import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Transaction } from "@mysten/sui/transactions";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { loadKeypair } from "@/lib/wallet/store";
import { suiClient, PACKAGE_ID } from "@/lib/wallet/config";
export const runtime = "nodejs";

// Only sign transactions whose every command is a MoveCall into the Talos package.
// Blocks a compromised client from signing coin transfers to an arbitrary address.
// Shape confirmed against @mysten/sui@1.45.2: getData().commands is
//   EnumOutputShapeWithKeys<...>[]  where each element is
//   { $kind: "MoveCall", MoveCall: { package: string, ... } }  (or other kinds).
export function isAllowed(tx: Transaction): boolean {
  const data = tx.getData();
  const cmds = data.commands ?? [];
  if (cmds.length === 0) return false;
  return cmds.every((c) => {
    const anyc = c as { $kind?: string; MoveCall?: { package?: string } };
    return anyc.$kind === "MoveCall" && anyc.MoveCall?.package === PACKAGE_ID;
  });
}

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const { txJson } = await req.json();
    if (typeof txJson !== "string") return NextResponse.json({ error: "bad request" }, { status: 400 });
    const tx = Transaction.from(txJson);
    if (!isAllowed(tx)) return NextResponse.json({ error: "target not allowed" }, { status: 403 });
    const signer = await loadKeypair(session.sub);
    tx.setSenderIfNotSet(signer.toSuiAddress());
    const res = await suiClient.signAndExecuteTransaction({ signer, transaction: tx, options: { showEffects: true } });
    return NextResponse.json({ digest: res.digest, status: res.effects?.status?.status });
  } catch (e: unknown) {
    return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 502 });
  }
}
