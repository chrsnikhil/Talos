import { NextResponse } from "next/server";
import { fetchVenueApys } from "@/lib/wallet/yields-fetch";
export const runtime = "nodejs";

export async function GET() {
  const result = await fetchVenueApys();
  return NextResponse.json(result);
}
