/**
 * AgentKey Cloudflare Email Ingestion Worker
 * Forwards every email received on agentkey.in directly into your Vercel Dashboard.
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10MB limit

// In-memory buffer for recent messages
const messageBuffer = [];

function extractEdgeData(body, subject) {
  const combined = `${subject}\n${body}`;

  // Deterministic OTP pattern extraction
  let otp_code = undefined;
  const labeledRegex = /(?:otp|verification|passcode|one-time\s*code|security\s*code|confirm(?:ation)?\s*code|code)(?:(?:\s+is|\s*[:=-])?\s*[*#]*\s*)([0-9]{4,8})\b/i;
  const otpLabeledMatch = combined.match(labeledRegex);
  if (otpLabeledMatch) {
    otp_code = otpLabeledMatch[1];
  } else {
    const standaloneMatch = combined.match(/\b\d{6}\b/);
    if (standaloneMatch) {
      otp_code = standaloneMatch[0];
    }
  }

  // Magic link extraction
  let magic_link = undefined;
  const magicLinkMatch = combined.match(
    /(https?:\/\/[^\s"'<>]*(?:verify|token|auth|magic|login|signin|confirm|callback)[^\s"'<>]*)/i
  );
  if (magicLinkMatch) {
    magic_link = magicLinkMatch[1];
  }

  return { otp_code, magic_link };
}

function parseMimeSimple(rawText) {
  const splitIdx = rawText.indexOf("\r\n\r\n") !== -1 ? rawText.indexOf("\r\n\r\n") : rawText.indexOf("\n\n");
  let headersPart = splitIdx !== -1 ? rawText.slice(0, splitIdx) : "";
  let bodyPart = splitIdx !== -1 ? rawText.slice(splitIdx + 2) : rawText;

  let subject = "";
  let sender = "";
  for (const line of headersPart.split(/\r?\n/)) {
    if (/^subject:/i.test(line)) subject = line.replace(/^subject:\s*/i, "").trim();
    if (/^from:/i.test(line)) sender = line.replace(/^from:\s*/i, "").trim();
  }

  return { subject, sender, body: bodyPart.trim() };
}

export default {
  // 1. Health check, test generator, and Dashboard API
  async fetch(request, env) {
    const url = new URL(request.url);

    // Test helper: visit /test in browser to generate a test email in KV immediately
    if (url.pathname.includes("/test")) {
      const testMsg = {
        id: `msg_test_${Date.now()}`,
        inbox_id: "inbox_primary_agent",
        thread_id: `thr_${Date.now()}`,
        channel: "EMAIL",
        direction: "INBOUND",
        sender: "saaqibheroindia@gmail.com",
        recipient: "agent-01@agentkey.in",
        subject: "AgentKey Test Verification Code",
        body_text: "Welcome to AgentKey! Your edge verification code is 849201. Boundaries and agent identity verified.",
        status: "DELIVERED",
        created_at: new Date().toISOString(),
        extracted_data: { otp_code: "849201" },
      };
      if (env.INBOX_STORE) {
        await env.INBOX_STORE.put(`msg:${Date.now()}`, JSON.stringify(testMsg));
      }
      messageBuffer.unshift(testMsg);
      return new Response(JSON.stringify({ status: "test_message_created", message: testMsg }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Endpoint for Vercel Dashboard to read messages
    if (url.pathname.includes("/messages")) {
      let messages = [...messageBuffer];

      // If KV storage is bound, load from KV
      if (env.INBOX_STORE) {
        try {
          const list = await env.INBOX_STORE.list({ prefix: "msg:", limit: 50 });
          const kvMessages = await Promise.all(
            list.keys.map((k) => env.INBOX_STORE.get(k.name, "json"))
          );
          if (kvMessages.filter(Boolean).length > 0) {
            messages = kvMessages.filter(Boolean);
          }
        } catch (e) {
          console.error("KV read error:", e);
        }
      }

      // Filter by recipient or inbox if query param supplied
      const reqRecipient = (url.searchParams.get("recipient") || url.searchParams.get("to") || "").toLowerCase().trim();
      const reqInboxId = (url.searchParams.get("inbox_id") || "").toLowerCase().trim();
      if (reqRecipient) {
        messages = messages.filter((m) => m.recipient && m.recipient.toLowerCase().includes(reqRecipient));
      } else if (reqInboxId) {
        messages = messages.filter((m) => (m.inbox_id && m.inbox_id.toLowerCase() === reqInboxId) || (m.recipient && m.recipient.toLowerCase().includes(reqInboxId)));
      }

      return new Response(JSON.stringify({ data: messages }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(
      JSON.stringify({
        status: "online",
        service: "AgentKey Email Worker",
        kv_bound: !!env.INBOX_STORE,
        stored_messages: messageBuffer.length,
        time: new Date().toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },

  // 2. Incoming email handler from Cloudflare Email Routing
  async email(message, env) {
    if (message.rawSize > MAX_BYTES) {
      message.setReject("Message exceeds 10MB size limit");
      return;
    }

    const rawBuffer = await new Response(message.raw).arrayBuffer();
    const rawText = new TextDecoder().decode(rawBuffer);
    const parsed = parseMimeSimple(rawText);

    const subject = parsed.subject || message.headers.get("subject") || "Inbound Email";
    const sender = parsed.sender || message.from;
    const recipient = message.to;
    const bodyText = parsed.body || "No message body";

    const extracted = extractEdgeData(bodyText, subject);

    const msgObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      inbox_id: "inbox_primary_agent",
      thread_id: `thr_${Date.now()}`,
      channel: "EMAIL",
      direction: "INBOUND",
      sender,
      recipient,
      subject,
      body_text: bodyText.slice(0, 5000),
      status: "DELIVERED",
      created_at: new Date().toISOString(),
      extracted_data: extracted,
    };

    // Store in memory
    messageBuffer.unshift(msgObj);
    if (messageBuffer.length > 50) messageBuffer.pop();

    // Store in KV if available
    if (env.INBOX_STORE) {
      try {
        await env.INBOX_STORE.put(`msg:${Date.now()}`, JSON.stringify(msgObj), {
          expirationTtl: 60 * 60 * 24 * 7, // 7 days
        });
      } catch (e) {
        console.error("KV write error:", e);
      }
    }

    // Also forward to Vercel
    const targetUrl = env.INGEST_URL || "https://www.agentkey.in/api/inbound/ingest";
    try {
      await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          envelope_from: sender,
          envelope_to: recipient,
          subject,
          text: bodyText,
        }),
      });
    } catch (e) {
      console.error("Vercel forward failed:", e);
    }
  },
};
