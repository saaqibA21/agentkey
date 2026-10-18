import { auth } from "@/auth";
import { ActionForm, CopyButton } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api } from "@/lib/api";

import { createAgent, deleteAgent } from "../actions";

type Agent = {
  id: string;
  agent_name: string;
  owner_name: string;
  owner_email: string;
  email_address: string;
  inbox_id: string;
  api_key_prefix: string;
  scopes: string[];
  created_at: string;
  passport?: string;
};

export default async function ApiPage() {
  const session = await auth();
  const ownerEmail = session?.user?.email ?? "";
  const ownerName = session?.user?.name || (ownerEmail ? ownerEmail.split("@")[0] : "Owner");
  const agents = await api<{ data: Agent[] }>("/agents");

  return (
    <>
      <PageHeader
        title="API & Agent Passports"
        lead="Manage autonomous AI agents with verifiable human accountability. Each agent receives a cryptographic BAGENTS Passport, dedicated email inbox, and API credentials."
      />

      {/* Uncontrolled on purpose: a server re-render after creating must not close the panel holding the new key. */}
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-500 [&::-webkit-details-marker]:hidden">
          <span className="transition group-open:rotate-45">+</span> Create API &amp; Agent
        </summary>
        <Card className="mt-4 max-w-2xl">
          <ActionForm action={createAgent} submit="Create API" className="space-y-4">
            <label className="block text-sm">
              <span className="font-medium">Agent name</span>
              <input
                name="agent_name"
                required
                maxLength={64}
                placeholder="Enter agent name, e.g. Sales Bot"
                className={`mt-1.5 w-full ${inputClass}`}
              />
              <span className="mt-1 block text-xs text-muted">The agent&apos;s email address is generated from this name.</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Owner name</span>
              <input
                name="owner_name"
                required
                maxLength={255}
                defaultValue={ownerName}
                placeholder="Your name"
                className={`mt-1.5 w-full ${inputClass}`}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Owner email</span>
              <input
                value={ownerEmail}
                readOnly
                aria-readonly
                className={`mt-1.5 w-full cursor-not-allowed opacity-70 ${inputClass}`}
              />
              <span className="mt-1 block text-xs text-muted">Taken from the authenticated account.</span>
            </label>
          </ActionForm>
        </Card>
      </details>

      <h2 className="mb-3 mt-10 font-semibold">Your agents</h2>
      <div className="space-y-4">
        {agents.data.length === 0 && (
          <Empty title="No agents yet">Press Create API to issue your first agent passport.</Empty>
        )}
        {agents.data.map((a) => {
          const verifySnippet = `// Third-Party Website Integration
const res = await fetch("http://127.0.0.1:8000/v1/auth/agent/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ passport: "${a.passport ?? ""}" })
});
const { verified, agent, owner, trust_score } = await res.json();`;

          return (
            <Card key={a.id} className="!p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{a.agent_name}</p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      99.0 Verified
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="truncate font-mono text-sm text-[#8BE8E3]">{a.email_address}</code>
                    <CopyButton value={a.email_address} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Owner {a.owner_name} ({a.owner_email}) · key {a.api_key_prefix}… · created {timeAgo(a.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {a.scopes.map((s) => (
                      <Badge key={s} tone={s === "send" ? "warn" : "neutral"}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <a
                    href={`/dashboard/inboxes/${a.inbox_id}`}
                    className="rounded-xl border border-line px-3.5 py-2 text-sm font-medium hover:bg-white/5"
                  >
                    Open inbox
                  </a>
                  <ActionForm
                    action={deleteAgent}
                    submit="Delete"
                    variant="danger"
                    confirm={`Delete ${a.agent_name}? Its passport & API key will be revoked immediately.`}
                  >
                    <input type="hidden" name="id" value={a.id} />
                  </ActionForm>
                </div>
              </div>

              {/* Verifiable Agent Passport & Third-Party Integration Drawer */}
              {a.passport && (
                <details className="group mt-4 border-t border-line/60 pt-3">
                  <summary className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#8BE8E3] hover:underline [&::-webkit-details-marker]:hidden">
                    <svg className="h-3.5 w-3.5 transition group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    Verifiable Passport &amp; Integration Snippet
                  </summary>

                  <div className="mt-3 space-y-3 rounded-xl border border-line bg-black/40 p-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                          Cryptographic Passport Token (HMAC-SHA256)
                        </span>
                        <CopyButton value={a.passport} />
                      </div>
                      <div className="mt-1.5 overflow-x-auto rounded-lg border border-line/80 bg-black/60 p-2.5 font-mono text-xs text-[#8BE8E3]">
                        {a.passport}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3 text-xs">
                      <div className="rounded-lg border border-line/50 bg-white/[0.02] p-2.5">
                        <span className="text-muted block">Accountability</span>
                        <span className="font-medium text-white">VERIFIED_HUMAN_OPERATOR</span>
                      </div>
                      <div className="rounded-lg border border-line/50 bg-white/[0.02] p-2.5">
                        <span className="text-muted block">Trust Score</span>
                        <span className="font-medium text-emerald-400">99.0 / 100</span>
                      </div>
                      <div className="rounded-lg border border-line/50 bg-white/[0.02] p-2.5">
                        <span className="text-muted block">Public Attestation</span>
                        <a
                          href={`/v1/auth/agent/verify/${a.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#8BE8E3] hover:underline"
                        >
                          View Live Badge
                        </a>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                          Third-Party Website Middleware (Node.js / Express)
                        </span>
                        <CopyButton value={verifySnippet} />
                      </div>
                      <pre className="mt-1.5 overflow-x-auto rounded-lg border border-line/80 bg-black/60 p-3 font-mono text-xs text-muted">
                        {verifySnippet}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
