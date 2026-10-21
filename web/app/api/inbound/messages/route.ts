import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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
