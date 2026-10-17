import { auth } from "@/auth";
import { ActionForm, CopyButton } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api } from "@/lib/api";

import { createAgent, deleteAgent } from "../actions";

type Agent = {
  id: string; agent_name: string; owner_name: string; owner_email: string; email_address: string;
  inbox_id: string; api_key_prefix: string; scopes: string[]; created_at: string;
};

export default async function ApiPage() {
  const session = await auth();
  const ownerEmail = session?.user?.email ?? "";
  const ownerName = session?.user?.name ?? "";
  const agents = await api<{ data: Agent[] }>("/agents");

  return (
    <>
      <PageHeader
        title="API"
        lead="Create an API for each AI agent. Every agent gets its own email address and its own API key, tied to you as the owner."
      />

      {/* Uncontrolled on purpose: a server re-render after creating must not close the panel holding the new key. */}
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-500 [&::-webkit-details-marker]:hidden">
          <span className="transition group-open:rotate-45">+</span> Create API
        </summary>
        <Card className="mt-4 max-w-2xl">
          <ActionForm action={createAgent} submit="Create API" className="space-y-4">
            <label className="block text-sm">
              <span className="font-medium">Agent name</span>
              <input name="agent_name" required maxLength={64} placeholder="Enter agent name, e.g. Sales Bot"
                     className={`mt-1.5 w-full ${inputClass}`} />
              <span className="mt-1 block text-xs text-muted">The agent&apos;s email address is made from this name.</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Owner name</span>
              <input name="owner_name" required maxLength={255} defaultValue={ownerName} placeholder="Your name"
                     className={`mt-1.5 w-full ${inputClass}`} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Owner email</span>
              <input value={ownerEmail} readOnly aria-readonly
                     className={`mt-1.5 w-full cursor-not-allowed opacity-70 ${inputClass}`} />
              <span className="mt-1 block text-xs text-muted">Taken from the account you signed in with.</span>
            </label>
          </ActionForm>
        </Card>
      </details>

      <h2 className="mb-3 mt-10 font-semibold">Your agents</h2>
      <div className="space-y-2">
        {agents.data.length === 0 && (
          <Empty title="No agents yet">Press Create API to make your first one.</Empty>
        )}
        {agents.data.map((a) => (
          <Card key={a.id} className="flex flex-wrap items-center gap-4 !py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.agent_name}</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="truncate font-mono text-sm text-[#8BE8E3]">{a.email_address}</code>
                <CopyButton value={a.email_address} />
              </div>
              <p className="mt-1 text-xs text-muted">
                Owner {a.owner_name} ({a.owner_email}) · key {a.api_key_prefix}… · created {timeAgo(a.created_at)}
              </p>
            </div>
            <div className="flex gap-1">
              {a.scopes.map((s) => (
                <Badge key={s} tone={s === "send" ? "warn" : "neutral"}>{s}</Badge>
              ))}
            </div>
            <a href={`/dashboard/inboxes/${a.inbox_id}`}
               className="rounded-xl border border-line px-3.5 py-2 text-sm font-medium hover:bg-white/5">
              Open inbox
            </a>
            <ActionForm action={deleteAgent} submit="Delete" variant="danger"
                        confirm={`Delete ${a.agent_name}? Its API key stops working and ${a.email_address} is retired for good.`}>
              <input type="hidden" name="id" value={a.id} />
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
