import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { api } from "@/lib/api";
import { createAgentRecord, deleteAgentRecord, getAgents } from "@/lib/agent-store";

export async function GET() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email?.toLowerCase().trim();

    let agents: any[] = [];
    try {
      const agentsRaw = await api<{ data: any[] }>("/agents");
      if (agentsRaw && Array.isArray(agentsRaw.data)) {
        agents = agentsRaw.data;
      }
    } catch {
      agents = getAgents(userEmail);
    }

    return NextResponse.json({ success: true, data: agents });
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
    const ownerEmail = session.user.email.toLowerCase().trim();

    const body = await req.json();
    const agent_name = String(body.agent_name || "Autonomous Agent").trim();
    const owner_name = String(body.owner_name || session.user.name || ownerEmail.split("@")[0] || "Operator").trim();
    const avatar_seed = body.avatar_seed ? String(body.avatar_seed).trim() : undefined;
    const avatar_url = body.avatar_url ? String(body.avatar_url).trim() : undefined;

    let agentData: any = null;
    let apiKey = "";

    try {
      const resp = await api<any>("/agents", {
        method: "POST",
        body: JSON.stringify({
          agent_name,
          owner_name,
          ...(avatar_seed ? { avatar_seed } : {}),
          ...(avatar_url ? { avatar_url } : {}),
        }),
      });
      agentData = {
        id: resp.id || `ag_${Date.now()}`,
        agent_name: resp.agent_name || agent_name,
        owner_name: resp.owner_name || owner_name,
        owner_email: resp.owner_email || ownerEmail,
        email_address: resp.email_address,
        inbox_id: resp.inbox_id,
        api_key_prefix: resp.api_key ? resp.api_key.slice(0, 12) : "ak_live_...",
        scopes: resp.scopes || ["read", "send", "manage", "connect"],
        passport: resp.passport,
        avatar_seed: resp.avatar_seed || avatar_seed,
        avatar_url: resp.avatar_url || avatar_url,
        created_at: new Date().toISOString(),
      };
      apiKey = resp.api_key;
    } catch {
      const { agent, api_key } = createAgentRecord({
        agent_name,
        owner_name,
        owner_email: ownerEmail,
        avatar_seed,
        avatar_url,
      });
      agentData = agent;
      apiKey = api_key;
    }

    return NextResponse.json({
      success: true,
      agent: agentData,
      api_key: apiKey,
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
      return NextResponse.json({ success: false, error: "Agent ID is required" }, { status: 400 });
    }

    try {
      await api(`/agents/${id}`, { method: "DELETE" });
    } catch {
      // ignore upstream failure, delete locally
    }

    deleteAgentRecord(id, userEmail);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
