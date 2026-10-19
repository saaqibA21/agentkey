import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ActionForm } from "@/components/client";
import { Badge, Card, Empty, PageHeader, StatCard, timeAgo } from "@/components/ui";
import { adminApi, AdminStats, AuditLogEntry, Workspace } from "@/lib/api";
import { adminUpdateWorkspace } from "../actions";

export const metadata = { title: "Admin Console · BAGENTS" };

export default async function AdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim() ?? "";
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!email || adminEmails.length === 0 || !adminEmails.includes(email)) {
    redirect("/dashboard");
  }

  let stats: AdminStats = { workspaces: 0, inboxes: 0, messages: 0, audit_logs: 0, status: "HEALTHY" };
  let workspaces: Workspace[] = [];
  let auditLogs: AuditLogEntry[] = [];
  let errorMsg: string | null = null;

  try {
    const [s, w, a] = await Promise.all([
      adminApi<AdminStats>("/admin/stats"),
      adminApi<Workspace[]>("/admin/workspaces"),
      adminApi<{ data: AuditLogEntry[] }>("/admin/audit-logs?limit=50"),
    ]);
    stats = s;
    workspaces = w;
    auditLogs = a.data;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Failed to load operator admin data.";
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Console"
        lead="Operator controls, tenant workspace management, global rate limits, and CERT-In 180-day compliance audit trails."
        aside={
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <Badge tone="good">System Operational</Badge>
          </div>
        }
      />

      {errorMsg && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <b>Admin Error:</b> {errorMsg}
        </div>
      )}

      {/* KPI Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Workspaces"
          value={stats.workspaces}
          subtext="Active tenant instances"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
            </svg>
          }
          tone="accent"
        />
        <StatCard
          title="Active Inboxes"
          value={stats.inboxes}
          subtext="Email + WhatsApp + SMS"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          }
          tone="good"
        />
        <StatCard
          title="Messages Routed"
          value={stats.messages}
          subtext="Zero-token edge processed"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          }
          tone="neutral"
        />
        <StatCard
          title="Audit Ledger"
          value={stats.audit_logs}
          subtext="CERT-In 180-day logs"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
          tone="warn"
        />
      </section>

      {/* Workspace Controls */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Tenant Workspaces</h2>
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
                    <ActionForm
                      action={adminUpdateWorkspace}
                      submit={ws.outbound_enabled ? "Revoke Send" : "Grant Send"}
                      variant={ws.outbound_enabled ? "secondary" : "primary"}
                    >
                      <input type="hidden" name="workspace_id" value={ws.id} />
                      <input type="hidden" name="outbound_enabled" value={ws.outbound_enabled ? "false" : "true"} />
                    </ActionForm>

                    <ActionForm
                      action={adminUpdateWorkspace}
                      submit={ws.pii_masking_enabled ? "Disable PII Shield" : "Enable PII Shield"}
                      variant="secondary"
                    >
                      <input type="hidden" name="workspace_id" value={ws.id} />
                      <input type="hidden" name="pii_masking_enabled" value={ws.pii_masking_enabled ? "false" : "true"} />
                    </ActionForm>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Security Audit Trail */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Security & Audit Log</h2>
            <p className="text-sm text-muted">Immutable append-only trail compliant with IT Act 2000 & CERT-In directions.</p>
          </div>
          <Badge tone="purple">Realtime Stream</Badge>
        </div>

        {auditLogs.length === 0 ? (
          <Empty title="No security events recorded yet" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-subtle/50 text-[11px] font-medium uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-subtle/40">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{timeAgo(log.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-ink">{log.actor}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-subtle px-2 py-0.5 font-mono text-[11px] text-ink">
                        {log.action}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted" title={log.target ?? ""}>
                      {log.target || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-muted">{log.ip_address || "127.0.0.1"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
