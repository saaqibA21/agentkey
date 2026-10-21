import { NextRequest, NextResponse } from "next/server";
import { storeMessage } from "@/lib/inbox-store";
import type { Message } from "@/lib/api";

export async function POST(req: NextRequest) {
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

    const replySubject = subject ? (subject.startsWith("Re:") ? subject : `Re: ${subject}`) : "Re: Your message";
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
        to: Array.isArray(to) ? to : [to],
        subject: replySubject,
        text,
        headers: in_reply_to ? {
          "In-Reply-To": in_reply_to,
          "References": in_reply_to,
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
