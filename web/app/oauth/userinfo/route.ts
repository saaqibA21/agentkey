import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/oauth-store";

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

  const tokenEntry = validateAccessToken(token);
  if (!tokenEntry) {
    return NextResponse.json({
      error: "invalid_token",
      error_description: "The access token is invalid, expired, or revoked.",
    }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const username = tokenEntry.user_email.split("@")[0] || "operator";

  return NextResponse.json({
    sub: `agent_${username}`,
    name: tokenEntry.user_name || "AgentKey Operator",
    email: `${username}@agentkey.in`,
    email_verified: true,
    picture: `${origin}/icon.png`,
    is_agent: true,
    agent_type: "AUTONOMOUS_AI_AGENT",
    trust_score: 99.0,
    operator: {
      name: tokenEntry.user_name || "Verified Operator",
      email: tokenEntry.user_email,
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
      "Cache-Control": "no-store",
    },
  });
}
