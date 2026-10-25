"use client";

import { useState } from "react";
import { Badge, Card, Empty } from "@/components/ui";
import type { Workspace } from "@/lib/api";

export function AdminWorkspacesManager({ initialWorkspaces }: { initialWorkspaces: Workspace[] }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces || []);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleField = async (id: string, field: "outbound_enabled" | "pii_masking_enabled", current: boolean) => {
    setUpdatingId(`${id}-${field}`);
    const nextVal = !current;
    try {
      const res = await fetch("/api/admin/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: nextVal }),
      });
      if (res.ok) {
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === id ? { ...w, [field]: nextVal } : w))
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#18191B]">Tenant Workspaces</h2>
          <p className="text-sm text-muted">Manage tenant outbound permissions, limits, and DPDP privacy settings.</p>
        </div>
        <Badge tone="neutral">{workspaces.length} total</Badge>
      </div>

      {workspaces.length === 0 ? (
        <Empty title="No workspaces found" />
      ) : (
        <div className="space-y-3">
          {workspaces.map((ws) => (
            <Card key={ws.id} className="transition-all hover:border-line/80">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-semibold text-ink">{ws.name}</h3>
                    <Badge tone={ws.outbound_enabled ? "good" : "warn"}>
                      {ws.outbound_enabled ? "Outbound Live" : "Inbound Only"}
                    </Badge>
                    <Badge tone={ws.pii_masking_enabled ? "accent" : "neutral"}>
                      {ws.pii_masking_enabled ? "DPDP PII Active" : "PII Unmasked"}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>ID: <code className="font-mono">{ws.id.slice(0, 8)}...</code></span>
                    <span>Plan: <b className="capitalize text-ink">{ws.plan}</b></span>
                    <span>Max Inboxes: <b className="text-ink">{ws.max_inboxes}</b></span>
                    <span>Daily Send Quota: <b className="text-ink">{ws.daily_send_limit}</b>/day</span>
                  </div>
                </div>

                {/* Operator Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={updatingId === `${ws.id}-outbound_enabled`}
                    onClick={() => toggleField(ws.id, "outbound_enabled", ws.outbound_enabled)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      ws.outbound_enabled
                        ? "border border-line bg-surface text-ink hover:bg-subtle"
                        : "bg-teal-600 text-white hover:bg-teal-500 shadow-xs"
                    }`}
                  >
                    {ws.outbound_enabled ? "Revoke Send" : "Grant Send"}
                  </button>

                  <button
                    type="button"
                    disabled={updatingId === `${ws.id}-pii_masking_enabled`}
                    onClick={() => toggleField(ws.id, "pii_masking_enabled", ws.pii_masking_enabled)}
                    className="rounded-xl border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-subtle transition"
                  >
                    {ws.pii_masking_enabled ? "Disable PII Shield" : "Enable PII Shield"}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
