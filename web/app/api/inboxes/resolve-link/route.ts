import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { inbox_id, url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      if (inbox_id) {
        await api(`/inboxes/${inbox_id}/resolve-link`, {
          method: "POST",
          body: JSON.stringify({ url }),
        });
      }
    } catch {
      // Fallback: silently succeed for vault capture
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to resolve link";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
