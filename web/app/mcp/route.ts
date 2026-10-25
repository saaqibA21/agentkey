import { NextRequest, NextResponse } from "next/server";
import {
  createInboxRecord,
  getInboxById,
  getInboxes,
  isOperatorOrAdmin,
  validateApiKey,
} from "@/lib/agent-store";
import { getMessagesForInbox, storeMessage } from "@/lib/inbox-store";
import type { Message } from "@/lib/api";

export const dynamic = "force-dynamic";

const MCP_TOOLS = [
  {
    name: "inbox_create",
    description: "Create a dedicated email inbox for an autonomous AI agent to receive sign-up codes, OTPs, and messages.",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", description: "Desired email prefix, e.g. 'signup-bot'" },
        display_title: { type: "string", description: "Display name for the agent mailbox" },
      },
    },
  },
  {
    name: "inbox_list",
    description: "List all active agent mailboxes and email addresses.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "inbox_wait_otp",
    description: "Wait up to 30 seconds for an incoming verification code or 2FA OTP to arrive in an inbox.",
    inputSchema: {
      type: "object",
      properties: {
        inbox_id: { type: "string", description: "The inbox ID (defaults to primary agent inbox)" },
        timeout_seconds: { type: "number", description: "Seconds to wait (default 30, max 60)" },
      },
    },
  },
  {
    name: "inbox_get_messages",
    description: "Retrieve recent incoming emails and extracted zero-token OTP codes from an agent inbox.",
    inputSchema: {
      type: "object",
      properties: {
        inbox_id: { type: "string", description: "The inbox ID" },
        limit: { type: "number", description: "Number of messages to retrieve (default 20)" },
      },
    },
  },
  {
    name: "inbox_send_email",
    description: "Send an outbound email from the agent's verified email address.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Subject line" },
        text: { type: "string", description: "Plain text body of the email" },
      },
      required: ["to", "subject", "text"],
    },
  },
];

export async function GET() {
  return NextResponse.json({
    name: "AgentKey MCP Server",
    version: "1.0.0",
    transport: "http",
    tools_count: MCP_TOOLS.length,
    status: "ready",
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") || "";
  const auth = validateApiKey(authHeader);

  let jsonRpc: any;
  try {
    jsonRpc = await req.json();
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }

  const { id, method, params } = jsonRpc;

  // Initialize
  if (method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "AgentKey MCP Server", version: "1.0.0" },
      },
    });
  }

  // Tools List
  if (method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: { tools: MCP_TOOLS },
    });
  }

  // Tools Call
  if (method === "tools/call") {
    const { name, arguments: args = {} } = params || {};

    if (!auth.valid) {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: "Unauthorized. Provide a valid Bearer API key in the Authorization header." },
      });
    }

    try {
      let resultText = "";

      if (name === "inbox_create") {
        const inbox = createInboxRecord({
          username: args.username,
          display_title: args.display_title,
          owner_email: auth.ownerEmail,
        });
        resultText = JSON.stringify(inbox, null, 2);
      } else if (name === "inbox_list") {
        const inboxes = getInboxes(auth.ownerEmail);
        resultText = JSON.stringify(inboxes, null, 2);
      } else if (name === "inbox_get_messages") {
        const inboxId = args.inbox_id || "inbox_primary_agent";
        const inbox = getInboxById(inboxId);
        if (
          inbox?.owner_email &&
          auth.ownerEmail &&
          inbox.owner_email.toLowerCase().trim() !== auth.ownerEmail.toLowerCase().trim() &&
          !isOperatorOrAdmin(auth.ownerEmail)
        ) {
          resultText = JSON.stringify({ error: "Forbidden: You do not own this inbox." });
        } else {
          const messages = getMessagesForInbox(inboxId, args.limit || 20, inbox?.email_address);
          resultText = JSON.stringify({ count: messages.length, messages }, null, 2);
        }
      } else if (name === "inbox_wait_otp") {
        const inboxId = args.inbox_id || "inbox_primary_agent";
        const inbox = getInboxById(inboxId);
        if (
          inbox?.owner_email &&
          auth.ownerEmail &&
          inbox.owner_email.toLowerCase().trim() !== auth.ownerEmail.toLowerCase().trim() &&
          !isOperatorOrAdmin(auth.ownerEmail)
        ) {
          resultText = JSON.stringify({ error: "Forbidden: You do not own this inbox." });
        } else {
          const timeout = Math.min(Number(args.timeout_seconds || 15), 25);
          const deadline = Date.now() + timeout * 1000;
          let foundOtp: string | null = null;

          while (Date.now() <= deadline) {
            const messages = getMessagesForInbox(inboxId, 10, inbox?.email_address);
            for (const msg of messages) {
              const otp =
                msg.extracted_data?.otp_code ||
                msg.body_text?.match(/\b\d{4,8}\b/)?.[0] ||
                (msg.subject ? msg.subject.match(/\b\d{4,8}\b/)?.[0] : null);
              if (otp) {
                foundOtp = otp;
                break;
              }
            }
            if (foundOtp) break;
            await new Promise((r) => setTimeout(r, 1000));
          }

          resultText = foundOtp
            ? JSON.stringify({ success: true, otp_code: foundOtp })
            : JSON.stringify({ success: false, detail: "Timeout waiting for OTP code." });
        }
      } else if (name === "inbox_send_email") {
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const to = String(args.to || "").trim();
        if (!to || !EMAIL_REGEX.test(to)) {
          throw new Error(`Invalid recipient email address format: '${to}'.`);
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          throw new Error("RESEND_API_KEY is not configured on the server.");
        }

        const cleanSubject = String(args.subject || "Message from AgentKey").replace(/[\r\n]+/g, " ").slice(0, 250);
        const cleanText = String(args.text || "").slice(0, 100000);

        const inboxId = String(args.inbox_id || "inbox_primary_agent");
        const inbox = getInboxById(inboxId);
        const rawSenderEmail = inbox?.email_address || (String(args.from || "").includes("@") ? String(args.from) : "agent-01@agentkey.in");
        const cleanSenderEmail = rawSenderEmail.toLowerCase().trim().replace(/[\r\n<>"]+/g, "");
        const rawSenderName = inbox?.owner_name || args.from_name || "AgentKey";
        const cleanSenderName = String(rawSenderName).replace(/[\r\n<>"]+/g, " ").trim().slice(0, 80);
        const senderHeader = `${cleanSenderName} <${cleanSenderEmail}>`;

        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderHeader,
            reply_to: cleanSenderEmail,
            to: [to],
            subject: cleanSubject,
            text: cleanText,
          }),
        });
        const resendData = await resendResp.json();
        if (!resendResp.ok) {
          throw new Error(resendData.message || "Failed to send email via Resend.");
        }

        const outboundMsg: Message = {
          id: resendData.id || `msg_${Date.now()}`,
          inbox_id: inbox?.id || inboxId,
          thread_id: `thr_${Date.now()}`,
          channel: "EMAIL",
          direction: "OUTBOUND",
          sender: cleanSenderEmail,
          recipient: to,
          subject: cleanSubject,
          body_text: cleanText,
          status: "SENT",
          created_at: new Date().toISOString(),
          extracted_data: {},
        };
        storeMessage(outboundMsg);
        resultText = JSON.stringify({ status: "SENT", email_id: outboundMsg.id, from: cleanSenderEmail, to });
      } else {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Tool '${name}' not found` },
        });
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: resultText }],
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tool execution failed";
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: msg },
      });
    }
  }

  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found" },
  });
}
