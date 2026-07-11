import { redirect } from "next/navigation";

// The embedded wallet + vault now live on the operator dashboard (VAULT tab).
// /app is kept only as a redirect so old links / the OAuth flow land in the right place.
export default function AppRedirect() {
  redirect("/dashboard?tab=VAULT");
}
