import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/client";
import { Badge, Card, PageHeader } from "@/components/ui";
import { InboxMessageList } from "@/components/inbox-message-list";
import { api, ApiError, type Inbox, type Message } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let inbox: Inbox;
  try {
    inbox = await api<Inbox>(`/inboxes/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) notFound();
    throw err;
  }
  const messagesRaw = await api<{ data: Message[] }>(`/inboxes/${id}/messages?limit=50`);
  const messages = messagesRaw ?? { data: [] };

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

      <InboxMessageList initialMessages={messages.data} inboxId={inbox.id} />
    </>
  );
}
