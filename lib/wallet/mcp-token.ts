import { SignJWT, jwtVerify } from "jose";
import { env } from "./config";

// Per-user bearer token for the Talos MCP connector. The user pastes it into Claude as
// an `Authorization: Bearer <token>` header. Signed with a dedicated secret (falls back
// to SESSION_SECRET). Revocable: the token carries a version `tv` that must match the
// user doc's `mcpTokenVersion` — bump that to invalidate all issued tokens.
//
// Phase 1 scope: read + pause/resume (NO fund movement). Kept in the token so a future
// funds-capable token is a scope change, not a new mechanism.
export const MCP_SCOPE = "read+control";

const secret = () => new TextEncoder().encode(process.env.MCP_TOKEN_SECRET || env("SESSION_SECRET"));

export type McpClaims = { sub: string; scope: string; tv: number };

export async function mintMcpToken(sub: string, tv: number): Promise<string> {
  return new SignJWT({ scope: MCP_SCOPE, tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(secret());
}

/** Validate signature + expiry. Returns claims, or null. Revocation (tv vs the user's
 *  current mcpTokenVersion) is checked by the caller, which has the user doc. */
export async function verifyMcpToken(token: string): Promise<McpClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub === "string" && typeof payload.scope === "string" && typeof payload.tv === "number") {
      return { sub: payload.sub, scope: payload.scope, tv: payload.tv };
    }
    return null;
  } catch {
    return null;
  }
}

/** Long-lived refresh token issued by the OAuth token endpoint. Same secret + tv
 *  revocation as the access token; distinguished by a `typ:"refresh"` claim. */
export async function mintRefreshToken(sub: string, tv: number): Promise<string> {
  return new SignJWT({ tv, typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(secret());
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; tv: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ === "refresh" && typeof payload.sub === "string" && typeof payload.tv === "number") {
      return { sub: payload.sub, tv: payload.tv };
    }
    return null;
  } catch {
    return null;
  }
}
