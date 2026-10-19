import Link from "next/link";

import { CopyButton } from "@/components/client";
import { Badge, Card, Code, PageHeader } from "@/components/ui";
import { publicApiUrl } from "@/lib/api";
import { snippets } from "@/lib/snippets";

export const metadata = { title: "User Guide · How to Use AgentKey" };

export default function UserGuidePage() {
  const s = snippets(publicApiUrl);

  const pythonQuickstart = `# 1. Install httpx or the python sdk
# pip install httpx

import httpx
import asyncio

API_KEY = "ai_live_YOUR_KEY"
BASE_URL = "${publicApiUrl}/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

async def main():
    async with httpx.AsyncClient() as client:
        # Step 1: Create an autonomous inbox for your agent
        inbox_resp = await client.post(
            f"{BASE_URL}/inboxes",
            headers=headers,
            json={"username": "researcher-bot"}
        )
        inbox = inbox_resp.json()
        print(f"Created Agent Email: {inbox['address']}")
        inbox_id = inbox['id']

        # Step 2: Use your agent's email to sign up on any website
        # ... agent submits form with inbox['address'] ...

        # Step 3: Wait for 2FA OTP code (Zero-token edge extraction!)
        print("Waiting for verification email...")
        wait_resp = await client.get(
            f"{BASE_URL}/inboxes/{inbox_id}/wait?for=otp&timeout_seconds=60",
            headers=headers
        )
        if wait_resp.status_code == 200:
            otp_data = wait_resp.json()
            code = otp_data["extracted_data"]["otp"]
            print(f"Extracted OTP Code: {code}")
            # Agent can now enter this code into the website form!

asyncio.run(main())`;

  const curlCreateInbox = `# 1. Create an inbox for your agent
curl -X POST "${publicApiUrl}/v1/inboxes" \\
  -H "Authorization: Bearer ai_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "my-agent"}'`;

  const curlWaitOtp = `# 2. Long-poll until an OTP code arrives (returns instantly when mail arrives)
curl -X GET "${publicApiUrl}/v1/inboxes/INBOX_ID/wait?for=otp&timeout_seconds=45" \\
  -H "Authorization: Bearer ai_live_YOUR_KEY"`;

  const curlSendMessage = `# 3. Send an email from your agent
curl -X POST "${publicApiUrl}/v1/inboxes/INBOX_ID/messages/send" \\
  -H "Authorization: Bearer ai_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "customer@example.com",
    "subject": "Order #4829 Update",
    "body_text": "Hello! Your report has been generated successfully."
  }'`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="User Guide · How to Use AgentKey"
        lead="Everything you need to give your AI agents sovereign email identities, automate OTP 2FA logins, connect Claude & Cursor MCP, and protect operations with human-in-the-loop guardrails."
        aside={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/api"
                className="rounded-xl border border-[#8BE8E3]/35 bg-[#132A26] px-4 py-2 text-xs font-semibold text-[#8BE8E3] transition hover:bg-[#1A3833]"
              >
                API Reference →
              </Link>
              <Link
                href="/dashboard/keys"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Get API Key →
              </Link>
            </div>
            <div className="hidden md:flex select-none shrink-0">
              <img
                src="/images/mascot/agentkey-docs.png"
                alt="AgentKey Guide Mascot"
                className="w-24 lg:w-28 h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        }
      />

      {/* Visual Roadmap / 5-Step Architecture */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E151E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-[#8BE8E3]">
            <span>STEP 01</span>
            <span className="h-2 w-2 rounded-full bg-[#8BE8E3]" />
          </div>
          <h3 className="mt-2 text-sm font-bold text-white">Create Inbox</h3>
          <p className="mt-1 text-xs text-[#9BA7B4]">
            Give your agent a real email address with 1 click or API call.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0E151E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
            <span>STEP 02</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <h3 className="mt-2 text-sm font-bold text-white">Connect Agent</h3>
          <p className="mt-1 text-xs text-[#9BA7B4]">
            Hook into Claude Code, Cursor, LangChain, or your custom Python stack.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0E151E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-teal-400">
            <span>STEP 03</span>
            <span className="h-2 w-2 rounded-full bg-teal-400" />
          </div>
          <h3 className="mt-2 text-sm font-bold text-white">Automate 2FA</h3>
          <p className="mt-1 text-xs text-[#9BA7B4]">
            Edge parser extracts OTP codes & magic links with zero token spend.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0E151E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-purple-400">
            <span>STEP 04</span>
            <span className="h-2 w-2 rounded-full bg-purple-400" />
          </div>
          <h3 className="mt-2 text-sm font-bold text-white">HITL Guardrails</h3>
          <p className="mt-1 text-xs text-[#9BA7B4]">
            Hold risky emails for human operator review before sending.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0E151E] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-indigo-400">
            <span>STEP 05</span>
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
          </div>
          <h3 className="mt-2 text-sm font-bold text-white">Verifiable ID</h3>
          <p className="mt-1 text-xs text-[#9BA7B4]">
            External sites authenticate your agent via OAuth 2.1 &amp; OD-ID.
          </p>
        </div>
      </div>

      {/* Deep-Dive Step 1 */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#8BE8E3]/30 bg-[#8BE8E3]/10 font-bold text-[#8BE8E3]">
            1
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">
                Create an Autonomous Inbox for Your Agent
              </h2>
              <Link
                href="/dashboard/inboxes"
                className="text-xs text-[#8BE8E3] hover:underline font-semibold"
              >
                Go to Inboxes &amp; Channels →
              </Link>
            </div>
            <p className="text-sm text-[#9BA7B4] leading-relaxed">
              Every AI agent needs its own communication handle so it can receive messages, register for SaaS accounts, and receive notifications. You can create inboxes either directly from the{" "}
              <Link href="/dashboard/inboxes" className="text-white underline">
                Inboxes UI
              </Link>{" "}
              or programmatically using the API.
            </p>

            <div className="pt-2">
              <Code code={curlCreateInbox} title="Create Inbox via cURL" />
            </div>
          </div>
        </div>
      </Card>

      {/* Deep-Dive Step 2 */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-400">
            2
          </div>
          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">
                Connect Your Agent: Claude Code, Cursor, or Python
              </h2>
              <Badge tone="good">Hosted MCP Ready</Badge>
            </div>
            <p className="text-sm text-[#9BA7B4] leading-relaxed">
              AgentKey provides native Model Context Protocol (MCP) servers and a lightweight HTTP API. You don&apos;t have to write custom email parsing code or install complex SMTP daemons.
            </p>

            {/* Sub-cards for toolkits */}
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              {/* Claude Code */}
              <div className="rounded-xl border border-white/[0.08] bg-[#080D12] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Claude Code (MCP)
                  </span>
                  <CopyButton value={s.claudeCode} />
                </div>
                <p className="text-xs text-[#718096]">
                  Run this single command in your terminal to equip Claude with autonomous email powers:
                </p>
                <pre className="text-xs font-mono text-[#8BE8E3] overflow-x-auto p-2.5 bg-black/50 rounded-lg">
                  {s.claudeCode}
                </pre>
              </div>

              {/* Cursor */}
              <div className="rounded-xl border border-white/[0.08] bg-[#080D12] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#8BE8E3]" />
                    Cursor IDE (.cursor/mcp.json)
                  </span>
                  <CopyButton value={s.mcpJson} />
                </div>
                <p className="text-xs text-[#718096]">
                  Paste into your project&apos;s <code>.cursor/mcp.json</code> file:
                </p>
                <pre className="text-xs font-mono text-[#B5F0D1] overflow-x-auto p-2.5 bg-black/50 rounded-lg max-h-32">
                  {s.mcpJson}
                </pre>
              </div>
            </div>

            {/* Python Example */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">Full Python Agent Integration</span>
                <span className="text-xs text-[#718096]">Works with LangChain, CrewAI, AutoGen, Swarm</span>
              </div>
              <Code code={pythonQuickstart} title="autonomous_agent_flow.py" />
            </div>
          </div>
        </div>
      </Card>

      {/* Deep-Dive Step 3 */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-500/30 bg-teal-500/10 font-bold text-teal-400">
            3
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">
                Automated 2FA OTP &amp; Magic Link Extraction (Zero Tokens)
              </h2>
              <Badge tone="accent">Zero-Token Engine</Badge>
            </div>
            <p className="text-sm text-[#9BA7B4] leading-relaxed">
              When an agent signs up on an external service (GitHub, Notion, Slack, X, etc.), the service sends a 6-digit confirmation code or magic link. Traditional LLM solutions feed the whole HTML email into GPT-4, burning thousands of tokens.
            </p>
            <p className="text-sm text-[#9BA7B4] leading-relaxed">
              With AgentKey, our edge parser runs deterministic RFC regular expressions and security heuristics on arrival. Your agent simply calls the <code className="text-white">/wait?for=otp</code> long-poll endpoint:
            </p>

            <div className="pt-2">
              <Code code={curlWaitOtp} title="Long-Poll OTP Endpoint" />
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-300">
              <b>Tip:</b> If the email contains a magic link button instead of a 6-digit number, use <code>/wait?for=magic_link</code> to extract the clean URL directly!
            </div>
          </div>
        </div>
      </Card>

      {/* Deep-Dive Step 4 */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 font-bold text-purple-300">
            4
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">
                Sending Outbound Messages &amp; Human-in-the-Loop (HITL) Guardrails
              </h2>
              <Link
                href="/dashboard/approvals"
                className="text-xs text-purple-300 hover:underline font-semibold"
              >
                View Approvals Queue →
              </Link>
            </div>
            <p className="text-sm text-[#9BA7B4] leading-relaxed">
              Autonomous agents should not be allowed to send emails unchecked. AgentKey gives you fine-grained policy control:
            </p>

            <ul className="list-disc list-inside text-xs text-[#9BA7B4] space-y-1.5 pl-2">
              <li><b>Keyword Triggers:</b> Hold any message containing words like <em>refund</em>, <em>wire</em>, <em>password</em>, or <em>urgent</em>.</li>
              <li><b>Budget Caps:</b> Enforce daily message limits per agent so runaway loops don&apos;t spam users.</li>
              <li><b>202 Accepted:</b> When an agent sends a held message, the API returns <code className="text-purple-300">HTTP 202 Accepted</code> with status <code>pending_approval</code>. You can approve or reject it from the dashboard.</li>
            </ul>

            <div className="pt-2">
              <Code code={curlSendMessage} title="Send Outbound Email via cURL" />
            </div>
          </div>
        </div>
      </Card>

      {/* Deep-Dive Step 5 */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 font-bold text-indigo-400">
            5
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">
                Verifiable Agent Passports (OD-ID) &amp; OAuth 2.1
              </h2>
              <Link
                href="/dashboard/oauth"
                className="text-xs text-[#8BE8E3] hover:underline font-semibold"
              >
                Open OAuth &amp; Connect Portal →
              </Link>
            </div>
            <p className="text-sm text-[#9BA7B4] leading-relaxed">
              How do external websites know an incoming request is an authorized AI agent and not an attack bot?
            </p>
            <p className="text-sm text-[#9BA7B4] leading-relaxed">
              With <b>Owner Delegated ID (OD-ID)</b> and <b>OAuth 2.1 OpenID Connect</b>, third-party apps can implement &ldquo;Sign in with AgentKey&rdquo;. The external app receives cryptographic claims confirming the agent&apos;s identity, trust score, and the verified human operator legally responsible for the agent.
            </p>

            <div className="rounded-xl border border-white/[0.08] bg-[#080D12] p-4 text-xs font-mono text-[#8BE8E3]">
              <p className="text-[#9BA7B4] mb-2 font-sans font-semibold text-xs">Standard OIDC Discovery URL:</p>
              <code>{publicApiUrl}/.well-known/openid-configuration</code>
            </div>
          </div>
        </div>
      </Card>

      {/* FAQ Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Frequently Asked Questions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="!p-5 space-y-2">
            <h4 className="text-sm font-bold text-white">Can my agent send emails immediately?</h4>
            <p className="text-xs text-[#9BA7B4] leading-relaxed">
              Inbound receiving and OTP extraction work instantly on your free inbox. To send outbound emails, you can either enable the outbound sandbox or connect your own domain under <Link href="/dashboard/domains" className="text-[#8BE8E3] underline">Domains &amp; DNS</Link>.
            </p>
          </Card>

          <Card className="!p-5 space-y-2">
            <h4 className="text-sm font-bold text-white">Where do I find my API key?</h4>
            <p className="text-xs text-[#9BA7B4] leading-relaxed">
              Head over to <Link href="/dashboard/keys" className="text-[#8BE8E3] underline">API Keys</Link> in the sidebar to create read-only or read/write API keys for your agents. Never share keys publicly.
            </p>
          </Card>

          <Card className="!p-5 space-y-2">
            <h4 className="text-sm font-bold text-white">How does Webhook delivery work?</h4>
            <p className="text-xs text-[#9BA7B4] leading-relaxed">
              Under <Link href="/dashboard/webhooks" className="text-[#8BE8E3] underline">Webhooks</Link>, register your HTTPS endpoint. Every time an email arrives or an approval status changes, AgentKey signs a HMAC SHA-256 payload and delivers it in under 100ms.
            </p>
          </Card>

          <Card className="!p-5 space-y-2">
            <h4 className="text-sm font-bold text-white">Is this DPDP and CERT-In compliant?</h4>
            <p className="text-xs text-[#9BA7B4] leading-relaxed">
              Yes. All email payloads are processed through our PII stripping pipeline, and audit trails are archived for 180 days in compliance with Indian CERT-In guidelines and global privacy standards.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
