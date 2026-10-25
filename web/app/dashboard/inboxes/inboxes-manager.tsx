"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, Empty, inputClass } from "@/components/ui";
import { CopyButton } from "@/components/client";
import type { Domain, Inbox, Overview } from "@/lib/api";

export function InboxesManager({
  initialInboxes = [],
  overview,
  domains = [],
}: {
  initialInboxes: Inbox[];
  overview?: Overview;
  domains?: Domain[];
}) {
  const router = useRouter();
  const [inboxes, setInboxes] = useState<Inbox[]>(initialInboxes);
  const [username, setUsername] = useState("");
  const [domain, setDomain] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Keep state in sync with server initial data
  useEffect(() => {
    if (Array.isArray(initialInboxes)) {
      setInboxes(initialInboxes);
    }
  }, [initialInboxes]);

  // Sync with client localStorage on mount for resilience
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ak_custom_inboxes");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setInboxes((prev) => {
            const seen = new Set(prev.map((i) => i.id));
            const seenEmails = new Set(prev.map((i) => i.email_address?.toLowerCase()));
            const toAdd = parsed.filter(
              (i: Inbox) => i && i.id && !seen.has(i.id) && !seenEmails.has(i.email_address?.toLowerCase())
            );
            return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const verifiedDomains = (domains || []).filter((d) => d && d.status === "VERIFIED");
  const maxInboxes = overview?.workspace?.max_inboxes ?? 50;
  const atLimit = inboxes.length >= maxInboxes;

  const handleGenerateName = () => {
    const prefixes = ["triage", "support", "sales", "agent", "ops", "research", "verify", "connect"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomHex = Math.random().toString(36).substring(2, 6);
    setUsername(`${randomPrefix}-${randomHex}`);
    if (error) setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUser || undefined,
          domain: domain.trim() || undefined,
          owner_name: ownerName.trim() || undefined,
          display_title: displayTitle.trim() || undefined,
          phone_number: phoneNumber.trim() || undefined,
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "Failed to create inbox.");
        return;
      }

      if (json.inbox) {
        setInboxes((prev) => {
          const updated = [json.inbox, ...prev.filter((i) => i.id !== json.inbox.id)];
          try {
            localStorage.setItem("ak_custom_inboxes", JSON.stringify(updated.slice(0, 25)));
          } catch {
            // ignore
          }
          return updated;
        });
        setUsername("");
        setOwnerName("");
        setDisplayTitle("");
        setPhoneNumber("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (inbox: Inbox) => {
    if (!window.confirm(`Delete inbox ${inbox.email_address}?`)) return;
    setDeletingId(inbox.id);
    try {
      // Optimistically remove from state and local storage
      setInboxes((prev) => {
        const updated = prev.filter((i) => i.id !== inbox.id);
        try {
          localStorage.setItem("ak_custom_inboxes", JSON.stringify(updated.slice(0, 25)));
        } catch {
          // ignore
        }
        return updated;
      });

      const res = await fetch(`/api/inboxes?id=${encodeURIComponent(inbox.id)}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
    } catch (err) {
      console.error("Error deleting inbox:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card className="transition-all hover:border-line/80">
        <h2 className="mb-3 text-sm font-semibold text-ink">Provision New Agent Inbox</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              name="username"
              value={username}
              onChange={(e) => {
                const clean = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "");
                setUsername(clean);
                if (error) setError(null);
              }}
              disabled={isSubmitting || atLimit}
              placeholder="agent-name (or leave blank for auto)"
              className={`w-64 ${inputClass}`}
            />
            <button
              type="button"
              onClick={handleGenerateName}
              disabled={isSubmitting || atLimit}
              className="rounded-xl border border-line bg-card/60 px-2.5 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-card active:scale-95 transition-all"
              title="Suggest a random name"
            >
              🎲 Suggest
            </button>
            <span className="text-muted">@</span>
            <select
              name="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={isSubmitting || atLimit}
              className={inputClass}
              aria-label="Domain"
            >
              <option value="">{overview?.mail_domain || "agentkey.in"}</option>
              {verifiedDomains.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSubmitting || atLimit}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 bg-teal-600 text-white shadow-sm shadow-teal-600/20 hover:bg-teal-500 hover:shadow-teal-500/30 active:scale-[0.98]"
            >
              {isSubmitting ? "Creating inbox…" : "Create inbox"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/40">
            <input
              name="owner_name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              disabled={isSubmitting || atLimit}
              placeholder="Owner Name (e.g. Saaqib)"
              className={`w-44 ${inputClass}`}
            />
            <input
              name="display_title"
              value={displayTitle}
              onChange={(e) => setDisplayTitle(e.target.value)}
              disabled={isSubmitting || atLimit}
              placeholder="Display Attribution (e.g. Saaqib (via TriageBot))"
              className={`w-64 ${inputClass}`}
            />
            <input
              name="phone_number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isSubmitting || atLimit}
              placeholder="+919876543210 (WhatsApp/SMS)"
              className={`w-48 ${inputClass}`}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400 font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </form>

        {atLimit && (
          <p className="mt-2 text-sm text-warn">
            You have reached your plan&apos;s inbox limit. Delete one to create another.
          </p>
        )}
      </Card>

      <div className="mt-6 space-y-2.5">
        {inboxes.length === 0 && (
          <Empty title="No inboxes yet">Create one above, or let your agent call create_agent_inbox.</Empty>
        )}
        {inboxes.map((inbox: Inbox) => {
          const isDeleting = deletingId === inbox.id;

          return (
            <Card
              key={inbox.id}
              className="flex flex-wrap items-center gap-3 !py-3.5 transition-all hover:border-line/80"
            >
              <Badge tone="good">Active</Badge>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/dashboard/inboxes/${inbox.id}`}
                    className="font-mono text-sm font-semibold hover:underline text-ink"
                  >
                    {inbox.email_address}
                  </a>
                  {inbox.owner_name && (
                    <Badge tone="purple">
                      OD-ID: {inbox.owner_name}
                    </Badge>
                  )}
                  {inbox.phone_number && (
                    <span className="text-xs text-muted">📱 {inbox.phone_number}</span>
                  )}
                </div>
                {inbox.display_title && (
                  <p className="mt-0.5 text-xs text-muted truncate">{inbox.display_title}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <CopyButton value={inbox.email_address} label="Copy address" />
                <CopyButton value={inbox.id} label="Copy ID" />
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(inbox)}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
