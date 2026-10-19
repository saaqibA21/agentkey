import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import { CopyButton } from "@/components/client";
import { Badge, Card, Code } from "@/components/ui";
import { api, publicApiUrl, type Overview } from "@/lib/api";
import { snippets } from "@/lib/snippets";

function Sparkline({ color = "#10B981" }: { color?: string }) {
  const gradId = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className="h-6 w-20 shrink-0 opacity-90" viewBox="0 0 80 24" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M 2 20 C 15 18, 25 14, 38 10 C 48 7, 58 13, 68 6 C 74 3, 76 4, 78 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 2 20 C 15 18, 25 14, 38 10 C 48 7, 58 13, 68 6 C 74 3, 76 4, 78 3 L 78 24 L 2 24 Z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

export default async function OverviewPage() {
  const [session, o] = await Promise.all([
    auth(),
    api<Overview>("/overview"),
  ]);

  const email = session?.user?.email?.toLowerCase().trim() ?? "";
  const adminEmails = (process.env.ADMIN_EMAILS ?? "saaqibheroindia@gmail.com")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdmin = Boolean(email && adminEmails.includes(email));

  const s = snippets(publicApiUrl);
  const canSend = o.workspace.outbound_enabled || o.counts.verified_domains > 0;

  const rawName = o.workspace.name || (email ? email.split("@")[0] : "saaqibheroindia");
  const workspaceTitle = rawName.toLowerCase().includes("workspace")
    ? rawName
    : `${rawName}'s workspace`;

  return (
    <div className="space-y-6">
      {/* Hero Banner with Mountain Mist Landscape Backdrop */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white p-6 lg:p-8 shadow-xs">
        {/* Landscape Image Layer with Natural Mist Fade */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/images/mountain-landscape.jpg"
            alt="Atmospheric Mountain Backdrop"
            fill
            priority
            className="object-cover object-top opacity-35 filter contrast-105 brightness-105"
          />
          {/* Natural Mist Gradient Masks */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#627282]">
              Welcome back,
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0E1B18] sm:text-3xl">
              {workspaceTitle}
            </h1>
            <p className="text-xs leading-relaxed text-[#627282] sm:text-sm">
              Your agent&apos;s sovereign communication identity, session vault, and guardrails at a glance.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            {/* Handwritten / Callout Quote */}
            <p className="font-serif italic text-xs sm:text-sm text-[#0D6E48] lg:text-right max-w-xs">
              &ldquo;Build agents that respect people, not just the internet.&rdquo;
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0D6E48]/25 bg-[#E8F8F0] px-3 py-1 text-xs font-medium text-[#0D6E48]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0D6E48]" />
                OD-ID Active
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-[#CBD5E1] bg-[#F1F5F2] px-3 py-1 text-xs font-medium text-[#475569]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                {o.workspace.plan} tier
              </span>

              {isAdmin && (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-[#0B1A17] px-3.5 py-1 text-xs font-semibold text-[#8BE8E3] hover:bg-[#122A25] transition shadow-xs"
                >
                  <span>Admin Console</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Active Inboxes */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#0D6E48]/20 bg-[#E8F8F0] text-[#0D6E48]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#627282]">
                ACTIVE INBOXES
              </span>
            </div>
            <button type="button" aria-label="Inbox options" className="text-[#94A3B8] hover:text-[#0E171B]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-[#0E1B18]">
              {o.counts.inboxes} / {o.workspace.max_inboxes}
            </span>
            <Sparkline color="#10B981" />
          </div>

          <p className="text-xs text-[#7E8B95]">
            Email + WhatsApp + SMS handles
          </p>
        </div>

        {/* Card 2: Inbound Today */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#0D6E48]/20 bg-[#E8F8F0] text-[#0D6E48]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#627282]">
                INBOUND TODAY
              </span>
            </div>
            <button type="button" aria-label="Inbound options" className="text-[#94A3B8] hover:text-[#0E171B]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-[#0E1B18]">
              {o.usage.received_today}
            </span>
            <Sparkline color="#059669" />
          </div>

          <p className="text-xs text-[#7E8B95]">
            Daily limit: {o.workspace.inbound_daily_limit} msgs
          </p>
        </div>

        {/* Card 3: Outbound Sent */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#0D6E48]/20 bg-[#E8F8F0] text-[#0D6E48]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#627282]">
                OUTBOUND SENT
              </span>
            </div>
            <button type="button" aria-label="Outbound options" className="text-[#94A3B8] hover:text-[#0E171B]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-[#0E1B18]">
              {o.usage.sent_today}
            </span>
            <Sparkline color="#0D9488" />
          </div>

          <p className="text-xs text-[#7E8B95]">
            {canSend ? `Daily quota: ${o.workspace.daily_send_limit}` : "Daily quota: 100"}
          </p>
        </div>

        {/* Card 4: Pending Approvals */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#0D6E48]/20 bg-[#E8F8F0] text-[#0D6E48]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#627282]">
                PENDING APPROVALS
              </span>
            </div>
            <button type="button" aria-label="Approvals options" className="text-[#94A3B8] hover:text-[#0E171B]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-[#0E1B18]">
              {o.counts.pending_approvals}
            </span>
            <Sparkline color="#6366F1" />
          </div>

          <p className="text-xs text-[#7E8B95]">
            {o.counts.pending_approvals > 0 ? "Requires operator action" : "Zero bottlenecks"}
          </p>
        </div>
      </div>

      {o.counts.pending_approvals > 0 && (
        <Link
          href="/dashboard/approvals"
          className="block rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm transition hover:bg-amber-100/60"
        >
          <div className="flex items-center gap-3 text-amber-900 font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">!</span>
            <span>{o.counts.pending_approvals} message{o.counts.pending_approvals === 1 ? " is" : "s are"} waiting for human approval.</span>
            <span className="ml-auto underline text-amber-800">Review Now →</span>
          </div>
        </Link>
      )}

      {/* Middle Showcase Section */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Card (approx 62% width): GET SET UP */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xs lg:col-span-8">
          <div className="grid md:grid-cols-12 h-full">
            {/* Scenic Left Subcard */}
            <div className="relative flex flex-col justify-end p-6 md:col-span-5 bg-gradient-to-b from-[#E6F3EE] to-[#D5EAE2] overflow-hidden min-h-[220px]">
              <Image
                src="/images/mountain-landscape-v2.jpg"
                alt="Scenic Sunrise"
                fill
                className="object-cover opacity-35 filter contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#D5EAE2] via-[#D5EAE2]/50 to-transparent" />

              <div className="relative z-10 space-y-3">
                <Link
                  href="/dashboard/api"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0D6E48] text-white shadow-md transition hover:scale-105 hover:bg-[#0A5638]"
                  title="Create Agent"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </Link>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D6E48]">
                    GET SET UP
                  </span>
                  <h3 className="text-base font-bold text-[#0E1B18]">Create. Connect. Deploy.</h3>
                  <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                    Your agent can now authenticate, receive messages, and start working — in minutes.
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist Right Subcard */}
            <div className="p-6 md:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white shadow-xs">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#0E1B18]">Create an API key</p>
                      <Link href="/dashboard/keys" className="text-[11px] text-[#0D6E48] hover:underline font-medium">
                        View keys →
                      </Link>
                    </div>
                    <p className="text-[11px] text-[#627282] mt-0.5">
                      Your agent authenticates with it. Read-only keys cannot send.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white shadow-xs">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#0E1B18]">Create an inbox</p>
                      <Link href="/dashboard/inboxes" className="text-[11px] text-[#0D6E48] hover:underline font-medium">
                        View inboxes →
                      </Link>
                    </div>
                    <p className="text-[11px] text-[#627282] mt-0.5">
                      You get an address on {o.mail_domain} straight away. Your agent can also create its own.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    canSend
                      ? "bg-[#10B981] text-white shadow-xs"
                      : "bg-[#E2E8F0] text-[#718096]"
                  }`}>
                    {canSend ? (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#94A3B8]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#0E1B18]">Unlock sending</p>
                      <Link href="/dashboard/domains" className="text-[11px] text-[#0D6E48] hover:underline font-medium">
                        Add domain →
                      </Link>
                    </div>
                    <p className="text-[11px] text-[#627282] mt-0.5">
                      Receiving already works. To send, connect a domain you own.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card (approx 38% width): Your Agent. Your Rules. */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-950/40 bg-gradient-to-b from-[#09221B] via-[#061813] to-[#04100D] text-white p-6 lg:col-span-4 shadow-md">
          {/* Ambient Glowing Glass Shape Visual */}
          <div className="pointer-events-none absolute -top-8 -right-8 h-44 w-44 rounded-full bg-gradient-to-br from-[#8BE8E3]/20 via-emerald-500/10 to-transparent blur-2xl" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#8BE8E3]/35 bg-[#8BE8E3]/15 text-[#8BE8E3]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-[#8BE8E3] tracking-widest uppercase">
              SOVEREIGN
            </span>
          </div>

          <div className="relative z-10 my-6 space-y-1.5">
            <h3 className="text-xl font-bold tracking-tight text-white">
              Your agent.<br />Your rules.
            </h3>
            <p className="text-xs text-[#9BA7B4]">
              Secure. Private. Sovereign.
            </p>
          </div>

          <div className="relative z-10">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <span>View Docs</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left (approx 65% width): Connect Your Agent Code Blocks */}
        <div className="space-y-4 lg:col-span-8">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#0D6E48]/20 bg-[#E8F8F0] text-[#0D6E48]">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0E1B18]">Connect your agent</h2>
              <p className="text-xs text-[#627282]">
                Integrate with Claude, Python, or your own stack.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Claude Code Block */}
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#0B151C] text-white shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-white">
                    Claude Code <span className="text-[#9BA7B4] font-normal">(hosted MCP, nothing to install)</span>
                  </span>
                </div>
                <CopyButton value={s.claudeCode} />
              </div>
              <div className="p-4 bg-[#070D12] overflow-x-auto text-xs font-mono text-[#8BE8E3]">
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
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#0B151C] text-white shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#8BE8E3]" />
                  <span className="text-xs font-semibold text-white">
                    Cursor and other MCP clients
                  </span>
                </div>
                <CopyButton value={s.mcpJson} />
              </div>
              <div className="p-4 bg-[#070D12] overflow-x-auto text-xs font-mono text-[#B5F0D1]">
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
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#0B151C] text-white shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="text-xs font-semibold text-white">
                    Python
                  </span>
                </div>
                <CopyButton value={s.python} />
              </div>
              <div className="p-4 bg-[#070D12] overflow-x-auto text-xs font-mono text-[#E2E8F0] max-h-56">
                <pre>{s.python}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right (approx 35% width): Quick Links & Sovereign by design */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#627282] mb-3">
              Quick Links
            </h3>

            <div className="space-y-1">
              <Link
                href="/docs"
                className="group flex items-center justify-between rounded-xl p-2.5 transition hover:bg-[#F8FAF8]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAF8] text-[#627282] group-hover:text-[#0E1B18]">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0E1B18]">Documentation</p>
                    <p className="text-[11px] text-[#7E8B95]">Guides, API reference, examples</p>
                  </div>
                </div>
                <span className="text-xs text-[#94A3B8] group-hover:text-[#0E1B18]">›</span>
              </Link>

              <Link
                href="/dashboard/keys"
                className="group flex items-center justify-between rounded-xl p-2.5 transition hover:bg-[#F8FAF8]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAF8] text-[#627282] group-hover:text-[#0E1B18]">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0E1B18]">API Keys</p>
                    <p className="text-[11px] text-[#7E8B95]">Manage your keys and permissions</p>
                  </div>
                </div>
                <span className="text-xs text-[#94A3B8] group-hover:text-[#0E1B18]">›</span>
              </Link>

              <Link
                href="/dashboard/oauth"
                className="group flex items-center justify-between rounded-xl p-2.5 transition hover:bg-[#F8FAF8]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#0D6E48]/20 bg-[#E8F8F0] text-[#0D6E48]">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0E1B18]">OAuth &amp; Connect</p>
                    <p className="text-[11px] text-[#7E8B95]">OpenID Connect, Client ID &amp; Auth</p>
                  </div>
                </div>
                <span className="text-xs text-[#94A3B8] group-hover:text-[#0E1B18]">›</span>
              </Link>

              <Link
                href="/dashboard/webhooks"
                className="group flex items-center justify-between rounded-xl p-2.5 transition hover:bg-[#F8FAF8]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAF8] text-[#627282] group-hover:text-[#0E1B18]">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="17" r="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0E1B18]">Webhooks</p>
                  <p className="text-[11px] text-[#7E8B95]">Real-time events &amp; integrations</p>
                </div>
                <span className="text-xs text-[#94A3B8] group-hover:text-[#0E1B18]">›</span>
              </Link>

              <Link
                href="mailto:support@bagents.ai"
                className="group flex items-center justify-between rounded-xl p-2.5 transition hover:bg-[#F8FAF8]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAF8] text-[#627282] group-hover:text-[#0E1B18]">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0E1B18]">Support</p>
                  <p className="text-[11px] text-[#7E8B95]">Get help from our team</p>
                </div>
                <span className="text-xs text-[#94A3B8] group-hover:text-[#0E1B18]">›</span>
              </Link>
            </div>
          </div>

          {/* Sovereign by Design Card with subtle contour curves */}
          <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
            {/* Topographic line decoration */}
            <svg
              className="pointer-events-none absolute bottom-0 right-0 h-32 w-48 text-[#10B981]/10"
              viewBox="0 0 200 120"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M0,100 C50,80 100,120 150,90 C180,70 190,50 200,60" />
              <path d="M0,80 C60,60 110,100 160,70 C185,50 195,30 200,40" />
              <path d="M0,60 C70,40 120,80 170,50 C190,30 198,15 200,20" />
            </svg>

            <div className="relative z-10 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#0D6E48]/20 bg-[#E8F8F0] text-[#0D6E48]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0E1B18]">Sovereign by design</p>
                <p className="text-[11px] text-[#627282] mt-0.5">
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
