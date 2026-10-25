import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api } from "@/lib/api";
import {
  createVaultLoginRecord,
  deleteVaultLoginRecord,
  getVaultLogins,
  updateVaultLoginApproval,
} from "@/lib/agent-store";

export async function GET() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email?.toLowerCase().trim();

    let logins: any[] = [];
    try {
      const loginsRaw = await api<{ data: any[] }>("/vault/items");
      if (loginsRaw && Array.isArray(loginsRaw.data)) {
        logins = loginsRaw.data;
      } else {
        logins = getVaultLogins(userEmail);
      }
    } catch {
      logins = getVaultLogins(userEmail);
    }

    return NextResponse.json({ success: true, data: logins });
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
    const name = String(body.name || "").trim();
    const site_url = String(body.site_url || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const approval = body.approval === "auto" ? "auto" : "ask";
    const totp_secret = body.totp_secret ? String(body.totp_secret).trim() : undefined;
    const owner_name = body.owner_name ? String(body.owner_name).trim() : undefined;

    if (!site_url || !username || !password) {
      return NextResponse.json(
        { success: false, error: "Site URL, username, and password are required." },
        { status: 400 }
      );
    }

    let created: any = null;
    try {
      const resp = await api<any>("/vault/items", {
        method: "POST",
        body: JSON.stringify({
          name: name || site_url,
          site_url,
          username,
          password,
          approval,
          ...(totp_secret ? { totp_secret } : {}),
          ...(owner_name ? { owner_name } : {}),
        }),
      });
      createVaultLoginRecord({
        name: name || site_url,
        site_url,
        username,
        password,
        approval,
        totp_secret,
        owner_name,
        owner_email: userEmail,
      });
      created = resp;
    } catch {
      created = createVaultLoginRecord({
        name: name || site_url,
        site_url,
        username,
        password,
        approval,
        totp_secret,
        owner_name,
        owner_email: userEmail,
      });
    }

    return NextResponse.json({ success: true, login: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = session.user.email.toLowerCase().trim();

    const body = await req.json();
    const { id, approval } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Login ID is required" }, { status: 400 });
    }

    const mode = approval === "auto" ? "auto" : "ask";
    try {
      await api(`/vault/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ approval: mode }),
      });
    } catch {
      // ignore
    }

    updateVaultLoginApproval(id, mode, userEmail);
    return NextResponse.json({ success: true, id, approval: mode });
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
      return NextResponse.json({ success: false, error: "Login ID is required" }, { status: 400 });
    }

    try {
      await api(`/vault/items/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }

    deleteVaultLoginRecord(id, userEmail);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
