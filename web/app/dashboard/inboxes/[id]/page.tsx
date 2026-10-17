import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, AutoRefresh, CopyButton } from "@/components/client";
import { Badge, Card, Empty, PageHeader, timeAgo } from "@/components/ui";
import { api, ApiError, type Inbox, type Message } from "@/lib/api";
import { resolveInboxLink } from "../../actions";

const statusTone = { PENDING_APPROVAL: "warn", REJECTED: "bad", FAILED: "bad" } as const;

function MessageCard({ m, inboxId }: { m: Message; inboxId: string }) {
  const x = m.extracted_data;
  const inbound = m.direction === "INBOUND";

  return (
    <Card className="!p-4 transition-all hover:border-line/80">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={inbound ? "good" : "neutral"}>{inbound ? "Received" : "Sent"}</Badge>
        {m.channel !== "EMAIL" && <Badge tone="accent">{m.channel}</Badge>}
        {m.status in statusTone && (
          <Badge tone={statusTone[m.status as keyof typeof statusTone]}>{m.status.replace("_", " ").toLowerCase()}</Badge>
        )}
        <span className="min-w-0 truncate font-medium text-ink">{inbound ? m.sender : `to ${m.recipient}`}</span>
        <span className="ml-auto shrink-0 text-xs text-muted">{timeAgo(m.created_at)}</span>
      </div>
      {m.subject && <p className="mt-2 font-semibold text-ink">{m.subject}</p>}

      {x.security?.prompt_injection_suspected && (
        <div className="mt-2.5 rounded-lg border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-xs text-warn-strong">
          <p className="font-semibold">⚠️ Prompt Injection Signal Detected</p>
          <p className="mt-0.5">This message reads like adversarial instructions aimed at hijacking an AI agent. Boundaries enforced.</p>
        </div>
      )}

      {(x.otp_code || x.magic_link) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-lg border border-teal-500/20 bg-teal-500/5 px-3.5 py-2.5">
          {x.otp_code && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">Edge OTP</span>
              <code className="font-mono text-lg font-bold tracking-widest text-teal-600 dark:text-teal-400">{x.otp_code}</code>
              <CopyButton value={x.otp_code} />
            </div>
          )}
          {x.magic_link && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">Magic Link</span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink/80">{x.magic_link}</code>
              <CopyButton value={x.magic_link} />
              <ActionForm action={resolveInboxLink} submit="Resolve & Save to Vault" variant="default">
                <input type="hidden" name="inbox_id" value={inboxId} />
                <input type="hidden" name="url" value={x.magic_link} />
              </ActionForm>
            </div>
          )}
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">
          {x.summary || m.body_text.slice(0, 160) || "(empty message body)"}
        </summary>
        {/* Rendered as text on purpose: message HTML is never trusted. */}
        <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-line/60 bg-subtle p-3.5 font-sans text-xs leading-relaxed text-ink/90">
          {m.body_text}
        </pre>
      </details>

      {x.attachments && x.attachments.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {x.attachments.map((a, i) => (
            <li key={a.id ?? i} className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1">
              {a.id ? (
                <a href={`/dashboard/attachments/${a.id}`} className="font-medium hover:text-accent">{a.filename}</a>
              ) : (
                <span className="text-muted">{a.filename} (large)</span>
              )}
              <span className="text-muted">· {Math.max(1, Math.round(a.size / 1024))} KB</span>
              {a.risky && <Badge tone="warn">code</Badge>}
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
      <Link href="/dashboard/inboxes" className="text-xs font-medium text-muted hover:text-ink">
        ← Back to Inboxes
      </Link>
      <div className="mt-2.5">
        <PageHeader
          title={inbox.email_address}
          lead="Real-time multi-channel inbox. Inbound messages are deterministic-parsed at wire speed with zero token waste."
          aside={
            <div className="flex items-center gap-2">
              <AutoRefresh />
              <CopyButton value={inbox.email_address} label="Copy address" />
              <CopyButton value={inbox.id} label="Copy id" />
            </div>
          }
        />
      </div>

      {/* Owner-Delegated Identity Card */}
      {(inbox.owner_name || inbox.display_title || inbox.phone_number) && (
        <Card className="mb-5 border-purple-500/20 bg-purple-500/5 !p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Owner-Delegated Identity (OD-ID)
                </span>
                <Badge tone="purple">Legally Bound</Badge>
              </div>
              <p className="mt-1 text-sm font-medium text-ink">
                {inbox.display_title || `Operated by ${inbox.owner_name}`}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
                {inbox.owner_name && <span>Principal: <b className="text-ink">{inbox.owner_name}</b></span>}
                {inbox.phone_number && <span>Linked WhatsApp/SMS: <b className="text-ink">{inbox.phone_number}</b></span>}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted">Headers automatically injected:</span>
              <p className="font-mono text-xs text-ink/80">X-Agent-Owner: {inbox.owner_name}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {messages.data.length === 0 && (
          <Empty title="No messages in this inbox yet">
            Send an email or SMS to this identity to see it arrive here in real time.
          </Empty>
        )}
        {messages.data.map((m) => (
          <MessageCard key={m.id} m={m} inboxId={inbox.id} />
        ))}
      </div>
    </>
  );
}
