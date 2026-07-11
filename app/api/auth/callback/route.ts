import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/wallet/google";
import { getOrCreateUser } from "@/lib/wallet/store";
import { signSession, SESSION_COOKIE } from "@/lib/wallet/session";
import { env } from "@/lib/wallet/config";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.redirect(`${env("APP_URL")}/dashboard?tab=VAULT&error=nocode`);
  try {
    const { sub, email } = await exchangeCode(code);
    await getOrCreateUser(sub, email);
    const token = await signSession({ sub, email });
    const res = NextResponse.redirect(`${env("APP_URL")}/dashboard?tab=VAULT`);
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: unknown) {
    console.error("[auth/callback]", e);
    return NextResponse.redirect(`${env("APP_URL")}/dashboard?tab=VAULT&error=auth`);
  }
}
