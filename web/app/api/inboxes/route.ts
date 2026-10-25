import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api } from "@/lib/api";
import { createInboxRecord, deleteInboxRecord, getInboxes, InboxRecord } from "@/lib/agent-store";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const email = session?.user?.email || undefined;
    let inboxes: InboxRecord[] = [];
    try {
      const upstream = await api<InboxRecord[] | { data: InboxRecord[] }>("/inboxes");
      if (Array.isArray(upstream)) {
        inboxes = upstream;
      } else if (Array.isArray((upstream as any)?.data)) {
        inboxes = (upstream as any).data;
      }
    } catch {
      inboxes = getInboxes(email);
    }
    if (inboxes.length === 0) {
      inboxes = getInboxes(email);
    }
    return NextResponse.json({ ok: true, data: inboxes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load inboxes";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Please log in to create inboxes." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase();
    const domain = String(body.domain || "").trim().toLowerCase();
    const owner_name = String(body.owner_name || "").trim();
    const display_title = String(body.display_title || "").trim();
    const phone_number = String(body.phone_number || "").trim();

    let created: InboxRecord;
    try {
      const upstream = await api<InboxRecord>("/inboxes", {
        method: "POST",
        body: JSON.stringify({
          ...(username ? { username } : {}),
          ...(domain ? { domain } : {}),
          ...(owner_name ? { owner_name } : {}),
          ...(display_title ? { display_title } : {}),
          ...(phone_number ? { phone_number } : {}),
        }),
      });
      createInboxRecord({
        username: username || undefined,
        domain: domain || undefined,
        owner_name: owner_name || undefined,
        display_title: display_title || undefined,
        phone_number: phone_number || undefined,
        owner_email: session.user.email,
      });
      created = upstream;
    } catch {
      created = createInboxRecord({
        username: username || undefined,
        domain: domain || undefined,
        owner_name: owner_name || undefined,
        display_title: display_title || undefined,
        phone_number: phone_number || undefined,
        owner_email: session.user.email,
      });
    }

    return NextResponse.json({ ok: true, inbox: created });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create inbox";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Please log in to manage inboxes." }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Inbox ID is missing" }, { status: 400 });
    }

    try {
      await api(`/inboxes/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }

    const success = deleteInboxRecord(id, session.user.email);
    return NextResponse.json({ ok: success });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete inbox";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
