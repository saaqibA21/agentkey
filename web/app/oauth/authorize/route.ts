import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams.toString();

  // Forward query parameters to the visual consent screen
  const targetUrl = new URL(`/connect/authorize?${searchParams}`, req.url);
  return NextResponse.redirect(targetUrl);
}
