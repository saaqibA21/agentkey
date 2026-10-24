import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { DnsRecord, Domain, Webhook } from "./api";

export type ApiKeyRecord = {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  owner_email?: string;
  created_at: string;
  revoked_at: string | null;
};

export type InboxRecord = {
  id: string;
  email_address: string;
  status: "ACTIVE" | "PAUSED" | "REVOKED";
  client_id?: string;
  owner_name?: string;
  display_title?: string;
  phone_number?: string;
  owner_email?: string;
  created_at: string;
};

export type AgentRecord = {
  id: string;
  agent_name: string;
  owner_name: string;
  owner_email: string;
  email_address: string;
  inbox_id: string;
  api_key_prefix: string;
  scopes: string[];
  created_at: string;
  passport: string;
  avatar_url?: string;
  avatar_seed?: string;
};

export type WebhookRecord = Webhook & {
  secret_token: string;
  owner_email?: string;
  created_at: string;
};

export type DomainRecord = Domain & {
  owner_email?: string;
  created_at: string;
};

const STORE_PATH = process.env.NODE_ENV === "production"
  ? "/tmp/agentkey_agents_store.json"
  : path.join(process.cwd(), ".agentkey_agents_store.json");

type StoreData = {
  keys: ApiKeyRecord[];
  inboxes: InboxRecord[];
  agents: AgentRecord[];
  webhooks: WebhookRecord[];
  domains: DomainRecord[];
};

const DEFAULT_KEY_PREFIX = "ai_live_8f3a";
const DEFAULT_API_KEY = "ai_live_8f3a92b1c4e0d5a7b9c1d2e3f4a5b6c7";

const DEFAULT_STORE: StoreData = {
  keys: [
    {
      id: "ak_live_default_primary",
      name: "default-production-agent",
      key_prefix: DEFAULT_KEY_PREFIX,
      key_hash: crypto.createHash("sha256").update(DEFAULT_API_KEY).digest("hex"),
      scopes: ["read", "send", "manage", "connect"],
      owner_email: "operator@agentkey.in",
      created_at: new Date().toISOString(),
      revoked_at: null,
    },
  ],
  inboxes: [
    {
      id: "inbox_primary_agent",
      email_address: "agent-01@agentkey.in",
      status: "ACTIVE",
      client_id: "agent-core-runner",
      owner_name: "Autonomous Task Agent",
      display_title: "Core Verification Agent",
      phone_number: "+91 98765 43210",
      owner_email: "operator@agentkey.in",
      created_at: new Date().toISOString(),
    },
  ],
  agents: [
    {
      id: "ag_live_primary",
      agent_name: "Autonomous Task Agent",
      owner_name: "Operator",
      owner_email: "operator@agentkey.in",
      email_address: "agent-01@agentkey.in",
      inbox_id: "inbox_primary_agent",
      api_key_prefix: DEFAULT_KEY_PREFIX,
      scopes: ["read", "send", "manage", "connect"],
      created_at: new Date().toISOString(),
      passport: "agpass_live_98a72b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
      avatar_url: "/images/mascot/agentkey-badge.png",
      avatar_seed: "8f3a2b",
    },
  ],
  webhooks: [],
  domains: [
    {
      id: "dom_agentkey_in",
      name: "agentkey.in",
      status: "VERIFIED",
      checks: { ownership: true, mx: true, spf: true, dkim: true, dmarc: true },
      records: [
        { purpose: "ownership", type: "TXT", name: "@", value: "agentkey-verification=prod-live-9c383", required: true },
        { purpose: "mx", type: "MX", name: "@", value: "route1.mx.cloudflare.net", priority: 10, required: true },
        { purpose: "spf", type: "TXT", name: "@", value: "v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all", required: true },
        { purpose: "dkim", type: "CNAME", name: "resend._domainkey", value: "dkim.resend.com", required: true },
        { purpose: "dmarc", type: "TXT", name: "_dmarc", value: "v=DMARC1; p=none;", required: false },
      ],
      created_at: new Date().toISOString(),
    },
  ],
};

const globalForAgents = globalThis as unknown as {
  _agentKeyData?: StoreData;
};

function loadStore(): StoreData {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.keys) && Array.isArray(parsed.inboxes)) {
        if (!Array.isArray(parsed.webhooks)) parsed.webhooks = [];
        if (!Array.isArray(parsed.domains)) parsed.domains = DEFAULT_STORE.domains;
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error loading agent store:", err);
  }
  return DEFAULT_STORE;
}

function saveStore(data: StoreData) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving agent store:", err);
  }
}

function getStore(): StoreData {
  if (!globalForAgents._agentKeyData) {
    globalForAgents._agentKeyData = loadStore();
  }
  return globalForAgents._agentKeyData;
}

// ---------------------------------------------------------------------------
// API Key Methods
// ---------------------------------------------------------------------------

export function createApiKeyRecord(
  name: string,
  scopes: string[] = ["read", "send"],
  ownerEmail?: string
): { key: ApiKeyRecord; secret: string } {
  const store = getStore();
  const rawKey = `ai_live_${crypto.randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 12);
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const record: ApiKeyRecord = {
    id: `ak_${crypto.randomBytes(8).toString("hex")}`,
    name,
    key_prefix: keyPrefix,
    key_hash: hash,
    scopes,
    owner_email: ownerEmail,
    created_at: new Date().toISOString(),
    revoked_at: null,
  };

  store.keys.unshift(record);
  saveStore(store);
  return { key: record, secret: rawKey };
}

export function getApiKeys(ownerEmail?: string): ApiKeyRecord[] {
  const store = getStore();
  const unrevoked = store.keys.filter((k) => !k.revoked_at);
  if (!ownerEmail) return unrevoked;
  const lower = ownerEmail.toLowerCase();
  return unrevoked.filter(
    (k) => !k.owner_email || k.owner_email.toLowerCase() === lower
  );
}

export function revokeApiKeyRecord(id: string, ownerEmail?: string): boolean {
  const store = getStore();
  const lower = ownerEmail ? ownerEmail.toLowerCase() : undefined;
  const key = store.keys.find((k) => {
    if (k.id !== id) return false;
    if (lower && k.owner_email && k.owner_email.toLowerCase() !== lower) {
      return false; // Unauthorized: Key belongs to another tenant
    }
    return true;
  });

  if (key) {
    key.revoked_at = new Date().toISOString();
    saveStore(store);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Security Utilities (Timing Attack & SSRF Protection)
// ---------------------------------------------------------------------------

export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isSafeWebhookUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    // Enforce HTTPS in production
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return false;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Block localhost, link-local, loopback, cloud metadata
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host === "169.254.169.254" || // AWS / Azure metadata
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      if (process.env.NODE_ENV === "production") {
        return false;
      }
    }

    // Block private RFC 1918 IPv4 ranges in production
    const ipMatch = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const b0 = Number(ipMatch[1]);
      const b1 = Number(ipMatch[2]);
      if (
        b0 === 10 || // 10.0.0.0/8
        b0 === 127 || // 127.0.0.0/8
        (b0 === 172 && b1 >= 16 && b1 <= 31) || // 172.16.0.0/12
        (b0 === 192 && b1 === 168) || // 192.168.0.0/16
        (b0 === 169 && b1 === 254) // 169.254.0.0/16
      ) {
        if (process.env.NODE_ENV === "production") {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function validateApiKey(providedKey: string): {
  valid: boolean;
  scopes: string[];
  ownerEmail?: string;
  name?: string;
} {
  if (!providedKey) return { valid: false, scopes: [] };
  const cleanKey = providedKey.trim().replace(/^Bearer\s+/i, "");

  // Timing-safe check against default key
  if (safeEqual(cleanKey, DEFAULT_API_KEY)) {
    return {
      valid: true,
      scopes: ["read", "send", "manage", "connect"],
      ownerEmail: "operator@agentkey.in",
      name: "default-production-agent",
    };
  }

  // Check optional environment master key
  const envMasterKey = process.env.AGENTKEY_API_KEY || process.env.MASTER_API_KEY;
  if (envMasterKey && safeEqual(cleanKey, envMasterKey)) {
    return {
      valid: true,
      scopes: ["read", "send", "manage", "connect"],
      ownerEmail: "operator@agentkey.in",
      name: "master-env-agent",
    };
  }

  const hash = crypto.createHash("sha256").update(cleanKey).digest("hex");

  const store = getStore();
  // Strictly compare key hashes using timing-safe comparison; do NOT use prefix matching
  const match = store.keys.find(
    (k) => !k.revoked_at && safeEqual(k.key_hash, hash)
  );

  if (match) {
    return {
      valid: true,
      scopes: match.scopes,
      ownerEmail: match.owner_email,
      name: match.name,
    };
  }

  return { valid: false, scopes: [] };
}

export function isOperatorOrAdmin(email?: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return lower === "operator@agentkey.in" || adminEmails.includes(lower);
}

// ---------------------------------------------------------------------------
// Inbox Methods
// ---------------------------------------------------------------------------

export function getInboxes(ownerEmail?: string): InboxRecord[] {
  const store = getStore();
  if (!ownerEmail) return store.inboxes;
  const lower = ownerEmail.toLowerCase().trim();
  if (isOperatorOrAdmin(lower)) {
    return store.inboxes;
  }
  return store.inboxes.filter(
    (i) => i.owner_email && i.owner_email.toLowerCase().trim() === lower
  );
}

export function getInboxById(id: string): InboxRecord | undefined {
  const store = getStore();
  return store.inboxes.find(
    (i) => i.id === id || i.email_address.toLowerCase() === id.toLowerCase()
  );
}

export function getOrCreateDefaultInbox(ownerEmail: string, ownerName?: string): InboxRecord {
  const store = getStore();
  const lower = ownerEmail.toLowerCase().trim();
  const existing = store.inboxes.find(
    (i) => i.owner_email && i.owner_email.toLowerCase().trim() === lower
  );
  if (existing) return existing;

  // Clean and derive friendly agent username from the email prefix
  const rawPrefix = lower.split("@")[0].replace(/[^a-z0-9_-]/g, "");
  const baseUsername = rawPrefix.slice(0, 18) || "agent";

  // Check if candidate email is already taken
  let candidateUsername = `${baseUsername}-bot`;
  const isTaken = (u: string) =>
    store.inboxes.some((i) => i.email_address.toLowerCase() === `${u}@agentkey.in`.toLowerCase());

  if (isTaken(candidateUsername)) {
    candidateUsername = `${baseUsername}-${crypto.randomBytes(2).toString("hex")}`;
  }

  const name = ownerName || ownerEmail.split("@")[0] || "Operator";
  const newInbox = createInboxRecord({
    username: candidateUsername,
    owner_name: name,
    display_title: `${name}'s Agent`,
    owner_email: lower,
  });

  return newInbox;
}

export function createInboxRecord(params: {
  username?: string;
  owner_name?: string;
  display_title?: string;
  phone_number?: string;
  owner_email?: string;
}): InboxRecord {
  const store = getStore();
  const username = (params.username || `agent-${crypto.randomBytes(3).toString("hex")}`)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");

  const emailAddress = username.includes("@") ? username : `${username}@agentkey.in`;
  const existing = store.inboxes.find((i) => i.email_address.toLowerCase() === emailAddress.toLowerCase());
  if (existing) return existing;

  const inbox: InboxRecord = {
    id: `inbox_${crypto.randomBytes(8).toString("hex")}`,
    email_address: emailAddress,
    status: "ACTIVE",
    client_id: `cli_${username}`,
    owner_name: params.owner_name || "Autonomous Agent",
    display_title: params.display_title || "Agent Mailbox",
    phone_number: params.phone_number || undefined,
    owner_email: params.owner_email ? params.owner_email.toLowerCase().trim() : undefined,
    created_at: new Date().toISOString(),
  };

  store.inboxes.unshift(inbox);
  saveStore(store);
  return inbox;
}

export function deleteInboxRecord(id: string, ownerEmail?: string): boolean {
  const store = getStore();
  if (id === "inbox_primary_agent") return false; // Protected system inbox

  const lower = ownerEmail ? ownerEmail.toLowerCase().trim() : undefined;
  const isAdmin = lower ? isOperatorOrAdmin(lower) : true;

  const inbox = store.inboxes.find((i) => i.id === id || i.email_address.toLowerCase() === id.toLowerCase());
  if (!inbox) return false;
  if (!isAdmin && inbox.owner_email && inbox.owner_email.toLowerCase().trim() !== lower) {
    return false; // Unauthorized
  }

  const initialLen = store.inboxes.length;
  store.inboxes = store.inboxes.filter((i) => i.id !== inbox.id);
  saveStore(store);
  return store.inboxes.length < initialLen;
}

// ---------------------------------------------------------------------------
// Agent Methods
// ---------------------------------------------------------------------------

export function getAgents(ownerEmail?: string): AgentRecord[] {
  const store = getStore();
  if (!ownerEmail) return store.agents;
  const lower = ownerEmail.toLowerCase().trim();
  if (isOperatorOrAdmin(lower)) {
    return store.agents;
  }
  return store.agents.filter(
    (a) => a.owner_email && a.owner_email.toLowerCase().trim() === lower
  );
}

export function createAgentRecord(params: {
  agent_name: string;
  owner_name: string;
  owner_email?: string;
  avatar_seed?: string;
  avatar_url?: string;
}): { agent: AgentRecord; api_key: string } {
  const store = getStore();
  const seed = params.avatar_seed || crypto.randomBytes(4).toString("hex");
  const username = params.agent_name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 24) || "agent";
  const inbox = createInboxRecord({
    username: `${username}-${seed.slice(0, 4)}`,
    owner_name: params.owner_name,
    owner_email: params.owner_email,
    display_title: params.agent_name,
  });

  const { key, secret } = createApiKeyRecord(params.agent_name, ["read", "send", "manage", "connect"], params.owner_email);

  const passport = `agpass_live_${crypto.randomBytes(32).toString("hex")}`;
  const agent: AgentRecord = {
    id: `ag_${crypto.randomBytes(8).toString("hex")}`,
    agent_name: params.agent_name,
    owner_name: params.owner_name,
    owner_email: params.owner_email || "operator@agentkey.in",
    email_address: inbox.email_address,
    inbox_id: inbox.id,
    api_key_prefix: key.key_prefix,
    scopes: key.scopes,
    created_at: new Date().toISOString(),
    passport,
    avatar_seed: seed,
    avatar_url: params.avatar_url || `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}`,
  };

  store.agents.unshift(agent);
  saveStore(store);
  return { agent, api_key: secret };
}

export function deleteAgentRecord(id: string, ownerEmail?: string): boolean {
  const store = getStore();
  const lower = ownerEmail ? ownerEmail.toLowerCase().trim() : undefined;
  const isAdmin = lower ? isOperatorOrAdmin(lower) : true;

  const agent = store.agents.find((a) => a.id === id);
  if (!agent) return false;
  if (!isAdmin && agent.owner_email && agent.owner_email.toLowerCase().trim() !== lower) {
    return false; // Unauthorized
  }

  const initialLen = store.agents.length;
  store.agents = store.agents.filter((a) => a.id !== id);
  saveStore(store);
  return store.agents.length < initialLen;
}

// ---------------------------------------------------------------------------
// Webhook Methods
// ---------------------------------------------------------------------------

export function getWebhooks(ownerEmail?: string): Webhook[] {
  const store = getStore();
  if (!ownerEmail) return store.webhooks;
  const lower = ownerEmail.toLowerCase().trim();
  if (isOperatorOrAdmin(lower)) {
    return store.webhooks;
  }
  return store.webhooks.filter(
    (w) => w.owner_email && w.owner_email.toLowerCase().trim() === lower
  );
}

export function createWebhookRecord(
  targetUrl: string,
  eventTypes: string[] = ["*"],
  ownerEmail?: string
): { webhook: WebhookRecord; secret_token: string } {
  if (!isSafeWebhookUrl(targetUrl)) {
    throw new Error("Invalid or prohibited webhook target URL. Must be a valid public HTTPS endpoint.");
  }

  const store = getStore();
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
  const hook: WebhookRecord = {
    id: `wh_${crypto.randomBytes(8).toString("hex")}`,
    target_url: targetUrl,
    event_types: eventTypes.length ? eventTypes : ["*"],
    is_active: true,
    secret_token: secret,
    owner_email: ownerEmail ? ownerEmail.toLowerCase().trim() : undefined,
    created_at: new Date().toISOString(),
  };

  store.webhooks.unshift(hook);
  saveStore(store);
  return { webhook: hook, secret_token: secret };
}

export function deleteWebhookRecord(id: string, ownerEmail?: string): boolean {
  const store = getStore();
  const lower = ownerEmail ? ownerEmail.toLowerCase().trim() : undefined;
  const isAdmin = lower ? isOperatorOrAdmin(lower) : true;

  const hook = store.webhooks.find((w) => w.id === id);
  if (!hook) return false;
  if (!isAdmin && hook.owner_email && hook.owner_email.toLowerCase().trim() !== lower) {
    return false; // Unauthorized
  }

  const initialLen = store.webhooks.length;
  store.webhooks = store.webhooks.filter((w) => w.id !== id);
  saveStore(store);
  return store.webhooks.length < initialLen;
}

export async function dispatchWebhooks(event: string, payload: any) {
  const store = getStore();
  const matching = store.webhooks.filter(
    (w) => w.is_active && (w.event_types.includes("*") || w.event_types.includes(event))
  );

  const timestamp = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify({
    event,
    timestamp,
    data: payload,
  });

  const promises = matching.map(async (w) => {
    // SSRF safeguard before dispatch
    if (!isSafeWebhookUrl(w.target_url)) {
      console.warn(`Skipping dispatch to unsafe webhook URL: ${w.target_url}`);
      return;
    }

    try {
      const signature = crypto
        .createHmac("sha256", w.secret_token)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");

      await fetch(w.target_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AgentKey-Signature": `t=${timestamp},v1=${signature}`,
          "User-Agent": "AgentKey-Webhook-Dispatcher/1.0",
        },
        body: rawBody,
        signal: AbortSignal.timeout(4000),
      });
    } catch (err) {
      console.error(`Failed to dispatch webhook to ${w.target_url}:`, err);
    }
  });

  // Non-blocking parallel dispatch
  Promise.allSettled(promises).catch(() => {});
}

// ---------------------------------------------------------------------------
// Domain Methods
// ---------------------------------------------------------------------------

export function getDomains(ownerEmail?: string): Domain[] {
  const store = getStore();
  if (!ownerEmail) return store.domains;
  const lower = ownerEmail.toLowerCase().trim();
  if (isOperatorOrAdmin(lower)) {
    return store.domains;
  }
  return store.domains.filter(
    (d) => d.id === "dom_agentkey_in" || (d.owner_email && d.owner_email.toLowerCase().trim() === lower)
  );
}

export function addDomainRecord(name: string, ownerEmail?: string): Domain {
  const store = getStore();
  const cleanName = name.trim().toLowerCase();
  const existing = store.domains.find((d) => d.name === cleanName);
  if (existing) return existing;

  const verificationToken = `agentkey-verification=${crypto.randomBytes(12).toString("hex")}`;
  const domain: DomainRecord = {
    id: `dom_${crypto.randomBytes(8).toString("hex")}`,
    name: cleanName,
    status: "PENDING",
    checks: { ownership: false, mx: false, spf: false, dkim: false, dmarc: false },
    records: [
      {
        purpose: "ownership",
        type: "TXT",
        name: cleanName,
        value: verificationToken,
        required: true,
      },
      {
        purpose: "mx",
        type: "MX",
        name: cleanName,
        value: "route1.mx.cloudflare.net",
        priority: 10,
        required: true,
      },
      {
        purpose: "spf",
        type: "TXT",
        name: cleanName,
        value: "v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all",
        required: true,
      },
      {
        purpose: "dkim",
        type: "CNAME",
        name: `resend._domainkey.${cleanName}`,
        value: "dkim.resend.com",
        required: true,
      },
      {
        purpose: "dmarc",
        type: "TXT",
        name: `_dmarc.${cleanName}`,
        value: "v=DMARC1; p=none;",
        required: false,
      },
    ],
    owner_email: ownerEmail,
    created_at: new Date().toISOString(),
  };

  store.domains.unshift(domain);
  saveStore(store);
  return domain;
}

export function verifyDomainRecord(id: string): Domain | undefined {
  const store = getStore();
  const domain = store.domains.find((d) => d.id === id);
  if (domain) {
    // Mark as verified
    domain.status = "VERIFIED";
    domain.checks = { ownership: true, mx: true, spf: true, dkim: true, dmarc: true };
    saveStore(store);
    return domain;
  }
  return undefined;
}

export function deleteDomainRecord(id: string): boolean {
  const store = getStore();
  // Don't delete the primary agentkey.in domain
  if (id === "dom_agentkey_in") return false;
  const initialLen = store.domains.length;
  store.domains = store.domains.filter((d) => d.id !== id);
  saveStore(store);
  return store.domains.length < initialLen;
}
