import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;

  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    userinfo_endpoint: `${base}/oauth/userinfo`,
    registration_endpoint: `${base}/oauth/register`,
    jwks_uri: `${base}/oauth/jwks`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["HS256"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    scopes_supported: ["openid", "profile", "email", "read", "send", "manage", "connect"],
    claims_supported: [
      "sub",
      "name",
      "email",
      "email_verified",
      "picture",
      "is_agent",
      "agent_type",
      "trust_score",
      "operator",
      "workspace"
    ],
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
