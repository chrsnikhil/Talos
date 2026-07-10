import { NextResponse } from "next/server";
import { googleAuthUrl } from "@/lib/wallet/google";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.redirect(googleAuthUrl());
}
