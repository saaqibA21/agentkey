import { ActionForm } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api, type Message, type Policy } from "@/lib/api";

import { createPolicy, decide, deletePolicy } from "../actions";

export default async function ApprovalsPage() {
  const [pending, policies] = await Promise.all([
    api<{ data: Message[] }>("/hitl/pending"),
    api<Policy[]>("/hitl/policies"),
  ]);

  return (
    <>
      <PageHeader
        title="Approvals"
        lead="Messages your agents wanted to send that matched one of your rules. Nothing leaves until you approve it."
      />

      <div className="space-y-3">
        {pending.data.length === 0 && (
          <Empty title="Nothing is waiting">
            {policies.length === 0 ? "Add a rule below to start holding sensitive messages." : "Held messages appear here."}
          </Empty>
        )}
        {pending.data.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="warn">Waiting</Badge>
              <span className="font-medium">To {m.recipient}</span>
              <span className="text-muted">from {m.sender}</span>
              <span className="ml-auto text-xs text-muted">{timeAgo(m.created_at)}</span>
            </div>
            {m.subject && <p className="mt-2 font-medium">{m.subject}</p>}
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-subtle p-3 font-sans text-sm">
              {m.body_text}
            </pre>
            <p className="mt-2 text-xs text-muted">Matched: {m.extracted_data.hitl?.matched.join(", ")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionForm action={decide} submit="Approve and send">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="verdict" value="approve" />
              </ActionForm>
              <ActionForm action={decide} submit="Reject" variant="danger">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="verdict" value="reject" />
              </ActionForm>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-10 font-semibold">Rules</h2>
      <Card>
        <ActionForm action={createPolicy} submit="Add rule" className="flex flex-wrap items-center gap-2">
          <input name="keywords" required placeholder="refund, contract, wire transfer" className={`w-72 ${inputClass}`}
                 aria-label="Keywords, separated by commas" />
          <select name="action" className={inputClass} aria-label="What to do">
            <option value="HOLD_FOR_APPROVAL">Hold for approval</option>
            <option value="NOTIFY_ONLY">Send, but notify me</option>
          </select>
          <input name="destination" type="url" required placeholder="Slack webhook URL" className={`w-72 ${inputClass}`} />
        </ActionForm>
        <p className="mt-2 text-sm text-muted">
          Keywords match whole words, in the subject or body. Slack receives a link to review each held message; create
          the webhook URL in Slack under Apps → Incoming Webhooks.
        </p>
      </Card>
      <div className="mt-3 space-y-2">
        {policies.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center gap-3 !py-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap gap-1">
                {p.trigger_keywords.map((k) => (
                  <Badge key={k}>{k}</Badge>
                ))}
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {p.action === "HOLD_FOR_APPROVAL" ? "Hold for approval" : "Notify only"} · {p.target_channel.toLowerCase()}
              </p>
            </div>
            <ActionForm action={deletePolicy} submit="Remove" variant="danger" confirm="Remove this rule?">
              <input type="hidden" name="id" value={p.id} />
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
