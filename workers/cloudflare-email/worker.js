/**
 * Cloudflare Email Worker: forwards every message received on the catch-all route to AgentIdentity.
 *
 * Setup: Email Routing -> Routing rules -> Catch-all -> "Send to a Worker" -> this worker.
 * Secrets (wrangler secret put ...): INGEST_SECRET (same value as the API's INGEST_SECRET).
 * Vars (wrangler.toml): INGEST_URL, e.g. https://api.yourdomain.com/v1/inbound/ingest
 */
const MAX_BYTES = 10 * 1024 * 1024;

function toBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function sign(secret, timestamp, body) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async email(message, env) {
    if (message.rawSize > MAX_BYTES) {
      message.setReject("Message too large");
      return;
    }
    const raw = new Uint8Array(await new Response(message.raw).arrayBuffer());
    const body = JSON.stringify({
      raw: toBase64(raw),
      envelope_from: message.from,
      envelope_to: message.to,
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await sign(env.INGEST_SECRET, timestamp, body);

    const response = await fetch(env.INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ingest-Signature": `t=${timestamp},v1=${signature}`,
      },
      body,
    });

    if (response.status === 404) {
      // No such inbox: bounce at SMTP time instead of silently accepting mail for unknown users.
      message.setReject("Address does not exist");
    } else if (!response.ok) {
      // Throwing makes Cloudflare return a temporary failure, so the sending server retries later.
      throw new Error(`ingest failed with HTTP ${response.status}`);
    }
  },
};
