"use client";

import { useState } from "react";
import { Badge, Card, Empty, inputClass, timeAgo } from "@/components/ui";
import type { Message, Policy } from "@/lib/api";

export function ApprovalsManager({
  initialPending,
  initialPolicies,
}: {
  initialPending: Message[];
  initialPolicies: Policy[];
}) {
  const [pending, setPending] = useState<Message[]>(initialPending || []);
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies || []);
  const [keywords, setKeywords] = useState("");
  const [action, setAction] = useState<"HOLD_FOR_APPROVAL" | "NOTIFY_ONLY">("HOLD_FOR_APPROVAL");
  const [destination, setDestination] = useState("");
  const [creating, setCreating] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handleDecide = async (id: string, verdict: "approve" | "reject") => {
    setDecidingId(id);
    setError(null);
    setStatusNotice(null);

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "decide",
          id,
          verdict,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${verdict} message`);
      }

      setPending((prev) => prev.filter((m) => m.id !== id));
      setStatusNotice(
        verdict === "approve"
          ? "Message approved and released to recipient."
          : "Message rejected and permanently withheld."
      );
      setTimeout(() => setStatusNotice(null), 3000);
    } catch (err: any) {
      setError(err.message || `Failed to ${verdict} message.`);
    } finally {
      setDecidingId(null);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!keywords.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "create_policy",
          keywords: keywords.trim(),
          action,
          destination: destination.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add rule");
      }

      if (data.policy) {
        setPolicies((prev) => [data.policy, ...prev]);
      }
      setKeywords("");
      setDestination("");
      setStatusNotice("Guardrail rule added successfully.");
      setTimeout(() => setStatusNotice(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to create policy rule.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!window.confirm("Remove this guardrail rule?")) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/approvals?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove rule");
      }

      setPolicies((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to remove rule.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {statusNotice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          {statusNotice}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-600">
          {error}
        </div>
      )}

      {/* Pending Approvals Section */}
      <div className="space-y-3">
        {pending.length === 0 && (
          <Empty title="Nothing is waiting">
            {policies.length === 0
              ? "Add a rule below to start holding sensitive messages."
              : "Held messages appear here."}
          </Empty>
        )}
        {pending.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="warn">Waiting</Badge>
              <span className="font-medium text-ink">To {m.recipient}</span>
              <span className="text-muted">from {m.sender}</span>
              <span className="ml-auto text-xs text-muted">{timeAgo(m.created_at)}</span>
            </div>
            {m.subject && <p className="mt-2 font-medium text-ink">{m.subject}</p>}
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-subtle p-3 font-sans text-sm text-ink">
              {m.body_text}
            </pre>
            <p className="mt-2 text-xs text-muted">
              Matched: {m.extracted_data?.hitl?.matched?.join(", ") || "Guardrail Rule"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={decidingId === m.id}
                onClick={() => handleDecide(m.id, "approve")}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50 transition active:scale-95"
              >
                {decidingId === m.id ? "Processing..." : "Approve and send"}
              </button>
              <button
                type="button"
                disabled={decidingId === m.id}
                onClick={() => handleDecide(m.id, "reject")}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50 transition active:scale-95"
              >
                {decidingId === m.id ? "Processing..." : "Reject"}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Rules Section */}
      <h2 className="mb-3 mt-10 text-base font-semibold text-[#18191B]">Guardrail Rules</h2>
      <Card>
        <form onSubmit={handleCreatePolicy} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              required
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="refund, wire transfer, credential, contract"
              className={`w-72 ${inputClass}`}
              aria-label="Keywords, separated by commas"
            />
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as any)}
              className={inputClass}
              aria-label="What to do"
            >
              <option value="HOLD_FOR_APPROVAL">Hold for approval</option>
              <option value="NOTIFY_ONLY">Send, but notify me</option>
            </select>
            <input
              type="url"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Slack or webhook URL"
              className={`w-72 ${inputClass}`}
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-[#18191B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 shadow-sm"
            >
              {creating ? "Adding..." : "Add rule"}
            </button>
          </div>
          <p className="text-xs text-muted">
            Keywords match whole words in the subject or body. Slack or webhook receives notification for review.
          </p>
        </form>
      </Card>

      <div className="space-y-2">
        {policies.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center gap-3 !py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1">
                {(p.trigger_keywords || []).map((k: string) => (
                  <Badge key={k}>{k}</Badge>
                ))}
              </div>
              <p className="mt-1 truncate text-xs text-muted">
                {p.action === "HOLD_FOR_APPROVAL" ? "Hold for approval" : "Notify only"} ·{" "}
                {(p.target_channel || "SLACK").toLowerCase()}
              </p>
            </div>
            <button
              type="button"
              disabled={deletingId === p.id}
              onClick={() => handleDeletePolicy(p.id)}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50 transition"
            >
              {deletingId === p.id ? "Removing..." : "Remove"}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
