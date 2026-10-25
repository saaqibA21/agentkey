import Link from "next/link";
import { auth } from "@/auth";
import { Badge, PageHeader } from "@/components/ui";
import { api, publicApiUrl } from "@/lib/api";
import { getVaultLogins } from "@/lib/agent-store";
import { IdentityManager } from "./identity-manager";

type Connection = {
  id: string;
  provider: string;
  account: string;
  scopes: string;
  allow_writes: boolean;
  allow_export: boolean;
  last_used_at: string | null;
};
type Login = {
  id: string;
  name: string;
  site_host: string;
  username: string;
  has_totp: boolean;
  approval: "ask" | "auto";
  owner_name?: string | null;
  has_session?: boolean;
  last_used_at: string | null;
};
type AccessRequest = { id: string; url: string; reason: string; created_at: string; item: Login };

export const metadata = { title: "Identity & Vault · AgentKey" };

export default async function IdentityPage({
  searchParams,
}: { searchParams?: Promise<{ connected?: string; error?: string }> }) {
  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase().trim();
  const ownerName = session?.user?.name || (userEmail ? userEmail.split("@")[0] : "Operator");

  const params = searchParams ? await searchParams : {};
  const connected = params?.connected;
  const error = params?.error;

  const [appsRaw, providersRaw, connectionsRaw, loginsRaw, requestsRaw] = await Promise.all([
    api<{ data: { client_id: string; client_name: string; redirect_host: string; scopes: string[]; last_authorized_at: string }[] }>("/oauth/grants").catch(() => ({ data: [] })),
    api<{ data: { id: string; name: string }[] }>("/connections/providers").catch(() => ({ data: [] })),
    api<{ data: Connection[] }>("/connections").catch(() => ({ data: [] })),
    api<{ data: Login[] }>("/vault/items").catch(() => ({ data: [] })),
    api<{ data: AccessRequest[] }>("/vault/requests").catch(() => ({ data: [] })),
  ]);

  const apps = appsRaw?.data ?? [];
  const providers = providersRaw?.data ?? [];
  const connections = connectionsRaw?.data ?? [];
  let logins: Login[] = loginsRaw?.data ?? [];
  if (logins.length === 0) {
    logins = getVaultLogins(userEmail) as unknown as Login[];
  }
  const requests = requestsRaw?.data ?? [];

  return (
    <>
      <PageHeader
        title="Identity & Session Vault"
        lead="Manage your agents' cross-site credentials and allow external websites to authenticate your agents via OpenID Connect & OAuth 2.1."
      />

      {/* OAuth 2.1 & OpenID Connect Provider Box */}
      <div className="mb-8 rounded-2xl border border-sky-400/30 bg-[#F2ECE1] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-100 text-sky-700">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#18191B]">OAuth 2.1 &amp; OpenID Connect Identity Provider</h2>
                <Badge tone="accent">OIDC</Badge>
              </div>
              <p className="mt-0.5 text-xs text-[#57534E]">
                External websites and apps use this to offer &ldquo;Sign in with AgentKey&rdquo; and verify agent email addresses.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/oauth"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-400/40 bg-sky-100 px-4 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-200 transition shadow-xs"
          >
            <span>Open OAuth Portal</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {connected && <p className="mb-4 rounded-lg bg-accent/10 px-4 py-2 text-sm">Connected {connected}.</p>}
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
          The connection did not complete. Please try again.
        </p>
      )}

      <IdentityManager
        initialRequests={requests}
        initialApps={apps}
        initialConnections={connections}
        initialLogins={logins}
        providers={providers}
        publicApiUrl={publicApiUrl}
        defaultOwnerName={ownerName}
      />

      <div className="mt-10 rounded-xl border border-line bg-subtle/50 p-5">
        <h3 className="font-semibold tracking-tight text-ink">Zero-Trust Credential Isolation</h3>
        <p className="mt-1 text-xs text-muted">
          AgentKey ensures autonomous LLMs never possess raw passwords in context windows. Secrets remain domain-pinned,
          ephemeral TOTPs are injected synchronously at runtime, and browser state is securely vaulted with owner attribution.
        </p>
      </div>
    </>
  );
}
