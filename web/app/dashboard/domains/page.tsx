import { ActionForm, CopyButton } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader } from "@/components/ui";
import { api, type DnsRecord, type Domain } from "@/lib/api";

import { addDomain, deleteDomain, verifyDomain } from "../actions";

const purposeLabel: Record<DnsRecord["purpose"], string> = {
  ownership: "Proves you own it",
  mx: "Receives mail",
  dkim: "Signs your mail",
  spf: "Authorises sending",
  dmarc: "Protects from spoofing",
};

/** DNS hosts want the record name relative to the domain ("@" for the domain itself). */
function hostLabel(recordName?: string, domain?: string): string {
  const rec = String(recordName ?? "").trim();
  const dom = String(domain ?? "").trim();
  if (!rec || rec === dom || rec === "@") return "@";
  if (dom && rec.endsWith(`.${dom}`)) return rec.slice(0, -dom.length - 1) || "@";
  return rec;
}

function DomainCard({ domain }: { domain: Domain }) {
  const verified = domain?.status === "VERIFIED";
  const records = Array.isArray(domain?.records) ? domain.records : [];
  const checks = domain?.checks || ({} as Record<string, boolean>);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono font-semibold">{domain?.name || "Custom Domain"}</h2>
        <Badge tone={verified ? "good" : "warn"}>{verified ? "Verified" : "Waiting for DNS"}</Badge>
        <div className="ml-auto flex items-start gap-2">
          <ActionForm action={verifyDomain} submit="Check DNS now" variant="secondary" className="flex flex-wrap justify-end gap-2">
            <input type="hidden" name="id" value={domain?.id} />
          </ActionForm>
          <ActionForm action={deleteDomain} submit="Remove" variant="danger" confirm={`Remove ${domain?.name}?`}>
            <input type="hidden" name="id" value={domain?.id} />
          </ActionForm>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {verified
          ? "You can create inboxes on this domain and send from them."
          : "Add these records where your domain's DNS is managed (GoDaddy, Cloudflare, Namecheap…), then check again. Changes can take up to an hour."}
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Name / Host</th>
              <th className="px-3 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const ok = Boolean(checks[r.purpose]);
              const host = hostLabel(r.name, domain?.name || "");
              return (
                <tr key={(r.name || "") + (r.value || "") + (r.purpose || "")} className="border-t border-line align-top">
                  <td className="px-3 py-2">
                    <Badge tone={ok ? "good" : r.required ? "warn" : "neutral"}>
                      {ok ? "Found" : r.required ? "Missing" : "Recommended"}
                    </Badge>
                    <p className="mt-1 text-xs text-muted">{purposeLabel[r.purpose] || r.purpose}</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.type}
                    {r.priority !== undefined && <span className="block text-muted">priority {r.priority}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <code className="break-all font-mono text-xs">{host}</code>
                      <CopyButton value={host} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <code className="break-all font-mono text-xs">{r.value}</code>
                      <CopyButton value={r.value} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default async function DomainsPage() {
  let domains = { data: [] as Domain[] };
  try {
    const domainsRaw = await api<{ data: Domain[] }>("/domains");
    if (domainsRaw && Array.isArray(domainsRaw.data)) {
      domains = domainsRaw;
    } else if (Array.isArray(domainsRaw)) {
      domains = { data: domainsRaw };
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
      <Card>
        <ActionForm action={addDomain} submit="Add domain" className="flex flex-wrap items-center gap-2">
          <input name="name" required placeholder="agents.yourcompany.com" className={`w-72 ${inputClass}`} />
        </ActionForm>
        <p className="mt-2 text-sm text-muted">
          Tip: use a subdomain such as <code className="font-mono">agents.yourcompany.com</code> so your main domain&apos;s
          email is untouched.
        </p>
      </Card>
      <div className="mt-4 space-y-4">
        {domains.data.length === 0 && (
          <Empty title="No domains connected">Receiving works without one. You only need a domain to send.</Empty>
        )}
        {domains.data.filter(Boolean).map((d) => (
          <DomainCard key={d.id || d.name} domain={d} />
        ))}
      </div>
    </>
  );
}
