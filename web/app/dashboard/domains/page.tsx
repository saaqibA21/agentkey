import { PageHeader } from "@/components/ui";
import { api, type Domain } from "@/lib/api";
import { DomainsManager } from "./domains-manager";

export default async function DomainsPage() {
  let domains: Domain[] = [];
  try {
    const domainsRaw = await api<{ data: Domain[] }>("/domains");
    if (domainsRaw && Array.isArray(domainsRaw.data)) {
      domains = domainsRaw.data;
    } else if (Array.isArray(domainsRaw)) {
      domains = domainsRaw;
    }
  } catch (err) {
    console.error("Error loading domains:", err);
  }

  return (
    <>
      <PageHeader
        title="Domains"
        lead="Connect a domain you own to send email from your agents. Mail goes out under your name and your reputation, without the shared-domain AI notice."
        aside={
          <div className="hidden sm:flex select-none shrink-0">
            <img
              src="/images/mascot/agentkey-domain.png"
              alt="AgentKey Domain Mascot"
              className="w-36 lg:w-44 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
            />
          </div>
        }
      />
      <DomainsManager initialDomains={domains} />
    </>
  );
}
