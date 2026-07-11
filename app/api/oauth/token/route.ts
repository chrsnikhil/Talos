import { consumeAuthCode } from "@/lib/wallet/oauth-store";
import { verifyPkce, corsJson, corsPreflight, OAUTH_SCOPES } from "@/lib/wallet/oauth";
import { mintMcpToken, mintRefreshToken, verifyRefreshToken } from "@/lib/wallet/mcp-token";
import { users } from "@/lib/wallet/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = OAUTH_SCOPES.join(" ");
const EXPIRES_IN = 90 * 24 * 60 * 60; // access token lifetime (90d), matches mcp-token

const err = (error: string, description?: string, status = 400) =>
  corsJson({ error, ...(description ? { error_description: description } : {}) }, status);

async function readParams(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      return (await req.json()) as Record<string, string>;
    } catch {
      return {};
    }
  }
  const params = new URLSearchParams(await req.text());
  return Object.fromEntries(params.entries());
}

/** Current mcpTokenVersion for a user (0 default). null if the user no longer exists. */
async function tvFor(sub: string): Promise<number | null> {
  const u = await (await users()).findOne({ sub });
  if (!u) return null;
  return u.mcpTokenVersion ?? 0;
}

// OAuth 2.1 token endpoint. Exchanges an authorization code (with PKCE verifier) or a
// refresh token for a Talos MCP access token (the per-user bearer JWT the tools read).
export async function POST(req: Request) {
  const p = await readParams(req);
  const grant = p.grant_type;

  if (grant === "authorization_code") {
    const rec = await consumeAuthCode(p.code ?? "");
    if (!rec) return err("invalid_grant", "authorization code invalid or expired");
    if (p.client_id && p.client_id !== rec.client_id) return err("invalid_grant", "client_id mismatch");
    if ((p.redirect_uri ?? "") !== rec.redirect_uri) return err("invalid_grant", "redirect_uri mismatch");
    if (!verifyPkce(p.code_verifier ?? "", rec.code_challenge, rec.code_challenge_method)) {
      return err("invalid_grant", "PKCE verification failed");
    }
    const tv = await tvFor(rec.sub);
    if (tv === null) return err("invalid_grant", "user not found");
    const access_token = await mintMcpToken(rec.sub, tv);
    const refresh_token = await mintRefreshToken(rec.sub, tv);
    return corsJson({ access_token, token_type: "Bearer", expires_in: EXPIRES_IN, refresh_token, scope: SCOPE });
  }

  if (grant === "refresh_token") {
    const claims = await verifyRefreshToken(p.refresh_token ?? "");
    if (!claims) return err("invalid_grant", "refresh token invalid or expired");
    const tv = await tvFor(claims.sub);
    if (tv === null) return err("invalid_grant", "user not found");
    if (tv !== claims.tv) return err("invalid_grant", "token revoked"); // mcpTokenVersion bumped
    const access_token = await mintMcpToken(claims.sub, tv);
    const refresh_token = await mintRefreshToken(claims.sub, tv);
    return corsJson({ access_token, token_type: "Bearer", expires_in: EXPIRES_IN, refresh_token, scope: SCOPE });
  }

  return err("unsupported_grant_type", `grant_type '${grant ?? ""}' not supported`);
}

export async function OPTIONS() {
  return corsPreflight();
}
