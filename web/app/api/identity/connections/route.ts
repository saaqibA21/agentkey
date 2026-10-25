import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, field, value } = body;
    if (!id || !field) {
      return NextResponse.json({ success: false, error: "ID and field are required." }, { status: 400 });
    }

    const targetField = field === "allow_export" ? "allow_export" : "allow_writes";
    try {
      await api(`/connections/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [targetField]: Boolean(value) }),
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, id, field: targetField, value: Boolean(value) });
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

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const clientId = url.searchParams.get("client_id");

    if (clientId) {
      try {
        await api(`/oauth/grants/${encodeURIComponent(clientId)}`, { method: "DELETE" });
      } catch {
        // ignore
      }
      return NextResponse.json({ success: true, client_id: clientId });
    }

    if (id) {
      try {
        await api(`/connections/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch {
        // ignore
      }
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ success: false, error: "Identifier required" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
