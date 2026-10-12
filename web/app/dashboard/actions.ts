"use server";

import { revalidatePath } from "next/cache";

import { api, ApiError } from "@/lib/api";

export type ActionState = { error?: string; ok?: boolean; secret?: string; secretLabel?: string } | null;

async function run(path: string, work: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    const result = await work();
    revalidatePath(path);
    return result ?? { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.detail ?? err.title };
    throw err;
  }
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

// ---- inboxes --------------------------------------------------------------

export async function createInbox(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/inboxes", async () => {
    const username = text(form, "username");
    const domain = text(form, "domain");
    await api("/inboxes", {
      method: "POST",
      body: JSON.stringify({ ...(username ? { username } : {}), ...(domain ? { domain } : {}) }),
    });
  });
}

export async function deleteInbox(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/inboxes", async () => {
    await api(`/inboxes/${text(form, "id")}?purge=${form.get("purge") === "on"}`, { method: "DELETE" });
  });
}

// ---- API keys -------------------------------------------------------------

export async function createKey(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/keys", async () => {
    const scopes = ["read", "send", "manage"].filter((s) => form.get(`scope_${s}`) === "on");
    if (scopes.length === 0) return { error: "Pick at least one permission." };
    const created = await api<{ api_key: string }>("/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: text(form, "name") || "Untitled key", scopes }),
    });
    return { ok: true, secret: created.api_key, secretLabel: "Your new API key" };
  });
}

export async function revokeKey(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/keys", async () => {
    await api(`/api-keys/${text(form, "id")}`, { method: "DELETE" });
  });
}

// ---- domains --------------------------------------------------------------

export async function addDomain(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/domains", async () => {
    await api("/domains", { method: "POST", body: JSON.stringify({ name: text(form, "name") }) });
  });
}

export async function verifyDomain(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/domains", async () => {
    const domain = await api<{ status: string }>(`/domains/${text(form, "id")}/verify`, { method: "POST" });
    if (domain.status !== "VERIFIED") {
      return { error: "Not verified yet. DNS changes can take up to an hour to appear; the list above shows what is still missing." };
    }
  });
}

export async function deleteDomain(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/domains", async () => {
    await api(`/domains/${text(form, "id")}`, { method: "DELETE" });
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

// ---- webhooks -------------------------------------------------------------

export async function createWebhook(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/webhooks", async () => {
    const events = form.getAll("event").map(String);
    const created = await api<{ secret_token: string }>("/webhooks", {
      method: "POST",
      body: JSON.stringify({ target_url: text(form, "url"), event_types: events.length ? events : ["*"] }),
    });
    return { ok: true, secret: created.secret_token, secretLabel: "Webhook signing secret" };
  });
}

export async function deleteWebhook(_: ActionState, form: FormData): Promise<ActionState> {
  return run("/dashboard/webhooks", async () => {
    await api(`/webhooks/${text(form, "id")}`, { method: "DELETE" });
  });
}
