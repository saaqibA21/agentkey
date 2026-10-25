import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api, type Webhook } from "@/lib/api";
import {
  createWebhookRecord,
  deleteWebhookRecord,
  getWebhooks,
  isSafeWebhookUrl,
} from "@/lib/agent-store";

export async function GET() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email?.toLowerCase().trim();

    let hooks: Webhook[] = [];
    try {
      const hooksRaw = await api<Webhook[] | { data: Webhook[] }>("/webhooks");
      if (Array.isArray(hooksRaw)) {
        hooks = hooksRaw;
      } else if (hooksRaw && Array.isArray((hooksRaw as any).data)) {
        hooks = (hooksRaw as any).data;
      }
    } catch {
      hooks = getWebhooks(userEmail);
    }

    return NextResponse.json({ success: true, data: hooks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = session.user.email.toLowerCase().trim();

    const body = await req.json();
    const targetUrl = String(body.url || "").trim();
    const events = Array.isArray(body.events) && body.events.length > 0 ? body.events : ["*"];

    if (!targetUrl) {
      return NextResponse.json({ success: false, error: "Webhook target URL is required." }, { status: 400 });
    }

    if (!isSafeWebhookUrl(targetUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid target URL. Must be a valid public HTTPS endpoint." },
        { status: 400 }
      );
    }

    let secretToken = "";
    let webhookRecord: any = null;

    try {
      const created = await api<{ secret_token: string; id?: string }>("/webhooks", {
        method: "POST",
        body: JSON.stringify({ target_url: targetUrl, event_types: events }),
      });
      secretToken = created.secret_token;
      webhookRecord = {
        id: created.id || `wh_${Date.now()}`,
        target_url: targetUrl,
        event_types: events,
        is_active: true,
      };
    } catch {
      const { webhook, secret_token } = createWebhookRecord(targetUrl, events, userEmail);
      secretToken = secret_token;
      webhookRecord = webhook;
    }

    return NextResponse.json({
      success: true,
      webhook: webhookRecord,
      secret_token: secretToken,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = session.user.email.toLowerCase().trim();

    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Webhook ID is required" }, { status: 400 });
    }

    try {
      await api(`/webhooks/${id}`, { method: "DELETE" });
    } catch {
      // ignore upstream failure, delete locally
    }

    deleteWebhookRecord(id, userEmail);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
