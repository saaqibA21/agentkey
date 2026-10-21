import { NextRequest, NextResponse } from "next/server";
import { registerOAuthClientRecord } from "@/lib/oauth-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_request", error_description: "Invalid JSON" }, { status: 400 });
    }

    const clientName = body.client_name || "Registered Client";
    const redirectUris = Array.isArray(body.redirect_uris) && body.redirect_uris.length > 0
      ? body.redirect_uris
      : ["http://localhost:3000/callback"];

    const client = registerOAuthClientRecord(clientName, redirectUris);

    return NextResponse.json(
      {
        client_id: client.client_id,
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        client_id_issued_at: Math.floor(Date.now() / 1000),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: "server_error", error_description: msg }, { status: 500 });
  }
}
