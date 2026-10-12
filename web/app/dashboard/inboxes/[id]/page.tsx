import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh, CopyButton } from "@/components/client";
import { Badge, Card, Empty, PageHeader, timeAgo } from "@/components/ui";
import { api, ApiError, type Inbox, type Message } from "@/lib/api";

const statusTone = { PENDING_APPROVAL: "warn", REJECTED: "bad", FAILED: "bad" } as const;

function MessageCard({ m }: { m: Message }) {
  const x = m.extracted_data;
  const inbound = m.direction === "INBOUND";
  return (
    <Card className="!p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={inbound ? "good" : "neutral"}>{inbound ? "Received" : "Sent"}</Badge>
        {m.channel !== "EMAIL" && <Badge>{m.channel}</Badge>}
        {m.status in statusTone && (
          <Badge tone={statusTone[m.status as keyof typeof statusTone]}>{m.status.replace("_", " ").toLowerCase()}</Badge>
        )}
        <span className="min-w-0 truncate font-medium">{inbound ? m.sender : `to ${m.recipient}`}</span>
        <span className="ml-auto shrink-0 text-xs text-muted">{timeAgo(m.created_at)}</span>
      </div>
      {m.subject && <p className="mt-2 font-medium">{m.subject}</p>}

      {x.security?.prompt_injection_suspected && (
        <p className="mt-2 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn-strong">
          This message reads like instructions aimed at an AI agent. Agents are warned not to follow it.
        </p>
      )}

      {(x.otp_code || x.magic_link) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-accent/5 px-3 py-2">
          {x.otp_code && (
            <>
              <span className="text-xs text-muted">Code</span>
              <code className="font-mono text-lg font-semibold tracking-widest">{x.otp_code}</code>
              <CopyButton value={x.otp_code} />
            </>
          )}
          {x.magic_link && (
            <>
              <span className="text-xs text-muted">Link</span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs">{x.magic_link}</code>
              <CopyButton value={x.magic_link} />
            </>
          )}
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-muted">
          {x.summary || m.body_text.slice(0, 160) || "(empty message)"}
        </summary>
        {/* Rendered as text on purpose: message HTML is never trusted. */}
        <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-subtle p-3 font-sans text-sm">{m.body_text}</pre>
      </details>

      {x.attachments && x.attachments.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {x.attachments.map((a, i) => (
            <li key={a.id ?? i} className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1">
              {a.id ? (
                <a href={`/dashboard/attachments/${a.id}`} className="hover:text-accent">{a.filename}</a>
              ) : (
                <span className="text-muted">{a.filename} (not stored: too large)</span>
              )}
              <span className="text-muted">{Math.max(1, Math.round(a.size / 1024))} KB</span>
              {a.risky && <Badge tone="warn">can run code</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function InboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let inbox: Inbox;
  try {
    inbox = await api<Inbox>(`/inboxes/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) notFound();
    throw err;
  }
  const messages = await api<{ data: Message[] }>(`/inboxes/${id}/messages?limit=50`);

  return (
    <>
      <Link href="/dashboard/inboxes" className="text-sm text-muted hover:text-ink">← Inboxes</Link>
      <div className="mt-2">
        <PageHeader
          title={inbox.email_address}
          lead="Send an email to this address to see it arrive here, parsed."
          aside={
            <div className="flex items-center gap-3">
              <AutoRefresh />
              <CopyButton value={inbox.email_address} label="Copy address" />
              <CopyButton value={inbox.id} label="Copy id" />
            </div>
          }
        />
      </div>
      <div className="space-y-2">
        {messages.data.length === 0 && (
          <Empty title="Nothing here yet">New mail shows up on its own; no need to reload.</Empty>
        )}
        {messages.data.map((m) => (
          <MessageCard key={m.id} m={m} />
        ))}
      </div>
    </>
  );
}
