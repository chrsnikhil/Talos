import { OAuth2Client } from "google-auth-library";
import { env } from "./config";

function redirectUri() { return `${env("APP_URL")}/api/auth/callback`; }
function oauth() {
  return new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    env("GOOGLE_CLIENT_SECRET"),
    redirectUri(),
  );
}

export function googleAuthUrl(state?: string): string {
  return oauth().generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    ...(state ? { state } : {}),
  });
}

export async function exchangeCode(code: string): Promise<{ sub: string; email: string }> {
  const client = oauth();
  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email) throw new Error("google id_token missing sub/email");
  return { sub: p.sub, email: p.email };
}
