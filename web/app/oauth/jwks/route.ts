import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * OpenID Connect JSON Web Key Set (JWKS) Endpoint
 * RFC 7517 compliant public key set.
 */
export async function GET() {
  return NextResponse.json(
    {
      keys: [
        {
          kty: "oct",
          use: "sig",
          alg: "HS256",
          kid: "agentkey_key_primary",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    }
  );
}
