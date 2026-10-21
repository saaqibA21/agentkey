import { NextRequest, NextResponse } from "next/server";
import { storeMessage } from "@/lib/inbox-store";
import { dispatchWebhooks, safeEqual } from "@/lib/agent-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import type { Message } from "@/lib/api";

function extractEdgeData(body: string, subject: string) {
  const combined = `${subject}\n${body}`;

  // Deterministic OTP pattern extraction
  // Matches 4-8 digit codes preceded by keywords, or standalone 6-digit numeric OTP
  let otp_code: string | undefined;
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

  // Magic link extraction (verification, token, signin, login links)
  let magic_link: string | undefined;
  const magicLinkMatch = combined.match(
    /(https?:\/\/[^\s"'<>]*(?:verify|token|auth|magic|login|signin|confirm|callback)[^\s"'<>]*)/i
  );
  if (magicLinkMatch) {
    magic_link = magicLinkMatch[1];
  }

  // Prompt injection detection signals
  const injectionPatterns = [
    /ignore (?:all )?previous instructions/i,
    /disregard prior directives/i,
    /system override/i,
    /you are now in developer mode/i,
    /<script[\s>]/i,
  ];
  const detectedSignals = injectionPatterns
    .filter((pat) => pat.test(combined))
    .map((pat) => pat.source);

  return {
    otp_code,
    magic_link,
    security: detectedSignals.length > 0 ? {
      prompt_injection_suspected: true,
      signals: detectedSignals,
    } : undefined,
  };
}

function parseMimeContent(rawString: string) {
  // Simple deterministic MIME parser
  const headerBodySplit = rawString.indexOf("\r\n\r\n");
  const splitIndex = headerBodySplit !== -1 ? headerBodySplit : rawString.indexOf("\n\n");

  let headersPart = "";
  let bodyPart = "";

  if (splitIndex !== -1) {
    headersPart = rawString.slice(0, splitIndex);
    bodyPart = rawString.slice(splitIndex + (headerBodySplit !== -1 ? 4 : 2));
  } else {
    bodyPart = rawString;
  }

  // Parse headers
  let subject = "";
  let sender = "";
  const headerLines = headersPart.split(/\r?\n/);
  for (const line of headerLines) {
    if (/^subject:/i.test(line)) {
      subject = line.replace(/^subject:\s*/i, "").trim();
    } else if (/^from:/i.test(line)) {
      sender = line.replace(/^from:\s*/i, "").trim();
    }
  }

  // Clean body text (strip multipart boundary noise if present)
  let cleanBody = bodyPart;
  if (bodyPart.includes("Content-Type: text/plain") || bodyPart.includes("--")) {
    const lines = bodyPart.split(/\r?\n/);
    const contentLines: string[] = [];
    let capturing = false;

    for (const line of lines) {
      if (line.includes("Content-Type: text/plain")) {
        capturing = true;
        continue;
      }
      if (capturing && (line.startsWith("--") || line.includes("Content-Type: text/html"))) {
        capturing = false;
        break;
      }
      if (capturing && !line.startsWith("Content-") && !line.startsWith("charset=")) {
        contentLines.push(line);
      }
    }
    if (contentLines.length > 0) {
      cleanBody = contentLines.join("\n").trim();
    }
  }

  return {
    subject: subject || "No Subject",
    sender: sender || "Unknown Sender",
    body: cleanBody.trim(),
  };
}

export async function POST(req: NextRequest) {
  // Rate limit: 120 ingest requests per minute per IP
  const clientIp = getClientIp(req.headers);
  const rateLimit = checkRateLimit(`ingest_${clientIp}`, 120, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many ingestion requests. Rate limit exceeded." },
      { status: 429, headers: { "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString() } }
    );
  }

  // Shared secret verification if INGEST_SECRET is configured in environment
  const expectedSecret = process.env.INGEST_SECRET;
  if (expectedSecret) {
    const providedSecret =
      req.headers.get("x-ingest-secret") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      "";
    if (!safeEqual(providedSecret, expectedSecret)) {
      return NextResponse.json({ error: "Unauthorized. Invalid ingest secret." }, { status: 401 });
    }
  }

  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload exceeds 10MB limit." }, { status: 413 });
    }

    const payload = await req.json();
    let bodyText = "";
    let subject = "Inbound Email";
    let sender = (payload.envelope_from || "external@sender.com").slice(0, 320);
    const recipient = (payload.envelope_to || "agent-01@agentkey.in").slice(0, 320);

    if (payload.raw) {
      // Decode Base64 raw MIME
      try {
        const decoded = Buffer.from(payload.raw, "base64").toString("utf-8");
        const parsed = parseMimeContent(decoded);
        if (parsed.subject) subject = parsed.subject.slice(0, 500);
        if (parsed.sender) sender = parsed.sender.slice(0, 320);
        bodyText = parsed.body.slice(0, 100000);
      } catch {
        bodyText = (payload.text || payload.body || "Raw message payload").slice(0, 100000);
      }
    } else {
      bodyText = (payload.text || payload.body || "").slice(0, 100000);
      if (payload.subject) subject = String(payload.subject).slice(0, 500);
    }

    const extracted = extractEdgeData(bodyText, subject);

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      inbox_id: "inbox_primary_agent",
      thread_id: `thr_${Date.now()}`,
      channel: "EMAIL",
      direction: "INBOUND",
      sender,
      recipient,
      subject,
      body_text: bodyText,
      status: "DELIVERED",
      created_at: new Date().toISOString(),
      extracted_data: extracted,
    };

    storeMessage(message);

    // Dispatch to registered webhooks in background
    dispatchWebhooks("message.received", message);
    if (extracted.otp_code) {
      dispatchWebhooks("otp.extracted", { ...message, otp_code: extracted.otp_code });
    }
    if (extracted.magic_link) {
      dispatchWebhooks("magic_link.extracted", { ...message, magic_link: extracted.magic_link });
    }

    return NextResponse.json({
      status: "stored",
      message_id: message.id,
      inbox: message.inbox_id,
      extracted,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "AgentKey Inbound Ingest API",
    endpoint: "/api/inbound/ingest",
  });
}
