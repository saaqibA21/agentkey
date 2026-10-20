import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";

const DEFAULT_API_URL = process.env.NODE_ENV === "production" ? "https://agentkey-api.onrender.com" : "http://127.0.0.1:8000";
const API_URL = (process.env.AIGENT_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail?: string,
  ) {
    super(detail ?? title);
  }
}

// Session tokens are short-lived and workspace-scoped; cache them per signed-in user until they near expiry.
const tokens = new Map<string, { token: string; expiresAt: number }>();

async function identity() {
  const session = await auth();
  const user = session?.user as { email?: string | null; name?: string | null; image?: string | null; provider?: string };
  if (!user?.email || !user.provider) redirect("/login");
  return { email: user.email, name: user.name ?? "", image: user.image ?? null, provider: user.provider };
}

async function sessionToken(forceNew = false): Promise<string> {
  const me = await identity();
  const cacheKey = `${me.provider}:${me.email}`;
  const cached = tokens.get(cacheKey);
  if (!forceNew && cached && cached.expiresAt - 120 > Date.now() / 1000) return cached.token;

  const resp = await fetch(`${API_URL}/v1/internal/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Dashboard-Secret": process.env.AIGENT_DASHBOARD_SECRET ?? "agentkey-super-secret-dashboard-key-2026",
    },
    body: JSON.stringify({ email: me.email, name: me.name, avatar_url: me.image, provider: me.provider }),
    cache: "no-store",
  });
  if (!resp.ok) throw new ApiError(resp.status, "Could not start a session with the AgentKey API");
  const data = (await resp.json()) as { token: string; expires_at: number };
  tokens.set(cacheKey, { token: data.token, expiresAt: data.expires_at });
  return data.token;
}

async function call(path: string, init: RequestInit | undefined, retry: boolean): Promise<Response> {
  const token = await sessionToken(!retry);
  const resp = await fetch(`${API_URL}/v1${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  return resp.status === 401 && retry ? call(path, init, false) : resp;
}

/** Call the AgentKey API as the signed-in user. Throws ApiError on any non-2xx response. */
export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const resp = await call(path, init, true);
  if (resp.status === 204) return undefined as T;
  if (!resp.ok) {
    const problem = (await resp.json().catch(() => ({}))) as { title?: string; detail?: string };
    throw new ApiError(resp.status, problem.title ?? resp.statusText, problem.detail);
  }
  return (await resp.json()) as T;
}

/** Raw response, for streaming attachment downloads through the dashboard. */
export async function apiRaw(path: string): Promise<Response> {
  return call(path, undefined, true);
}

/** Call operator admin endpoints using X-Admin-Secret. */
export async function adminApi<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const adminSecret = process.env.AIGENT_ADMIN_SECRET ?? "_yETXQ0OHXL-BvESlXEyKBrqom7NZaH89W42GKG8Kz0";
  const resp = await fetch(`${API_URL}/v1${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      "X-Admin-Secret": adminSecret,
    },
    cache: "no-store",
  });
  if (resp.status === 204) return undefined as T;
  if (!resp.ok) {
    const problem = (await resp.json().catch(() => ({}))) as { title?: string; detail?: string };
    throw new ApiError(resp.status, problem.title ?? resp.statusText, problem.detail);
  }
  return (await resp.json()) as T;
}

export const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? API_URL).replace(/\/$/, "");

// ---- shapes returned by the API -----------------------------------------------------------

export type Workspace = {
  id: string; name: string; plan: string; outbound_enabled: boolean; daily_send_limit: number;
  max_inboxes: number; inbound_daily_limit: number; pii_masking_enabled: boolean;
};
export type Overview = {
  workspace: Workspace;
  usage: { sent_today: number; received_today: number };
  counts: { inboxes: number; messages: number; pending_approvals: number; api_keys: number; verified_domains: number };
  mail_domain: string;
};
export type Inbox = {
  id: string;
  email_address: string;
  status: string;
  client_id: string | null;
  owner_name?: string | null;
  display_title?: string | null;
  phone_number?: string | null;
  created_at: string;
};
export type AdminStats = {
  workspaces: number;
  inboxes: number;
  messages: number;
  audit_logs: number;
  status: string;
};
export type AuditLogEntry = {
  id: string;
  actor: string;
  action: string;
  target?: string | null;
  detail: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
};
export type AttachmentInfo = {
  id?: string; filename: string; content_type: string; size: number; has_text?: boolean; risky?: boolean; skipped?: string;
};
export type Message = {
  id: string; inbox_id: string; thread_id: string | null; channel: string; direction: "INBOUND" | "OUTBOUND";
  sender: string; recipient: string; subject: string | null; body_text: string; status: string; created_at: string;
  extracted_data: {
    otp_code?: string; magic_link?: string; summary?: string; intent?: string; reply_text?: string;
    attachments?: AttachmentInfo[]; invoice?: Record<string, unknown>;
    security?: { prompt_injection_suspected: boolean; signals: string[] };
    hitl?: { matched: string[]; action: string };
  };
};
export type ApiKey = {
  id: string; name: string; key_prefix: string; scopes: string[]; created_at: string; revoked_at: string | null;
};
export type DnsRecord = {
  purpose: "ownership" | "mx" | "dkim" | "spf" | "dmarc"; type: string; name: string; value: string;
  priority?: number; required: boolean;
};
export type Domain = {
  id: string; name: string; status: "PENDING" | "VERIFIED"; checks: Record<string, boolean>; records: DnsRecord[];
};
export type Policy = {
  id: string; trigger_keywords: string[]; action: string; target_channel: string; target_destination: string;
};
export type Webhook = { id: string; target_url: string; event_types: string[]; is_active: boolean };
