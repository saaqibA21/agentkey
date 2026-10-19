import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import { CopyButton } from "@/components/client";
import { Badge, Card, Code } from "@/components/ui";
import { api, publicApiUrl, type Overview } from "@/lib/api";
import { snippets } from "@/lib/snippets";

function Sparkline({ color = "#8BE8E3" }: { color?: string }) {
  const gradId = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className="h-7 w-24 shrink-0 opacity-80" viewBox="0 0 80 24" fill="none">
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
    <div className="space-y-6 w-full">
      {/* Hero Banner with Atmospheric Mist Landscape Backdrop */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white p-6 lg:p-8 xl:p-10 shadow-xs">
        {/* Landscape Image Layer with Mist Gradient */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/images/mountain-landscape.jpg"
            alt="Atmospheric Mountain Backdrop"
            fill
            priority
            className="object-cover object-top opacity-30 filter contrast-105"
          />
          {/* Subtle White Mist Gradient Mask */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Welcome back,
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#0E171B] sm:text-3xl lg:text-4xl">
              {workspaceTitle}
            </h1>
            <p className="text-xs leading-relaxed text-[#475569] sm:text-sm lg:text-base max-w-2xl">
              Your agent&apos;s sovereign communication identity, session vault, and guardrails at a glance.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end shrink-0">
            {/* Handwritten / Callout Quote */}
            <p className="font-serif italic text-xs sm:text-sm text-[#0D6E48] lg:text-right max-w-xs font-medium">
              &ldquo;Build agents that respect people, not just the internet.&rdquo;
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B7F0D5] bg-[#EAFBF3] px-3.5 py-1 text-xs font-medium text-[#0D6E48]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                OD-ID Active
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-1 text-xs font-medium text-[#475569]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                {o.workspace.plan} tier
              </span>

              {isAdmin && (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex items-center gap-1 rounded-full border border-[#0D6E48] bg-[#0D6E48] px-4 py-1 text-xs font-semibold text-white transition hover:bg-[#0A5638] shadow-xs"
                >
                  <span>Admin Console</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Row - Fluid across width */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 w-full">
        {/* Card 1: Active Inboxes */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#B7F0D5] bg-[#EAFBF3] text-[#0D6E48]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                ACTIVE INBOXES
              </span>
            </div>
            <button type="button" aria-label="Inbox options" className="text-[#94A3B8] hover:text-[#0E171B]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
          </div>

          <div className="my-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-[#0E171B]">
              {o.counts.inboxes} / {o.workspace.max_inboxes}
            </span>
            <Sparkline color="#10B981" />
          </div>

          <p className="text-xs text-[#64748B]">
            Email + WhatsApp + SMS handles
          </p>
        </div>

        {/* Card 2: Inbound Today */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#BAE6FD] bg-[#E0F2FE] text-[#0284C7]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                INBOUND TODAY
              </span>
            </div>
            <button type="button" aria-label="Inbound options" className="text-[#94A3B8] hover:text-[#0E171B]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
          </div>

          <div className="my-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-[#0E171B]">
              {o.usage.received_today}
            </span>
            <Sparkline color="#0284C7" />
          </div>

          <p className="text-xs text-[#64748B]">
            Daily limit: {o.workspace.inbound_daily_limit} msgs
          </p>
        </div>

        {/* Card 3: Outbound Sent */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                OUTBOUND SENT
              </span>
            </div>
            <button type="button" aria-label="Outbound options" className="text-[#94A3B8] hover:text-[#0E171B]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
          </div>

          <div className="my-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-[#0E171B]">
              {o.usage.sent_today}
            </span>
            <Sparkline color="#0D9488" />
          </div>

          <p className="text-xs text-[#64748B]">
            {canSend ? `Daily quota: ${o.workspace.daily_send_limit}` : "Daily quota: 100"}
          </p>
        </div>

        {/* Card 4: Pending Approvals */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                PENDING APPROVALS
              </span>
            </div>
            <button type="button" aria-label="Approvals options" className="text-[#94A3B8] hover:text-[#0E171B]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
          </div>

          <div className="my-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-[#0E171B]">
              {o.counts.pending_approvals}
            </span>
            <Sparkline color="#6366F1" />
          </div>

          <p className="text-xs text-[#64748B]">
            {o.counts.pending_approvals > 0 ? "Requires operator action" : "Zero bottlenecks"}
          </p>
        </div>
      </div>

      {o.counts.pending_approvals > 0 && (
        <Link
          href="/dashboard/approvals"
          className="block rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm transition hover:bg-amber-100"
        >
          <div className="flex items-center gap-3 text-amber-900 font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">!</span>
            <span>{o.counts.pending_approvals} message{o.counts.pending_approvals === 1 ? " is" : "s are"} waiting for human approval.</span>
            <span className="ml-auto underline">Review Now →</span>
          </div>
        </Link>
      )}

      {/* Middle Showcase Section */}
      <div className="grid gap-6 lg:grid-cols-12 w-full">
        {/* Left Card (approx 65% width): GET SET UP */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white lg:col-span-8 shadow-xs">
          <div className="grid md:grid-cols-12 h-full">
            {/* Scenic Left Subcard */}
            <div className="relative flex flex-col justify-end p-6 md:p-8 md:col-span-5 bg-gradient-to-b from-[#134E4A] to-[#042F2E] overflow-hidden min-h-[240px]">
              <Image
                src="/images/mountain-landscape-v2.jpg"
                alt="Scenic Sunrise"
                fill
                className="object-cover opacity-30 filter contrast-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#042F2E] via-[#042F2E]/70 to-transparent" />

              <div className="relative z-10 space-y-3">
                <Link
                  href="/dashboard/api"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[#10B981]/50 bg-[#10B981] text-white shadow-lg transition hover:scale-105 hover:bg-[#059669]"
                  title="Create Agent"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </Link>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0]">
                    GET SET UP
                  </span>
                  <h3 className="text-lg font-bold text-white">Create. Connect. Deploy.</h3>
                  <p className="mt-1 text-xs text-white/80 leading-relaxed">
                    Your agent can now authenticate, receive messages, and start working — in minutes.
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist Right Subcard */}
            <div className="p-6 md:p-8 md:col-span-7 flex flex-col justify-between space-y-5 bg-white">
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAFBF3] text-[#0D6E48] border border-[#B7F0D5]">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#0E171B]">Create an API key</p>
                      <Link href="/dashboard/keys" className="text-xs text-[#0D6E48] hover:underline font-semibold">
                        View keys →
                      </Link>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Your agent authenticates with it. Read-only keys cannot send.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAFBF3] text-[#0D6E48] border border-[#B7F0D5]">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#0E171B]">Create an inbox</p>
                      <Link href="/dashboard/inboxes" className="text-xs text-[#0D6E48] hover:underline font-semibold">
                        View inboxes →
                      </Link>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      You get an address on {o.mail_domain} straight away. Your agent can also create its own.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    canSend
                      ? "bg-[#EAFBF3] text-[#0D6E48] border border-[#B7F0D5]"
                      : "bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]"
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
                      <p className="text-sm font-semibold text-[#0E171B]">Unlock sending</p>
                      <Link href="/dashboard/domains" className="text-xs text-[#0D6E48] hover:underline font-semibold">
                        Add domain →
                      </Link>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Receiving already works. To send, connect a domain you own.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card (approx 35% width): Your Agent. Your Rules. */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#047857]/30 bg-gradient-to-b from-[#064E3B] via-[#022C22] to-[#064E3B] p-6 lg:p-8 lg:col-span-4 shadow-md text-white">
          {/* Ambient Glowing Glass Shape Visual */}
          <div className="pointer-events-none absolute -top-8 -right-8 h-48 w-48 rounded-full bg-gradient-to-br from-[#10B981]/30 via-emerald-500/15 to-transparent blur-2xl" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#10B981]/40 bg-[#10B981]/20 text-[#A7F3D0]">
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-[#A7F3D0] tracking-widest uppercase">
              SOVEREIGN
            </span>
          </div>

          <div className="relative z-10 my-6 space-y-2">
            <h3 className="text-2xl font-bold tracking-tight text-white">
              Your agent.<br />Your rules.
            </h3>
            <p className="text-xs text-[#A7F3D0]/80">
              Secure. Private. Sovereign.
            </p>
          </div>

          <div className="relative z-10">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 shadow-xs"
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
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#B7F0D5] bg-[#EAFBF3] text-[#0D6E48]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0E171B]">Connect your agent</h2>
              <p className="text-xs text-[#64748B]">
                Integrate with Claude, Python, or your own stack.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Claude Code Block */}
            <div className="overflow-hidden rounded-2xl border border-[#CBD5E1] bg-[#0A1017] shadow-xs">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0F172A] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-white">
                    Claude Code <span className="text-[#94A3B8] font-normal">(hosted MCP, nothing to install)</span>
                  </span>
                </div>
                <CopyButton value={s.claudeCode} />
              </div>
              <div className="p-4 bg-[#080D12] overflow-x-auto text-xs font-mono text-[#8BE8E3]">
                <pre>{s.claudeCode}</pre>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0F172A] px-4 py-2 text-[11px] text-[#94A3B8]">
                <span>
                  Replace <code className="text-[#8BE8E3]">ai_live_YOUR_KEY</code> with a key from <Link href="/dashboard/keys" className="underline text-white hover:text-[#8BE8E3]">API keys</Link>
                </span>
                <Link href="/docs" className="text-[#8BE8E3] hover:underline font-medium">
                  More in the docs →
                </Link>
              </div>
            </div>

            {/* Cursor & Other MCP Clients Block */}
            <div className="overflow-hidden rounded-2xl border border-[#CBD5E1] bg-[#0A1017] shadow-xs">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0F172A] px-4 py-2.5">
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
              <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0F172A] px-4 py-2 text-[11px] text-[#94A3B8]">
                <span>
                  Paste into <code className="text-[#8BE8E3]">.cursor/mcp.json</code>
                </span>
                <Link href="/docs" className="text-[#8BE8E3] hover:underline font-medium">
                  More in the docs →
                </Link>
              </div>
            </div>

            {/* Python SDK Block */}
            <div className="overflow-hidden rounded-2xl border border-[#CBD5E1] bg-[#0A1017] shadow-xs">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0F172A] px-4 py-2.5">
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
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-4">
              Quick Links
            </h3>

            <div className="space-y-1.5">
              <Link
                href="/docs"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] group-hover:text-[#0E171B]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0E171B]">Documentation</p>
                    <p className="text-xs text-[#64748B]">Guides, API reference, examples</p>
                  </div>
                </div>
                <span className="text-sm text-[#94A3B8] group-hover:text-[#0E171B]">›</span>
              </Link>

              <Link
                href="/dashboard/keys"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] group-hover:text-[#0E171B]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0E171B]">API Keys</p>
                    <p className="text-xs text-[#64748B]">Manage your keys and permissions</p>
                  </div>
                </div>
                <span className="text-sm text-[#94A3B8] group-hover:text-[#0E171B]">›</span>
              </Link>

              <Link
                href="/dashboard/oauth"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#B7F0D5] bg-[#EAFBF3] text-[#0D6E48]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0E171B]">OAuth &amp; Connect</p>
                    <p className="text-xs text-[#64748B]">OpenID Connect, Client ID &amp; Auth</p>
                  </div>
                </div>
                <span className="text-sm text-[#94A3B8] group-hover:text-[#0E171B]">›</span>
              </Link>

              <Link
                href="/dashboard/webhooks"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] group-hover:text-[#0E171B]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="17" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0E171B]">Webhooks</p>
                    <p className="text-xs text-[#64748B]">Real-time events &amp; integrations</p>
                  </div>
                </div>
                <span className="text-sm text-[#94A3B8] group-hover:text-[#0E171B]">›</span>
              </Link>

              <Link
                href="mailto:support@bagents.ai"
                className="group flex items-center justify-between rounded-xl p-3 transition hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] group-hover:text-[#0E171B]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0E171B]">Support</p>
                    <p className="text-xs text-[#64748B]">Get help from our team</p>
                  </div>
                </div>
                <span className="text-sm text-[#94A3B8] group-hover:text-[#0E171B]">›</span>
              </Link>
            </div>
          </div>

          {/* Sovereign by Design Card with subtle contour curves */}
          <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
            {/* Topographic line decoration */}
            <svg
              className="pointer-events-none absolute bottom-0 right-0 h-36 w-56 text-[#10B981]/10"
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#B7F0D5] bg-[#EAFBF3] text-[#0D6E48]">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0E171B]">Sovereign by design</p>
                <p className="text-xs text-[#64748B] mt-0.5">
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
