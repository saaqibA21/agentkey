import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api, type ApiKey } from "@/lib/api";
import { createApiKeyRecord, getApiKeys, revokeApiKeyRecord } from "@/lib/agent-store";

export async function GET() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email?.toLowerCase().trim();

    let keys: ApiKey[] = [];
    try {
      const keysRaw = await api<ApiKey[]>("/api-keys");
      const arr = Array.isArray(keysRaw) ? keysRaw : ((keysRaw as any)?.data ?? []);
      keys = (Array.isArray(arr) ? arr : []).filter((k: ApiKey) => k && !k.revoked_at && k.name !== "root");
    } catch {
      keys = getApiKeys(userEmail) as unknown as ApiKey[];
    }

    return NextResponse.json({ success: true, data: keys });
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
    const name = String(body.name || "Untitled key").trim();
    const scopes = Array.isArray(body.scopes) && body.scopes.length > 0
      ? body.scopes
      : ["read", "manage"];

    if (scopes.length === 0) {
      return NextResponse.json({ success: false, error: "Select at least one permission scope." }, { status: 400 });
    }

    let secretKey = "";
    let keyRecord: any = null;

    try {
      const created = await api<{ api_key: string }>("/api-keys", {
        method: "POST",
        body: JSON.stringify({ name, scopes }),
      });
      secretKey = created.api_key;
      keyRecord = {
        id: `ak_${Date.now()}`,
        name,
        key_prefix: secretKey.slice(0, 12),
        scopes,
        created_at: new Date().toISOString(),
      };
    } catch {
      const { key, secret } = createApiKeyRecord(name, scopes, userEmail);
      secretKey = secret;
      keyRecord = key;
    }

    return NextResponse.json({
      success: true,
      key: keyRecord,
      secret: secretKey,
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
      return NextResponse.json({ success: false, error: "Key ID is required" }, { status: 400 });
    }

    try {
      await api(`/api-keys/${id}`, { method: "DELETE" });
    } catch {
      // ignore upstream failure, proceed to local revocation
    }

    revokeApiKeyRecord(id, userEmail);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
