import { PageHeader } from "@/components/ui";
import { api, type ApiKey } from "@/lib/api";
import { auth } from "@/auth";
import { getApiKeys } from "@/lib/agent-store";
import { KeysManager } from "./keys-manager";

export const metadata = { title: "API Keys · AgentKey" };

export default async function KeysPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // ignore
  }
  const userEmail = session?.user?.email?.toLowerCase().trim();

  let keys: ApiKey[] = [];
  try {
    const keysRaw = await api<ApiKey[]>("/api-keys");
    const arr = Array.isArray(keysRaw) ? keysRaw : ((keysRaw as any)?.data ?? []);
    keys = (Array.isArray(arr) ? arr : []).filter((k: ApiKey) => k && !k.revoked_at && k.name !== "root");
  } catch {
    keys = getApiKeys(userEmail) as unknown as ApiKey[];
  }

  return (
    <>
      <PageHeader
        title="API keys"
        lead="Give each agent its own key with only the permissions it needs. A key without Send can never send a message."
        aside={
          <div className="hidden sm:flex select-none shrink-0">
            <img
              src="/images/mascot/agentkey-vault.png"
              alt="AgentKey Vault Mascot"
              className="w-32 lg:w-40 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
            />
          </div>
        }
      />

      <KeysManager initialKeys={keys} />
    </>
  );
}
