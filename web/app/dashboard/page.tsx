import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import { CopyButton } from "@/components/client";
import { Badge, Card, Code } from "@/components/ui";
import { api, publicApiUrl, type Overview } from "@/lib/api";
import { snippets } from "@/lib/snippets";

export default async function OverviewPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  const defaultOverview: Overview = {
    workspace: {
      id: "ws_live_primary",
      name: session?.user?.name || "Autonomous Workspace",
      plan: "pro",
      outbound_enabled: true,
      daily_send_limit: 1000,
      max_inboxes: 50,
      inbound_daily_limit: 5000,
      pii_masking_enabled: true,
    },
    usage: { sent_today: 0, received_today: 0 },
    counts: { inboxes: 1, messages: 0, pending_approvals: 0, api_keys: 1, verified_domains: 1 },
    mail_domain: "agentkey.in",
  };

  let o: Overview = defaultOverview;
  try {
    const rawO = await api<Overview>("/overview");
    if (rawO && rawO.workspace) {
      o = rawO;
    }
  } catch {
    o = defaultOverview;
  }

  const email = session?.user?.email?.toLowerCase().trim() ?? "";
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdmin = Boolean(email && adminEmails.length > 0 && adminEmails.includes(email));

  const s = snippets(publicApiUrl);
  const canSend = Boolean(o?.workspace?.outbound_enabled || (o?.counts?.verified_domains ?? 0) > 0);

  const rawName =
    o?.workspace?.name && o.workspace.name !== "Autonomous Workspace"
      ? o.workspace.name
      : (session?.user?.name || (email ? email.split("@")[0] : "Workspace"));
  const workspaceTitle = rawName.toLowerCase().includes("workspace")
    ? rawName
    : `${rawName}'s workspace`;

  return (
    <div className="space-y-6 w-full">
      {/* Hero Banner with Warm Sand Container Palette */}
      <div className="relative overflow-hidden rounded-3xl border border-[#DDD4C2] bg-[#F2ECE1] p-6 lg:p-8 xl:p-10 shadow-sm">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#78716C]">
              Welcome back,
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] sm:text-3xl lg:text-4xl">
              {workspaceTitle}
            </h1>
            <p className="text-xs leading-relaxed text-[#57534E] sm:text-sm lg:text-base max-w-2xl">
              Your agent&apos;s sovereign communication identity, session vault, and guardrails at a glance.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end shrink-0">
            {/* Callout Quote */}
            <p className="font-serif italic text-xs sm:text-sm text-sky-800 font-medium lg:text-right max-w-xs">
              &ldquo;Build agents that respect people, not just the internet.&rdquo;
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6CCB6] bg-white px-3.5 py-1 text-xs font-medium text-[#18191B] shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)]" />
                {o.workspace.plan} tier
              </span>

              {isAdmin ? (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-100 px-4 py-1 text-xs font-semibold text-sky-800 transition hover:bg-sky-200 shadow-xs"
                >
                  <span>Admin Console</span>
                  <span>→</span>
                </Link>
              ) : (
                <Link
                  href="/dashboard/guide"
                  className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-100 px-4 py-1 text-xs font-semibold text-sky-800 transition hover:bg-sky-200 shadow-xs"
                >
                  <span>User Guide</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {o.counts.pending_approvals > 0 && (
        <Link
          href="/dashboard/approvals"
          className="block rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm transition hover:bg-amber-500/15"
        >
          <div className="flex items-center gap-3 text-amber-300 font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-black text-xs font-bold">!</span>
            <span>{o.counts.pending_approvals} message{o.counts.pending_approvals === 1 ? " is" : "s are"} waiting for human approval.</span>
            <span className="ml-auto underline">Review Now →</span>
          </div>
        </Link>
      )}

      {/* Middle Showcase Section */}
      <div className="grid gap-6 lg:grid-cols-12 w-full">
        {/* Left Card (approx 65% width): GET SET UP */}
        <div className="overflow-hidden rounded-2xl border border-[#DDD4C2] bg-[#F2ECE1] lg:col-span-8 shadow-sm">
          <div className="grid md:grid-cols-12 h-full">
            {/* Scenic Left Subcard */}
            <div className="relative flex flex-col justify-end p-6 md:p-8 md:col-span-5 bg-gradient-to-b from-[#0F172A] via-[#0B0F17] to-[#080D12] overflow-hidden min-h-[240px]">
              <Image
                src="/images/mountain-landscape-v2.jpg"
                alt="Scenic Sunrise"
                fill
                className="object-cover opacity-25 filter contrast-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080D12] via-[#080D12]/75 to-transparent" />

              <div className="relative z-10 space-y-3">
                <Link
                  href="/dashboard/api"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/15 text-sky-300 shadow-lg shadow-sky-500/25 transition hover:scale-105 hover:bg-sky-500/25 hover:border-sky-400/60"
                  title="Create Agent"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </Link>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    GET SET UP
                  </span>
                  <h3 className="text-lg font-bold text-white">Create. Connect. Deploy.</h3>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    Your agent can now authenticate, receive messages, and start working — in minutes.
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist Right Subcard */}
            <div className="p-6 md:p-8 md:col-span-7 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 border border-sky-300/60">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#18191B]">Create an API key</p>
                      <Link href="/dashboard/keys" className="text-xs text-sky-700 hover:text-sky-900 hover:underline font-semibold">
                        View keys →
                      </Link>
                    </div>
                    <p className="text-xs text-[#57534E] mt-0.5">
                      Your agent authenticates with it. Read-only keys cannot send.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 border border-sky-300/60">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#18191B]">Create an inbox</p>
                      <Link href="/dashboard/inboxes" className="text-xs text-sky-700 hover:text-sky-900 hover:underline font-semibold">
                        View inboxes →
                      </Link>
                    </div>
                    <p className="text-xs text-[#57534E] mt-0.5">
                      You get an address on {o.mail_domain} straight away. Your agent can also create its own.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    canSend
                      ? "bg-sky-100 text-sky-700 border border-sky-300/60"
                      : "bg-[#E5DEC9] text-[#78716C] border border-[#DDD4C2]"
                  }`}>
                    {canSend ? (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#78716C]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#18191B]">Unlock sending</p>
                      <Link href="/dashboard/domains" className="text-xs text-sky-700 hover:text-sky-900 hover:underline font-semibold">
                        Add domain →
                      </Link>
                    </div>
                    <p className="text-xs text-[#57534E] mt-0.5">
                      Receiving already works. To send, connect a domain you own.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card (approx 35% width): Your Agent. Your Rules. */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DDD4C2] bg-[#F2ECE1] p-6 lg:p-8 lg:col-span-4 shadow-sm">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-100 text-sky-700">
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-sky-800 tracking-widest uppercase font-bold">
              SOVEREIGN
            </span>
          </div>

          <div className="relative z-10 my-4 space-y-3">
            <div className="flex items-center justify-center select-none py-1">
              <img
                src="/images/agentkey-mascot.png"
                alt="AgentKey Verified Mascot"
                className="w-32 h-auto drop-shadow-[0_12px_24px_rgba(40,30,20,0.18)]"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-[#18191B]">
                Your agent. Your rules.
              </h3>
              <p className="text-xs text-[#57534E] mt-0.5">
                Sovereign communication &amp; cryptographic identity.
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD4C2] bg-white px-4 py-2 text-xs font-semibold text-[#18191B] transition hover:bg-[#FAF5EE] shadow-xs"
            >
              <span>View Docs</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-12 w-full">
        {/* Left (approx 65% width): Connect Your Agent Code Blocks */}
        <div className="space-y-4 lg:col-span-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-100 text-sky-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#18191B]">Connect your agent</h2>
              <p className="text-xs text-[#57534E]">
                Integrate with Claude, Python, or your own stack.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Claude Code Block */}
            <div className="overflow-hidden rounded-2xl border border-[#DDD4C2] bg-[#F2ECE1] shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DDD4C2] px-4 py-2.5 bg-white/70">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.7)]" />
                  <span className="text-xs font-bold text-[#18191B]">
                    Claude Code <span className="text-[#57534E] font-normal">(hosted MCP, nothing to install)</span>
                  </span>
                </div>
                <CopyButton value={s.claudeCode} />
              </div>
              <div className="p-4 bg-[#080D12] overflow-x-auto text-xs font-mono text-[#E2E8F0]">
                <pre>{s.claudeCode}</pre>
              </div>
              <div className="flex items-center justify-between border-t border-[#DDD4C2] px-4 py-2 text-[11px] text-[#57534E] bg-white/50">
                <span>
                  Replace <code className="text-sky-800 font-semibold bg-sky-100/70 px-1 py-0.5 rounded border border-sky-300/40">ai_live_YOUR_KEY</code> with a key from <Link href="/dashboard/keys" className="underline text-sky-700 font-semibold hover:text-sky-900">API keys</Link>
                </span>
                <Link href="/docs" className="text-sky-700 hover:text-sky-900 hover:underline font-semibold">
                  More in the docs →
                </Link>
              </div>
            </div>

            {/* Cursor & Other MCP Clients Block */}
            <div className="overflow-hidden rounded-2xl border border-[#DDD4C2] bg-[#F2ECE1] shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DDD4C2] px-4 py-2.5 bg-white/70">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.7)]" />
                  <span className="text-xs font-bold text-[#18191B]">
                    Cursor and other MCP clients
                  </span>
                </div>
                <CopyButton value={s.mcpJson} />
              </div>
              <div className="p-4 bg-[#080D12] overflow-x-auto text-xs font-mono text-[#E2E8F0]">
                <pre>{s.mcpJson}</pre>
              </div>
              <div className="flex items-center justify-between border-t border-[#DDD4C2] px-4 py-2 text-[11px] text-[#57534E] bg-white/50">
                <span>
                  Paste into <code className="text-sky-800 font-semibold bg-sky-100/70 px-1 py-0.5 rounded border border-sky-300/40">.cursor/mcp.json</code>
                </span>
                <Link href="/docs" className="text-sky-700 hover:text-sky-900 hover:underline font-semibold">
                  More in the docs →
                </Link>
              </div>
            </div>

            {/* Python SDK Block */}
            <div className="overflow-hidden rounded-2xl border border-[#DDD4C2] bg-[#F2ECE1] shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DDD4C2] px-4 py-2.5 bg-white/70">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(192,132,252,0.7)]" />
                  <span className="text-xs font-bold text-[#18191B]">
                    Python
                  </span>
                </div>
                <CopyButton value={s.python} />
              </div>
              <div className="p-4 bg-[#080D12] overflow-x-auto text-xs font-mono text-[#E2E8F0] max-h-56">
                <pre>{s.python}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right (approx 35% width): Quick Links & Sovereign by design */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-[#DDD4C2] bg-[#F2ECE1] p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716C] mb-4">
              Quick Links
            </h3>

            <div className="space-y-1.5">
              <Link
                href="/dashboard/guide"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD4C2] bg-white text-sky-700 group-hover:border-sky-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 6h10" /><path d="M6 10h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#18191B]">User Guide</p>
                    <p className="text-xs text-[#57534E]">How to use AgentKey, 2FA &amp; MCP</p>
                  </div>
                </div>
                <span className="text-sm text-[#78716C] group-hover:text-[#18191B] transition-transform group-hover:translate-x-0.5">›</span>
              </Link>

              <Link
                href="/docs"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD4C2] bg-white text-sky-700 group-hover:border-sky-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#18191B]">Documentation</p>
                    <p className="text-xs text-[#57534E]">Guides, API reference, examples</p>
                  </div>
                </div>
                <span className="text-sm text-[#78716C] group-hover:text-[#18191B] transition-transform group-hover:translate-x-0.5">›</span>
              </Link>

              <Link
                href="/dashboard/keys"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD4C2] bg-white text-sky-700 group-hover:border-sky-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#18191B]">API Keys</p>
                    <p className="text-xs text-[#57534E]">Manage your keys and permissions</p>
                  </div>
                </div>
                <span className="text-sm text-[#78716C] group-hover:text-[#18191B] transition-transform group-hover:translate-x-0.5">›</span>
              </Link>

              <Link
                href="/dashboard/oauth"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD4C2] bg-white text-sky-700 group-hover:border-sky-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#18191B]">OAuth &amp; Connect</p>
                    <p className="text-xs text-[#57534E]">OpenID Connect, Client ID &amp; Auth</p>
                  </div>
                </div>
                <span className="text-sm text-[#78716C] group-hover:text-[#18191B] transition-transform group-hover:translate-x-0.5">›</span>
              </Link>

              <Link
                href="/dashboard/webhooks"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD4C2] bg-white text-sky-700 group-hover:border-sky-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="17" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#18191B]">Webhooks</p>
                    <p className="text-xs text-[#57534E]">Real-time events &amp; integrations</p>
                  </div>
                </div>
                <span className="text-sm text-[#78716C] group-hover:text-[#18191B] transition-transform group-hover:translate-x-0.5">›</span>
              </Link>

              <Link
                href="mailto:support@agentkey.in"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD4C2] bg-white text-sky-700 group-hover:border-sky-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#18191B]">Support</p>
                    <p className="text-xs text-[#57534E]">Get help from our team</p>
                  </div>
                </div>
                <span className="text-sm text-[#78716C] group-hover:text-[#18191B] transition-transform group-hover:translate-x-0.5">›</span>
              </Link>
            </div>
          </div>

          {/* Sovereign by Design Card */}
          <div className="relative overflow-hidden rounded-2xl border border-[#DDD4C2] bg-[#F2ECE1] p-6 shadow-sm">
            {/* Topographic line decoration */}
            <svg
              className="pointer-events-none absolute bottom-0 right-0 h-36 w-56 text-sky-900/10"
              viewBox="0 0 200 120"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M0,100 C50,80 100,120 150,90 C180,70 190,50 200,60" />
              <path d="M0,80 C60,60 110,100 160,70 C185,50 195,30 200,40" />
              <path d="M0,60 C70,40 120,80 170,50 C190,30 198,15 200,20" />
            </svg>

            <div className="relative z-10 flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-100 text-sky-700">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#18191B]">Sovereign by design</p>
                <p className="text-xs text-[#57534E] mt-0.5">
                  Your data. Your agents. Your control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
