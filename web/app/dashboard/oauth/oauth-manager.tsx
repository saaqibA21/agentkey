"use client";

import { useState } from "react";
import { CopyButton } from "@/components/client";
import { Card, Empty, inputClass, timeAgo } from "@/components/ui";
import type { OAuthClient } from "@/lib/oauth-store";

export function OAuthManager({ initialClients }: { initialClients: OAuthClient[] }) {
  const [clients, setClients] = useState<OAuthClient[]>(initialClients || []);
  const [clientName, setClientName] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<OAuthClient | null>(null);

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!clientName.trim() || !redirectUri.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/oauth/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName.trim(),
          redirect_uri: redirectUri.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register application");
      }

      if (data.client) {
        setClients((prev) => [data.client, ...prev]);
        setNewClient(data.client);
      }
      setClientName("");
      setRedirectUri("");
    } catch (err: any) {
      setError(err.message || "Failed to register application.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClient = async (clientId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? Applications using this Client ID will immediately lose access.`)) {
      return;
    }

    setDeletingId(clientId);
    setError(null);
    try {
      const res = await fetch(`/api/oauth/clients?client_id=${encodeURIComponent(clientId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete application");
      }

      setClients((prev) => prev.filter((c) => c.client_id !== clientId));
    } catch (err: any) {
      setError(err.message || "Failed to delete application.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Newly Issued Client ID Notice Box */}
      {newClient && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">✓</span>
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Application &ldquo;{newClient.client_name}&rdquo; Registered
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted">
                Use this Client ID in Claude Desktop, custom agent connectors, or your OAuth 2.1 client configuration.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewClient(null)}
              className="text-xs text-muted hover:text-ink font-medium"
            >
              Dismiss
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-emerald-500/30 bg-white dark:bg-black/40 px-3 py-2 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {newClient.client_id}
            </code>
            <CopyButton value={newClient.client_id} />
          </div>
        </div>
      )}

      {/* Registration Card */}
      <Card>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#18191B]">Register New Application</h2>
          <p className="text-xs text-[#64646A] mt-0.5">
            Add an external client (Claude Desktop, custom agents, or web apps) to issue credentials.
          </p>
        </div>

        <form onSubmit={handleRegisterClient} className="space-y-4 max-w-2xl">
          <label className="block text-sm">
            <span className="font-medium text-[#18191B]">Application Name</span>
            <input
              required
              maxLength={80}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Claude Desktop, Customer Portal, or Agent Script"
              className={`mt-1.5 w-full ${inputClass}`}
            />
            <span className="mt-1 block text-xs text-[#64646A]">
              Shown to the operator on the consent screen when authenticating.
            </span>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-[#18191B]">Redirect URI</span>
            <input
              required
              type="url"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder="https://your-domain.com/api/auth/callback"
              className={`mt-1.5 w-full font-mono text-xs ${inputClass}`}
            />
            <span className="mt-1 block text-xs text-[#64646A]">
              Where AgentKey redirects after authorization. Must use HTTPS (or HTTP for localhost).
            </span>
          </label>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-[#18191B] px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 shadow-sm"
          >
            {creating ? "Registering..." : "Register Application"}
          </button>
        </form>
      </Card>

      {/* Registered Applications List */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-[#18191B]">Your Registered Applications</h2>

        {clients.length === 0 ? (
          <Empty title="No applications registered yet">
            Register an application above to generate a Client ID for external tools and agents.
          </Empty>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <Card key={c.client_id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between !py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#18191B]">{c.client_name}</p>
                    <span className="text-xs text-[#8C8A94]">· {timeAgo(c.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#64646A]">Client ID:</span>
                    <code className="font-mono text-xs text-[#18191B] bg-[#F2ECE1] px-2 py-0.5 rounded border border-[#E5DEC9]">
                      {c.client_id}
                    </code>
                    <CopyButton value={c.client_id} />
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-[#8C8A94]">Redirect:</span>
                    <span className="font-mono text-[11px] text-[#64646A] truncate">
                      {c.redirect_uris.join(", ")}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    disabled={deletingId === c.client_id}
                    onClick={() => handleDeleteClient(c.client_id, c.client_name)}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50 transition"
                  >
                    {deletingId === c.client_id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
