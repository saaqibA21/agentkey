"use client";

import { useState } from "react";
import { Badge, Card, Empty, inputClass } from "@/components/ui";
import type { Webhook } from "@/lib/api";

const events = [
  ["message.received", "Any message arrives"],
  ["otp.extracted", "A code was found"],
  ["magic_link.extracted", "A sign-in link was found"],
  ["message.sent", "A message was sent"],
  ["message.pending_approval", "A message is held"],
  ["message.failed", "Sending failed"],
] as const;

export function WebhooksManager({ initialWebhooks }: { initialWebhooks: Webhook[] }) {
  const [hooks, setHooks] = useState<Webhook[]>(initialWebhooks || []);
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<{ secret: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!targetUrl.trim()) return;

    const activeEvents = Object.entries(selectedEvents)
      .filter(([_, active]) => active)
      .map(([id]) => id);

    setCreating(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl.trim(),
          events: activeEvents.length > 0 ? activeEvents : ["*"],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create webhook");
      }

      if (data.webhook) {
        setHooks((prev) => [data.webhook, ...prev]);
      }
      setNewWebhookSecret({ secret: data.secret_token, url: targetUrl.trim() });
      setTargetUrl("");
      setSelectedEvents({});
    } catch (err: any) {
      setError(err.message || "Failed to add webhook endpoint.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!window.confirm("Remove this webhook?")) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/webhooks?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove webhook");
      }

      setHooks((prev) => prev.filter((h) => h.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to remove webhook.");
    } finally {
      setDeletingId(null);
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
      {/* Newly Created Signing Secret Alert Box */}
      {newWebhookSecret && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">✓</span>
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Webhook configured for &ldquo;{newWebhookSecret.url}&rdquo;
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted">
                Copy your HMAC-SHA256 signing secret. It is used to verify payload authenticity via the <code>X-AgentKey-Signature</code> header.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewWebhookSecret(null)}
              className="text-xs text-muted hover:text-ink font-medium"
            >
              Dismiss
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-emerald-500/30 bg-white dark:bg-black/40 px-3 py-2 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {newWebhookSecret.secret}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(newWebhookSecret.secret)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95"
            >
              {copied ? "Copied!" : "Copy Secret"}
            </button>
          </div>
        </div>
      )}

      {/* Creation Card */}
      <Card>
        <form onSubmit={handleAddWebhook} className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="url"
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://your-app.com/hooks/agentkey"
              className={`w-96 ${inputClass}`}
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-[#18191B] px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 shadow-sm"
            >
              {creating ? "Adding..." : "Add webhook"}
            </button>
          </div>

          <fieldset className="grid basis-full gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 pt-2 border-t border-line/40">
            <legend className="mb-1 text-xs text-muted">Events (none ticked = all events)</legend>
            {events.map(([id, label]) => (
              <label key={id} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(selectedEvents[id])}
                  onChange={() => toggleEvent(id)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-ink">{label}</span>
              </label>
            ))}
          </fieldset>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </form>
      </Card>

      {/* Webhooks List */}
      <div className="space-y-2">
        {hooks.length === 0 && (
          <Empty title="No webhooks">Agents that cannot receive webhooks can use the WebSocket stream instead.</Empty>
        )}
        {hooks.map((hook) => {
          const eventTypes = ((hook.event_types as string[]) ?? []);
          return (
            <Card key={hook.id} className="flex flex-wrap items-center gap-3 !py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm text-ink">{hook.target_url}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {eventTypes.map((e) => (
                    <Badge key={e}>{e === "*" ? "all events" : e}</Badge>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={deletingId === hook.id}
                onClick={() => handleDeleteWebhook(hook.id)}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50 transition"
              >
                {deletingId === hook.id ? "Removing..." : "Remove"}
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
