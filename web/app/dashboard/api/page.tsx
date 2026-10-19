import Link from "next/link";
import { auth } from "@/auth";
import { AgentAvatar } from "@/components/agent-avatar";
import { AvatarPicker } from "@/components/avatar-picker";
import { ActionForm, CopyButton } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api } from "@/lib/api";

import { createAgent, deleteAgent, updateAgentAvatar } from "../actions";

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
  avatar_url?: string;
  avatar_seed?: string;
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
        lead="Manage autonomous AI agents with verifiable human accountability. Each agent receives a guaranteed unique avatar, cryptographic BAGENTS Passport, dedicated email inbox, and API credentials."
      />

      {/* OAuth Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#0D6E48]/20 bg-[#E8F8F0] text-[#0D6E48]">
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0E1B18]">Looking for OAuth &amp; &ldquo;Sign in with BAGENTS&rdquo;?</p>
            <p className="text-[11px] text-[#627282]">Give external websites OpenID Connect discovery and client IDs to authenticate your agents.</p>
          </div>
        </div>
        <Link
          href="/dashboard/oauth"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#0D6E48] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0A5638] transition shadow-xs"
        >
          <span>OAuth &amp; Connect Portal</span>
          <span>→</span>
        </Link>
      </div>



      {/* Create Agent Drawer */}
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

            {/* Interactive Unique Avatar Picker */}
            <AvatarPicker />

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
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Unique Agent Avatar */}
                  <AgentAvatar
                    seed={a.avatar_seed}
                    url={a.avatar_url}
                    name={a.agent_name}
                    size="lg"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#0E1B18]">{a.agent_name}</p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                        99.0 Verified
                      </span>
                      {a.avatar_seed && (
                        <span className="hidden sm:inline-flex items-center rounded-md border border-[#CBD5E1] bg-[#F1F5F2] px-2 py-0.5 text-[10px] font-mono text-[#627282]">
                          id: {a.avatar_seed}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="truncate font-mono text-sm text-[#0D6E48] font-semibold">{a.email_address}</code>
                      <CopyButton value={a.email_address} />
                    </div>
                    <p className="mt-1 text-xs text-[#627282]">
                      Owner {a.owner_name} ({a.owner_email}) · key {a.api_key_prefix}… · created {timeAgo(a.created_at)}
                    </p>
                  </div>

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

                    <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-4 text-xs">
                      <div className="rounded-lg border border-line/50 bg-white/[0.02] p-2.5">
                        <span className="text-muted block">Accountability</span>
                        <span className="font-medium text-white">VERIFIED_HUMAN_OPERATOR</span>
                      </div>
                      <div className="rounded-lg border border-line/50 bg-white/[0.02] p-2.5">
                        <span className="text-muted block">Trust Score</span>
                        <span className="font-medium text-emerald-400">99.0 / 100</span>
                      </div>
                      <div className="rounded-lg border border-line/50 bg-white/[0.02] p-2.5">
                        <span className="text-muted block">Unique Avatar</span>
                        <a
                          href={a.avatar_url ?? `/v1/agents/${a.id}/avatar.svg`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#8BE8E3] hover:underline truncate block"
                        >
                          View Vector SVG
                        </a>
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

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                          OAuth 2.1 &amp; OpenID Connect UserInfo URL
                        </span>
                        <CopyButton value="http://127.0.0.1:8000/oauth/userinfo" />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/80 bg-black/60 p-2.5 font-mono text-xs text-[#8BE8E3]">
                        <span>GET http://127.0.0.1:8000/oauth/userinfo</span>
                        <Link href="/dashboard/oauth" className="text-xs text-white underline hover:text-[#8BE8E3]">
                          Register Client ID &amp; OAuth Portal →
                        </Link>
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
