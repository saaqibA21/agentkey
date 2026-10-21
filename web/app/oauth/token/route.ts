import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { consumeAuthCode } from "@/lib/oauth-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function verifyPkce(verifier: string, challenge: string): boolean {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  const calculated = base64Url(hash);
  return calculated === challenge;
}

export async function POST(req: NextRequest) {
  // Rate limit: 30 token requests per minute per IP to prevent brute-forcing
  const clientIp = getClientIp(req.headers);
  const rateLimit = checkRateLimit(`oauth_token_${clientIp}`, 30, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "slow_down",
        error_description: "Too many token exchange attempts. Please try again later.",
      },
      { status: 429, headers: { "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString() } }
    );
  }

  try {
    let body: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((val, key) => {
        body[key] = val.toString();
      });
    } else {
      body = await req.json().catch(() => ({}));
    }

    const { grant_type, code, redirect_uri, client_id, code_verifier } = body;

    if (grant_type !== "authorization_code") {
      return NextResponse.json({
        error: "unsupported_grant_type",
        error_description: "Only authorization_code grant is supported.",
      }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({
        error: "invalid_request",
        error_description: "Missing 'code' parameter.",
      }, { status: 400 });
    }

    const authCode = consumeAuthCode(code);
    if (!authCode) {
      return NextResponse.json({
        error: "invalid_grant",
        error_description: "The authorization code is invalid or has expired.",
      }, { status: 400 });
    }

    // PKCE verification
    if (authCode.code_challenge) {
      if (!code_verifier || !verifyPkce(code_verifier, authCode.code_challenge)) {
        return NextResponse.json({
          error: "invalid_grant",
          error_description: "PKCE verification failed: invalid code_verifier.",
        }, { status: 400 });
      }
    }

    const accessToken = `ai_at_${crypto.randomBytes(24).toString("hex")}`;
    const scopeStr = authCode.scopes.join(" ");

    // Simple signable ID token payload for OpenID Connect
    const idTokenHeader = base64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
    const idTokenPayload = base64Url(Buffer.from(JSON.stringify({
      iss: new URL(req.url).origin,
      sub: `agent_${authCode.user_email.split("@")[0] || "primary"}`,
      aud: authCode.client_id,
      email: authCode.user_email,
      name: authCode.user_name,
      is_agent: true,
      agent_type: "AUTONOMOUS_AI_AGENT",
      trust_score: 99.0,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })));
    const signingSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "agentkey-signing-secret";
    const signature = base64Url(crypto.createHmac("sha256", signingSecret).update(`${idTokenHeader}.${idTokenPayload}`).digest());
    const idToken = `${idTokenHeader}.${idTokenPayload}.${signature}`;

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: scopeStr,
      id_token: idToken,
    }, {
      headers: {
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token exchange error";
    return NextResponse.json({ error: "server_error", error_description: message }, { status: 500 });
  }
}
