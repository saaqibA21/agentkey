import Link from "next/link";
import { auth } from "@/auth";
import { ActionForm, CopyButton } from "@/components/client";
import { Badge, Card, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api, publicApiUrl } from "@/lib/api";
import { getOAuthClients, type OAuthClient } from "@/lib/oauth-store";
import { deleteOAuthClient, registerOAuthClient } from "../actions";

export const metadata = { title: "OAuth Applications · AgentKey" };

export default async function OAuthPage() {
  const session = await auth();
  const userEmail = session?.user?.email ?? "";

  let clients: OAuthClient[] = [];
  try {
    const res = await api<{ data: OAuthClient[] }>("/oauth/clients");
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      clients = res.data;
    } else {
      clients = getOAuthClients(userEmail);
    }
  } catch {
    clients = getOAuthClients(userEmail);
  }

  clients = clients.filter(
    (c) => c && c.client_id !== "cli_claude_desktop" && c.client_id !== "cli_chatgpt_agent"
  );

  const discoveryUrl = `${publicApiUrl}/.well-known/openid-configuration`;
  const authorizeUrl = `${publicApiUrl}/oauth/authorize`;
  const tokenUrl = `${publicApiUrl}/oauth/token`;
  const userinfoUrl = `${publicApiUrl}/oauth/userinfo`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="OAuth Applications"
        lead="Register external applications and services to authenticate your agents via 'Sign in with AgentKey'."
        aside={
          <div className="flex items-center gap-2">
            <Badge tone="accent">OAuth 2.1</Badge>
            <Badge tone="good">PKCE S256</Badge>
          </div>
        }
      />

      {/* Registration Card */}
      <Card>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#18191B]">Register New Application</h2>
          <p className="text-xs text-[#64646A] mt-0.5">
            Add an external client (Claude Desktop, custom agents, or web apps) to issue credentials.
          </p>
        </div>

        <ActionForm action={registerOAuthClient} submit="Register Application" className="space-y-4 max-w-2xl">
          <label className="block text-sm">
            <span className="font-medium text-[#18191B]">Application Name</span>
            <input
              name="client_name"
              required
              maxLength={80}
              placeholder="e.g. Claude Desktop, Customer Portal, or Agent Script"
              className={`mt-1.5 w-full ${inputClass}`}
            />
            <span className="mt-1 block text-xs text-[#64646A]">
              Shown to the operator on the consent screen when authenticating.
            </span>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-[#18191B]">Redirect URI</span>
            <input
              name="redirect_uri"
              required
              type="url"
              placeholder="https://your-domain.com/api/auth/callback"
              className={`mt-1.5 w-full font-mono text-xs ${inputClass}`}
            />
            <span className="mt-1 block text-xs text-[#64646A]">
              Where AgentKey redirects after authorization. Must use HTTPS (or HTTP for localhost).
            </span>
          </label>
        </ActionForm>
      </Card>

      {/* Registered Applications List */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-[#18191B]">Your Registered Applications</h2>

        {clients.length === 0 ? (
          <Empty title="No applications registered yet">
            Register an application above to generate a Client ID for external tools and agents.
          </Empty>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <Card key={c.client_id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between !py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#18191B]">{c.client_name}</p>
                    <span className="text-xs text-[#8C8A94]">· {timeAgo(c.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#64646A]">Client ID:</span>
                    <code className="font-mono text-xs text-[#18191B] bg-[#F2ECE1] px-2 py-0.5 rounded border border-[#E5DEC9]">
                      {c.client_id}
                    </code>
                    <CopyButton value={c.client_id} />
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-[#8C8A94]">Redirect:</span>
                    <span className="font-mono text-[11px] text-[#64646A] truncate">
                      {c.redirect_uris.join(", ")}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <ActionForm
                    action={deleteOAuthClient}
                    submit="Delete"
                    variant="danger"
                    confirm={`Delete "${c.client_name}"? Applications using this Client ID will immediately lose access.`}
                  >
                    <input type="hidden" name="client_id" value={c.client_id} />
                  </ActionForm>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Developer Integration Details (Collapsible & Clean) */}
      <details className="group rounded-2xl border border-[#E5DEC9] bg-white p-5 shadow-sm transition">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[#18191B] [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[#8C8A94] group-open:rotate-90 transition-transform duration-200">▶</span>
            <span>Developer Endpoints & OIDC Discovery</span>
          </div>
          <span className="text-xs text-[#8C8A94] font-normal group-open:hidden">Click to expand</span>
        </summary>

        <div className="mt-4 pt-4 border-t border-[#E5DEC9] space-y-3">
          <p className="text-xs text-[#64646A]">
            Use these standard endpoints to integrate AgentKey into NextAuth, BetterAuth, Claude Desktop, or custom Python agents.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-[#E5DEC9] bg-[#FAF5EE] p-3 text-xs">
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-semibold text-[#18191B]">Discovery Document</span>
                <p className="truncate font-mono text-[11px] text-[#64646A] mt-0.5">{discoveryUrl}</p>
              </div>
              <CopyButton value={discoveryUrl} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E5DEC9] bg-[#FAF5EE] p-3 text-xs">
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-semibold text-[#18191B]">UserInfo / Agent Claims</span>
                <p className="truncate font-mono text-[11px] text-[#64646A] mt-0.5">{userinfoUrl}</p>
              </div>
              <CopyButton value={userinfoUrl} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E5DEC9] bg-[#FAF5EE] p-3 text-xs">
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-semibold text-[#18191B]">Authorization URL</span>
                <p className="truncate font-mono text-[11px] text-[#64646A] mt-0.5">{authorizeUrl}</p>
              </div>
              <CopyButton value={authorizeUrl} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E5DEC9] bg-[#FAF5EE] p-3 text-xs">
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-semibold text-[#18191B]">Token URL (PKCE)</span>
                <p className="truncate font-mono text-[11px] text-[#64646A] mt-0.5">{tokenUrl}</p>
              </div>
              <CopyButton value={tokenUrl} />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-[#64646A]">
            <span>Need sample code or SDKs?</span>
            <Link href="/docs" className="font-semibold text-[#18191B] hover:underline">
              View API Documentation →
            </Link>
          </div>
        </div>
      </details>
    </div>
  );
}
