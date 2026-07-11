import { NextResponse } from "next/server";
import { googleAuthUrl } from "@/lib/wallet/google";
export const runtime = "nodejs";

// Optional ?returnTo=/api/oauth/authorize?... is carried through Google as `state` so
// the OAuth connector flow resumes after login. Only same-origin OAuth paths allowed.
export async function GET(req: Request) {
  const returnTo = new URL(req.url).searchParams.get("returnTo");
  const state = returnTo && returnTo.startsWith("/api/oauth/authorize") ? returnTo : undefined;
  return NextResponse.redirect(googleAuthUrl(state));
}
