import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminApi } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase().trim() ?? "";
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (!email || adminEmails.length === 0 || !adminEmails.includes(email)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...changes } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Workspace ID is required" }, { status: 400 });
    }

    try {
      await adminApi(`/admin/workspaces/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, id, changes });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
