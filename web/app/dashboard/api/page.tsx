import Link from "next/link";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui";
import { api, publicApiUrl } from "@/lib/api";
import { getAgents } from "@/lib/agent-store";
import { ApiManager } from "./api-manager";

export const metadata = { title: "API & Passports · AgentKey" };

type Agent = {
  id: string;
  agent_name: string;
  owner_name: string;
  owner_email: string;
  email_address: string;
  inbox_id: string;
  api_key_prefix: string;
  scopes: string[];
  created_at: string;
  passport?: string;
  avatar_url?: string;
  avatar_seed?: string;
};

export default async function ApiPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  const ownerEmail = session?.user?.email ?? "";
  const ownerName = session?.user?.name || (ownerEmail ? ownerEmail.split("@")[0] : "Owner");

  let agents: Agent[] = [];
  try {
    const agentsRaw = await api<{ data: Agent[] }>("/agents");
    if (agentsRaw && Array.isArray(agentsRaw.data)) {
      agents = agentsRaw.data;
    } else {
      agents = getAgents(ownerEmail) as unknown as Agent[];
    }
  } catch {
    agents = getAgents(ownerEmail) as unknown as Agent[];
  }

  return (
    <>
      <PageHeader
        title="API & Agent Passports"
        lead="Manage autonomous AI agents with verifiable human accountability. Each agent receives a guaranteed unique avatar, cryptographic AgentKey Passport, dedicated email inbox, and API credentials."
        aside={
          <div className="hidden sm:flex select-none shrink-0">
            <img
              src="/images/mascot/agentkey-api-active.png"
              alt="AgentKey API Active Mascot"
              className="w-28 sm:w-32 h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
            />
          </div>
        }
      />

      {/* OAuth Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-sky-400/30 bg-[#F2ECE1] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-100 text-sky-700">
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-[#18191B]">Looking for OAuth &amp; &ldquo;Sign in with AgentKey&rdquo;?</p>
            <p className="text-[11px] text-[#57534E]">Give external websites OpenID Connect discovery and client IDs to authenticate your agents.</p>
          </div>
        </div>
        <Link
          href="/dashboard/oauth"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-400/40 bg-sky-100 px-3.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-200 transition shadow-xs"
        >
          <span>OAuth &amp; Connect Portal</span>
          <span>→</span>
        </Link>
      </div>

      <ApiManager
        initialAgents={agents}
        ownerEmail={ownerEmail}
        ownerName={ownerName}
        publicApiUrl={publicApiUrl}
      />
    </>
  );
}
