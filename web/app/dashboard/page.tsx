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
      {/* Hero Banner with Dark Mountain Mist Landscape Backdrop */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0A1017] p-6 lg:p-8 xl:p-10 shadow-xl shadow-black/30">
        {/* Landscape Image Layer with Dark Atmospheric Gradient */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/images/mountain-landscape.jpg"
            alt="Atmospheric Mountain Backdrop"
            fill
            priority
            className="object-cover object-top opacity-20 filter contrast-125 brightness-75"
          />
          {/* Obsidian Gradient Mask */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#080D12] via-[#080D12]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080D12] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9BA7B4]">
              Welcome back,
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {workspaceTitle}
            </h1>
            <p className="text-xs leading-relaxed text-[#9BA7B4] sm:text-sm lg:text-base max-w-2xl">
              Your agent&apos;s sovereign communication identity, session vault, and guardrails at a glance.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end shrink-0">
            {/* Handwritten / Callout Quote */}
            <p className="font-serif italic text-xs sm:text-sm text-[#8BE8E3]/85 lg:text-right max-w-xs">
              &ldquo;Build agents that respect people, not just the internet.&rdquo;
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OD-ID Active
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium text-[#9BA7B4]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8BE8E3]" />
                {o.workspace.plan} tier
              </span>

              {isAdmin ? (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex items-center gap-1 rounded-full border border-[#8BE8E3]/40 bg-[#132A26] px-4 py-1 text-xs font-semibold text-[#8BE8E3] transition hover:bg-[#1A3833] hover:border-[#8BE8E3]/60 shadow-sm"
                >
                  <span>Admin Console</span>
                  <span>→</span>
                </Link>
              ) : (
                <Link
                  href="/dashboard/guide"
                  className="inline-flex items-center gap-1 rounded-full border border-[#8BE8E3]/40 bg-[#132A26] px-4 py-1 text-xs font-semibold text-[#8BE8E3] transition hover:bg-[#1A3833] hover:border-[#8BE8E3]/60 shadow-sm"
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
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E151E] lg:col-span-8 shadow-xl shadow-black/20">
          <div className="grid md:grid-cols-12 h-full">
            {/* Scenic Left Subcard */}
            <div className="relative flex flex-col justify-end p-6 md:p-8 md:col-span-5 bg-gradient-to-b from-[#102324] to-[#091517] overflow-hidden min-h-[240px]">
              <Image
                src="/images/mountain-landscape-v2.jpg"
                alt="Scenic Sunrise"
                fill
                className="object-cover opacity-25 filter contrast-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1617] via-[#0A1617]/70 to-transparent" />

              <div className="relative z-10 space-y-3">
                <Link
                  href="/dashboard/api"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[#8BE8E3]/50 bg-[#8BE8E3]/20 text-[#8BE8E3] shadow-lg shadow-[#8BE8E3]/25 transition hover:scale-105 hover:bg-[#8BE8E3]/30"
                  title="Create Agent"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </Link>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8BE8E3]">
                    GET SET UP
                  </span>
                  <h3 className="text-lg font-bold text-white">Create. Connect. Deploy.</h3>
                  <p className="mt-1 text-xs text-[#9BA7B4] leading-relaxed">
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
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Create an API key</p>
                      <Link href="/dashboard/keys" className="text-xs text-[#8BE8E3] hover:underline font-medium">
                        View keys →
                      </Link>
                    </div>
                    <p className="text-xs text-[#9BA7B4] mt-0.5">
                      Your agent authenticates with it. Read-only keys cannot send.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Create an inbox</p>
                      <Link href="/dashboard/inboxes" className="text-xs text-[#8BE8E3] hover:underline font-medium">
                        View inboxes →
                      </Link>
                    </div>
                    <p className="text-xs text-[#9BA7B4] mt-0.5">
                      You get an address on {o.mail_domain} straight away. Your agent can also create its own.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    canSend
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-white/5 text-[#718096] border border-white/10"
                  }`}>
                    {canSend ? (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Unlock sending</p>
                      <Link href="/dashboard/domains" className="text-xs text-[#8BE8E3] hover:underline font-medium">
                        Add domain →
                      </Link>
                    </div>
                    <p className="text-xs text-[#9BA7B4] mt-0.5">
                      Receiving already works. To send, connect a domain you own.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card (approx 35% width): Your Agent. Your Rules. */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0F1D1B] via-[#0B1516] to-[#070D0E] p-6 lg:p-8 lg:col-span-4 shadow-xl shadow-black/20">
          {/* Ambient Glowing Glass Shape Visual */}
          <div className="pointer-events-none absolute -top-8 -right-8 h-48 w-48 rounded-full bg-gradient-to-br from-[#8BE8E3]/20 via-emerald-500/10 to-transparent blur-2xl" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#8BE8E3]/35 bg-[#8BE8E3]/10 text-[#8BE8E3]">
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-[#8BE8E3] tracking-widest uppercase">
              SOVEREIGN
            </span>
          </div>

          <div className="relative z-10 my-4 space-y-3">
            <div className="flex items-center justify-center select-none py-1">
              <img
                src="/images/agentkey-mascot.png"
                alt="AgentKey Verified Mascot"
                className="w-32 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Your agent. Your rules.
              </h3>
              <p className="text-xs text-[#9BA7B4] mt-0.5">
                Sovereign communication &amp; cryptographic identity.
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 hover:border-white/20"
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
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#8BE8E3]/30 bg-[#8BE8E3]/10 text-[#8BE8E3]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Connect your agent</h2>
              <p className="text-xs text-[#9BA7B4]">
                Integrate with Claude, Python, or your own stack.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Claude Code Block */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E151E]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-white">
                    Claude Code <span className="text-[#9BA7B4] font-normal">(hosted MCP, nothing to install)</span>
                  </span>
                </div>
                <CopyButton value={s.claudeCode} />
              </div>
              <div className="p-4 bg-[#080D12] overflow-x-auto text-xs font-mono text-[#8BE8E3]">
                <pre>{s.claudeCode}</pre>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-2 text-[11px] text-[#718096]">
                <span>
                  Replace <code className="text-[#8BE8E3]">ai_live_YOUR_KEY</code> with a key from <Link href="/dashboard/keys" className="underline text-white">API keys</Link>
                </span>
                <Link href="/docs" className="text-[#8BE8E3] hover:underline">
                  More in the docs →
                </Link>
              </div>
            </div>

            {/* Cursor & Other MCP Clients Block */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E151E]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#8BE8E3]" />
                  <span className="text-xs font-semibold text-white">
                    Cursor and other MCP clients
                  </span>
                </div>
                <CopyButton value={s.mcpJson} />
              </div>
              <div className="p-4 bg-[#080D12] overflow-x-auto text-xs font-mono text-[#B5F0D1]">
                <pre>{s.mcpJson}</pre>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-2 text-[11px] text-[#718096]">
                <span>
                  Paste into <code className="text-[#8BE8E3]">.cursor/mcp.json</code>
                </span>
                <Link href="/docs" className="text-[#8BE8E3] hover:underline">
                  More in the docs →
                </Link>
              </div>
            </div>

            {/* Python SDK Block */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E151E]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="text-xs font-semibold text-white">
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
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E151E] p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9BA7B4] mb-4">
              Quick Links
            </h3>

            <div className="space-y-1.5">
              <Link
                href="/dashboard/guide"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#8BE8E3]/30 bg-[#8BE8E3]/10 text-[#8BE8E3]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 6h10" /><path d="M6 10h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">User Guide</p>
                    <p className="text-xs text-[#718096]">How to use AgentKey, 2FA &amp; MCP</p>
                  </div>
                </div>
                <span className="text-sm text-[#718096] group-hover:text-white">›</span>
              </Link>

              <Link
                href="/docs"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9BA7B4] group-hover:text-white">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Documentation</p>
                    <p className="text-xs text-[#718096]">Guides, API reference, examples</p>
                  </div>
                </div>
                <span className="text-sm text-[#718096] group-hover:text-white">›</span>
              </Link>

              <Link
                href="/dashboard/keys"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9BA7B4] group-hover:text-white">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">API Keys</p>
                    <p className="text-xs text-[#718096]">Manage your keys and permissions</p>
                  </div>
                </div>
                <span className="text-sm text-[#718096] group-hover:text-white">›</span>
              </Link>

              <Link
                href="/dashboard/oauth"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#8BE8E3]/30 bg-[#8BE8E3]/10 text-[#8BE8E3]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">OAuth &amp; Connect</p>
                    <p className="text-xs text-[#718096]">OpenID Connect, Client ID &amp; Auth</p>
                  </div>
                </div>
                <span className="text-sm text-[#718096] group-hover:text-white">›</span>
              </Link>

              <Link
                href="/dashboard/webhooks"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9BA7B4] group-hover:text-white">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="17" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Webhooks</p>
                    <p className="text-xs text-[#718096]">Real-time events &amp; integrations</p>
                  </div>
                </div>
                <span className="text-sm text-[#718096] group-hover:text-white">›</span>
              </Link>

              <Link
                href="mailto:support@agentkey.in"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9BA7B4] group-hover:text-white">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Support</p>
                    <p className="text-xs text-[#718096]">Get help from our team</p>
                  </div>
                </div>
                <span className="text-sm text-[#718096] group-hover:text-white">›</span>
              </Link>
            </div>
          </div>

          {/* Sovereign by Design Card with subtle contour curves */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E151E] p-6 shadow-xl">
            {/* Topographic line decoration */}
            <svg
              className="pointer-events-none absolute bottom-0 right-0 h-36 w-56 text-[#8BE8E3]/5"
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Sovereign by design</p>
                <p className="text-xs text-[#9BA7B4] mt-0.5">
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
