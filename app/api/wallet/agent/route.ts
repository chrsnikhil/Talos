import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { users } from "@/lib/wallet/mongo";
export const runtime = "nodejs";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const u = await (await users()).findOne({ sub: session.sub });
  if (!u) return NextResponse.json({ error: "no wallet" }, { status: 404 });
  return NextResponse.json({ paused: !!u.paused });
}

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.paused !== "boolean") {
    return NextResponse.json({ error: "body must be { paused: boolean }" }, { status: 400 });
  }
  const { paused } = body;
  await (await users()).updateOne({ sub: session.sub }, { $set: { paused } });
  return NextResponse.json({ paused });
}
