import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createInboxRecord, getInboxById, getInboxes, isOperatorOrAdmin, validateApiKey } from "@/lib/agent-store";
import { getMessagesForInbox } from "@/lib/inbox-store";
import type { Message } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Enforce authentication via Dashboard Session or Bearer API Key
  const session = await auth();
  const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key") || "";
  const apiKeyAuth = authHeader ? validateApiKey(authHeader) : null;

  if (!session?.user && (!apiKeyAuth || !apiKeyAuth.valid)) {
    return NextResponse.json(
      { error: "Unauthorized. Authentication required to access messages." },
      { status: 401 }
    );
  }

  const userEmail = (session?.user?.email || apiKeyAuth?.ownerEmail || "").toLowerCase().trim();
  const isAdmin = isOperatorOrAdmin(userEmail);

  // Prime local container store from user cookie for cross-container consistency
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
              owner_email: item.owner_email || userEmail,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const searchParams = req.nextUrl.searchParams;
  const inboxId = searchParams.get("inbox_id") || searchParams.get("inbox");
  const reqRecipient = (searchParams.get("recipient") || searchParams.get("email") || "").toLowerCase().trim();

  let targetInbox = inboxId ? getInboxById(inboxId) : undefined;
  if (!targetInbox && reqRecipient) {
    targetInbox = getInboxById(reqRecipient);
  }

  // Tenant authorization check
  if (targetInbox && targetInbox.owner_email && !isAdmin) {
    if (targetInbox.owner_email.toLowerCase().trim() !== userEmail) {
      return NextResponse.json(
        { error: "Forbidden. You do not have permission to view messages from this inbox.", data: [] },
        { status: 403 }
      );
    }
  }

  const userInboxes = getInboxes(userEmail);
  const targetEmail = targetInbox
    ? targetInbox.email_address.toLowerCase().trim()
    : reqRecipient || "";

  const allowedEmails = targetInbox
    ? [targetInbox.email_address.toLowerCase().trim()]
    : targetEmail
    ? [targetEmail, ...userInboxes.map((i) => i.email_address.toLowerCase().trim())]
    : userInboxes.map((i) => i.email_address.toLowerCase().trim());

  let workerMessages: Message[] = [];
  try {
    const workerQuery = targetEmail ? `?recipient=${encodeURIComponent(targetEmail)}` : "";
    const workerUrl = `https://agentkey-email-worker.saaqibheroindia.workers.dev/messages${workerQuery}`;
    const res = await fetch(workerUrl, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        workerMessages = json.data;
      }
    }
  } catch (err: unknown) {
    console.error("Worker fetch failed:", err);
  }

  // Filter worker messages strictly against allowed tenant inboxes
  const filteredWorker = workerMessages.filter((m: Message) => {
    if (!m) return false;
    const recipient = (m.recipient || "").toLowerCase().trim();
    if (targetEmail && recipient.includes(targetEmail)) {
      return true;
    }
    if (allowedEmails.some((allowed) => recipient.includes(allowed))) {
      return true;
    }
    if (isAdmin) {
      return true;
    }
    if (targetInbox && targetInbox.id === "inbox_primary_agent" && m.inbox_id === "inbox_primary_agent") {
      return recipient.includes("agent-01@agentkey.in");
    }
    return false;
  });

  // Get locally stored messages for target inbox or user inboxes
  const localMessages: Message[] = targetInbox
    ? getMessagesForInbox(targetInbox.id)
    : userInboxes.flatMap((i) => getMessagesForInbox(i.id));

  // Merge and deduplicate by message ID
  const seenIds = new Set<string>();
  const merged: Message[] = [];
  for (const m of [...filteredWorker, ...localMessages]) {
    if (m && m.id && !seenIds.has(m.id)) {
      seenIds.add(m.id);
      merged.push(m);
    }
  }

  // Sort newest first
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json(
    { data: merged },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
