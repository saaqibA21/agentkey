import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storeMessage } from "@/lib/inbox-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { createInboxRecord, createPendingApproval, evaluateGuardrails, getInboxById, getInboxes } from "@/lib/agent-store";
import type { Message } from "@/lib/api";

export async function POST(req: NextRequest) {
  // Prevent Open Email Relay: Require authenticated dashboard session
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized. Authentication required to send replies." }, { status: 401 });
  }

  // Rate limit: 20 replies per minute per user/IP
  const clientIp = getClientIp(req.headers);
  const rateLimit = checkRateLimit(`reply_${session.user.email || clientIp}`, 20, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many replies sent. Please wait a moment." },
      { status: 429, headers: { "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString() } }
    );
  }

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({
        error: "RESEND_API_KEY is not configured in environment variables.",
      }, { status: 500 });
    }

    const { to, subject, text, in_reply_to, inbox_id, from_email, from_name } = await req.json();

    if (!to || !text) {
      return NextResponse.json({ error: "Missing 'to' or 'text' parameter." }, { status: 400 });
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipient = String(to).trim();
    if (!EMAIL_REGEX.test(recipient)) {
      return NextResponse.json({ error: `Invalid recipient email address: '${recipient}'` }, { status: 400 });
    }

    // Prime local store from user cookie if needed
    const cookieHeader = req.cookies.get("ak_user_inboxes")?.value;
    if (cookieHeader) {
      try {
        const fromCookie = JSON.parse(decodeURIComponent(cookieHeader));
        if (Array.isArray(fromCookie)) {
          for (const item of fromCookie) {
            if (item && item.email_address) {
              createInboxRecord({
                username: item.email_address.split("@")[0],
                domain: item.email_address.split("@")[1],
                owner_name: item.owner_name,
                display_title: item.display_title,
                phone_number: item.phone_number,
                owner_email: session.user.email || undefined,
              });
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // Determine the sender address based on the current inbox
    let targetInbox = inbox_id ? getInboxById(String(inbox_id)) : undefined;
    if (!targetInbox && from_email) {
      targetInbox = getInboxById(String(from_email));
    }

    // Extract clean from address
    let rawSenderEmail = "";
    if (from_email) {
      const emailMatch = String(from_email).match(/<([^>]+)>/);
      rawSenderEmail = emailMatch ? emailMatch[1] : String(from_email);
    } else if (targetInbox?.email_address) {
      rawSenderEmail = targetInbox.email_address;
    } else {
      rawSenderEmail = "agent-01@agentkey.in";
    }

    let cleanSenderEmail = rawSenderEmail.toLowerCase().trim().replace(/[\r\n<>"]+/g, "");
    if (cleanSenderEmail && !cleanSenderEmail.includes("@")) {
      cleanSenderEmail = `${cleanSenderEmail}@agentkey.in`;
    }
    const rawSenderName = from_name || targetInbox?.owner_name || session.user.name || "AgentKey Agent";
    const cleanSenderName = String(rawSenderName).replace(/[\r\n<>"]+/g, " ").trim().slice(0, 80);
    const sender = `${cleanSenderName} <${cleanSenderEmail}>`;

    // Sanitize against SMTP header injection
    const rawSubject = subject ? (subject.startsWith("Re:") ? subject : `Re: ${subject}`) : "Re: Your message";
    const replySubject = rawSubject.replace(/[\r\n]+/g, " ").slice(0, 250);
    const cleanText = String(text).slice(0, 100000);

    // Evaluate HITL Guardrails
    const userEmail = session.user.email || undefined;
    const guardrail = evaluateGuardrails(`${replySubject} ${cleanText}`, userEmail);

    if (guardrail.action === "HOLD_FOR_APPROVAL") {
      createPendingApproval({
        inbox_id: targetInbox?.id || inbox_id || "inbox_primary_agent",
        thread_id: in_reply_to ? String(in_reply_to) : null,
        channel: "EMAIL",
        sender,
        recipient,
        subject: replySubject,
        body_text: cleanText,
        matched_rules: guardrail.matched,
        owner_email: userEmail,
      });

      return NextResponse.json({
        ok: true,
        held: true,
        message: `Message held for human approval because it matched keyword rule: ${guardrail.matched.join(", ")}`,
      });
    }

    if (guardrail.action === "NOTIFY_ONLY" && guardrail.policy?.target_destination) {
      fetch(guardrail.policy.target_destination, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `[AgentKey Alert] Outbound message to ${recipient} triggered policy: ${guardrail.matched.join(", ")}\nSubject: ${replySubject}`,
        }),
      }).catch(() => {});
    }

    // Call Resend to deliver outbound email from the agent's verified address
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        reply_to: cleanSenderEmail,
        to: [recipient],
        subject: replySubject,
        text: cleanText,
        headers: in_reply_to ? {
          "In-Reply-To": String(in_reply_to).replace(/[\r\n]+/g, ""),
          "References": String(in_reply_to).replace(/[\r\n]+/g, ""),
        } : {},
      }),
    });

    const resendData = await resendResp.json();

    if (!resendResp.ok) {
      return NextResponse.json({
        error: resendData.message || "Failed to send email via Resend",
        details: resendData,
      }, { status: resendResp.status });
    }

    // Store outbound message in local inbox store for instant UI display
    const outboundMsg: Message = {
      id: resendData.id || `msg_${Date.now()}`,
      inbox_id: targetInbox?.id || inbox_id || "inbox_primary_agent",
      thread_id: in_reply_to ? String(in_reply_to) : `thr_${Date.now()}`,
      channel: "EMAIL",
      direction: "OUTBOUND",
      sender: cleanSenderEmail,
      recipient,
      subject: replySubject,
      body_text: cleanText,
      status: "SENT",
      created_at: new Date().toISOString(),
      extracted_data: {},
    };
    storeMessage(outboundMsg);

    return NextResponse.json({
      ok: true,
      message_id: outboundMsg.id,
      from: cleanSenderEmail,
      to: recipient,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error processing reply";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
