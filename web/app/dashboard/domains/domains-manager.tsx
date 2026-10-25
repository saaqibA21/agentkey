"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, Empty, inputClass } from "@/components/ui";
import { CopyButton } from "@/components/client";
import type { DnsRecord, Domain } from "@/lib/api";

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

export function DomainsManager({ initialDomains = [] }: { initialDomains: Domain[] }) {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>(initialDomains);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Sync state if server re-renders with fresh data
  useEffect(() => {
    if (Array.isArray(initialDomains)) {
      setDomains(initialDomains);
    }
  }, [initialDomains]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanName = name.trim().toLowerCase();
    if (!cleanName) {
      setFormError("Please enter a domain name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const json = await res.json();
      if (!res.ok || json.error) {
        setFormError(json.error || "Failed to add domain.");
        return;
      }

      if (json.domain) {
        setDomains((prev) => [json.domain, ...prev.filter((d) => d && d.id !== json.domain.id)]);
        setName("");
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const json = await res.json();
      if (res.ok && json.domain) {
        setDomains((prev) =>
          prev.map((d) => (d.id === id ? { ...d, ...json.domain } : d))
        );
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err) {
      console.error("Error verifying domain:", err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (domain: Domain) => {
    if (!window.confirm(`Remove ${domain.name}?`)) return;
    const targetId = domain.id || domain.name;
    setDeletingId(targetId);
    try {
      // Optimistically remove immediately from local state
      setDomains((prev) =>
        prev.filter((d) => d && d.id !== targetId && d.name !== targetId && d.name !== domain.name)
      );

      const res = await fetch(`/api/domains?id=${encodeURIComponent(targetId)}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Error deleting domain:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card>
        <form onSubmit={handleAddDomain} className="flex flex-wrap items-center gap-3">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSubmitting}
            placeholder="agents.yourcompany.com"
            className={`w-72 ${inputClass}`}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 bg-teal-600 text-white shadow-sm shadow-teal-600/20 hover:bg-teal-500 hover:shadow-teal-500/30 active:scale-[0.98]"
          >
            {isSubmitting ? "Adding domain…" : "Add domain"}
          </button>
          {formError && (
            <p role="alert" className="basis-full text-sm text-rose-600 font-medium">
              {formError}
            </p>
          )}
        </form>
        <p className="mt-2 text-sm text-muted">
          Tip: use a subdomain such as <code className="font-mono">agents.yourcompany.com</code> so your main domain&apos;s
          email is untouched.
        </p>
      </Card>

      <div className="mt-4 space-y-4">
        {domains.length === 0 && (
          <Empty title="No custom domains connected">
            Your agents currently send and receive email using your included <strong className="font-semibold text-ink">@agentkey.in</strong> inbox address. Connect your own custom domain above if you want your agents to email clients from your company&apos;s brand.
          </Empty>
        )}
        {domains.filter(Boolean).map((d) => {
          const verified = d.status === "VERIFIED";
          const records = Array.isArray(d.records) ? d.records : [];
          const checks = d.checks || ({} as Record<string, boolean>);
          const isVerifying = verifyingId === d.id;
          const isDeleting = deletingId === (d.id || d.name);

          return (
            <Card key={d.id || d.name}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-mono font-semibold">{d.name || "Custom Domain"}</h2>
                <Badge tone={verified ? "good" : "warn"}>{verified ? "Verified" : "Waiting for DNS"}</Badge>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleVerify(d.id)}
                    className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-subtle hover:border-line/90 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isVerifying ? "Checking…" : "Check DNS now"}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(d)}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isDeleting ? "Removing…" : "Remove"}
                  </button>
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
                      const host = hostLabel(r.name, d.name || "");
                      return (
                        <tr
                          key={(r.name || "") + (r.value || "") + (r.purpose || "")}
                          className="border-t border-line align-top"
                        >
                          <td className="px-3 py-2">
                            <Badge tone={ok ? "good" : r.required ? "warn" : "neutral"}>
                              {ok ? "Found" : r.required ? "Missing" : "Recommended"}
                            </Badge>
                            <p className="mt-1 text-xs text-muted">{purposeLabel[r.purpose] || r.purpose}</p>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {r.type}
                            {r.priority !== undefined && (
                              <span className="block text-muted">priority {r.priority}</span>
                            )}
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
        })}
      </div>
    </>
  );
}
