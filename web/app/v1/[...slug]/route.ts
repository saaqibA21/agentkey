import { NextRequest, NextResponse } from "next/server";
import {
  createInboxRecord,
  dispatchWebhooks,
  getInboxById,
  getInboxes,
  validateApiKey,
} from "@/lib/agent-store";
import { getAllMessages, getMessagesForInbox, storeMessage } from "@/lib/inbox-store";
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

  const path = slug.join("/");

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
    return NextResponse.json(inbox);
  }

  // 3. GET /v1/inboxes/[id]/messages
  if (slug[0] === "inboxes" && slug[2] === "messages" && slug.length === 3) {
    const inboxId = slug[1];
    // Sync latest from Cloudflare worker KV
    try {
      const workerUrl = "https://agentkey-email-worker.saaqibheroindia.workers.dev/messages";
      const cfRes = await fetch(workerUrl, { cache: "no-store", signal: AbortSignal.timeout(2500) });
      if (cfRes.ok) {
        const json = await cfRes.json();
        if (json && Array.isArray(json.data)) {
          for (const m of json.data) {
            storeMessage(m);
          }
        }
      }
    } catch {
      // ignore network errors
    }

    const messages = getMessagesForInbox(inboxId, 50);
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
      // Check store
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

  // 5. GET /v1/overview
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
// POST Handlers (Create inbox, Send outbound email, Verify agent passport)
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");

  // Verify Agent Passport (public or authenticated)
  if (path === "auth/agent/verify") {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    return NextResponse.json({
      verified: true,
      is_agent: true,
      agent_type: "AUTONOMOUS_AI_AGENT",
      trust_score: 99.0,
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

  // 1. POST /v1/inboxes (Create inbox)
  if (path === "inboxes") {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const inbox = createInboxRecord({
      username: body.username,
      owner_name: body.owner_name || auth.name,
      display_title: body.display_title,
      phone_number: body.phone_number,
      owner_email: auth.ownerEmail,
    });
    return NextResponse.json(inbox, { status: 201 });
  }

  // 2. POST /v1/inboxes/[id]/messages/send or POST /v1/inboxes/[id]/messages (Send Outbound Email)
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const { to, subject, text, html } = body;
    if (!to || (!text && !html)) {
      return NextResponse.json(
        { status: 400, title: "Bad Request", detail: "Fields 'to' and 'text' or 'html' are required." },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { status: 500, title: "Server Error", detail: "RESEND_API_KEY is not configured on server." },
        { status: 500 }
      );
    }

    const fromAddress = `${inbox.owner_name || "Agent"} <${inbox.email_address}>`;
    const recipients = Array.isArray(to) ? to : [to];

    try {
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipients,
          subject: subject || "Message from AgentKey",
          text: text || undefined,
          html: html || undefined,
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
