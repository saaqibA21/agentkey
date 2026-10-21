import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storeMessage } from "@/lib/inbox-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
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

    const { to, subject, text, in_reply_to } = await req.json();

    if (!to || !text) {
      return NextResponse.json({ error: "Missing 'to' or 'text' parameter." }, { status: 400 });
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipient = String(to).trim();
    if (!EMAIL_REGEX.test(recipient)) {
      return NextResponse.json({ error: `Invalid recipient email address: '${recipient}'` }, { status: 400 });
    }

    // Sanitize against SMTP header injection
    const rawSubject = subject ? (subject.startsWith("Re:") ? subject : `Re: ${subject}`) : "Re: Your message";
    const replySubject = rawSubject.replace(/[\r\n]+/g, " ").slice(0, 250);
    const cleanText = String(text).slice(0, 100000);
    const sender = "Agent-01 <agent-01@agentkey.in>";

    // Call Resend to deliver outbound email
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
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

    // Record outbound message in our store
    const outboundMsg: Message = {
      id: resendData.id || `msg_out_${Date.now()}`,
      inbox_id: "inbox_primary_agent",
      thread_id: in_reply_to || `thr_${Date.now()}`,
      channel: "EMAIL",
      direction: "OUTBOUND",
      sender: "agent-01@agentkey.in",
      recipient: Array.isArray(to) ? to.join(", ") : to,
      subject: replySubject,
      body_text: text,
      status: "SENT",
      created_at: new Date().toISOString(),
      extracted_data: {},
    };

    storeMessage(outboundMsg);

    return NextResponse.json({
      status: "sent",
      id: outboundMsg.id,
      resend_id: resendData.id,
      recipient: outboundMsg.recipient,
      subject: outboundMsg.subject,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
