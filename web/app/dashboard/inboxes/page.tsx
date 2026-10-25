import { PageHeader } from "@/components/ui";
import { api, type Domain, type Inbox, type Overview } from "@/lib/api";
import { InboxesManager } from "./inboxes-manager";

export default async function InboxesPage() {
  let inboxes: Inbox[] = [];
  let overview: Overview = {
    workspace: { id: "ws_default", name: "Workspace", plan: "pro", outbound_enabled: true, daily_send_limit: 1000, max_inboxes: 50, inbound_daily_limit: 5000, pii_masking_enabled: true },
    usage: { sent_today: 0, received_today: 0 },
    counts: { inboxes: 1, messages: 0, pending_approvals: 0, api_keys: 1, verified_domains: 0 },
    mail_domain: "agentkey.in",
  };
  let domainsList: Domain[] = [];

  try {
    const [inboxesRaw, overviewRaw, domainsRaw] = await Promise.all([
      api<Inbox[] | { data: Inbox[] }>("/inboxes?limit=200").catch(() => []),
      api<Overview>("/overview").catch(() => null),
      api<{ data: Domain[] }>("/domains").catch(() => ({ data: [] })),
    ]);

    if (Array.isArray(inboxesRaw)) {
      inboxes = inboxesRaw;
    } else if (Array.isArray((inboxesRaw as any)?.data)) {
      inboxes = (inboxesRaw as any).data;
    }

    if (overviewRaw && overviewRaw.workspace) {
      overview = overviewRaw;
    }

    domainsList = (domainsRaw as any)?.data ?? (Array.isArray(domainsRaw) ? (domainsRaw as unknown as Domain[]) : []);
  } catch (err) {
    console.error("Error loading inboxes page data:", err);
  }

  const maxInboxes = overview?.workspace?.max_inboxes ?? 50;

  return (
    <>
      <PageHeader
        title="Inboxes"
        lead={`${inboxes.length} of ${maxInboxes} in use. Provision dedicated email, WhatsApp, and SMS identities with Owner-Delegated legal binding.`}
        aside={
          <div className="hidden sm:flex select-none shrink-0">
            <img
              src="/images/mascot/agentkey-inbox.png"
              alt="AgentKey Inbox Mascot"
              className="w-36 lg:w-44 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
            />
          </div>
        }
      />
      <InboxesManager
        initialInboxes={inboxes}
        overview={overview}
        domains={domainsList}
      />
    </>
  );
}
