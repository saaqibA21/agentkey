import { cookies } from "next/headers";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui";
import { api, type Domain, type Inbox, type Overview } from "@/lib/api";
import { createInboxRecord, getInboxes, getOrCreateDefaultInbox } from "@/lib/agent-store";
import { InboxesManager } from "./inboxes-manager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InboxesPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // ignore
  }

  const userEmail = session?.user?.email?.toLowerCase().trim();
  const userName = session?.user?.name || (userEmail ? userEmail.split("@")[0] : "Operator");

  // Auto-provision default inbox for authenticated user if none exists
  if (userEmail) {
    try {
      getOrCreateDefaultInbox(userEmail, userName);
    } catch {
      // ignore
    }
  }

  let inboxes: Inbox[] = [];
  let overview: Overview = {
    workspace: {
      id: "ws_default",
      name: `${userName}'s Workspace`,
      plan: "pro",
      outbound_enabled: true,
      daily_send_limit: 1000,
      max_inboxes: 50,
      inbound_daily_limit: 5000,
      pii_masking_enabled: true,
    },
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

  // Fallback to local store if upstream/api returned empty
  if (inboxes.length === 0) {
    inboxes = getInboxes(userEmail) as unknown as Inbox[];
  }

  // Cross-container sync: Merge inboxes from user's cookie
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get("ak_user_inboxes")?.value;
    if (cookieVal) {
      const fromCookie = JSON.parse(decodeURIComponent(cookieVal));
      if (Array.isArray(fromCookie)) {
        const seenIds = new Set(inboxes.map((i) => i.id));
        const seenEmails = new Set(inboxes.map((i) => i.email_address.toLowerCase()));

        for (const item of fromCookie) {
          if (!seenIds.has(item.id) && !seenEmails.has(item.email_address?.toLowerCase())) {
            inboxes.unshift(item);
            seenIds.add(item.id);
            seenEmails.add(item.email_address?.toLowerCase());
            // Prime local container store
            try {
              createInboxRecord({
                username: item.email_address?.split("@")[0],
                domain: item.email_address?.split("@")[1],
                owner_name: item.owner_name,
                display_title: item.display_title,
                phone_number: item.phone_number,
                owner_email: userEmail,
              });
            } catch {
              // ignore
            }
          }
        }
      }
    }
  } catch {
    // ignore
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
