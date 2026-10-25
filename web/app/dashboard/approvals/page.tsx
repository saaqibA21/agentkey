import { PageHeader } from "@/components/ui";
import { api, type Message, type Policy } from "@/lib/api";
import { auth } from "@/auth";
import { getPendingApprovals, getPolicies } from "@/lib/agent-store";
import { ApprovalsManager } from "./approvals-manager";

export const metadata = { title: "Approvals · AgentKey" };

export default async function ApprovalsPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // ignore
  }
  const userEmail = session?.user?.email?.toLowerCase().trim();

  let pending: Message[] = [];
  let policies: Policy[] = [];

  try {
    const [pendingRaw, policiesRaw] = await Promise.all([
      api<{ data: Message[] }>("/hitl/pending"),
      api<Policy[] | { data: Policy[] }>("/hitl/policies"),
    ]);
    pending = pendingRaw?.data || [];
    policies = Array.isArray(policiesRaw)
      ? policiesRaw
      : Array.isArray((policiesRaw as any)?.data)
      ? (policiesRaw as any).data
      : [];
  } catch {
    pending = getPendingApprovals(userEmail) as unknown as Message[];
    policies = getPolicies(userEmail) as unknown as Policy[];
  }

  return (
    <>
      <PageHeader
        title="Approvals"
        lead="Messages your agents wanted to send that matched one of your rules. Nothing leaves until you approve it."
      />

      <ApprovalsManager initialPending={pending} initialPolicies={policies} />
    </>
  );
}
