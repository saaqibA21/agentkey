import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addDomainRecord, deleteDomainRecord, getDomains } from "@/lib/agent-store";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const email = session?.user?.email || undefined;
    const domains = getDomains(email);
    return NextResponse.json({ ok: true, data: domains });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load domains";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Please log in to manage domains." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const rawName = String(body.name || "").trim().toLowerCase();
    const cleanName = rawName.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();

    if (!cleanName || !cleanName.includes(".") || cleanName.length < 3) {
      return NextResponse.json(
        { error: "Please enter a valid domain name (e.g. agents.yourcompany.com)." },
        { status: 400 }
      );
    }

    const domain = addDomainRecord(cleanName, session.user.email);
    return NextResponse.json({ ok: true, domain });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add domain";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Please log in to manage domains." }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Domain ID is missing" }, { status: 400 });
    }
    const success = deleteDomainRecord(id, session.user.email);
    return NextResponse.json({ ok: success });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete domain";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
