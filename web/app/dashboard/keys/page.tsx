import { ActionForm } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api, type ApiKey } from "@/lib/api";

import { createKey, revokeKey } from "../actions";

const scopes = [
  ["read", "Read", "List inboxes, read messages, wait for codes", true],
  ["send", "Send", "Send email, WhatsApp and SMS", false],
  ["manage", "Manage", "Create and delete inboxes, webhooks, rules, keys", true],
  ["connect", "Connect", "Act as you through connected accounts and saved logins", false],
] as const;

export default async function KeysPage() {
  const keysRaw = await api<ApiKey[]>("/api-keys");
  const keys: ApiKey[] = (Array.isArray(keysRaw) ? keysRaw : ((keysRaw as any)?.data ?? [])).filter((k: ApiKey) => !k?.revoked_at && k?.name !== "root");

  return (
    <>
      <PageHeader
        title="API keys"
        lead="Give each agent its own key with only the permissions it needs. A key without Send can never send a message."
        aside={
          <div className="hidden sm:flex select-none shrink-0">
            <img
              src="/images/mascot/agentkey-vault.png"
              alt="AgentKey Vault Mascot"
              className="w-32 lg:w-40 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
            />
          </div>
        }
      />

      <Card>
        <ActionForm action={createKey} submit="Create key" className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <input name="name" required maxLength={80} placeholder="Key name, e.g. signup-agent" className={`w-64 ${inputClass}`} />
          <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
            <legend className="sr-only">Permissions</legend>
            {scopes.map(([id, label, help, checked]) => (
              <label key={id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name={`scope_${id}`} defaultChecked={checked} className="mt-1 accent-[var(--accent)]" />
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="block text-xs text-muted">{help}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </ActionForm>
      </Card>

      <div className="mt-4 space-y-2">
        {keys.length === 0 && <Empty title="No keys yet">Create one above and paste it into your agent&apos;s config.</Empty>}
        {keys.map((key) => (
          <Card key={key.id} className="flex flex-wrap items-center gap-3 !py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{key.name}</p>
              <p className="font-mono text-xs text-muted">{key.key_prefix}… · created {timeAgo(key.created_at)}</p>
            </div>
            <div className="flex gap-1">
              {key.scopes.map((s) => (
                <Badge key={s} tone={s === "send" || s === "connect" ? "warn" : "neutral"}>{s}</Badge>
              ))}
            </div>
            <ActionForm action={revokeKey} submit="Revoke" variant="danger"
                        confirm={`Revoke "${key.name}"? Agents using it stop working immediately.`}>
              <input type="hidden" name="id" value={key.id} />
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
