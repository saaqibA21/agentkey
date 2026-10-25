import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api, type Message, type Policy } from "@/lib/api";
import {
  createPolicyRecord,
  decidePendingApproval,
  deletePolicyRecord,
  getPendingApprovals,
  getPolicies,
} from "@/lib/agent-store";

export async function GET() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email?.toLowerCase().trim();

    let pending: Message[] = [];
    let policies: Policy[] = [];

    try {
      const [pendingRaw, policiesRaw] = await Promise.all([
        api<{ data: Message[] }>("/hitl/pending"),
        api<Policy[] | { data: Policy[] }>("/hitl/policies"),
      ]);
      pending = pendingRaw?.data || [];
      policies = Array.isArray(policiesRaw)
        ? policiesRaw
        : Array.isArray((policiesRaw as any)?.data)
        ? (policiesRaw as any).data
        : [];
    } catch {
      pending = getPendingApprovals(userEmail) as unknown as Message[];
      policies = getPolicies(userEmail) as unknown as Policy[];
    }

    return NextResponse.json({
      success: true,
      pending,
      policies,
    });
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
    const { action_type } = body;

    if (action_type === "decide") {
      const { id, verdict } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: "Message ID is required." }, { status: 400 });
      }
      const finalVerdict = verdict === "approve" ? "approve" : "reject";

      try {
        await api(`/hitl/${finalVerdict}/${id}`, { method: "POST" });
      } catch {
        // ignore upstream failure, apply to store
      }

      decidePendingApproval(id, finalVerdict, userEmail);
      return NextResponse.json({ success: true, id, verdict: finalVerdict });
    }

    if (action_type === "create_policy") {
      const rawKeywords = body.keywords;
      const keywords = Array.isArray(rawKeywords)
        ? rawKeywords.map(String).map((k) => k.trim()).filter(Boolean)
        : String(rawKeywords || "")
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean);

      if (keywords.length === 0) {
        return NextResponse.json({ success: false, error: "Provide at least one keyword." }, { status: 400 });
      }

      const policyAction = body.action === "NOTIFY_ONLY" ? "NOTIFY_ONLY" : "HOLD_FOR_APPROVAL";
      const destination = String(body.destination || "").trim();

      let createdPolicy: any = null;
      try {
        createdPolicy = await api<Policy>("/hitl/policies", {
          method: "POST",
          body: JSON.stringify({
            trigger_keywords: keywords,
            action: policyAction,
            target_channel: "SLACK",
            target_destination: destination,
          }),
        });
      } catch {
        createdPolicy = createPolicyRecord(keywords, policyAction, destination, userEmail);
      }

      return NextResponse.json({ success: true, policy: createdPolicy });
    }

    return NextResponse.json({ success: false, error: "Invalid action_type" }, { status: 400 });
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
      return NextResponse.json({ success: false, error: "Rule ID is required" }, { status: 400 });
    }

    try {
      await api(`/hitl/policies/${id}`, { method: "DELETE" });
    } catch {
      // ignore upstream failure, delete locally
    }

    deletePolicyRecord(id, userEmail);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
