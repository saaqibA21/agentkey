import { NextRequest, NextResponse } from "next/server";
import {
  addDomainRecord,
  createInboxRecord,
  createWebhookRecord,
  deleteDomainRecord,
  deleteWebhookRecord,
  dispatchWebhooks,
  getDomains,
  getInboxById,
  getInboxes,
  getWebhooks,
  isOperatorOrAdmin,
  validateApiKey,
  verifyDomainRecord,
} from "@/lib/agent-store";
import { getAllMessages, getMessagesForInbox, storeMessage } from "@/lib/inbox-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import type { Message } from "@/lib/api";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  const authHeader =
    req.headers.get("Authorization") ||
    req.headers.get("x-api-key") ||
    req.headers.get("X-API-Key") ||
    "";
  return validateApiKey(authHeader);
}

// ---------------------------------------------------------------------------
// GET Handlers
// ---------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");

  // Public Agent Verification Endpoint
  if (path === "auth/agent/verify") {
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`verify_ip_${clientIp}`, 60, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification requests. Please slow down." },
        { status: 429, headers: { "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString() } }
      );
    }

    return NextResponse.json({
      verified: true,
      is_agent: true,
      agent_type: "AUTONOMOUS_AI_AGENT",
      trust_score: 99.0,
      agent: {
        id: "ag_live_primary",
        name: "Autonomous Task Agent",
        email: "agent-01@agentkey.in",
      },
      owner: {
        name: "Verified Operator",
        email: "operator@agentkey.in",
      },
      operator: {
        name: "Verified Operator",
        email: "operator@agentkey.in",
        accountability_tier: "VERIFIED_HUMAN_OPERATOR",
        verified: true,
      },
      compliance: {
        passport_active: true,
        zero_token_otp: true,
        enclave_enforced: true,
      },
    });
  }

  const auth = checkAuth(req);
  if (!auth.valid) {
    return NextResponse.json(
      {
        status: 401,
        title: "Unauthorized",
        detail: "Invalid, missing, or revoked API key. Provide your key in the 'Authorization: Bearer <api_key>' header.",
      },
      { status: 401 }
    );
  }

  // 1. GET /v1/inboxes
  if (path === "inboxes") {
    const inboxes = getInboxes(auth.ownerEmail);
    return NextResponse.json(inboxes);
  }

  // 2. GET /v1/inboxes/[id]
  if (slug[0] === "inboxes" && slug.length === 2) {
    const inboxId = slug[1];
    const inbox = getInboxById(inboxId);
    if (!inbox) {
      return NextResponse.json(
        { status: 404, title: "Not Found", detail: `Inbox '${inboxId}' not found.` },
        { status: 404 }
      );
    }
    if (
      inbox.owner_email &&
      auth.ownerEmail &&
      inbox.owner_email.toLowerCase().trim() !== auth.ownerEmail.toLowerCase().trim() &&
      !isOperatorOrAdmin(auth.ownerEmail)
    ) {
      return NextResponse.json(
        { status: 403, title: "Forbidden", detail: "You do not have permission to access this inbox." },
        { status: 403 }
      );
    }
    return NextResponse.json(inbox);
  }

  // 3. GET /v1/inboxes/[id]/messages
  if (slug[0] === "inboxes" && slug[2] === "messages" && slug.length === 3) {
    const inboxId = slug[1];
    const inbox = getInboxById(inboxId);
    if (!inbox) {
      return NextResponse.json(
        { status: 404, title: "Not Found", detail: `Inbox '${inboxId}' not found.` },
        { status: 404 }
      );
    }
    if (
      inbox.owner_email &&
      auth.ownerEmail &&
      inbox.owner_email.toLowerCase().trim() !== auth.ownerEmail.toLowerCase().trim() &&
      !isOperatorOrAdmin(auth.ownerEmail)
    ) {
      return NextResponse.json(
        { status: 403, title: "Forbidden", detail: "You do not have permission to view messages from this inbox." },
        { status: 403 }
      );
    }

    // Sync latest from Cloudflare worker KV filtered strictly by recipient
    try {
      const workerUrl = `https://agentkey-email-worker.saaqibheroindia.workers.dev/messages?recipient=${encodeURIComponent(inbox.email_address)}`;
      const cfRes = await fetch(workerUrl, { cache: "no-store", signal: AbortSignal.timeout(2500) });
      if (cfRes.ok) {
        const json = await cfRes.json();
        if (json && Array.isArray(json.data)) {
          for (const m of json.data) {
            if (m.recipient && m.recipient.toLowerCase().includes(inbox.email_address.toLowerCase())) {
              storeMessage(m);
            }
          }
        }
      }
    } catch {
      // ignore network errors
    }

    const messages = getMessagesForInbox(inbox.id, 50, inbox.email_address);
    return NextResponse.json({ data: messages });
  }

  // 4. GET /v1/inboxes/[id]/wait (wait for OTP / magic link / message)
  if (slug[0] === "inboxes" && slug[2] === "wait" && slug.length === 3) {
    const inboxId = slug[1];
    const searchParams = req.nextUrl.searchParams;
    const kind = searchParams.get("for") || "otp";
    const timeout = Math.min(Number(searchParams.get("timeout") || 10), 15);
    const deadline = Date.now() + timeout * 1000;

    while (Date.now() <= deadline) {
      const messages = getMessagesForInbox(inboxId, 20);
      for (const msg of messages) {
        if (kind === "otp") {
          const otpMatch =
            msg.extracted_data?.otp_code ||
            msg.body_text?.match(/\b\d{4,8}\b/)?.[0] ||
            (msg.subject ? msg.subject.match(/\b\d{4,8}\b/)?.[0] : null);
          if (otpMatch) {
            return NextResponse.json({
              otp_code: String(otpMatch),
              message_id: msg.id,
              subject: msg.subject,
              sender: msg.sender,
              received_at: msg.created_at,
            });
          }
        } else if (kind === "magic_link") {
          const linkMatch =
            msg.extracted_data?.magic_link ||
            msg.body_text?.match(/https?:\/\/[^\s"'<>]+/)?.[0];
          if (linkMatch) {
            return NextResponse.json({
              magic_link: linkMatch,
              message_id: msg.id,
              received_at: msg.created_at,
            });
          }
        } else if (kind === "message" && messages.length > 0) {
          return NextResponse.json({ message: messages[0] });
        }
      }

      if (Date.now() + 1000 > deadline) break;
      await new Promise((r) => setTimeout(r, 1200));
    }

    // Timeout
    return new Response(null, { status: 204 });
  }

  // 5. GET /v1/webhooks
  if (path === "webhooks") {
    return NextResponse.json(getWebhooks(auth.ownerEmail));
  }

  // 6. GET /v1/domains
  if (path === "domains") {
    return NextResponse.json({ data: getDomains(auth.ownerEmail) });
  }

  // 7. GET /v1/vault/items/[id]/export-browser-state
  if (slug[0] === "vault" && slug[1] === "items" && slug[3] === "export-browser-state") {
    return NextResponse.json({
      cookies: [],
      origins: [
        {
          origin: "https://agentkey.in",
          localStorage: [
            { name: "agentkey_session", value: "active" },
          ],
        },
      ],
    });
  }

  // 8. GET /v1/overview
  if (path === "overview") {
    return NextResponse.json({
      workspace: {
        id: "ws_live_primary",
        name: "Autonomous Workspace",
        plan: "pro",
        outbound_enabled: true,
        daily_send_limit: 1000,
        max_inboxes: 50,
      },
      counts: { inboxes: 1, messages: getAllMessages().length },
      mail_domain: "agentkey.in",
    });
  }

  return NextResponse.json({ status: 404, title: "Endpoint not found" }, { status: 404 });
}

// ---------------------------------------------------------------------------
// POST Handlers (Create inbox, Send outbound email, Reply, Webhooks, Domains)
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");

  // Public Agent Verification Endpoint
  if (path === "auth/agent/verify") {
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`verify_ip_${clientIp}`, 60, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification requests. Please slow down." },
        { status: 429, headers: { "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString() } }
      );
    }

    return NextResponse.json({
      verified: true,
      is_agent: true,
      agent_type: "AUTONOMOUS_AI_AGENT",
      trust_score: 99.0,
      agent: {
        id: "ag_live_primary",
        name: "Autonomous Task Agent",
        email: "agent-01@agentkey.in",
      },
      owner: {
        name: "Verified Operator",
        email: "operator@agentkey.in",
      },
      operator: {
        name: "Verified Operator",
        email: "operator@agentkey.in",
        accountability_tier: "VERIFIED_HUMAN_OPERATOR",
        verified: true,
      },
      compliance: {
        passport_active: true,
        zero_token_otp: true,
        enclave_enforced: true,
      },
    });
  }

  const auth = checkAuth(req);
  if (!auth.valid) {
    return NextResponse.json(
      {
        status: 401,
        title: "Unauthorized",
        detail: "Invalid, missing, or revoked API key.",
      },
      { status: 401 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // 1. POST /v1/inboxes (Create inbox)
  if (path === "inboxes") {
    const inbox = createInboxRecord({
      username: body.username,
      owner_name: body.owner_name || auth.name,
      display_title: body.display_title,
      phone_number: body.phone_number,
      owner_email: auth.ownerEmail,
    });
    return NextResponse.json(inbox, { status: 201 });
  }

  // 2. POST /v1/webhooks (Create webhook)
  if (path === "webhooks") {
    if (!body.target_url) {
      return NextResponse.json({ error: "target_url is required" }, { status: 400 });
    }
    const { webhook, secret_token } = createWebhookRecord(
      body.target_url,
      body.event_types || ["*"],
      auth.ownerEmail
    );
    return NextResponse.json({ ...webhook, secret_token }, { status: 201 });
  }

  // 3. POST /v1/domains (Add custom domain)
  if (path === "domains") {
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const domain = addDomainRecord(body.name, auth.ownerEmail);
    return NextResponse.json(domain, { status: 201 });
  }

  // 4. POST /v1/domains/[id]/verify
  if (slug[0] === "domains" && slug[2] === "verify" && slug.length === 3) {
    const domain = verifyDomainRecord(slug[1]);
    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }
    return NextResponse.json({ status: "VERIFIED", domain });
  }

  // 5. POST /v1/inboxes/[id]/messages/[msg_id]/reply (Threaded reply)
  if (slug[0] === "inboxes" && slug[2] === "messages" && slug[4] === "reply" && slug.length === 5) {
    const inboxId = slug[1];
    const msgId = slug[3];
    const inbox = getInboxById(inboxId) || {
      id: inboxId,
      email_address: inboxId.includes("@") ? inboxId : `${inboxId}@agentkey.in`,
      owner_name: "AgentKey Agent",
    };

    const text = body.text || body.message || "";
    if (!text) {
      return NextResponse.json({ error: "Field 'text' is required for reply." }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
    }

    const messages = getMessagesForInbox(inbox.id, 50);
    const original = messages.find((m) => m.id === msgId) || messages[0];
    const to = original ? original.sender : "operator@agentkey.in";
    const subject = original?.subject?.startsWith("Re:") ? original.subject : `Re: ${original?.subject || "Message"}`;

    try {
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${inbox.owner_name} <${inbox.email_address}>`,
          reply_to: inbox.email_address,
          to: [to],
          subject,
          text,
          headers: { "In-Reply-To": msgId, References: msgId },
        }),
      });
      const resendData = await resendResp.json();
      return NextResponse.json({ status: "SENT", resend_id: resendData.id });
    } catch (err: unknown) {
      return NextResponse.json({ error: "Reply failed" }, { status: 500 });
    }
  }

  // 6. POST /v1/inboxes/[id]/messages/send or POST /v1/inboxes/[id]/messages (Send Outbound Email)
  if (
    slug[0] === "inboxes" &&
    (slug[2] === "messages" || slug[2] === "send" || (slug[2] === "messages" && slug[3] === "send"))
  ) {
    const inboxId = slug[1];
    const inbox = getInboxById(inboxId) || {
      id: inboxId,
      email_address: inboxId.includes("@") ? inboxId : `${inboxId}@agentkey.in`,
      owner_name: "AgentKey Agent",
    };

    const { to, subject, text, html } = body;
    if (!to || (!text && !html)) {
      return NextResponse.json(
        { status: 400, title: "Bad Request", detail: "Fields 'to' and 'text' or 'html' are required." },
        { status: 400 }
      );
    }

    // Rate limit: 30 outbound sends per minute
    const clientIp = getClientIp(req.headers);
    const sendRateLimit = checkRateLimit(`send_email_${auth.ownerEmail || clientIp}`, 30, 60000);
    if (!sendRateLimit.allowed) {
      return NextResponse.json(
        { status: 429, title: "Rate Limit Exceeded", detail: "Too many outbound emails sent. Please wait a moment." },
        { status: 429, headers: { "Retry-After": Math.ceil(sendRateLimit.resetMs / 1000).toString() } }
      );
    }

    // Validate email format and recipient count
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = (Array.isArray(to) ? to : [to])
      .map((addr: unknown) => String(addr).trim())
      .filter(Boolean);

    if (recipients.length === 0 || recipients.length > 10) {
      return NextResponse.json(
        { status: 400, title: "Bad Request", detail: "Recipients must contain between 1 and 10 email addresses." },
        { status: 400 }
      );
    }

    for (const addr of recipients) {
      if (!EMAIL_REGEX.test(addr)) {
        return NextResponse.json(
          { status: 400, title: "Bad Request", detail: `Invalid recipient email address format: '${addr}'.` },
          { status: 400 }
        );
      }
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { status: 500, title: "Server Error", detail: "RESEND_API_KEY is not configured on server." },
        { status: 500 }
      );
    }

    // Sanitize subject and sender against SMTP header injection
    const cleanSubject = (subject ? String(subject).replace(/[\r\n]+/g, " ") : "Message from AgentKey").slice(0, 250);
    const cleanOwnerName = (inbox.owner_name || "Agent").replace(/[\r\n<>"]+/g, " ").trim().slice(0, 80);
    const fromAddress = `${cleanOwnerName} <${inbox.email_address}>`;

    try {
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          reply_to: inbox.email_address,
          to: recipients,
          subject: cleanSubject,
          text: text ? String(text).slice(0, 100000) : undefined,
          html: html ? String(html).slice(0, 500000) : undefined,
        }),
      });

      const resendData = await resendResp.json();
      if (!resendResp.ok) {
        return NextResponse.json(
          {
            status: resendResp.status,
            title: "Email Delivery Failed",
            detail: resendData.message || "Failed to send email via provider.",
            resend: resendData,
          },
          { status: resendResp.status }
        );
      }

      // Record outbound message in our store
      const outboundMsg: Message = {
        id: resendData.id || `msg_${Date.now()}`,
        inbox_id: inbox.id,
        thread_id: `thr_${Date.now()}`,
        channel: "EMAIL",
        direction: "OUTBOUND",
        sender: inbox.email_address,
        recipient: recipients.join(", "),
        subject: subject || "Message from AgentKey",
        body_text: text || "",
        status: "SENT",
        created_at: new Date().toISOString(),
        extracted_data: {},
      };
      storeMessage(outboundMsg);
      dispatchWebhooks("message.sent", outboundMsg);

      return NextResponse.json(
        {
          id: outboundMsg.id,
          status: "SENT",
          inbox_id: inbox.id,
          sender: inbox.email_address,
          recipient: outboundMsg.recipient,
          subject: outboundMsg.subject,
          resend_id: resendData.id,
          created_at: outboundMsg.created_at,
        },
        { status: 200 }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delivery failure";
      return NextResponse.json(
        { status: 500, title: "Transmission Error", detail: msg },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ status: 404, title: "Endpoint not found" }, { status: 404 });
}

// ---------------------------------------------------------------------------
// DELETE Handlers (Delete webhook, domain, inbox)
// ---------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const auth = checkAuth(req);
  if (!auth.valid) {
    return NextResponse.json({ status: 401, detail: "Unauthorized" }, { status: 401 });
  }

  if (slug[0] === "webhooks" && slug.length === 2) {
    deleteWebhookRecord(slug[1]);
    return NextResponse.json({ ok: true });
  }

  if (slug[0] === "domains" && slug.length === 2) {
    deleteDomainRecord(slug[1]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ status: 404, title: "Endpoint not found" }, { status: 404 });
}
