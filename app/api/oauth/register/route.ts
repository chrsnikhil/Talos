import { registerClient } from "@/lib/wallet/oauth-store";
import { corsJson, corsPreflight } from "@/lib/wallet/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RFC 7591 Dynamic Client Registration. Claude POSTs its redirect_uris here and gets
// back a client_id. We accept public clients (PKCE, no client secret).
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* tolerate empty/non-JSON bodies */
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? (body.redirect_uris as unknown[]).filter((u): u is string => typeof u === "string")
    : [];
  if (redirectUris.length === 0) {
    return corsJson({ error: "invalid_redirect_uri", error_description: "redirect_uris is required" }, 400);
  }
  // Only allow https redirect targets (Claude uses https://claude.ai/api/mcp/auth_callback).
  const bad = redirectUris.find((u) => !/^https:\/\//i.test(u));
  if (bad) {
    return corsJson({ error: "invalid_redirect_uri", error_description: `redirect_uri must be https: ${bad}` }, 400);
  }

  const client = await registerClient({
    redirect_uris: redirectUris,
    client_name: typeof body.client_name === "string" ? body.client_name : undefined,
  });

  return corsJson(
    {
      client_id: client.client_id,
      redirect_uris: client.redirect_uris,
      client_name: client.client_name,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    },
    201,
  );
}

export async function OPTIONS() {
  return corsPreflight();
}
