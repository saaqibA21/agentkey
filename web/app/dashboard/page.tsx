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
        {done ? "✓" : ""}
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
            <Link
              href="/dashboard/admin"
              className="rounded-lg border border-line bg-subtle px-3 py-1 text-xs font-medium text-ink transition hover:bg-line/40"
            >
              Admin Console →
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Inboxes"
          value={`${o.counts.inboxes} / ${o.workspace.max_inboxes}`}
          subtext="Email + WhatsApp + SMS handles"
          icon="📬"
          tone="accent"
        />
        <StatCard
          title="Inbound Today"
          value={o.usage.received_today}
          subtext={`Daily limit: ${o.workspace.inbound_daily_limit} msgs`}
          icon="⚡"
          tone="good"
        />
        <StatCard
          title="Outbound Sent"
          value={o.usage.sent_today}
          subtext={canSend ? `Daily quota: ${o.workspace.daily_send_limit}` : "Inbound-only mode"}
          icon="📤"
          tone={canSend ? "good" : "neutral"}
        />
        <StatCard
          title="Pending Approvals"
          value={o.counts.pending_approvals}
          subtext={o.counts.pending_approvals > 0 ? "Requires operator action" : "Zero bottlenecks"}
          icon="🛡️"
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
