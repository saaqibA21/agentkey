import Link from "next/link";

import { ActionForm, CopyButton } from "@/components/client";
import { Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api, type Domain, type Inbox, type Overview } from "@/lib/api";

import { createInbox, deleteInbox } from "../actions";

export default async function InboxesPage() {
  const [inboxes, overview, domains] = await Promise.all([
    api<Inbox[]>("/inboxes?limit=200"),
    api<Overview>("/overview"),
    api<{ data: Domain[] }>("/domains"),
  ]);
  const verified = domains.data.filter((d) => d.status === "VERIFIED");
  const atLimit = inboxes.length >= overview.workspace.max_inboxes;

  return (
    <>
      <PageHeader
        title="Inboxes"
        lead={`${inboxes.length} of ${overview.workspace.max_inboxes} in use. Each inbox is a real address your agent can receive on.`}
      />

      <Card>
        <ActionForm action={createInbox} submit="Create inbox" className="flex flex-wrap items-center gap-2">
          <input name="username" placeholder="name (optional)" pattern="[a-z0-9][a-z0-9._\-]{1,62}[a-z0-9]"
                 title="3 to 64 lowercase letters, digits, dots, dashes or underscores" className={`w-48 ${inputClass}`} />
          <span className="text-muted">@</span>
          <select name="domain" className={inputClass} aria-label="Domain">
            <option value="">{overview.mail_domain}</option>
            {verified.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </ActionForm>
        {atLimit && (
          <p className="mt-2 text-sm text-muted">You have reached your plan&apos;s inbox limit. Delete one to create another.</p>
        )}
      </Card>

      <div className="mt-4 space-y-2">
        {inboxes.length === 0 && (
          <Empty title="No inboxes yet">Create one above, or let your agent call create_agent_inbox.</Empty>
        )}
        {inboxes.map((inbox) => (
          <Card key={inbox.id} className="flex flex-wrap items-center gap-3 !py-3">
            <div className="min-w-0 flex-1">
              <Link href={`/dashboard/inboxes/${inbox.id}`} className="font-mono text-sm font-medium hover:text-accent">
                {inbox.email_address}
              </Link>
              <p className="text-xs text-muted">
                Created {timeAgo(inbox.created_at)}
                {inbox.client_id && <> · client_id {inbox.client_id}</>}
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
