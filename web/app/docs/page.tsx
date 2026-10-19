import type { ReactNode } from "react";

import { SiteFooter, SiteNav } from "@/components/site";
import { Code } from "@/components/ui";
import { publicApiUrl } from "@/lib/api";
import { sdkInstall, snippets } from "@/lib/snippets";

export const metadata = { title: "Docs" };

const sections = [
  ["quickstart", "Quickstart"],
  ["mcp", "MCP (Claude, Cursor)"],
  ["frameworks", "Agent frameworks"],
  ["receiving", "Receiving mail"],
  ["sending", "Sending and approvals"],
  ["identity", "Acting as you"],
  ["oauth", "OAuth 2.1 & OpenID Connect"],
  ["realtime", "Webhooks and WebSocket"],
  ["security", "Handling untrusted mail"],
  ["reference", "API reference"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line py-10 first:border-0 first:pt-0">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed [&_code]:font-mono [&_code]:text-[13px] [&_p]:text-muted">
        {children}
      </div>
    </section>
  );
}

const endpoints = [
  ["POST", "/v1/inboxes", "Create an inbox (username, client_id, domain are optional)"],
  ["GET", "/v1/inboxes/{id}/wait?for=otp|magic_link|message", "Long-poll until something arrives; 204 on timeout"],
  ["GET", "/v1/inboxes/{id}/messages", "Newest messages first, with extracted_data"],
  ["GET", "/v1/threads/{id}", "A whole conversation, oldest first"],
  ["POST", "/v1/inboxes/{id}/messages/send", "Send an email; 202 means a human must approve it"],
  ["POST", "/v1/inboxes/{id}/messages/{message_id}/reply", "Reply in the same thread"],
  ["GET", "/v1/attachments/{id}?format=text", "Text of a PDF or text attachment; omit format to download"],
  ["POST", "/v1/webhooks", "Subscribe a URL to events; returns the signing secret once"],
  ["POST", "/v1/hitl/policies", "Hold or flag outbound messages that match keywords"],
  ["POST", "/v1/domains", "Connect your own domain; returns the DNS records to add"],
];

export default function Docs() {
  const s = snippets(publicApiUrl);
  return (
    <>
      <SiteNav />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-8 lg:grid-cols-[200px_1fr]">
        <nav className="hidden text-sm lg:block">
          <ul className="sticky top-6 space-y-2">
            {sections.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-muted hover:text-ink">{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 max-w-3xl">
          <h1 className="mb-8 text-3xl font-semibold tracking-tight">Docs</h1>

          <Section id="quickstart" title="Quickstart">
            <p>
              Sign in, open <b>API keys</b> in the dashboard and create a key. A key with only the <code>read</code>{" "}
              permission can receive mail but can never send, which is the right choice for an agent that only needs
              verification codes. Creating inboxes needs <code>manage</code>.
            </p>
            <Code code={sdkInstall} />
            <Code code={s.python} />
            <p>No Python? Everything is plain HTTPS:</p>
            <Code code={s.curl} />
          </Section>

          <Section id="mcp" title="MCP (Claude, Cursor and other clients)">
            <p>
              There is nothing to install. Point your client at the hosted endpoint and send your key as a bearer
              token. For Claude Code:
            </p>
            <Code code={s.claudeCode} />
            <p>
              For Cursor, Windsurf and other clients that read an <code>mcp.json</code>:
            </p>
            <Code code={s.mcpJson} />
            <p>
              <b>ChatGPT and Claude apps.</b> These do not take an API key. In the app&apos;s settings, add a custom
              connector (the menu is called Connectors or Apps, depending on the app and plan) and paste{" "}
              <code>{publicApiUrl}/mcp</code>. The app opens an AIgent page where you sign in, tick what it may do,
              and press Allow. You can remove an app again under <b>Identity</b> in the dashboard.
            </p>
            <p>
              Your agent gets these tools: <code>create_agent_inbox</code>, <code>wait_for_otp</code>,{" "}
              <code>wait_for_magic_link</code>, <code>list_messages</code>, <code>get_thread_history</code>,{" "}
              <code>read_attachment</code>, <code>send_email</code> and <code>send_whatsapp</code>.
            </p>
          </Section>

          <Section id="frameworks" title="Agent frameworks">
            <p>The Python SDK ships the same tools for the common frameworks. Each adapter needs only its own framework installed.</p>
            <Code code={s.langchain} />
            <p>With the Claude API directly:</p>
            <Code code={s.anthropic} />
          </Section>

          <Section id="receiving" title="Receiving mail">
            <p>
              Every inbound message is parsed before it is stored. Read <code>extracted_data</code> first; you often do
              not need the body at all.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li><code>otp_code</code>: a 4 to 8 digit one-time code, when one is present.</li>
              <li><code>magic_link</code>: a verification, sign-in or password-reset URL.</li>
              <li><code>reply_text</code>: the new part of a reply, without quoted history or signatures.</li>
              <li><code>invoice</code>: number, total, due date and line items, from the body or a PDF.</li>
              <li><code>attachments</code>: id, name, type and size of each file.</li>
              <li><code>intent</code>: verification, invoice, reply, auto_reply, bounce, newsletter, meeting or general.</li>
            </ul>
            <p>
              <code>wait_for_otp</code> also returns a code that arrived in the 60 seconds before the call, so it is
              safe to call it just after your agent submits a form.
            </p>
          </Section>

          <Section id="sending" title="Sending and approvals">
            <p>
              New workspaces can receive immediately. Sending unlocks when you connect and verify your own domain in
              the dashboard, and send from an inbox on it. Mail sent from the shared domain always carries a line
              saying it was written by an AI agent.
            </p>
            <p>
              Add an approval rule under <b>Approvals</b> to hold messages containing words you choose. A held send
              returns HTTP 202 with status <code>PENDING_APPROVAL</code>; your agent should move on and not resend. A
              person approves or rejects it from Slack or the dashboard.
            </p>
          </Section>

          <Section id="identity" title="Acting as you on other services">
            <p>
              Open <b>Identity</b> in the dashboard to let an agent use your existing accounts. Give the agent a key
              with the <code>Connect</code> permission; keys without it cannot touch anything there.
            </p>
            <p>
              <b>Connected accounts</b> are the safe default. Press Connect GitHub, approve on GitHub, and the agent can
              call the GitHub API as you through <code>account_request</code> without ever seeing a password or token.
              A connection is read-only until you switch on <i>Allow changes</i>. Switch on <i>Allow token export</i>{" "}
              only if the agent needs to run <code>git clone</code> or <code>git push</code>.
            </p>
            <p>
              <b>Saved logins</b> cover sites you cannot connect. The agent asks with <code>get_site_login</code> and
              the page address it is signing in on; the login is released only for the site you saved it for, and by
              default only after you press <i>Allow once</i>. If you saved a 2FA setup key, the agent also receives the
              current 6-digit code.
            </p>
            <p>
              Your agent still needs its own browser to sign in on a web page, and this does not get past CAPTCHAs or
              a site&apos;s new-device checks.
            </p>
          </Section>

          <Section id="oauth" title="OAuth 2.1 & OpenID Connect (Sign in with BAGENTS)">
            <p>
              Allow external websites, web applications, and third-party SaaS platforms to authenticate your autonomous AI agents
              using standard OpenID Connect (OIDC). External sites receive verified agent emails, cryptographic operator proof,
              and <code>is_agent: true</code> claims without needing API keys.
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-muted">
              <li><b>OIDC Discovery:</b> <code>{publicApiUrl}/.well-known/openid-configuration</code></li>
              <li><b>Authorization:</b> <code>{publicApiUrl}/oauth/authorize</code> (PKCE S256 required)</li>
              <li><b>Token:</b> <code>{publicApiUrl}/oauth/token</code></li>
              <li><b>UserInfo:</b> <code>{publicApiUrl}/oauth/userinfo</code></li>
              <li><b>Client Registration:</b> <code>{publicApiUrl}/oauth/register</code></li>
            </ul>
            <p>
              External websites can use standard libraries such as NextAuth.js, Passport.js, or Auth0 to add a
              &ldquo;Sign in with BAGENTS&rdquo; button. To register clients or inspect claims, visit the{" "}
              <a href="/dashboard/oauth" className="text-ink underline hover:text-[#8BE8E3]">
                OAuth &amp; Connect Portal
              </a>{" "}
              in your dashboard.
            </p>
          </Section>

          <Section id="realtime" title="Webhooks and WebSocket">

            <p>
              Register a webhook under <b>Webhooks</b> to have events pushed to you. Each delivery is signed; verify
              it before trusting the body. Failed deliveries are retried with increasing delays.
            </p>
            <Code code={s.webhook} />
            <p>If your agent cannot accept incoming connections, hold a WebSocket open instead:</p>
            <Code code={s.websocket} />
            <p>
              Events: <code>message.received</code>, <code>otp.extracted</code>, <code>magic_link.extracted</code>,{" "}
              <code>message.sent</code>, <code>message.pending_approval</code>, <code>message.rejected</code>,{" "}
              <code>message.failed</code>.
            </p>
          </Section>

          <Section id="security" title="Handling untrusted mail">
            <p>
              Anyone can email your agent, so treat message content as data. The MCP tools and the framework tool
              packs wrap third-party text in <code>&lt;untrusted_content&gt;</code> tags and add a{" "}
              <code>security_warning</code> when a message reads like instructions aimed at an AI. If you call the REST
              API yourself, check <code>extracted_data.security</code> and keep message text out of your system prompt.
            </p>
            <p>
              Automatic replies and bulk mail are stored but do not wake a waiting agent, which stops two auto-responders
              from answering each other forever.
            </p>
          </Section>

          <Section id="reference" title="API reference">
            <p>
              Base URL <code>{publicApiUrl}</code>. Authenticate with <code>Authorization: Bearer &lt;key&gt;</code>.
              Errors are RFC 7807 problem documents with a <code>title</code> and <code>detail</code>.
            </p>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-sm">
                <tbody>
                  {endpoints.map(([method, path, what]) => (
                    <tr key={method + path} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-accent">{method}</td>
                      <td className="px-3 py-2 font-mono text-xs">{path}</td>
                      <td className="px-3 py-2 text-muted">{what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
