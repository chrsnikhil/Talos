import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { users } from "@/lib/wallet/mongo";
import { mintMcpToken, MCP_SCOPE } from "@/lib/wallet/mcp-token";
import { env } from "@/lib/wallet/config";
export const runtime = "nodejs";

function mcpUrl(): string {
  return `${env("APP_URL").replace(/\/$/, "")}/api/mcp/mcp`;
}

async function session() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

/** Mint (or re-mint) this user's MCP bearer token to paste into Claude. */
export async function POST() {
  const s = await session();
  if (!s) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const col = await users();
  const u = await col.findOne({ sub: s.sub });
  if (!u) return NextResponse.json({ error: "no wallet" }, { status: 404 });
  const token = await mintMcpToken(s.sub, u.mcpTokenVersion ?? 0);
  return NextResponse.json({ token, url: mcpUrl(), header: `Bearer ${token}`, scope: MCP_SCOPE });
}

/** Revoke every issued token by bumping the version. */
export async function DELETE() {
  const s = await session();
  if (!s) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  await (await users()).updateOne({ sub: s.sub }, { $inc: { mcpTokenVersion: 1 } });
  return NextResponse.json({ revoked: true });
}
