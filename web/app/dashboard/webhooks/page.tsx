import { ActionForm } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader } from "@/components/ui";
import { api, type Webhook } from "@/lib/api";

import { createWebhook, deleteWebhook } from "../actions";

const events = [
  ["message.received", "Any message arrives"],
  ["otp.extracted", "A code was found"],
  ["magic_link.extracted", "A sign-in link was found"],
  ["message.sent", "A message was sent"],
  ["message.pending_approval", "A message is held"],
  ["message.failed", "Sending failed"],
] as const;

export default async function WebhooksPage() {
  const hooks = await api<Webhook[]>("/webhooks");

  return (
    <>
      <PageHeader
        title="Webhooks"
        lead="Have events pushed to your server the moment they happen. Every delivery is signed, and failures are retried."
        aside={
          <div className="hidden sm:flex select-none shrink-0">
            <img
              src="/images/mascot/agentkey-webhook.png"
              alt="AgentKey Webhook Mascot"
              className="w-36 lg:w-44 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
            />
          </div>
        }
      />
      <Card>
        <ActionForm action={createWebhook} submit="Add webhook" className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <input name="url" type="url" required placeholder="https://your-app.com/hooks/aigent" className={`w-80 ${inputClass}`} />
          <fieldset className="grid basis-full gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="mb-1 text-xs text-muted">Events (none ticked = all)</legend>
            {events.map(([id, label]) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="event" value={id} className="accent-[var(--accent)]" />
                {label}
              </label>
            ))}
          </fieldset>
        </ActionForm>
      </Card>

      <div className="mt-4 space-y-2">
        {hooks.length === 0 && <Empty title="No webhooks">Agents that cannot receive webhooks can use the WebSocket stream instead.</Empty>}
        {hooks.map((hook) => (
          <Card key={hook.id} className="flex flex-wrap items-center gap-3 !py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm">{hook.target_url}</p>
              <p className="mt-1 flex flex-wrap gap-1">
                {hook.event_types.map((e) => (
                  <Badge key={e}>{e === "*" ? "all events" : e}</Badge>
                ))}
              </p>
            </div>
            <ActionForm action={deleteWebhook} submit="Remove" variant="danger" confirm="Remove this webhook?">
              <input type="hidden" name="id" value={hook.id} />
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
