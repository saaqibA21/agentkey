import Link from "next/link";
import { auth } from "@/auth";
import { CopyButton } from "@/components/client";
import { Badge, PageHeader } from "@/components/ui";
import { api, publicApiUrl } from "@/lib/api";
import { getOAuthClients, type OAuthClient } from "@/lib/oauth-store";
import { OAuthManager } from "./oauth-manager";

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

      <OAuthManager initialClients={clients} />

      {/* Developer Integration Details */}
      <details className="group rounded-2xl border border-[#E5DEC9] bg-white p-5 shadow-sm transition">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[#18191B] [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-[#8C8A94] group-open:rotate-90 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>Developer Endpoints &amp; OIDC Discovery</span>
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
