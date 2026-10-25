"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentAvatar } from "@/components/agent-avatar";
import { AvatarPicker } from "@/components/avatar-picker";
import { CopyButton } from "@/components/client";
import { Badge, Card, Empty, inputClass, timeAgo } from "@/components/ui";

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

export function ApiManager({
  initialAgents,
  ownerEmail,
  ownerName: defaultOwnerName,
  publicApiUrl,
}: {
  initialAgents: Agent[];
  ownerEmail: string;
  ownerName: string;
  publicApiUrl: string;
}) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents || []);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [ownerName, setOwnerName] = useState(defaultOwnerName || "Operator");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<{
    agent: Agent;
    api_key: string;
  } | null>(null);

  const handleCreateAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!agentName.trim()) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const avatar_seed = formData.get("avatar_seed")?.toString();
    const avatar_url = formData.get("avatar_url")?.toString();

    setCreating(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: agentName.trim(),
          owner_name: ownerName.trim(),
          avatar_seed,
          avatar_url,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create agent");
      }

      if (data.agent) {
        setAgents((prev) => [data.agent, ...prev]);
        setCreatedSecret({
          agent: data.agent,
          api_key: data.api_key,
        });
      }
      setAgentName("");
      setOpenDrawer(false);
    } catch (err: any) {
      setError(err.message || "Failed to issue agent passport.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAgent = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? Its passport & API key will be revoked immediately.`)) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/agents?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete agent");
      }

      setAgents((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete agent.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Newly Created Agent Credentials Banner */}
      {createdSecret && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AgentAvatar
                seed={createdSecret.agent.avatar_seed}
                url={createdSecret.agent.avatar_url}
                name={createdSecret.agent.agent_name}
                size="md"
              />
              <div>
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Agent &ldquo;{createdSecret.agent.agent_name}&rdquo; Provisioned Successfully
                </h3>
                <p className="text-xs text-muted">
                  Save your credentials. The API key is shown once and cannot be recovered.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCreatedSecret(null)}
              className="text-xs text-muted hover:text-ink font-medium"
            >
              Dismiss
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-emerald-500/30 bg-white dark:bg-black/40 p-3">
              <span className="text-muted block text-[11px] font-semibold uppercase">Live API Key</span>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                  {createdSecret.api_key}
                </code>
                <CopyButton value={createdSecret.api_key} />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-white dark:bg-black/40 p-3">
              <span className="text-muted block text-[11px] font-semibold uppercase">Agent Email</span>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                  {createdSecret.agent.email_address}
                </code>
                <CopyButton value={createdSecret.agent.email_address} />
              </div>
            </div>
          </div>

          {createdSecret.agent.passport && (
            <div className="rounded-xl border border-emerald-500/30 bg-white dark:bg-black/40 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted block text-[11px] font-semibold uppercase">Verifiable Passport Token</span>
                <CopyButton value={createdSecret.agent.passport} />
              </div>
              <code className="mt-1 block font-mono text-emerald-700 dark:text-emerald-400 truncate">
                {createdSecret.agent.passport}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Drawer / Creator Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setOpenDrawer(!openDrawer)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#18191B] border border-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black active:scale-95"
        >
          <span className={`transition-transform duration-150 ${openDrawer ? "rotate-45" : ""}`}>+</span>
          Create API &amp; Agent
        </button>

        {openDrawer && (
          <Card className="mt-4 max-w-2xl">
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <label className="block text-sm">
                <span className="font-medium text-[#18191B]">Agent name</span>
                <input
                  name="agent_name"
                  required
                  maxLength={64}
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter agent name, e.g. Sales Bot"
                  className={`mt-1.5 w-full ${inputClass}`}
                />
                <span className="mt-1 block text-xs text-muted">
                  The agent&apos;s email address is generated from this name.
                </span>
              </label>

              {/* Unique Avatar Picker */}
              <AvatarPicker defaultName={agentName || "Sales Bot"} />

              <label className="block text-sm">
                <span className="font-medium text-[#18191B]">Owner name</span>
                <input
                  name="owner_name"
                  required
                  maxLength={255}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Your name"
                  className={`mt-1.5 w-full ${inputClass}`}
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-[#18191B]">Owner email</span>
                <input
                  value={ownerEmail}
                  readOnly
                  aria-readonly
                  className={`mt-1.5 w-full cursor-not-allowed opacity-70 ${inputClass}`}
                />
                <span className="mt-1 block text-xs text-muted">Taken from your authenticated account.</span>
              </label>

              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-[#18191B] px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 shadow-sm"
                >
                  {creating ? "Provisioning..." : "Create API"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDrawer(false)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-subtle"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        )}
      </div>

      {/* Agents List */}
      <h2 className="mb-3 mt-10 text-base font-semibold text-[#18191B]">Your agents</h2>
      <div className="space-y-4">
        {agents.length === 0 && (
          <Empty title="No agents yet">Press Create API to issue your first agent passport.</Empty>
        )}
        {agents.map((a) => {
          const verifySnippet = `// Third-Party Website Integration
const res = await fetch("${publicApiUrl}/v1/auth/agent/verify", {
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
                      <p className="font-semibold text-[#18191B]">{a.agent_name}</p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                        99.0 Verified
                      </span>
                      {a.avatar_seed && (
                        <span className="hidden sm:inline-flex items-center rounded-md border border-[#DDD4C2] bg-white px-2 py-0.5 text-[10px] font-mono text-[#57534E]">
                          id: {a.avatar_seed}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="truncate font-mono text-sm text-sky-800 font-semibold">{a.email_address}</code>
                      <CopyButton value={a.email_address} />
                    </div>
                    <p className="mt-1 text-xs text-[#57534E]">
                      Owner {a.owner_name} ({a.owner_email}) · key {a.api_key_prefix}… · created {timeAgo(a.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {((a.scopes as string[]) ?? []).map((s) => (
                      <Badge key={s} tone={s === "send" ? "warn" : "neutral"}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <a
                    href={a.inbox_id ? `/dashboard/inboxes/${a.inbox_id}` : "/dashboard/inboxes"}
                    className="rounded-xl border border-[#DDD4C2] bg-white px-3.5 py-2 text-sm font-medium text-[#18191B] hover:bg-[#FAF5EE] shadow-xs"
                  >
                    Open inbox
                  </a>
                  <button
                    type="button"
                    disabled={deletingId === a.id}
                    onClick={() => handleDeleteAgent(a.id, a.agent_name)}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50 transition"
                  >
                    {deletingId === a.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              {/* Verifiable Agent Passport & Third-Party Integration Drawer */}
              {a.passport && (
                <details className="group mt-4 border-t border-line/60 pt-3">
                  <summary className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline [&::-webkit-details-marker]:hidden">
                    <svg className="h-3.5 w-3.5 transition group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    Verifiable Passport &amp; Integration Snippet
                  </summary>

                  <div className="mt-3 space-y-3 rounded-xl border border-[#2E3038] bg-[#1A1B21] p-4 text-[#F2ECE1]">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#8C8A94] uppercase tracking-wider">
                          Cryptographic Passport Token (HMAC-SHA256)
                        </span>
                        <CopyButton value={a.passport} />
                      </div>
                      <div className="mt-1.5 overflow-x-auto rounded-lg border border-[#2E3038] bg-[#141518] p-2.5 font-mono text-xs text-sky-300">
                        {a.passport}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-4 text-xs">
                      <div className="rounded-lg border border-[#2E3038] bg-white/[0.04] p-2.5">
                        <span className="text-[#8C8A94] block">Accountability</span>
                        <span className="font-medium text-[#FAF5EE]">VERIFIED_HUMAN_OPERATOR</span>
                      </div>
                      <div className="rounded-lg border border-[#2E3038] bg-white/[0.04] p-2.5">
                        <span className="text-[#8C8A94] block">Trust Score</span>
                        <span className="font-semibold text-sky-400">99.0 / 100</span>
                      </div>
                      <div className="rounded-lg border border-[#2E3038] bg-white/[0.04] p-2.5">
                        <span className="text-[#8C8A94] block">Unique Avatar</span>
                        <a
                          href={a.avatar_url ?? `/v1/agents/${a.id}/avatar.svg`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-sky-400 hover:underline truncate block"
                        >
                          View Vector SVG
                        </a>
                      </div>
                      <div className="rounded-lg border border-[#2E3038] bg-white/[0.04] p-2.5">
                        <span className="text-[#8C8A94] block">Public Attestation</span>
                        <a
                          href={`/v1/auth/agent/verify/${a.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-sky-400 hover:underline"
                        >
                          View Live Badge
                        </a>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#8C8A94] uppercase tracking-wider">
                          OAuth 2.1 &amp; OpenID Connect UserInfo URL
                        </span>
                        <CopyButton value={`${publicApiUrl}/oauth/userinfo`} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2E3038] bg-[#141518] p-2.5 font-mono text-xs text-sky-300">
                        <span>GET {publicApiUrl}/oauth/userinfo</span>
                        <Link href="/dashboard/oauth" className="text-xs text-sky-400 underline hover:text-sky-300">
                          Register Client ID &amp; OAuth Portal →
                        </Link>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#8C8A94] uppercase tracking-wider">
                          Third-Party Website Middleware (Node.js / Express)
                        </span>
                        <CopyButton value={verifySnippet} />
                      </div>
                      <pre className="mt-1.5 overflow-x-auto rounded-lg border border-[#2E3038] bg-[#141518] p-3 font-mono text-xs text-[#8C8A94]">
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
    </div>
  );
}
