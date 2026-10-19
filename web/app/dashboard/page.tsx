import Link from "next/link";

import { Badge, Card, Code, PageHeader, StatCard } from "@/components/ui";
import { api, publicApiUrl, type Overview } from "@/lib/api";
import { snippets } from "@/lib/snippets";

function Step({
  done,
  title,
  children,
  href,
  cta,
}: {
  done: boolean;
  title: string;
  children: string;
  href: string;
  cta: string;
}) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between px-2 transition hover:bg-white/[0.02] rounded-xl">
      <div className="flex items-start gap-4 min-w-0">
        <span
          aria-hidden
          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold transition-all ${
            done
              ? "bg-[#B5F0D1]/20 text-[#B5F0D1] border border-[#B5F0D1]/40 shadow-sm shadow-[#B5F0D1]/20"
              : "border border-white/20 text-[#9BA7B4] bg-white/[0.02]"
          }`}
        >
          {done ? (
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : null}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{title}</p>
            {done && (
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Completed
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-[#9BA7B4]">{children}</p>
        </div>
      </div>
      <div className="self-end sm:self-auto pl-10 sm:pl-0">
        {!done ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 hover:border-white/20"
          >
            <span>{cta}</span>
            <span>→</span>
          </Link>
        ) : (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#8BE8E3] hover:text-[#B5F0D1] hover:underline"
          >
            <span>View settings</span>
            <span>→</span>
          </Link>
        )}
      </div>
    </li>
  );
}

export default async function OverviewPage() {
  const o = await api<Overview>("/overview");
  const s = snippets(publicApiUrl);
  const canSend = o.workspace.outbound_enabled || o.counts.verified_domains > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={o.workspace.name}
        lead="Your agents' sovereign communication identity, session vault, and guardrails at a glance."
        aside={
          <div className="flex items-center gap-2.5">
            <Badge tone="purple">OD-ID Active</Badge>
            <Badge tone="good">{o.workspace.plan} tier</Badge>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Inboxes"
          value={`${o.counts.inboxes} / ${o.workspace.max_inboxes}`}
          subtext="Email + WhatsApp + SMS handles"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          }
          tone="accent"
        />
        <StatCard
          title="Inbound Today"
          value={o.usage.received_today}
          subtext={`Daily limit: ${o.workspace.inbound_daily_limit} msgs`}
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          }
          tone="good"
        />
        <StatCard
          title="Outbound Sent"
          value={o.usage.sent_today}
          subtext={canSend ? `Daily quota: ${o.workspace.daily_send_limit}` : "Inbound-only mode"}
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          }
          tone={canSend ? "good" : "neutral"}
        />
        <StatCard
          title="Pending Approvals"
          value={o.counts.pending_approvals}
          subtext={o.counts.pending_approvals > 0 ? "Requires operator action" : "Zero bottlenecks"}
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
          tone={o.counts.pending_approvals > 0 ? "warn" : "neutral"}
        />
      </div>

      {o.counts.pending_approvals > 0 && (
        <Link href="/dashboard/approvals" className="block rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm transition hover:bg-amber-500/15">
          <div className="flex items-center gap-3 text-amber-300 font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-black text-xs font-bold">!</span>
            <span>{o.counts.pending_approvals} message{o.counts.pending_approvals === 1 ? " is" : "s are"} waiting for your human-in-the-loop approval.</span>
            <span className="ml-auto underline">Review Now →</span>
          </div>
        </Link>
      )}

      {/* Setup Guide Card */}
      <Card>
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Workspace Quickstart</h2>
            <p className="mt-0.5 text-xs text-[#9BA7B4]">Essential configurations to bring your autonomous agents to life</p>
          </div>
          <span className="text-xs font-mono text-[#8BE8E3]">
            {[o.counts.api_keys > 0, o.counts.inboxes > 0, canSend].filter(Boolean).length} / 3 Completed
          </span>
        </div>
        <ul className="mt-3 divide-y divide-white/[0.06]">
          <Step done={o.counts.api_keys > 0} title="Create an API key" href="/dashboard/keys" cta="Create key">
            Your agent authenticates with it. Read-only keys cannot send.
          </Step>
          <Step done={o.counts.inboxes > 0} title="Create an inbox" href="/dashboard/inboxes" cta="Create inbox">
            {`You get an address on ${o.mail_domain} straight away. Your agent can also create its own.`}
          </Step>
          <Step done={canSend} title="Unlock sending" href="/dashboard/domains" cta="Add domain">
            Receiving already works. To send, connect a domain you own.
          </Step>
        </ul>
      </Card>

      {/* Code Connect Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Connect Your Agent</h2>
          <p className="mt-1 text-xs text-[#9BA7B4]">
            Plug BAGENTS directly into Claude Code, Cursor, LangChain, or your custom Python agent runtime.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9BA7B4]">Claude Code</span>
                <span className="text-[11px] text-[#8BE8E3]">Hosted MCP (Zero Install)</span>
              </div>
              <Code code={s.claudeCode} title="Terminal (CLI)" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9BA7B4]">Cursor & MCP Clients</span>
                <span className="text-[11px] text-[#9BA7B4]">JSON Config</span>
              </div>
              <Code code={s.mcpJson} title=".cursor/mcp.json" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9BA7B4]">Python SDK</span>
              <span className="text-[11px] text-[#B5F0D1]">Sync & Async</span>
            </div>
            <Code code={s.python} title="main.py" />
          </div>
        </div>

        <p className="text-xs text-[#9BA7B4] pt-2">
          Replace <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[#8BE8E3]">ai_live_YOUR_KEY</code> with a key from{" "}
          <Link href="/dashboard/keys" className="text-white underline hover:text-[#8BE8E3]">API keys</Link>. For full SDK reference, view{" "}
          <Link href="/docs" className="text-white underline hover:text-[#8BE8E3]">Developer Documentation</Link>.
        </p>
      </div>
    </div>
  );
}
