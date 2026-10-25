"use client";

import { useState } from "react";
import { Badge, Card, Empty, inputClass, timeAgo } from "@/components/ui";
import type { ApiKey } from "@/lib/api";

const scopes = [
  ["read", "Read", "List inboxes, read messages, wait for codes", true],
  ["send", "Send", "Send email, WhatsApp and SMS", false],
  ["manage", "Manage", "Create and delete inboxes, webhooks, rules, keys", true],
  ["connect", "Connect", "Act as you through connected accounts and saved logins", false],
] as const;

export function KeysManager({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys || []);
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<Record<string, boolean>>({
    read: true,
    send: false,
    manage: true,
    connect: false,
  });
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newKeySecret, setNewKeySecret] = useState<{ secret: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => ({ ...prev, [scope]: !prev[scope] }));
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const activeScopes = Object.entries(selectedScopes)
      .filter(([_, active]) => active)
      .map(([s]) => s);

    if (activeScopes.length === 0) {
      setError("Please select at least one permission scope.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName.trim() || "Untitled Key",
          scopes: activeScopes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create API key");
      }

      if (data.key) {
        setKeys((prev) => [data.key, ...prev]);
      }
      setNewKeySecret({ secret: data.secret, name: keyName.trim() || "Untitled Key" });
      setKeyName("");
    } catch (err: any) {
      setError(err.message || "Something went wrong while generating the API key.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!window.confirm(`Revoke "${name}"? Agents using it will stop working immediately.`)) {
      return;
    }

    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke key");
      }

      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to revoke key.");
    } finally {
      setRevokingId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Newly Created Key Alert Box */}
      {newKeySecret && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">✓</span>
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                  New API key generated for &ldquo;{newKeySecret.name}&rdquo;
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted">
                Copy this key now. For your security, it will never be displayed again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewKeySecret(null)}
              className="text-xs text-muted hover:text-ink font-medium"
            >
              Dismiss
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-emerald-500/30 bg-white dark:bg-black/40 px-3 py-2 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {newKeySecret.secret}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(newKeySecret.secret)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95"
            >
              {copied ? "Copied!" : "Copy Key"}
            </button>
          </div>
        </div>
      )}

      {/* Creation Card */}
      <Card>
        <form onSubmit={handleCreateKey} className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="text"
              required
              maxLength={80}
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key name, e.g. signup-agent"
              className={`w-72 ${inputClass}`}
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-[#18191B] px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 shadow-sm"
            >
              {creating ? "Generating..." : "Create key"}
            </button>
          </div>

          <fieldset className="flex flex-wrap gap-x-6 gap-y-2 pt-1 border-t border-line/40">
            <legend className="sr-only">Permissions</legend>
            {scopes.map(([id, label, help]) => (
              <label key={id} className="flex items-start gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(selectedScopes[id])}
                  onChange={() => toggleScope(id)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span>
                  <span className="font-medium text-ink">{label}</span>
                  <span className="block text-xs text-muted">{help}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </form>
      </Card>

      {/* Keys List */}
      <div className="space-y-2">
        {keys.length === 0 && (
          <Empty title="No keys yet">Create one above and paste it into your agent&apos;s config.</Empty>
        )}
        {keys.map((key) => {
          const scopesList = Array.isArray(key?.scopes) ? key.scopes : [];
          return (
            <Card key={key.id} className="flex flex-wrap items-center gap-3 !py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{key.name}</p>
                <p className="font-mono text-xs text-muted">
                  {key.key_prefix}… · created {timeAgo(key.created_at)}
                </p>
              </div>
              <div className="flex gap-1">
                {scopesList.map((s) => (
                  <Badge key={s} tone={s === "send" || s === "connect" ? "warn" : "neutral"}>
                    {s}
                  </Badge>
                ))}
              </div>
              <button
                type="button"
                disabled={revokingId === key.id}
                onClick={() => handleRevokeKey(key.id, key.name)}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50 transition"
              >
                {revokingId === key.id ? "Revoking..." : "Revoke"}
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
