import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({
      error: "unauthorized",
      error_description: "Missing Bearer token in Authorization header.",
    }, { status: 401 });
  }

  const origin = new URL(req.url).origin;

  return NextResponse.json({
    sub: "agent_primary_identity",
    name: "Core Verification Agent",
    email: "agent-01@agentkey.in",
    email_verified: true,
    picture: `${origin}/icon.png`,
    is_agent: true,
    agent_type: "AUTONOMOUS_AI_AGENT",
    trust_score: 99.0,
    operator: {
      name: "Saaqib",
      email: "saaqibheroindia@gmail.com",
      verified: true,
    },
    workspace: {
      id: "ws_default",
      plan: "pro",
      domain: "agentkey.in",
    },
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
