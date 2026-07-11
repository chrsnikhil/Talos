import { protectedResourceMetadata, corsJson, corsPreflight } from "@/lib/wallet/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RFC 9728. Claude fetches this after a 401 to learn which authorization server to
// use. Served on both /.well-known/oauth-protected-resource and the resource-suffixed
// /.well-known/oauth-protected-resource/api/mcp/mcp (optional catch-all matches both).
export async function GET() {
  return corsJson(protectedResourceMetadata());
}

export async function OPTIONS() {
  return corsPreflight();
}
