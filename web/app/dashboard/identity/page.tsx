import Link from "next/link";
import { ActionForm } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api, publicApiUrl } from "@/lib/api";

import {
  addLogin, connectProvider, decideAccess, deleteLogin, disconnect, revokeApp, setLoginApproval, updateConnection,
} from "../actions";

type Connection = {
  id: string; provider: string; account: string; scopes: string; allow_writes: boolean; allow_export: boolean;
  last_used_at: string | null;
};
type Login = {
  id: string; name: string; site_host: string; username: string; has_totp: boolean; approval: "ask" | "auto";
  owner_name?: string | null; has_session?: boolean; last_used_at: string | null;
};
type AccessRequest = { id: string; url: string; reason: string; created_at: string; item: Login };

function Toggle({ id, field, on, label, help }: { id: string; field: string; on: boolean; label: string; help: string }) {
  return (
    <ActionForm action={updateConnection} submit={on ? "Turn off" : "Turn on"} variant="secondary"
                className="flex flex-wrap items-center gap-3"
                confirm={on ? undefined : `${label}: ${help} Turn this on?`}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={on ? "false" : "true"} />
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{label}</span> <Badge tone={on ? "warn" : "neutral"}>{on ? "on" : "off"}</Badge>
        <span className="block text-xs text-muted">{help}</span>
      </span>
    </ActionForm>
  );
}

export default async function IdentityPage({
  searchParams,
}: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const [{ connected, error }, apps, providers, connections, logins, requests] = await Promise.all([
    searchParams,
    api<{ data: { client_id: string; client_name: string; redirect_host: string; scopes: string[]; last_authorized_at: string }[] }>("/oauth/grants"),
    api<{ data: { id: string; name: string }[] }>("/connections/providers"),
    api<{ data: Connection[] }>("/connections"),
    api<{ data: Login[] }>("/vault/items"),
    api<{ data: AccessRequest[] }>("/vault/requests"),
  ]);

  return (
    <>
      <PageHeader
        title="Identity & Session Vault"
        lead="Manage your agents' cross-site credentials and allow external websites to authenticate your agents via OpenID Connect & OAuth 2.1."
      />

      {/* OAuth 2.1 & OpenID Connect Provider Box */}
      <div className="mb-8 rounded-2xl border border-white/[0.08] bg-[#0E151E] p-5 shadow-xl shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#8BE8E3]/35 bg-[#8BE8E3]/15 text-[#8BE8E3]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">OAuth 2.1 &amp; OpenID Connect Identity Provider</h2>
                <Badge tone="accent">OIDC</Badge>
              </div>
              <p className="mt-0.5 text-xs text-[#9BA7B4]">
                External websites and apps use this to offer &ldquo;Sign in with BAGENTS&rdquo; and verify agent email addresses.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/oauth"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#8BE8E3]/40 bg-[#132A26] px-4 py-2 text-xs font-semibold text-[#8BE8E3] hover:bg-[#1A3833] transition shadow-sm"
          >
            <span>Open OAuth Portal</span>
            <span>→</span>
          </Link>
        </div>
      </div>



      {connected && <p className="mb-4 rounded-lg bg-accent/10 px-4 py-2 text-sm">Connected {connected}.</p>}
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
          The connection did not complete. Please try again.
        </p>
      )}

      {requests.data.length > 0 && (
        <section className="mb-8 space-y-2">
          <h2 className="font-semibold">Waiting for your OK</h2>
          {requests.data.map((r) => (
            <Card key={r.id} className="border-warn/50">
              <p className="text-sm">
                An agent wants to sign in to <b>{r.item.site_host}</b> as <b>{r.item.username}</b>
                <span className="text-muted"> · {timeAgo(r.created_at)}</span>
              </p>
              <p className="mt-1 break-all font-mono text-xs text-muted">{r.url}</p>
              {r.reason && <p className="mt-1 text-sm text-muted">Reason given: “{r.reason}”</p>}
              <div className="mt-3 flex gap-2">
                <ActionForm action={decideAccess} submit="Allow once">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="verdict" value="approve" />
                </ActionForm>
                <ActionForm action={decideAccess} submit="Deny" variant="danger">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="verdict" value="deny" />
                </ActionForm>
              </div>
            </Card>
          ))}
        </section>
      )}

      <h2 className="mb-1 font-semibold">AI apps with access</h2>
      <p className="mb-3 max-w-2xl text-sm text-muted">
        Apps such as ChatGPT and Claude that you connected by signing in. To add one, paste{" "}
        <code className="font-mono text-xs">{publicApiUrl}/mcp</code> as a new connector in the app, then approve here.
      </p>
      <div className="mb-10 space-y-2">
        {apps.data.length === 0 && <Empty title="No apps connected yet" />}
        {apps.data.map((a) => (
          <Card key={a.client_id} className="flex flex-wrap items-center gap-3 !py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{a.client_name}</p>
              <p className="text-xs text-muted">{a.redirect_host} · approved {timeAgo(a.last_authorized_at)}</p>
            </div>
            <div className="flex gap-1">
              {a.scopes.map((s) => (
                <Badge key={s} tone={s === "send" || s === "connect" ? "warn" : "neutral"}>{s}</Badge>
              ))}
            </div>
            <ActionForm action={revokeApp} submit="Remove access" variant="danger" confirm={`Remove ${a.client_name}'s access?`}>
              <input type="hidden" name="client_id" value={a.client_id} />
            </ActionForm>
          </Card>
        ))}
      </div>

      <h2 className="mb-1 font-semibold">Connected accounts</h2>
      <p className="mb-3 max-w-2xl text-sm text-muted">
        The safest way. You approve access on the service&apos;s own page; your password is never shared, and you can
        disconnect at any time.
      </p>
      <Card className="flex flex-wrap gap-2">
        {providers.data.length === 0 && (
          <p className="text-sm text-muted">No services are set up on this deployment yet.</p>
        )}
        {providers.data.map((p) => (
          <ActionForm key={p.id} action={connectProvider} submit={`Connect ${p.name}`} variant="secondary">
            <input type="hidden" name="provider" value={p.id} />
          </ActionForm>
        ))}
      </Card>
      <div className="mt-3 space-y-2">
        {connections.data.map((c) => (
          <Card key={c.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium capitalize">{c.provider} · <span className="normal-case">{c.account}</span></p>
                <p className="text-xs text-muted">
                  Access: {c.scopes || "default"} · {c.last_used_at ? `last used ${timeAgo(c.last_used_at)}` : "not used yet"}
                </p>
              </div>
              <ActionForm action={disconnect} submit="Disconnect" variant="danger" confirm={`Disconnect ${c.account}?`}>
                <input type="hidden" name="id" value={c.id} />
              </ActionForm>
            </div>
            <Toggle id={c.id} field="allow_writes" on={c.allow_writes} label="Allow changes"
                    help="Off: the agent can only read. On: it can also create, edit and delete." />
            <Toggle id={c.id} field="allow_export" on={c.allow_export} label="Allow token export"
                    help="Needed for git clone and push. The agent receives the access token itself." />
          </Card>
        ))}
      </div>

      <h2 className="mb-1 mt-10 font-semibold">Saved logins & Browser Sessions</h2>
      <p className="mb-3 max-w-2xl text-sm text-muted">
        For websites where OAuth is not supported. Stored cryptographically encrypted, domain-pinned, and tied to the registered owner.
        With “Ask me each time”, the agent waits until you confirm here.
      </p>
      <Card>
        <ActionForm action={addLogin} submit="Save login" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input name="name" required placeholder="Name, e.g. AWS Console or GitHub" className={inputClass} />
          <input name="site_url" required placeholder="https://github.com" className={inputClass} />
          <input name="owner_name" placeholder="Owner / Operator (e.g. Saaqib)" className={inputClass} />
          <input name="username" required placeholder="Username or email" autoComplete="off" className={inputClass} />
          <input name="password" type="password" required placeholder="Password" autoComplete="new-password" className={inputClass} />
          <input name="totp_secret" placeholder="2FA setup key (optional)" autoComplete="off" className={inputClass} />
          <select name="approval" className={inputClass} aria-label="When the agent asks for this login">
            <option value="ask">Ask me each time</option>
            <option value="auto">Release automatically</option>
          </select>
        </ActionForm>
      </Card>
      <div className="mt-3 space-y-2">
        {logins.data.length === 0 && <Empty title="No saved logins" />}
        {logins.data.map((l) => (
          <Card key={l.id} className="space-y-3 !py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{l.name}</p>
                  {l.owner_name && (
                    <Badge tone="purple">Owner: {l.owner_name}</Badge>
                  )}
                  {l.has_session && (
                    <Badge tone="accent">Session Harvested (Playwright Ready)</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {l.username} on <span className="font-mono text-ink">{l.site_host}</span>
                  {l.has_totp && " · 2FA codes included"}
                  {l.last_used_at && ` · last used ${timeAgo(l.last_used_at)}`}
                </p>
              </div>
              <Badge tone={l.approval === "auto" ? "warn" : "good"}>{l.approval === "auto" ? "automatic" : "asks first"}</Badge>
              <ActionForm action={setLoginApproval} variant="secondary"
                          submit={l.approval === "auto" ? "Ask me each time" : "Make automatic"}
                          confirm={l.approval === "auto" ? undefined
                            : "The agent will get this password whenever it asks, without checking with you. Continue?"}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="approval" value={l.approval === "auto" ? "ask" : "auto"} />
              </ActionForm>
              <ActionForm action={deleteLogin} submit="Delete" variant="danger" confirm={`Delete the saved login for ${l.site_host}?`}>
                <input type="hidden" name="id" value={l.id} />
              </ActionForm>
            </div>
            {l.has_session && (
              <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3 text-xs">
                <p className="font-semibold text-teal-600 dark:text-teal-400">Browser Automation Primitive</p>
                <p className="mt-0.5 text-muted">
                  Agent can authenticate headlessly via Playwright/Puppeteer storage state:
                </p>
                <code className="mt-1.5 block select-all rounded bg-code px-2 py-1 font-mono text-[11px] text-ink">
                  curl -H &quot;Authorization: Bearer $AGENT_API_KEY&quot; {publicApiUrl}/vault/items/{l.id}/export-browser-state
                </code>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-line bg-subtle/50 p-5">
        <h3 className="font-semibold tracking-tight text-ink">Zero-Trust Credential Isolation</h3>
        <p className="mt-1 text-xs text-muted">
          BAGENTS ensures autonomous LLMs never possess raw passwords in context windows. Secrets remain domain-pinned,
          ephemeral TOTPs are injected synchronously at runtime, and browser state is securely vaulted with owner attribution.
        </p>
      </div>
    </>
  );
}
