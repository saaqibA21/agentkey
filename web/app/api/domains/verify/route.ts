import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyDomainRecord } from "@/lib/agent-store";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Please log in to verify domains." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Domain ID is missing" }, { status: 400 });
    }
    const domain = verifyDomainRecord(id);
    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, domain });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify domain";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
