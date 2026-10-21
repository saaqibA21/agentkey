"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Empty, timeAgo } from "@/components/ui";
import { CopyButton, ActionForm } from "@/components/client";
import { resolveInboxLink } from "@/app/dashboard/actions";
import type { Message } from "@/lib/api";

const statusTone = { PENDING_APPROVAL: "warn", REJECTED: "bad", FAILED: "bad" } as const;

export function InboxMessageList({
  initialMessages,
  inboxId,
}: {
  initialMessages: Message[];
  inboxId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function fetchLatest() {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/inbound/messages?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          setMessages(json.data);
          setLastUpdated(new Date());
        }
      }
    } catch (e) {
      console.error("Failed to poll messages:", e);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    // Initial fetch to get latest messages immediately on load
    fetchLatest();

    // Auto-refresh interval every 3 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLatest();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            Live Stream
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {messages.length} {messages.length === 1 ? "Message" : "Messages"}
          </span>
        </div>

        <button
          onClick={() => fetchLatest()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-subtle disabled:opacity-50"
        >
          <svg
            className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
          {isRefreshing ? "Checking..." : "Refresh"}
        </button>
      </div>

      {messages.length === 0 ? (
        <Empty title="No messages in this inbox yet">
          Send an email or SMS to this identity to see it arrive here in real time.
        </Empty>
      ) : (
        messages.map((m) => {
          const x = m.extracted_data || {};
          const inbound = m.direction === "INBOUND";

          return (
            <Card key={m.id} className="!p-4 transition-all hover:border-line/80">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={inbound ? "good" : "neutral"}>{inbound ? "Received" : "Sent"}</Badge>
                {m.channel !== "EMAIL" && <Badge tone="accent">{m.channel}</Badge>}
                {m.status in statusTone && (
                  <Badge tone={statusTone[m.status as keyof typeof statusTone]}>
                    {m.status.replace("_", " ").toLowerCase()}
                  </Badge>
                )}
                <span className="min-w-0 truncate font-medium text-ink">
                  {inbound ? m.sender : `to ${m.recipient}`}
                </span>
                <span className="ml-auto shrink-0 text-xs text-muted">
                  {timeAgo(m.created_at)}
                </span>
              </div>

              {m.subject && <p className="mt-2 font-semibold text-ink">{m.subject}</p>}

              {x.security?.prompt_injection_suspected && (
                <div className="mt-2.5 rounded-lg border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-xs text-warn-strong">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" x2="12" y1="9" y2="13" />
                      <line x1="12" x2="12.01" y1="17" y2="17" />
                    </svg>
                    <span>Prompt Injection Signal Detected</span>
                  </div>
                  <p className="mt-0.5">
                    This message reads like adversarial instructions aimed at hijacking an AI agent. Boundaries enforced.
                  </p>
                </div>
              )}

              {(x.otp_code || x.magic_link) && (
                <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-lg border border-teal-500/20 bg-teal-500/5 px-3.5 py-2.5">
                  {x.otp_code && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted uppercase tracking-wider">
                        Edge OTP
                      </span>
                      <code className="font-mono text-lg font-bold tracking-widest text-teal-600 dark:text-teal-400">
                        {x.otp_code}
                      </code>
                      <CopyButton value={x.otp_code} />
                    </div>
                  )}
                  {x.magic_link && (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted uppercase tracking-wider">
                        Magic Link
                      </span>
                      <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink/80">
                        {x.magic_link}
                      </code>
                      <CopyButton value={x.magic_link} />
                      <ActionForm action={resolveInboxLink} submit="Resolve & Save to Vault" variant="primary">
                        <input type="hidden" name="inbox_id" value={inboxId} />
                        <input type="hidden" name="url" value={x.magic_link} />
                      </ActionForm>
                    </div>
                  )}
                </div>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">
                  {x.summary || m.body_text?.slice(0, 160) || "(empty message body)"}
                </summary>
                <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-line/60 bg-subtle p-3.5 font-sans text-xs leading-relaxed text-ink/90">
                  {m.body_text}
                </pre>
              </details>
            </Card>
          );
        })
      )}
    </div>
  );
}
