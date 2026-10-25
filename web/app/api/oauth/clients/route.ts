import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api } from "@/lib/api";
import {
  deleteOAuthClientRecord,
  getOAuthClients,
  isValidRedirectUri,
  OAuthClient,
  registerOAuthClientRecord,
} from "@/lib/oauth-store";

export async function GET() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email?.toLowerCase().trim();

    let clients: OAuthClient[] = [];
    try {
      const res = await api<{ data: OAuthClient[] }>("/oauth/clients");
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        clients = res.data;
      } else {
        clients = getOAuthClients(userEmail);
      }
    } catch {
      clients = getOAuthClients(userEmail);
    }

    const filtered = clients.filter(
      (c) => c && c.client_id !== "cli_claude_desktop" && c.client_id !== "cli_chatgpt_agent"
    );

    return NextResponse.json({ success: true, data: filtered });
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
    const client_name = String(body.client_name || "Untitled App").trim();
    const redirect_uri = String(body.redirect_uri || "").trim();

    if (!redirect_uri) {
      return NextResponse.json({ success: false, error: "Redirect URI is required." }, { status: 400 });
    }

    if (!isValidRedirectUri(redirect_uri)) {
      return NextResponse.json(
        { success: false, error: "Invalid Redirect URI. Must be HTTPS or localhost." },
        { status: 400 }
      );
    }

    let createdClient: OAuthClient;
    try {
      const upstream = await api<{
        client_id: string;
        client_name: string;
        redirect_uris: string[];
      }>("/oauth/clients", {
        method: "POST",
        body: JSON.stringify({
          client_name,
          redirect_uris: [redirect_uri],
        }),
      });
      registerOAuthClientRecord(upstream.client_name, upstream.redirect_uris, userEmail);
      createdClient = {
        client_id: upstream.client_id,
        client_name: upstream.client_name,
        redirect_uris: upstream.redirect_uris,
        created_at: new Date().toISOString(),
        owner_email: userEmail,
      };
    } catch {
      createdClient = registerOAuthClientRecord(client_name, [redirect_uri], userEmail);
    }

    return NextResponse.json({ success: true, client: createdClient });
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
    let clientId = url.searchParams.get("client_id");
    if (!clientId) {
      const body = await req.json().catch(() => ({}));
      clientId = body?.client_id;
    }

    if (!clientId) {
      return NextResponse.json({ success: false, error: "Client ID is required" }, { status: 400 });
    }

    try {
      await api(`/oauth/clients/${encodeURIComponent(clientId)}`, { method: "DELETE" });
    } catch {
      // ignore upstream failure, delete locally
    }

    deleteOAuthClientRecord(clientId, userEmail);
    return NextResponse.json({ success: true, client_id: clientId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
