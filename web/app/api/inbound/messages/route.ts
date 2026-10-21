import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateApiKey } from "@/lib/agent-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Enforce authentication via Dashboard Session or Bearer API Key
  const session = await auth();
  const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key") || "";
  const apiKeyAuth = authHeader ? validateApiKey(authHeader) : { valid: false };

  if (!session?.user && !apiKeyAuth.valid) {
    return NextResponse.json(
      { error: "Unauthorized. Authentication required to access messages." },
      { status: 401 }
    );
  }

  try {
    const workerUrl = "https://agentkey-email-worker.saaqibheroindia.workers.dev/messages";
    const res = await fetch(workerUrl, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const json = await res.json();
      return NextResponse.json(json, {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: errorMessage, data: [] }, { status: 500 });
  }
  return NextResponse.json({ data: [] });
}
