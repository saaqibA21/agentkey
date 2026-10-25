"use client";

import { useState } from "react";
import { Badge, Card, Empty, inputClass, timeAgo } from "@/components/ui";

type Connection = {
  id: string;
  provider: string;
  account: string;
  scopes: string;
  allow_writes: boolean;
  allow_export: boolean;
  last_used_at: string | null;
};

type Login = {
  id: string;
  name: string;
  site_host: string;
  username: string;
  has_totp: boolean;
  approval: "ask" | "auto";
  owner_name?: string | null;
  has_session?: boolean;
  last_used_at: string | null;
};

type AccessRequest = {
  id: string;
  url: string;
  reason: string;
  created_at: string;
  item: Login;
};

type ConnectedApp = {
  client_id: string;
  client_name: string;
  redirect_host: string;
  scopes: string[];
  last_authorized_at: string;
};

export function IdentityManager({
  initialRequests,
  initialApps,
  initialConnections,
  initialLogins,
  providers,
  publicApiUrl,
  defaultOwnerName,
}: {
  initialRequests: AccessRequest[];
  initialApps: ConnectedApp[];
  initialConnections: Connection[];
  initialLogins: Login[];
  providers: { id: string; name: string }[];
  publicApiUrl: string;
  defaultOwnerName: string;
}) {
  const [requests, setRequests] = useState<AccessRequest[]>(initialRequests || []);
  const [apps, setApps] = useState<ConnectedApp[]>(initialApps || []);
  const [connections, setConnections] = useState<Connection[]>(initialConnections || []);
  const [logins, setLogins] = useState<Login[]>(initialLogins || []);

  // Form states for adding login
  const [name, setName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [ownerName, setOwnerName] = useState(defaultOwnerName || "Operator");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [approval, setApproval] = useState<"ask" | "auto">("ask");

  const [savingLogin, setSavingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Handle access requests
  const handleDecideRequest = async (id: string, verdict: "approve" | "deny") => {
    try {
      await fetch("/api/vault/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, verdict }),
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setNotice(verdict === "approve" ? "Access granted for this session." : "Access request denied.");
      setTimeout(() => setNotice(null), 3000);
    } catch {
      // ignore
    }
  };

  // Handle revoking app
  const handleRevokeApp = async (clientId: string, appName: string) => {
    if (!window.confirm(`Remove ${appName}'s access?`)) return;
    try {
      await fetch(`/api/identity/connections?client_id=${encodeURIComponent(clientId)}`, {
        method: "DELETE",
      });
      setApps((prev) => prev.filter((a) => a.client_id !== clientId));
    } catch {
      // ignore
    }
  };

  // Handle disconnecting provider
  const handleDisconnect = async (id: string, account: string) => {
    if (!window.confirm(`Disconnect ${account}?`)) return;
    try {
      await fetch(`/api/identity/connections?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  // Handle connection toggles
  const handleToggleConnection = async (id: string, field: "allow_writes" | "allow_export", currentVal: boolean) => {
    const nextVal = !currentVal;
    try {
      await fetch("/api/identity/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, field, value: nextVal }),
      });
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: nextVal } : c))
      );
    } catch {
      // ignore
    }
  };

  // Handle adding saved login
  const handleAddLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!siteUrl.trim() || !username.trim() || !password) return;

    setSavingLogin(true);
    try {
      const res = await fetch("/api/vault/logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || siteUrl.trim(),
          site_url: siteUrl.trim(),
          username: username.trim(),
          password,
          approval,
          totp_secret: totpSecret.trim() || undefined,
          owner_name: ownerName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save login");
      }

      if (data.login) {
        setLogins((prev) => [data.login, ...prev]);
      }
      setName("");
      setSiteUrl("");
      setUsername("");
      setPassword("");
      setTotpSecret("");
      setNotice("Login securely saved to cryptographic vault.");
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setLoginError(err.message || "Failed to save login credentials.");
    } finally {
      setSavingLogin(false);
    }
  };

  // Handle toggle login approval
  const handleToggleApproval = async (id: string, currentApproval: "ask" | "auto") => {
    const nextApproval = currentApproval === "auto" ? "ask" : "auto";
    if (nextApproval === "auto") {
      if (!window.confirm("The agent will get this password whenever it asks, without checking with you. Continue?")) {
        return;
      }
    }

    try {
      await fetch("/api/vault/logins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approval: nextApproval }),
      });
      setLogins((prev) =>
        prev.map((l) => (l.id === id ? { ...l, approval: nextApproval } : l))
      );
    } catch {
      // ignore
    }
  };

  // Handle delete login
  const handleDeleteLogin = async (id: string, host: string) => {
    if (!window.confirm(`Delete the saved login for ${host}?`)) return;
    try {
      await fetch(`/api/vault/logins?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setLogins((prev) => prev.filter((l) => l.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8">
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* Access Requests Waiting for OK */}
      {requests.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-[#18191B]">Waiting for your OK</h2>
          {requests.map((r) => (
            <Card key={r.id} className="border-warn/50">
              <p className="text-sm text-ink">
                An agent wants to sign in to <b>{r.item.site_host}</b> as <b>{r.item.username}</b>
                <span className="text-muted"> · {timeAgo(r.created_at)}</span>
              </p>
              <p className="mt-1 break-all font-mono text-xs text-muted">{r.url}</p>
              {r.reason && <p className="mt-1 text-sm text-muted">Reason given: &ldquo;{r.reason}&rdquo;</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDecideRequest(r.id, "approve")}
                  className="rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-xs"
                >
                  Allow once
                </button>
                <button
                  type="button"
                  onClick={() => handleDecideRequest(r.id, "deny")}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 transition"
                >
                  Deny
                </button>
              </div>
            </Card>
          ))}
        </section>
      )}

      {/* AI Apps with Access */}
      <div>
        <h2 className="mb-1 font-semibold text-[#18191B]">AI apps with access</h2>
        <p className="mb-3 max-w-2xl text-sm text-muted">
          Apps such as ChatGPT and Claude that you connected by signing in. To add one, paste{" "}
          <code className="font-mono text-xs">{publicApiUrl}/mcp</code> as a new connector in the app, then approve here.
        </p>
        <div className="space-y-2">
          {apps.length === 0 && <Empty title="No apps connected yet" />}
          {apps.map((a) => (
            <Card key={a.client_id} className="flex flex-wrap items-center gap-3 !py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{a.client_name}</p>
                <p className="text-xs text-muted">{a.redirect_host} · approved {timeAgo(a.last_authorized_at)}</p>
              </div>
              <div className="flex gap-1">
                {a.scopes.map((s) => (
                  <Badge key={s} tone={s === "send" || s === "connect" ? "warn" : "neutral"}>
                    {s}
                  </Badge>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleRevokeApp(a.client_id, a.client_name)}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 transition"
              >
                Remove access
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* Connected Accounts */}
      <div>
        <h2 className="mb-1 font-semibold text-[#18191B]">Connected accounts</h2>
        <p className="mb-3 max-w-2xl text-sm text-muted">
          The safest way. You approve access on the service&apos;s own page; your password is never shared, and you can
          disconnect at any time.
        </p>
        <Card className="flex flex-wrap gap-2">
          {providers.length === 0 && (
            <p className="text-sm text-muted">No external OAuth providers configured on this deployment yet.</p>
          )}
          {providers.map((p) => (
            <a
              key={p.id}
              href={`/api/auth/signin?provider=${p.id}`}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-subtle transition"
            >
              Connect {p.name}
            </a>
          ))}
        </Card>
        <div className="mt-3 space-y-2">
          {connections.map((c) => (
            <Card key={c.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium capitalize text-ink">
                    {c.provider} · <span className="normal-case">{c.account}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Access: {c.scopes || "default"} · {c.last_used_at ? `last used ${timeAgo(c.last_used_at)}` : "not used yet"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDisconnect(c.id, c.account)}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 transition"
                >
                  Disconnect
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-2 text-xs">
                <div>
                  <span className="font-medium text-ink">Allow changes</span>
                  <p className="text-muted text-[11px]">Off: read-only. On: agent can create and delete.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConnection(c.id, "allow_writes", c.allow_writes)}
                  className="rounded-lg border border-line bg-surface px-3 py-1 text-xs font-medium text-ink hover:bg-subtle"
                >
                  {c.allow_writes ? "Turn off" : "Turn on"}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-2 text-xs">
                <div>
                  <span className="font-medium text-ink">Allow token export</span>
                  <p className="text-muted text-[11px]">Needed for git clone and push.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConnection(c.id, "allow_export", c.allow_export)}
                  className="rounded-lg border border-line bg-surface px-3 py-1 text-xs font-medium text-ink hover:bg-subtle"
                >
                  {c.allow_export ? "Turn off" : "Turn on"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Saved Logins & Browser Sessions */}
      <div>
        <h2 className="mb-1 font-semibold text-[#18191B]">Saved logins &amp; Browser Sessions</h2>
        <p className="mb-3 max-w-2xl text-sm text-muted">
          For websites where OAuth is not supported. Stored cryptographically encrypted, domain-pinned, and tied to the registered owner.
          With &ldquo;Ask me each time&rdquo;, the agent waits until you confirm here.
        </p>

        <Card>
          <form onSubmit={handleAddLogin} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name, e.g. AWS Console or GitHub"
              className={inputClass}
            />
            <input
              required
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://github.com"
              className={inputClass}
            />
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Owner / Operator (e.g. Saaqib)"
              className={inputClass}
            />
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username or email"
              autoComplete="off"
              className={inputClass}
            />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="new-password"
              className={inputClass}
            />
            <input
              value={totpSecret}
              onChange={(e) => setTotpSecret(e.target.value)}
              placeholder="2FA setup key (optional)"
              autoComplete="off"
              className={inputClass}
            />
            <select
              value={approval}
              onChange={(e) => setApproval(e.target.value as any)}
              className={inputClass}
              aria-label="When the agent asks for this login"
            >
              <option value="ask">Ask me each time</option>
              <option value="auto">Release automatically</option>
            </select>
            <div className="sm:col-span-2 lg:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={savingLogin}
                className="rounded-xl bg-[#18191B] px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 shadow-sm"
              >
                {savingLogin ? "Saving..." : "Save login"}
              </button>
              {loginError && <span className="text-xs text-rose-600 font-medium">{loginError}</span>}
            </div>
          </form>
        </Card>

        <div className="mt-4 space-y-2">
          {logins.length === 0 && <Empty title="No saved logins" />}
          {logins.map((l) => (
            <Card key={l.id} className="space-y-3 !py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{l.name}</p>
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
                <Badge tone={l.approval === "auto" ? "warn" : "good"}>
                  {l.approval === "auto" ? "automatic" : "asks first"}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleToggleApproval(l.id, l.approval)}
                  className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-subtle transition"
                >
                  {l.approval === "auto" ? "Ask me each time" : "Make automatic"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLogin(l.id, l.site_host)}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 transition"
                >
                  Delete
                </button>
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
      </div>
    </div>
  );
}
