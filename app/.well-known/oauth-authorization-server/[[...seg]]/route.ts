import { authorizationServerMetadata, corsJson, corsPreflight } from "@/lib/wallet/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RFC 8414. Advertises the authorize/token/registration endpoints + PKCE support.
// Served on the root path and any resource-suffixed variant Claude may probe.
export async function GET() {
  return corsJson(authorizationServerMetadata());
}

export async function OPTIONS() {
  return corsPreflight();
}
