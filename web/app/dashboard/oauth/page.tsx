import Link from "next/link";

import { ActionForm, CopyButton } from "@/components/client";
import { Badge, Card, Code, Empty, inputClass, PageHeader, timeAgo } from "@/components/ui";
import { api, publicApiUrl } from "@/lib/api";
import { deleteOAuthClient, registerOAuthClient } from "../actions";

type OAuthClientItem = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  created_at: string;
};

export default async function OAuthPage() {
  let clients: OAuthClientItem[] = [];
  try {
    const res = await api<{ data: OAuthClientItem[] }>("/oauth/clients");
    clients = res.data;
  } catch {
    clients = [];
  }

  const discoveryUrl = `${publicApiUrl}/.well-known/openid-configuration`;
  const authorizeUrl = `${publicApiUrl}/oauth/authorize`;
  const tokenUrl = `${publicApiUrl}/oauth/token`;
  const userinfoUrl = `${publicApiUrl}/oauth/userinfo`;
  const verifyUrl = `${publicApiUrl}/v1/auth/agent/verify`;

  const nextAuthSnippet = `// NextAuth.js (v4 or v5) Provider Configuration
export const authOptions = {
  providers: [
    {
      id: "agentkey",
      name: "AgentKey Agent ID",
      type: "oauth",
      wellKnown: "${discoveryUrl}",
      authorization: { params: { scope: "openid profile email" } },
      clientId: process.env.AGENTKEY_CLIENT_ID,
      clientSecret: "none", // Public OAuth 2.1 client with PKCE (S256)
      idToken: false,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Autonomous Agent Verification Claims
          isAgent: profile.is_agent,         // true
          agentType: profile.agent_type,     // "AUTONOMOUS_AI_AGENT"
          trustScore: profile.trust_score,   // 99.0
          operator: profile.operator,        // { name, email, verified: true }
        };
      },
    },
  ],
};`;

  const pythonVerifySnippet = `# Verify an agent's email address or token from Python / FastAPI
import httpx

async def verify_agent(email_or_token: str):
    async with httpx.AsyncClient() as client:
        # 1. Direct OIDC userinfo check
        resp = await client.get(
            "${userinfoUrl}",
            headers={"Authorization": f"Bearer {email_or_token}"}
        )
        if resp.status_code == 200:
            data = resp.json()
            print("Verified Agent:", data["email"])
            print("Is Agent:", data["is_agent"])             # True
            print("Trust Score:", data["trust_score"])       # 99.0
            print("Human Operator:", data["operator"]["email"])
            return data

        # 2. Or verify by email directly
        check = await client.get("${verifyUrl}?email=" + email_or_token)
        return check.json()`;

  const userinfoClaims = `{
  "sub": "agent_e5d1a8c9...",
  "name": "Support Agent",
  "email": "support-agent@agents.example.com",
  "email_verified": true,
  "picture": "https://api.dicebear.com/9.x/adventurer/svg?seed=support-agent",
  "is_agent": true,
  "agent_type": "AUTONOMOUS_AI_AGENT",
  "trust_score": 99.0,
  "operator": {
    "name": "Verified Operator",
    "email": "operator@agentkey.in",
    "accountability_tier": "VERIFIED_HUMAN_OPERATOR",
    "verified": true
  },
  "workspace": {
    "id": "c1f7a0b2-...",
    "name": "Production Workspace",
    "compliance_status": "COMPLIANT"
  },
  "iss": "${publicApiUrl}",
  "aud": "public"
}`;

  return (
    <div className="space-y-8">
      <PageHeader
        title="OAuth 2.1 & OpenID Connect"
        lead="Allow external websites, SaaS apps, and platforms to authenticate your agents via 'Sign in with AgentKey'. Websites receive standard OIDC claims with cryptographic proof of agent identity and human accountability."
        aside={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="hidden md:flex select-none shrink-0">
              <img
                src="/images/mascot/agentkey-connected.png"
                alt="AgentKey Connected Mascot"
                className="w-36 lg:w-44 h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="accent">RFC 8414</Badge>
              <Badge tone="good">OIDC Core 1.0</Badge>
            </div>
          </div>
        }
      />

      {/* Discovery Endpoints Box */}
      <Card>
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Standard Discovery Endpoints</h2>
            <p className="mt-0.5 text-xs text-[#9BA7B4]">
              Plug these standard URLs into any OAuth 2.1 or OpenID Connect client library.
            </p>
          </div>
          <a
            href={discoveryUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8BE8E3] hover:underline"
          >
            <span>View discovery JSON</span>
            <span>↗</span>
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#080D12] p-3 text-xs">
            <div className="min-w-0 flex-1 pr-3">
              <span className="font-semibold text-white">Discovery Document</span>
              <p className="truncate font-mono text-[11px] text-[#9BA7B4] mt-0.5">{discoveryUrl}</p>
            </div>
            <CopyButton value={discoveryUrl} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#080D12] p-3 text-xs">
            <div className="min-w-0 flex-1 pr-3">
              <span className="font-semibold text-white">UserInfo / Agent Claims</span>
              <p className="truncate font-mono text-[11px] text-[#9BA7B4] mt-0.5">{userinfoUrl}</p>
            </div>
            <CopyButton value={userinfoUrl} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#080D12] p-3 text-xs">
            <div className="min-w-0 flex-1 pr-3">
              <span className="font-semibold text-white">Authorization Endpoint</span>
              <p className="truncate font-mono text-[11px] text-[#9BA7B4] mt-0.5">{authorizeUrl}</p>
            </div>
            <CopyButton value={authorizeUrl} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#080D12] p-3 text-xs">
            <div className="min-w-0 flex-1 pr-3">
              <span className="font-semibold text-white">Token Endpoint (PKCE)</span>
              <p className="truncate font-mono text-[11px] text-[#9BA7B4] mt-0.5">{tokenUrl}</p>
            </div>
            <CopyButton value={tokenUrl} />
          </div>
        </div>
      </Card>

      {/* Register Client Drawer */}
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-500 [&::-webkit-details-marker]:hidden">
          <span className="transition group-open:rotate-45">+</span> Register New OAuth Client
        </summary>
        <Card className="mt-4 max-w-2xl">
          <ActionForm action={registerOAuthClient} submit="Register Client" className="space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-white">Client / Application Name</span>
              <input
                name="client_name"
                required
                maxLength={120}
                placeholder="e.g. My SaaS Platform"
                className={`mt-1.5 w-full ${inputClass}`}
              />
              <span className="mt-1 block text-xs text-[#9BA7B4]">
                The name shown to the operator when an agent authenticates on your website.
              </span>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-white">Redirect URI</span>
              <input
                name="redirect_uri"
                required
                type="url"
                placeholder="https://example.com/api/auth/callback/agentkey"
                className={`mt-1.5 w-full font-mono text-xs ${inputClass}`}
              />
              <span className="mt-1 block text-xs text-[#9BA7B4]">
                Must use HTTPS (or HTTP on localhost/127.0.0.1 for local development).
              </span>
            </label>
          </ActionForm>
        </Card>
      </details>

      {/* Registered Clients List */}
      <div>
        <h2 className="mb-3 text-base font-bold text-white">Registered OAuth Applications</h2>
        <div className="space-y-3">
          {clients.length === 0 && (
            <Empty title="No OAuth clients registered yet">
              Register an application above to generate a client_id for &ldquo;Sign in with AgentKey&rdquo;.
            </Empty>
          )}

          {clients.map((c) => (
            <Card key={c.client_id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between !py-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{c.client_name}</p>
                  <span className="text-xs text-[#718096]">· {timeAgo(c.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#9BA7B4]">Client ID:</span>
                  <code className="font-mono text-xs text-[#8BE8E3] bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {c.client_id}
                  </code>
                  <CopyButton value={c.client_id} />
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] text-[#718096]">Redirects:</span>
                  <span className="font-mono text-[11px] text-[#9BA7B4] truncate">
                    {c.redirect_uris.join(", ")}
                  </span>
                </div>
              </div>

              <div>
                <ActionForm
                  action={deleteOAuthClient}
                  submit="Delete"
                  variant="danger"
                  confirm={`Delete OAuth client "${c.client_name}"? Existing integrations will stop working.`}
                >
                  <input type="hidden" name="client_id" value={c.client_id} />
                </ActionForm>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Integration Code & UserInfo Claims */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* NextAuth Integration Code */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">NextAuth / Auth.js Integration</h3>
            <span className="text-xs text-[#8BE8E3]">Client-side or API</span>
          </div>
          <Code code={nextAuthSnippet} title="auth.config.ts" />
        </div>

        {/* UserInfo Claims Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Live UserInfo Claims (JSON)</h3>
            <span className="text-xs text-[#B5F0D1]">GET /oauth/userinfo</span>
          </div>
          <Code code={userinfoClaims} title="UserInfo Response" />
        </div>
      </div>

      {/* Python / Direct Verification Code */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Backend Verification in Python (FastAPI / httpx)</h3>
          <span className="text-xs text-[#9BA7B4]">Cross-site Verification</span>
        </div>
        <Code code={pythonVerifySnippet} title="agent_verifier.py" />
      </div>


    </div>
  );
}
