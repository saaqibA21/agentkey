/**
 * AgentKey Cloudflare Email Ingestion Worker
 *
 * Forwards every email received on agentkey.in directly into the AgentKey Vercel dashboard.
 * - Handles 'email' events triggered by Cloudflare Email Routing.
 * - Handles 'fetch' events for HTTP preview & health checks.
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10MB limit

function toBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default {
  // 1. Health check & browser test preview
  async fetch(request, env) {
    return new Response(
      JSON.stringify({
        status: "online",
        service: "AgentKey Email Worker",
        target: env.INGEST_URL || "https://www.agentkey.in/api/inbound/ingest",
        time: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },

  // 2. Incoming email handler from Cloudflare Email Routing
  async email(message, env) {
    if (message.rawSize > MAX_BYTES) {
      message.setReject("Message exceeds 10MB size limit");
      return;
    }

    const raw = new Uint8Array(await new Response(message.raw).arrayBuffer());
    const body = JSON.stringify({
      raw: toBase64(raw),
      envelope_from: message.from,
      envelope_to: message.to,
      subject: message.headers.get("subject") || "",
    });

    const targetUrl = env.INGEST_URL || "https://www.agentkey.in/api/inbound/ingest";

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`AgentKey ingest failed with HTTP status ${response.status}`);
    }
  },
};
