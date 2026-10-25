import { PageHeader } from "@/components/ui";
import { api, type Webhook } from "@/lib/api";
import { auth } from "@/auth";
import { getWebhooks } from "@/lib/agent-store";
import { WebhooksManager } from "./webhooks-manager";

export const metadata = { title: "Webhooks · AgentKey" };

export default async function WebhooksPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // ignore
  }
  const userEmail = session?.user?.email?.toLowerCase().trim();

  let hooks: Webhook[] = [];
  try {
    const hooksRaw = await api<Webhook[] | { data: Webhook[] }>("/webhooks");
    if (Array.isArray(hooksRaw)) {
      hooks = hooksRaw;
    } else if (hooksRaw && Array.isArray((hooksRaw as any).data)) {
      hooks = (hooksRaw as any).data;
    }
  } catch {
    hooks = getWebhooks(userEmail);
  }

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

      <WebhooksManager initialWebhooks={hooks} />
    </>
  );
}
