import { WALRUS_PUBLISHER } from "./config"

/** Store a decision record on Walrus as verifiable agent memory. Returns the blobId. */
export async function storeDecision(record: unknown): Promise<string | null> {
  try {
    const r = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=1`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    })
    if (!r.ok) return null
    const j: any = await r.json()
    return j?.newlyCreated?.blobObject?.blobId ?? j?.alreadyCertified?.blobId ?? null
  } catch {
    return null
  }
}
