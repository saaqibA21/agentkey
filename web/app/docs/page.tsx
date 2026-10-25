import type { ReactNode } from "react";
import Link from "next/link";

import { CodeTabs } from "@/components/code-tabs";
import { SiteFooter, SiteNav } from "@/components/site";
import { Badge, Card, Code } from "@/components/ui";
import { publicApiUrl } from "@/lib/api";
import { nodeInstall, sdkInstall, snippets } from "@/lib/snippets";

export const metadata = {
  title: "Documentation · AgentKey Developer Platform",
  description: "Complete guide, SDKs, MCP server, OAuth 2.1 OIDC specifications, and REST API reference for AgentKey.",
};

const sections = [
  { id: "quickstart", label: "Quickstart", category: "Getting Started" },
  { id: "architecture", label: "Core Architecture", category: "Getting Started" },
  { id: "mcp", label: "Claude & Cursor MCP", category: "Integrations" },
  { id: "frameworks", label: "Agent Frameworks", category: "Integrations" },
  { id: "passports", label: "Verifiable Passports", category: "Identity & Trust" },
  { id: "oauth", label: "OAuth 2.1 & OpenID Connect", category: "Identity & Trust" },
  { id: "vault", label: "Session Vault & Browser State", category: "Identity & Trust" },
  { id: "receiving", label: "Receiving & Zero-Token OTP", category: "Communication" },
  { id: "sending", label: "Sending & Custom Domains", category: "Communication" },
  { id: "approvals", label: "HITL Guardrails", category: "Communication" },
  { id: "realtime", label: "Webhooks & WebSocket", category: "Real-time" },
  { id: "security", label: "Prompt Injection Defense", category: "Security" },
  { id: "reference", label: "REST API Reference", category: "Reference" },
] as const;

function Section({ id, title, badge, children }: { id: string; title: string; badge?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-10 border-t border-[#E5DEC9] py-12 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-[#18191B]">{title}</h2>
        {badge && <Badge tone="accent">{badge}</Badge>}
      </div>
      <div className="space-y-4 text-[15px] leading-relaxed text-[#4A4B53] [&_code]:rounded-md [&_code]:border [&_code]:border-[#E5DEC9] [&_code]:bg-[#F2ECE1] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-[#18191B]">
        {children}
      </div>
    </section>
  );
}

const endpoints = [
  { method: "POST", path: "/v1/inboxes", desc: "Create a dedicated task inbox (username, client_id, domain optional)" },
  { method: "GET", path: "/v1/inboxes/{id}/wait", desc: "Long-poll edge-extracted OTP, magic link, or message (204 on timeout)" },
  { method: "GET", path: "/v1/inboxes/{id}/messages", desc: "List inbox messages with deterministic zero-token metadata" },
  { method: "GET", path: "/v1/threads/{id}", desc: "Fetch complete conversation thread history chronologically" },
  { method: "POST", path: "/v1/inboxes/{id}/messages/send", desc: "Send outbound email (HTTP 202 if held by HITL approval rule)" },
  { method: "POST", path: "/v1/inboxes/{id}/messages/{msg_id}/reply", desc: "Threaded reply with RFC-compliant headers" },
  { method: "GET", path: "/v1/attachments/{id}", desc: "Download or inspect attachment text/OCR" },
  { method: "POST", path: "/v1/auth/agent/verify", desc: "Verify HMAC-SHA256 AgentKey Passport token (returns claims & score)" },
  { method: "GET", path: "/.well-known/openid-configuration", desc: "OpenID Connect discovery metadata for external apps" },
  { method: "GET", path: "/oauth/authorize", desc: "OAuth 2.1 authorization endpoint (PKCE S256 required)" },
  { method: "POST", path: "/oauth/token", desc: "Token exchange for authorization code with PKCE verifier" },
  { method: "GET", path: "/oauth/userinfo", desc: "OIDC userinfo endpoint with is_agent: true and operator attestation" },
  { method: "POST", path: "/oauth/register", desc: "RFC 7591 dynamic OAuth client registration" },
  { method: "GET", path: "/v1/vault/items/{id}/export-browser-state", desc: "Export Playwright/Puppeteer storage state JSON" },
  { method: "POST", path: "/v1/webhooks", desc: "Register a webhook endpoint with HMAC signature secret" },
  { method: "POST", path: "/v1/hitl/policies", desc: "Define keyword guardrail policies for human-in-the-loop approvals" },
  { method: "POST", path: "/v1/domains", desc: "Add custom domain; returns DKIM, SPF, and MX verification records" },
];

export default function Docs() {
  const s = snippets(publicApiUrl);

  const quickstartTabs = [
    { id: "python", label: "Python SDK", code: s.python },
    { id: "node", label: "Node.js / TS", code: s.nodeQuickstart },
    { id: "curl", label: "cURL (REST)", code: s.curl },
    { id: "mcp", label: "Claude MCP", code: s.claudeCode },
  ];

  const mcpTabs = [
    { id: "claude-code", label: "Claude Code CLI", code: s.claudeCode },
    { id: "cursor-json", label: "Cursor / Windsurf (.cursor/mcp.json)", code: s.mcpJson },
  ];

  const frameworkTabs = [
    { id: "langchain", label: "LangChain / LangGraph", code: s.langchain },
    { id: "anthropic", label: "Anthropic Claude API", code: s.anthropic },
  ];

  return (
    <div className="min-h-screen bg-[#FAF5EE] text-[#18191B] flex flex-col">
      <SiteNav />

      {/* Hero Header */}
      <header className="border-b border-[#E5DEC9] bg-[#FAF5EE]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-800">
                  Platform API v1.0
                </span>
                <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-0.5 text-xs font-semibold text-purple-800">
                  OpenID Connect Certified
                </span>
                <span className="rounded-full border border-[#DDD4C2] bg-white px-3 py-0.5 text-xs font-medium text-[#64646A]">
                  Claude MCP Hosted
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#18191B]">
                AgentKey Documentation
              </h1>
              <p className="text-sm sm:text-base text-[#64646A] leading-relaxed">
                The complete cryptographic identity and sovereign communication platform for autonomous AI agents.
                Integrate with Claude, Cursor, LangChain, or any OAuth 2.1 web application.
              </p>
            </div>

            <div className="flex justify-start sm:justify-end select-none shrink-0">
              <img
                src="/images/mascot/agentkey-docs.png"
                alt="AgentKey Developer Docs Mascot"
                loading="lazy"
                decoding="async"
                className="w-32 sm:w-40 h-auto drop-shadow-[0_15px_30px_rgba(40,30,20,0.12)] transition-transform duration-500 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          {/* Sticky Left Sidebar Navigation */}
          <aside className="hidden lg:block">
            <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 space-y-6 text-xs">
              {Array.from(new Set(sections.map((s) => s.category))).map((cat) => (
                <div key={cat} className="space-y-2">
                  <h3 className="font-semibold uppercase tracking-wider text-[#8C8A94] text-[11px] px-2.5">
                    {cat}
                  </h3>
                  <ul className="space-y-1">
                    {sections
                      .filter((s) => s.category === cat)
                      .map(({ id, label }) => (
                        <li key={id}>
                          <a
                            href={`#${id}`}
                            className="block rounded-lg px-2.5 py-1.5 font-medium text-[#64646A] transition hover:bg-black/[0.04] hover:text-[#18191B]"
                          >
                            {label}
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}

              <div className="pt-4 border-t border-[#E5DEC9]">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between rounded-xl border border-[#DDD4C2] bg-white px-3 py-2 text-xs font-semibold text-[#18191B] shadow-xs hover:bg-[#F2ECE1] transition"
                >
                  <span>Open Dashboard</span>
                  <span>→</span>
                </Link>
              </div>
            </nav>
          </aside>

          {/* Main Docs Content */}
          <main className="min-w-0 max-w-3xl space-y-2">
            {/* Quickstart */}
            <Section id="quickstart" title="Quickstart">
              <p>
                Get your autonomous AI agent equipped with a real sovereign email inbox, cryptographic passport,
                and zero-token 2FA verification in less than two minutes.
              </p>
              <div className="rounded-xl border border-[#E5DEC9] bg-white p-4">
                <ol className="list-decimal space-y-2 pl-5 text-sm text-[#4A4B53]">
                  <li>
                    <b>Sign in to your AgentKey Dashboard</b> and navigate to <code>API Keys</code>.
                  </li>
                  <li>
                    <b>Generate an API key:</b> Select <code>read</code> (for agents that only receive verification codes),
                    or include <code>manage</code> and <code>send</code> for full execution authority.
                  </li>
                  <li>
                    <b>Install the official SDK</b> or connect via standard HTTPS:
                  </li>
                </ol>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#64646A]">
                  <span>Package Installation</span>
                  <span>Python &amp; Node.js</span>
                </div>
                <Code code={sdkInstall} title="Terminal (Python)" />
              </div>

              <div className="space-y-2 pt-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#64646A]">
                  <span>Quickstart Implementation</span>
                  <span>Multi-Language</span>
                </div>
                <CodeTabs tabs={quickstartTabs} />
              </div>
            </Section>

            {/* Architecture */}
            <Section id="architecture" title="Core Architecture & Zero-Token Edge Extraction" badge="Architecture">
              <p>
                Standard LLM agent setups waste thousands of context tokens parsing long HTML emails just to find a
                4-digit login PIN. AgentKey executes deterministic extraction at the wire edge before messages hit storage:
              </p>
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="rounded-xl border border-[#E5DEC9] bg-white p-4 shadow-2xs">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-700">01. Wire Ingestion</span>
                  <p className="mt-1 text-xs text-[#64646A] leading-relaxed">
                    DPDP-compliant inbound SMTP pipelines receive messages and verify cryptographic DKIM/SPF signatures.
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5DEC9] bg-white p-4 shadow-2xs">
                  <span className="font-bold text-xs uppercase tracking-wider text-purple-700">02. Edge Parsing</span>
                  <p className="mt-1 text-xs text-[#64646A] leading-relaxed">
                    Under 10ms extraction isolates OTP codes, magic verification links, and invoices with zero LLM token waste.
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5DEC9] bg-white p-4 shadow-2xs">
                  <span className="font-bold text-xs uppercase tracking-wider text-amber-700">03. Context Delivery</span>
                  <p className="mt-1 text-xs text-[#64646A] leading-relaxed">
                    Your agent receives only the clean code or action URL, immune to prompt injection attacks inside message bodies.
                  </p>
                </div>
              </div>
            </Section>

            {/* MCP Server */}
            <Section id="mcp" title="Model Context Protocol (MCP) Server" badge="Anthropic & Cursor">
              <p>
                AgentKey runs a fully compliant, zero-installation <b>Model Context Protocol (MCP)</b> endpoint.
                Connect Claude Code, Cursor, Windsurf, or ChatGPT without installing any local binaries.
              </p>

              <CodeTabs tabs={mcpTabs} />

              <div className="pt-2">
                <h3 className="font-semibold text-sm text-[#18191B] mb-2">Tools Available to Your Agent</h3>
                <div className="overflow-x-auto rounded-xl border border-[#E5DEC9] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5DEC9] bg-[#F2ECE1]/60 font-semibold text-[#18191B]">
                        <th className="px-3.5 py-2">MCP Tool Name</th>
                        <th className="px-3.5 py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DEC9]">
                      <tr>
                        <td className="px-3.5 py-2 font-mono text-[#18191B]">create_agent_inbox</td>
                        <td className="px-3.5 py-2 text-[#64646A]">Provisions a dedicated task email address on demand.</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono text-[#18191B]">wait_for_otp</td>
                        <td className="px-3.5 py-2 text-[#64646A]">Blocks until a 4-8 digit verification code arrives (instant edge return).</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono text-[#18191B]">wait_for_magic_link</td>
                        <td className="px-3.5 py-2 text-[#64646A]">Resolves sign-in or password-reset URLs automatically.</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono text-[#18191B]">list_messages</td>
                        <td className="px-3.5 py-2 text-[#64646A]">Fetches inbound messages with extracted metadata.</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono text-[#18191B]">get_thread_history</td>
                        <td className="px-3.5 py-2 text-[#64646A]">Returns complete chronological thread history for customer support workflows.</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono text-[#18191B]">send_email</td>
                        <td className="px-3.5 py-2 text-[#64646A]">Sends outbound mail; subjects to HITL guardrails if policies match.</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono text-[#18191B]">send_whatsapp</td>
                        <td className="px-3.5 py-2 text-[#64646A]">Dispatches compliant WhatsApp notifications with owner attribution.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>

            {/* Frameworks */}
            <Section id="frameworks" title="Agent Framework Integrations">
              <p>
                The AgentKey Python SDK ships native tool adapters for the industry&apos;s leading orchestration frameworks.
                No custom wrapper code needed.
              </p>
              <CodeTabs tabs={frameworkTabs} />
            </Section>

            {/* Verifiable Passports */}
            <Section id="passports" title="Verifiable Agent Passports" badge="Trust & Verification">
              <p>
                Every autonomous agent created in AgentKey receives a cryptographically signed HMAC-SHA256 passport token.
                Third-party SaaS applications and APIs use this token to verify the human operator behind the bot,
                allowing zero-CAPTCHA cross-site access with verifiable accountability:
              </p>
              <Code code={s.passportVerify} title="Third-Party Server Verification Middleware (Express / Node.js)" />
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 leading-relaxed">
                <b>Verified Claims:</b> When an external application verifies a passport token via <code>/v1/auth/agent/verify</code>,
                it receives confirmed operator identity, trust score (<code>99.0</code>), DPDP legal compliance status,
                and unique vector avatar attestation.
              </div>
            </Section>

            {/* OAuth 2.1 & OpenID Connect */}
            <Section id="oauth" title="OAuth 2.1 & OpenID Connect Discovery" badge="OIDC Standard">
              <p>
                Allow external web applications, partner portals, and SaaS platforms to offer &ldquo;Sign in with AgentKey&rdquo;.
                AgentKey implements standard OpenID Connect discovery and authorization code flow with PKCE S256:
              </p>
              <div className="rounded-xl border border-[#E5DEC9] bg-white p-4 font-mono text-xs space-y-1.5 text-[#18191B]">
                <div><span className="text-[#8C8A94]">Issuer &amp; Discovery:</span> {publicApiUrl}/.well-known/openid-configuration</div>
                <div><span className="text-[#8C8A94]">Authorization Endpoint:</span> {publicApiUrl}/oauth/authorize</div>
                <div><span className="text-[#8C8A94]">Token Endpoint:</span> {publicApiUrl}/oauth/token</div>
                <div><span className="text-[#8C8A94]">UserInfo Endpoint:</span> {publicApiUrl}/oauth/userinfo</div>
                <div><span className="text-[#8C8A94]">Dynamic Registration:</span> {publicApiUrl}/oauth/register</div>
              </div>
              <p className="pt-2">
                External platforms using NextAuth.js / Auth.js can add AgentKey with standard OIDC configuration:
              </p>
              <Code code={s.nextAuth} title="NextAuth.js Provider Configuration" />
            </Section>

            {/* Session Vault */}
            <Section id="vault" title="Session Vault & Headless Browser Automation">
              <p>
                For platforms that do not yet support OAuth 2.1, AgentKey provides domain-pinned credential isolation.
                Your LLMs never hold raw plaintext passwords in context windows.
              </p>
              <p>
                Agents can export authenticated Playwright/Puppeteer storage state snapshots to browse headlessly without
                triggering multi-factor login challenges:
              </p>
              <Code code={s.browserSession} title="Export Playwright Storage State" />
            </Section>

            {/* Receiving */}
            <Section id="receiving" title="Receiving Mail & Extraction Fields">
              <p>
                Inbound emails and verification messages are deterministic-parsed at wire speed.
                Access structured properties via <code>extracted_data</code>:
              </p>
              <div className="overflow-x-auto rounded-xl border border-[#E5DEC9] bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5DEC9] bg-[#F2ECE1]/60 font-semibold text-[#18191B]">
                      <th className="px-3.5 py-2 font-mono">Field</th>
                      <th className="px-3.5 py-2">Type</th>
                      <th className="px-3.5 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DEC9]">
                    <tr>
                      <td className="px-3.5 py-2 font-mono text-[#18191B]">otp_code</td>
                      <td className="px-3.5 py-2 text-[#8C8A94]">string | null</td>
                      <td className="px-3.5 py-2 text-[#64646A]">Isolated 4 to 8 digit numeric/alphanumeric one-time code.</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2 font-mono text-[#18191B]">magic_link</td>
                      <td className="px-3.5 py-2 text-[#8C8A94]">string | null</td>
                      <td className="px-3.5 py-2 text-[#64646A]">Direct verification, sign-in, or password-reset URL.</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2 font-mono text-[#18191B]">reply_text</td>
                      <td className="px-3.5 py-2 text-[#8C8A94]">string</td>
                      <td className="px-3.5 py-2 text-[#64646A]">Clean latest reply text stripped of quoted history and signatures.</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2 font-mono text-[#18191B]">invoice</td>
                      <td className="px-3.5 py-2 text-[#8C8A94]">object | null</td>
                      <td className="px-3.5 py-2 text-[#64646A]">Invoice number, total amount, currency, and line items.</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2 font-mono text-[#18191B]">intent</td>
                      <td className="px-3.5 py-2 text-[#8C8A94]">string</td>
                      <td className="px-3.5 py-2 text-[#64646A]">Classified intent: <code>verification</code>, <code>invoice</code>, <code>reply</code>, <code>bounce</code>, <code>meeting</code>.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Sending & Custom Domains */}
            <Section id="sending" title="Sending Mail & Custom Domains">
              <p>
                All AgentKey workspaces can receive immediately on the shared <code>@agentkey.in</code> domain.
                To send outbound messages under your brand reputation without automated AI notices, connect a custom domain:
              </p>
              <div className="rounded-xl border border-[#E5DEC9] bg-white p-4 space-y-2 text-xs text-[#4A4B53]">
                <p><b>1. Add your domain</b> in the dashboard under <code>Domains &amp; DNS</code> (e.g. <code>agents.yourcompany.com</code>).</p>
                <p><b>2. Add the required DNS records:</b> MX, SPF (<code>v=spf1 include:agentkey.in ~all</code>), DKIM (2048-bit RSA), and DMARC.</p>
                <p><b>3. Automatic Verification:</b> AgentKey validates DNS propagation every 60 seconds.</p>
              </div>
            </Section>

            {/* HITL Guardrails */}
            <Section id="approvals" title="Human-in-the-Loop (HITL) Guardrails">
              <p>
                Prevent autonomous hallucinated sends. Define keyword or regex triggers in the <b>Approvals</b> tab.
                When an agent attempts to send an outbound message matching a policy:
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 leading-relaxed space-y-2">
                <p>
                  1. The API call immediately returns <b>HTTP 202 Accepted</b> with status <code>PENDING_APPROVAL</code>.
                </p>
                <p>
                  2. The message is queued safely in your vault; your agent moves on without blocking.
                </p>
                <p>
                  3. A human operator reviews, approves, or rejects the dispatch from the dashboard or connected Slack workspace.
                </p>
              </div>
            </Section>

            {/* Real-time */}
            <Section id="realtime" title="Webhooks & WebSocket Streaming">
              <p>
                Receive instantaneous notifications when messages land, codes are parsed, or approval verdicts are issued:
              </p>
              <Code code={s.webhook} title="Signed Webhook Handler (Python)" />
              <p className="pt-2">Or maintain an active duplex WebSocket connection for local edge runners:</p>
              <Code code={s.websocket} title="WebSocket Real-Time Listener (Python)" />
            </Section>

            {/* Security */}
            <Section id="security" title="Prompt Injection Isolation & Security">
              <p>
                Because any external party can send emails to your agent, AgentKey strictly wraps untrusted message
                bodies in <code>&lt;untrusted_content&gt;</code> tags and alerts agents when prompt injection signals are detected.
              </p>
              <p>
                Automated loop-prevention heuristics stop two autonomous agents from replying to each other in an infinite token-burning spiral.
              </p>
            </Section>

            {/* API Reference Table */}
            <Section id="reference" title="Complete REST API Reference">
              <p>
                Base URL: <code>{publicApiUrl}</code>. Authenticate all requests using standard <code>Authorization: Bearer ai_live_...</code> headers.
                Errors follow RFC 7807 problem details with machine-readable <code>title</code> and <code>detail</code> fields.
              </p>
              <div className="overflow-x-auto rounded-xl border border-[#E5DEC9] bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5DEC9] bg-[#F2ECE1]/60 font-semibold text-[#18191B]">
                      <th className="px-3.5 py-2.5">Method</th>
                      <th className="px-3.5 py-2.5 font-mono">Endpoint</th>
                      <th className="px-3.5 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DEC9]">
                    {endpoints.map((ep) => (
                      <tr key={ep.method + ep.path} className="hover:bg-black/[0.02]">
                        <td className="px-3.5 py-2.5">
                          <span className={`inline-block rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                            ep.method === "POST"
                              ? "bg-emerald-100 text-emerald-800"
                              : ep.method === "GET"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {ep.method}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[#18191B]">{ep.path}</td>
                        <td className="px-3.5 py-2.5 text-[#64646A]">{ep.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
