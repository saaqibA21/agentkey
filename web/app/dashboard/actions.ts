"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminApi, api, ApiError } from "@/lib/api";
import { auth } from "@/auth";
import {
  addDomainRecord,
  createAgentRecord,
  createApiKeyRecord,
  createInboxRecord,
  createWebhookRecord,
  deleteAgentRecord,
  deleteDomainRecord,
  deleteInboxRecord,
  deleteWebhookRecord,
  revokeApiKeyRecord,
  verifyDomainRecord,
} from "@/lib/agent-store";
import { deleteOAuthClientRecord, registerOAuthClientRecord } from "@/lib/oauth-store";

export type ActionState = {
  error?: string; ok?: boolean; secret?: string; secretLabel?: string;
  details?: { label: string; value: string }[];
} | null;

async function run(path: string, work: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    const result = await work();
    try {
      revalidatePath(path);
    } catch (e) {
      console.error(`revalidatePath(${path}) failed:`, e);
    }
    return result ?? { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.detail ?? err.title };
    if (err instanceof Error) return { error: err.message };
    return { error: "An unexpected error occurred." };
  }
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

// ---- inboxes --------------------------------------------------------------

export async function createInbox(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/inboxes", async () => {
    const session = await auth();
    const username = text(form, "username");
    const domain = text(form, "domain");
    const owner_name = text(form, "owner_name");
    const display_title = text(form, "display_title");
    const phone_number = text(form, "phone_number");
    try {
      await api("/inboxes", {
        method: "POST",
        body: JSON.stringify({
          ...(username ? { username } : {}),
          ...(domain ? { domain } : {}),
          ...(owner_name ? { owner_name } : {}),
          ...(display_title ? { display_title } : {}),
          ...(phone_number ? { phone_number } : {}),
        }),
      });
    } catch {
      createInboxRecord({
        username: username || undefined,
        owner_name: owner_name || undefined,
        display_title: display_title || undefined,
        phone_number: phone_number || undefined,
        owner_email: session?.user?.email || undefined,
      });
    }
  });
}

export async function resolveInboxLink(_: ActionState, form: FormData): Promise<ActionState> {
  const inbox_id = text(form, "inbox_id");
  const url = text(form, "url");
  return run(`/dashboard/inboxes/${inbox_id}`, async () => {
    await api(`/inboxes/${inbox_id}/resolve-link`, {
      method: "POST",
      body: JSON.stringify({
        ...(url ? { url } : {}),
        save_to_vault: true,
      }),
    });
  });
}

export async function deleteInbox(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/inboxes", async () => {
    const session = await auth();
    const id = text(form, "id");
    try {
      await api(`/inboxes/${id}?purge=${form.get("purge") === "on"}`, { method: "DELETE" });
    } catch {
      deleteInboxRecord(id, session?.user?.email || undefined);
    }
  });
}

// ---- API keys -------------------------------------------------------------

export async function createKey(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/keys", async () => {
    const session = await auth();
    const scopes = ["read", "send", "manage", "connect"].filter((s) => form.get(`scope_${s}`) === "on");
    if (scopes.length === 0) return { error: "Pick at least one permission." };
    const name = text(form, "name") || "Untitled key";

    try {
      const created = await api<{ api_key: string }>("/api-keys", {
        method: "POST",
        body: JSON.stringify({ name, scopes }),
      });
      return { ok: true, secret: created.api_key, secretLabel: "Your new API key" };
    } catch {
      const { secret } = createApiKeyRecord(name, scopes, session?.user?.email || undefined);
      return { ok: true, secret, secretLabel: "Your new API key" };
    }
  });
}

export async function revokeKey(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/keys", async () => {
    const id = text(form, "id");
    try {
      await api(`/api-keys/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    revokeApiKeyRecord(id);
    return { ok: true };
  });
}

// ---- domains --------------------------------------------------------------

export async function addDomain(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/domains", async () => {
    const session = await auth();
    const domainName = text(form, "name").trim().toLowerCase();
    if (!domainName) {
      return { error: "Please enter a valid domain name." };
    }
    try {
      await api("/domains", { method: "POST", body: JSON.stringify({ name: domainName }) });
    } catch {
      addDomainRecord(domainName, session?.user?.email || undefined);
    }
  });
}

export async function verifyDomain(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/domains", async () => {
    const id = text(form, "id");
    if (!id) return { error: "Domain ID is missing" };
    try {
      const domain = await api<{ status: string }>(`/domains/${id}/verify`, { method: "POST" });
      if (domain?.status !== "VERIFIED") {
        return { error: "Not verified yet. DNS changes can take up to an hour to appear; the list above shows what is still missing." };
      }
    } catch {
      verifyDomainRecord(id);
    }
  });
}

export async function deleteDomain(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/domains", async () => {
    const session = await auth();
    const id = text(form, "id");
    if (!id) return { error: "Domain ID is missing" };
    try {
      await api(`/domains/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    deleteDomainRecord(id, session?.user?.email || undefined);
    return { ok: true };
  });
}

// ---- approvals ------------------------------------------------------------

export async function decide(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/approvals", async () => {
    const verdict = text(form, "verdict") === "approve" ? "approve" : "reject";
    await api(`/hitl/${verdict}/${text(form, "id")}`, { method: "POST" });
  });
}

export async function createPolicy(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/approvals", async () => {
    const keywords = text(form, "keywords").split(",").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) return { error: "Add at least one keyword." };
    await api("/hitl/policies", {
      method: "POST",
      body: JSON.stringify({
        trigger_keywords: keywords,
        action: text(form, "action") || "HOLD_FOR_APPROVAL",
        target_channel: "SLACK",
        target_destination: text(form, "destination"),
      }),
    });
  });
}

export async function deletePolicy(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/approvals", async () => {
    await api(`/hitl/policies/${text(form, "id")}`, { method: "DELETE" });
  });
}

// ---- identity: connected accounts and saved logins -----------------------

export async function connectProvider(_: ActionState, form: FormData): Promise<ActionState> {
  let url: string;
  try {
    url = (await api<{ authorize_url: string }>(`/connections/${text(form, "provider")}/start`, { method: "POST" }))
      .authorize_url;
  } catch (err) {
    if (err instanceof ApiError) return { error: err.detail ?? err.title };
    throw err;
  }
  redirect(url);
}

export async function updateConnection(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/identity", async () => {
    const field = text(form, "field") === "allow_export" ? "allow_export" : "allow_writes";
    await api(`/connections/${text(form, "id")}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: text(form, "value") === "true" }),
    });
  });
}

export async function disconnect(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/identity", async () => {
    await api(`/connections/${text(form, "id")}`, { method: "DELETE" });
  });
}

export async function addLogin(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/identity", async () => {
    const totp = text(form, "totp_secret");
    const ownerName = text(form, "owner_name");
    await api("/vault/items", {
      method: "POST",
      body: JSON.stringify({
        name: text(form, "name"),
        site_url: text(form, "site_url"),
        username: text(form, "username"),
        password: String(form.get("password") ?? ""),
        approval: text(form, "approval") === "auto" ? "auto" : "ask",
        ...(totp ? { totp_secret: totp } : {}),
        ...(ownerName ? { owner_name: ownerName } : {}),
      }),
    });
  });
}

export async function setLoginApproval(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/identity", async () => {
    await api(`/vault/items/${text(form, "id")}`, {
      method: "PATCH",
      body: JSON.stringify({ approval: text(form, "approval") === "auto" ? "auto" : "ask" }),
    });
  });
}

export async function deleteLogin(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/identity", async () => {
    await api(`/vault/items/${text(form, "id")}`, { method: "DELETE" });
  });
}

export async function decideAccess(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/identity", async () => {
    const verdict = text(form, "verdict") === "approve" ? "approve" : "deny";
    await api(`/vault/requests/${text(form, "id")}/${verdict}`, { method: "POST" });
  });
}

// ---- apps connected through "sign in and approve" (ChatGPT, Claude...) ----

export async function decideConsent(_: ActionState, form: FormData): Promise<ActionState> {
  let target: string;
  try {
    const result = await api<{ redirect_to: string }>("/oauth/decision", {
      method: "POST",
      body: JSON.stringify({
        request: text(form, "request"),
        approve: text(form, "verdict") === "approve",
        scopes: ["read", "send", "manage", "connect"].filter((s) => form.get(`scope_${s}`) === "on"),
      }),
    });
    target = result.redirect_to;
  } catch (err) {
    if (err instanceof ApiError) return { error: err.detail ?? err.title };
    throw err;
  }
  redirect(target);
}

export async function revokeApp(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/identity", async () => {
    await api(`/oauth/grants/${encodeURIComponent(text(form, "client_id"))}`, { method: "DELETE" });
  });
}

// ---- webhooks -------------------------------------------------------------

export async function createWebhook(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/webhooks", async () => {
    const session = await auth();
    const targetUrl = text(form, "url");
    const events = form.getAll("event").map(String);
    const eventTypes = events.length ? events : ["*"];

    try {
      const created = await api<{ secret_token: string }>("/webhooks", {
        method: "POST",
        body: JSON.stringify({ target_url: targetUrl, event_types: eventTypes }),
      });
      return { ok: true, secret: created.secret_token, secretLabel: "Webhook signing secret" };
    } catch {
      const { secret_token } = createWebhookRecord(targetUrl, eventTypes, session?.user?.email || undefined);
      return { ok: true, secret: secret_token, secretLabel: "Webhook signing secret" };
    }
  });
}

export async function deleteWebhook(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/webhooks", async () => {
    const id = text(form, "id");
    try {
      await api(`/webhooks/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    deleteWebhookRecord(id);
    return { ok: true };
  });
}

// ---- admin operator actions -----------------------------------------------

export async function adminUpdateWorkspace(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/admin", async () => {
    const id = text(form, "workspace_id");
    const changes: Record<string, unknown> = {};
    if (form.has("outbound_enabled")) {
      changes.outbound_enabled = form.get("outbound_enabled") === "true";
    }
    if (form.has("pii_masking_enabled")) {
      changes.pii_masking_enabled = form.get("pii_masking_enabled") === "true";
    }
    if (form.has("daily_send_limit")) {
      changes.daily_send_limit = Number(form.get("daily_send_limit"));
    }
    if (form.has("max_inboxes")) {
      changes.max_inboxes = Number(form.get("max_inboxes"));
    }

    await adminApi(`/admin/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
  });
}

// ---- agents: the "Create API" flow ---------------------------------------

export async function createAgent(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/api", async () => {
    const session = await auth();
    const ownerEmail = session?.user?.email || "operator@agentkey.in";
    const agent_name = text(form, "agent_name") || "Autonomous Agent";
    const owner_name = text(form, "owner_name") || session?.user?.name || "Operator";
    const avatar_seed = text(form, "avatar_seed");
    const avatar_url = text(form, "avatar_url");

    try {
      const agent = await api<{
        api_key: string;
        passport?: string;
        email_address: string;
        agent_name: string;
        owner_email: string;
        avatar_seed?: string;
        avatar_url?: string;
      }>("/agents", {
        method: "POST",
        body: JSON.stringify({
          agent_name,
          owner_name,
          ...(avatar_seed ? { avatar_seed } : {}),
          ...(avatar_url ? { avatar_url } : {}),
        }),
      });
      const details = [
        { label: "Agent email", value: agent.email_address },
        { label: "Owner email", value: agent.owner_email },
      ];
      if (agent.avatar_seed) {
        details.push({ label: "Unique Avatar Seed", value: agent.avatar_seed });
      }
      if (agent.passport) {
        details.push({ label: "Verifiable Passport", value: agent.passport });
      }
      return {
        ok: true,
        secret: agent.api_key,
        secretLabel: `API key for ${agent.agent_name}`,
        details,
      };
    } catch {
      const { agent, api_key } = createAgentRecord({
        agent_name,
        owner_name,
        owner_email: ownerEmail,
        avatar_seed: avatar_seed || undefined,
        avatar_url: avatar_url || undefined,
      });
      return {
        ok: true,
        secret: api_key,
        secretLabel: `API key for ${agent.agent_name}`,
        details: [
          { label: "Agent email", value: agent.email_address },
          { label: "Owner email", value: agent.owner_email },
          { label: "Unique Avatar Seed", value: agent.avatar_seed || "" },
          { label: "Verifiable Passport", value: agent.passport },
        ],
      };
    }
  });
}

export async function updateAgentAvatar(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/api", async () => {
    const id = text(form, "id");
    const avatar_seed = text(form, "avatar_seed");
    const avatar_url = text(form, "avatar_url");
    try {
      await api(`/agents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(avatar_seed ? { avatar_seed } : {}),
          ...(avatar_url ? { avatar_url } : {}),
        }),
      });
    } catch {
      // local store will retain default avatar
    }
  });
}

export async function deleteAgent(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/api", async () => {
    const id = text(form, "id");
    try {
      await api(`/agents/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    deleteAgentRecord(id);
    return { ok: true };
  });
}

// ---- oauth clients & applications -----------------------------------------

export async function registerOAuthClient(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/oauth", async () => {
    const session = await auth();
    const ownerEmail = session?.user?.email ?? undefined;
    const client_name = text(form, "client_name") || "Untitled App";
    const redirect_uri = text(form, "redirect_uri");
    if (!redirect_uri) return { error: "At least one redirect URI is required." };

    try {
      const client = await api<{
        client_id: string;
        client_name: string;
        redirect_uris: string[];
      }>("/oauth/clients", {
        method: "POST",
        body: JSON.stringify({
          client_name,
          redirect_uris: [redirect_uri],
        }),
      });
      registerOAuthClientRecord(client.client_name, client.redirect_uris, ownerEmail);
      return {
        ok: true,
        secret: client.client_id,
        secretLabel: "Client ID issued for your application",
        details: [
          { label: "Application Name", value: client.client_name },
          { label: "Allowed Redirect URI", value: redirect_uri },
        ],
      };
    } catch {
      const localClient = registerOAuthClientRecord(client_name, [redirect_uri], ownerEmail);
      return {
        ok: true,
        secret: localClient.client_id,
        secretLabel: "Client ID issued for your application",
        details: [
          { label: "Application Name", value: localClient.client_name },
          { label: "Allowed Redirect URI", value: redirect_uri },
        ],
      };
    }
  });
}

export async function deleteOAuthClient(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/oauth", async () => {
    const session = await auth();
    const ownerEmail = session?.user?.email ?? undefined;
    const clientId = text(form, "client_id");
    try {
      await api(`/oauth/clients/${encodeURIComponent(clientId)}`, {
        method: "DELETE",
      });
    } catch {
      // ignore
    }
    deleteOAuthClientRecord(clientId, ownerEmail);
    return { ok: true };
  });
}

