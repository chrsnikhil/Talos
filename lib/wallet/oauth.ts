import { createHash } from "node:crypto";
import { env } from "./config";

// -----------------------------------------------------------------------------
// OAuth 2.1 for the Talos MCP connector.
//
// Claude.ai web does NOT support static bearer headers on custom connectors — it
// authenticates a remote MCP server ONLY through OAuth 2.1 (PKCE + Dynamic Client
// Registration + Protected-Resource-Metadata discovery). This module holds the
// metadata documents, PKCE verification, and CORS helpers shared by the OAuth
// endpoints. The user step (proving who they are) reuses the existing Google login;
// the issued access token is the same per-user MCP JWT (lib/wallet/mcp-token).
// -----------------------------------------------------------------------------

/** App origin, no trailing slash (e.g. https://talos-…azure.com). */
export function issuer(): string {
  return env("APP_URL").replace(/\/$/, "");
}
/** The protected resource = the MCP endpoint URL. */
export function resourceUrl(): string {
  return `${issuer()}/api/mcp/mcp`;
}

export const OAUTH_SCOPES = ["read", "control"] as const;

/** RFC 9728 Protected Resource Metadata — tells Claude which authorization server to use. */
export function protectedResourceMetadata() {
  return {
    resource: resourceUrl(),
    authorization_servers: [issuer()],
    bearer_methods_supported: ["header"],
    scopes_supported: [...OAUTH_SCOPES],
    resource_documentation: `${issuer()}/dashboard?tab=VAULT`,
  };
}

/** RFC 8414 Authorization Server Metadata — the endpoints + capabilities Claude discovers. */
export function authorizationServerMetadata() {
  const iss = issuer();
  return {
    issuer: iss,
    authorization_endpoint: `${iss}/api/oauth/authorize`,
    token_endpoint: `${iss}/api/oauth/token`,
    registration_endpoint: `${iss}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [...OAUTH_SCOPES],
  };
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Verify a PKCE code_verifier against the stored code_challenge. Default method S256. */
export function verifyPkce(verifier: string, challenge: string, method?: string): boolean {
  if (!verifier || !challenge) return false;
  if (method === "plain") return verifier === challenge;
  // S256 (default / required)
  return b64url(createHash("sha256").update(verifier).digest()) === challenge;
}

// Claude.ai's MCP connector runs partly in the browser, so the discovery/token
// endpoints are hit cross-origin and need permissive CORS. The token endpoint is
// safe to open (`*`) because it requires the PKCE code_verifier, not a cookie.
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

export function corsJson(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
  });
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
