import Link from "next/link";

import { ActionForm, CopyButton } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api, type Domain, type Inbox, type Overview } from "@/lib/api";

import { createInbox, deleteInbox } from "../actions";

export default async function InboxesPage() {
  const [inboxesRaw, overviewRaw, domainsRaw] = await Promise.all([
    api<Inbox[] | { data: Inbox[] }>("/inboxes?limit=200"),
    api<Overview>("/overview"),
    api<{ data: Domain[] }>("/domains"),
  ]);
  const inboxes: Inbox[] = Array.isArray(inboxesRaw)
    ? inboxesRaw
    : (Array.isArray((inboxesRaw as any)?.data) ? (inboxesRaw as any).data : []);
  const overview = overviewRaw ?? {
    workspace: { id: "ws_default", name: "Workspace", plan: "pro", outbound_enabled: true, daily_send_limit: 1000, max_inboxes: 50, inbound_daily_limit: 5000, pii_masking_enabled: true },
    usage: { sent_today: 0, received_today: 0 },
    counts: { inboxes: 1, messages: 0, pending_approvals: 0, api_keys: 1, verified_domains: 1 },
    mail_domain: "agentkey.in",
  };
  const domainsList = domainsRaw?.data ?? [];
  const verified = domainsList.filter((d) => d.status === "VERIFIED");
  const atLimit = inboxes.length >= (overview.workspace?.max_inboxes ?? 50);

  return (
    <>
      <PageHeader
        title="Inboxes"
        lead={`${inboxes.length} of ${overview.workspace.max_inboxes} in use. Provision dedicated email, WhatsApp, and SMS identities with Owner-Delegated legal binding.`}
      />

      <Card className="transition-all hover:border-line/80">
        <h2 className="mb-3 text-sm font-semibold text-ink">Provision New Agent Inbox</h2>
        <ActionForm action={createInbox} submit="Create inbox" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              name="username"
              placeholder="agent-name (e.g. triage-bot)"
              pattern="[a-z0-9][a-z0-9._\-]{1,62}[a-z0-9]"
              title="3 to 64 lowercase letters, digits, dots, dashes or underscores"
              className={`w-56 ${inputClass}`}
            />
            <span className="text-muted">@</span>
            <select name="domain" className={inputClass} aria-label="Domain">
              <option value="">{overview.mail_domain}</option>
              {verified.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/40">
            <input
              name="owner_name"
              placeholder="Owner Name (e.g. Saaqib)"
              className={`w-44 ${inputClass}`}
            />
            <input
              name="display_title"
              placeholder="Display Attribution (e.g. Saaqib (via TriageBot))"
              className={`w-64 ${inputClass}`}
            />
            <input
              name="phone_number"
              placeholder="+919876543210 (WhatsApp/SMS)"
              className={`w-48 ${inputClass}`}
            />
          </div>
        </ActionForm>
        {atLimit && (
          <p className="mt-2 text-sm text-warn">You have reached your plan&apos;s inbox limit. Delete one to create another.</p>
        )}
      </Card>

      <div className="mt-6 space-y-2.5">
        {inboxes.length === 0 && (
          <Empty title="No inboxes yet">Create one above, or let your agent call create_agent_inbox.</Empty>
        )}
        {inboxes.map((inbox: Inbox) => (
          <Card key={inbox.id} className="flex flex-wrap items-center gap-3 !py-3.5 transition-all hover:border-line/80">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/dashboard/inboxes/${inbox.id}`} className="font-mono text-sm font-semibold hover:text-accent">
                  {inbox.email_address}
                </Link>
                {inbox.owner_name && (
                  <Badge tone="purple">Owner: {inbox.owner_name}</Badge>
                )}
                {inbox.phone_number && (
                  <Badge tone="accent">WA: {inbox.phone_number}</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                Created {timeAgo(inbox.created_at)}
                {inbox.display_title && <> · <span className="text-ink/80 font-medium">&ldquo;{inbox.display_title}&rdquo;</span></>}
                {inbox.client_id && <> · client_id <code className="font-mono">{inbox.client_id}</code></>}
              </p>
            </div>
            <CopyButton value={inbox.email_address} label="Copy address" />
            <CopyButton value={inbox.id} label="Copy id" />
            <ActionForm
              action={deleteInbox} submit="Delete" variant="danger"
              confirm={`Delete ${inbox.email_address} and all its messages? The address can never be reused.`}
            >
              <input type="hidden" name="id" value={inbox.id} />
              <input type="hidden" name="purge" value="on" />
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
