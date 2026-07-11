import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { getClient, createAuthCode } from "@/lib/wallet/oauth-store";
import { issuer } from "@/lib/wallet/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OAuth 2.1 authorization endpoint (browser redirect, no CORS needed). The user proves
// identity via the existing Google login; once a Talos session exists we auto-consent
// (own account, read/control scope only) and issue a PKCE-bound authorization code.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;
  const responseType = q.get("response_type");
  const clientId = q.get("client_id") ?? "";
  const redirectUri = q.get("redirect_uri") ?? "";
  const codeChallenge = q.get("code_challenge") ?? "";
  const codeChallengeMethod = q.get("code_challenge_method") ?? "S256";
  const scope = q.get("scope") ?? "read control";
  const state = q.get("state") ?? "";

  // Validate the client + redirect_uri BEFORE any redirect back to it.
  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "invalid_client", error_description: "unknown client_id" }, { status: 400 });
  }
  if (!client.redirect_uris.includes(redirectUri)) {
    return NextResponse.json({ error: "invalid_request", error_description: "redirect_uri not registered" }, { status: 400 });
  }

  const back = (params: Record<string, string>) => {
    const dest = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) dest.searchParams.set(k, v);
    if (state) dest.searchParams.set("state", state);
    return NextResponse.redirect(dest.toString());
  };

  if (responseType !== "code") return back({ error: "unsupported_response_type" });
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return back({ error: "invalid_request", error_description: "PKCE S256 required" });
  }

  // Must be logged in. If not, bounce through Google login and resume this exact request.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    const returnTo = `/api/oauth/authorize${url.search}`;
    const login = `${issuer()}/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
    return NextResponse.redirect(login);
  }

  const code = await createAuthCode({
    sub: session.sub,
    email: session.email,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope,
  });
  return back({ code });
}
