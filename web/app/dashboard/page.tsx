import Link from "next/link";

import { Badge, Card, Code, PageHeader, StatCard } from "@/components/ui";
import { api, publicApiUrl, type Overview } from "@/lib/api";
import { snippets } from "@/lib/snippets";

function Step({ done, title, children, href, cta }: {
  done: boolean; title: string; children: string; href: string; cta: string;
}) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${
          done ? "bg-accent text-white" : "border border-line text-muted"
        }`}
      >
        {done ? (
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? "text-muted line-through" : ""}`}>{title}</p>
        <p className="text-sm text-muted">{children}</p>
      </div>
      {!done && (
        <Link href={href} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-subtle">
          {cta}
        </Link>
      )}
    </li>
  );
}

export default async function OverviewPage() {
  const o = await api<Overview>("/overview");
  const s = snippets(publicApiUrl);
  const canSend = o.workspace.outbound_enabled || o.counts.verified_domains > 0;

  return (
    <>
      <PageHeader
        title={o.workspace.name}
        lead="Your agents' sovereign communication identity, session vault, and guardrails at a glance."
        aside={
          <div className="flex items-center gap-2">
            <Badge tone="purple">OD-ID Active</Badge>
            <Badge tone="good">{o.workspace.plan} tier</Badge>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Link href="/dashboard/approvals" className="mt-4 block rounded-xl border border-warn/40 bg-warn/10 px-5 py-3 text-sm">
          <b>{o.counts.pending_approvals}</b> message{o.counts.pending_approvals === 1 ? " is" : "s are"} waiting for
          your approval. Review →
        </Link>
      )}

      <Card className="mt-6">
        <h2 className="font-semibold">Get set up</h2>
        <ul className="mt-2 divide-y divide-line">
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

      <h2 className="mb-3 mt-8 font-semibold">Connect your agent</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm text-muted">Claude Code (hosted MCP, nothing to install)</p>
          <Code code={s.claudeCode} />
          <p className="mb-2 mt-4 text-sm text-muted">Cursor and other MCP clients</p>
          <Code code={s.mcpJson} />
        </div>
        <div>
          <p className="mb-2 text-sm text-muted">Python</p>
          <Code code={s.python} />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">
        Replace <code className="font-mono">ai_live_YOUR_KEY</code> with a key from{" "}
        <Link href="/dashboard/keys" className="underline">API keys</Link>. More in the{" "}
        <Link href="/docs" className="underline">docs</Link>.
      </p>
    </>
  );
}
