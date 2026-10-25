import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api } from "@/lib/api";
import {
  createInboxRecord,
  deleteInboxRecord,
  getInboxes,
  getOrCreateDefaultInbox,
  InboxRecord,
} from "@/lib/agent-store";

function parseCookieInboxes(cookieHeader: string | undefined): InboxRecord[] {
  if (!cookieHeader) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieHeader));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase().trim() || undefined;
    const name = session?.user?.name || (email ? email.split("@")[0] : "Operator");

    if (email) {
      try {
        getOrCreateDefaultInbox(email, name);
      } catch {
        // ignore
      }
    }

    let inboxes = getInboxes(email);

    // Merge inboxes from cookie for cross-container consistency
    const cookieHeader = req.cookies.get("ak_user_inboxes")?.value;
    const fromCookie = parseCookieInboxes(cookieHeader);
    if (fromCookie.length > 0) {
      const existingIds = new Set(inboxes.map((i) => i.id));
      const existingEmails = new Set(inboxes.map((i) => i.email_address.toLowerCase()));

      for (const item of fromCookie) {
        if (!existingIds.has(item.id) && !existingEmails.has(item.email_address.toLowerCase())) {
          inboxes.unshift(item);
          // Prime container store
          try {
            createInboxRecord({
              username: item.email_address.split("@")[0],
              domain: item.email_address.split("@")[1],
              owner_name: item.owner_name,
              display_title: item.display_title,
              phone_number: item.phone_number,
              owner_email: email,
            });
          } catch {
            // ignore
          }
        }
      }
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

    const email = session.user.email.toLowerCase().trim();
    const defaultName = session.user.name || email.split("@")[0] || "Operator";

    const body = await req.json().catch(() => ({}));
    const rawUsername = String(body.username || "").trim().toLowerCase();
    const cleanUsername = rawUsername.replace(/[^a-z0-9._-]/g, "");
    const domain = String(body.domain || "").trim().toLowerCase() || "agentkey.in";
    const owner_name = String(body.owner_name || "").trim() || defaultName;
    const display_title = String(body.display_title || "").trim();
    const phone_number = String(body.phone_number || "").trim();

    let created: InboxRecord;
    try {
      created = createInboxRecord({
        username: cleanUsername || undefined,
        domain,
        owner_name,
        display_title: display_title || undefined,
        phone_number: phone_number || undefined,
        owner_email: email,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create inbox";
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    // Fire-and-forget sync upstream if backend is running (non-blocking)
    api<InboxRecord>("/inboxes", {
      method: "POST",
      body: JSON.stringify({
        ...(cleanUsername ? { username: cleanUsername } : {}),
        domain,
        owner_name,
        ...(display_title ? { display_title } : {}),
        ...(phone_number ? { phone_number } : {}),
      }),
    }).catch(() => {});

    // Save to user cookie so all serverless instances immediately see it
    const cookieHeader = req.cookies.get("ak_user_inboxes")?.value;
    const existing = parseCookieInboxes(cookieHeader);
    const updated = [
      created,
      ...existing.filter((i) => i.id !== created.id && i.email_address !== created.email_address),
    ].slice(0, 25);

    const res = NextResponse.json({ ok: true, inbox: created });
    res.cookies.set("ak_user_inboxes", encodeURIComponent(JSON.stringify(updated)), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });

    return res;
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

    // Upstream delete in background
    api(`/inboxes/${id}`, { method: "DELETE" }).catch(() => {});

    const success = deleteInboxRecord(id, session.user.email);

    // Update cookie
    const cookieHeader = req.cookies.get("ak_user_inboxes")?.value;
    const existing = parseCookieInboxes(cookieHeader);
    const updated = existing.filter((i) => i.id !== id && i.email_address.toLowerCase() !== id.toLowerCase());

    const res = NextResponse.json({ ok: success });
    res.cookies.set("ak_user_inboxes", encodeURIComponent(JSON.stringify(updated)), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });

    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete inbox";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
