import { ActionForm } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api } from "@/lib/api";

import {
  addLogin, connectProvider, decideAccess, deleteLogin, disconnect, setLoginApproval, updateConnection,
} from "../actions";

type Connection = {
  id: string; provider: string; account: string; scopes: string; allow_writes: boolean; allow_export: boolean;
  last_used_at: string | null;
};
type Login = {
  id: string; name: string; site_host: string; username: string; has_totp: boolean; approval: "ask" | "auto";
  last_used_at: string | null;
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
  const [{ connected, error }, providers, connections, logins, requests] = await Promise.all([
    searchParams,
    api<{ data: { id: string; name: string }[] }>("/connections/providers"),
    api<{ data: Connection[] }>("/connections"),
    api<{ data: Login[] }>("/vault/items"),
    api<{ data: AccessRequest[] }>("/vault/requests"),
  ]);

  return (
    <>
      <PageHeader
        title="Identity"
        lead="Let your agent act as you on other services. Only API keys with the Connect permission can use anything on this page, and you decide how far each one goes."
      />
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

      <h2 className="mb-1 mt-10 font-semibold">Saved logins</h2>
      <p className="mb-3 max-w-2xl text-sm text-muted">
        For sites you cannot connect above. Stored encrypted, and only ever released for the site you saved them for.
        With “Ask me each time”, the agent waits until you allow it here.
      </p>
      <Card>
        <ActionForm action={addLogin} submit="Save login" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input name="name" required placeholder="Name, e.g. Work GitHub" className={inputClass} />
          <input name="site_url" required placeholder="https://github.com" className={inputClass} />
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
          <Card key={l.id} className="flex flex-wrap items-center gap-3 !py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{l.name}</p>
              <p className="text-xs text-muted">
                {l.username} on {l.site_host}
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
          </Card>
        ))}
      </div>
    </>
  );
}
