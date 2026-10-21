import crypto from "crypto";
import fs from "fs";
import path from "path";

export type OAuthClient = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  created_at: string;
};

export type AuthCodeEntry = {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge?: string;
  scopes: string[];
  user_email: string;
  user_name: string;
  expires_at: number;
};

const STORE_PATH = process.env.NODE_ENV === "production"
  ? "/tmp/agentkey_oauth_clients.json"
  : path.join(process.cwd(), ".agentkey_oauth_clients.json");

const globalForOAuth = globalThis as unknown as {
  _agentKeyOAuthClients?: OAuthClient[];
  _agentKeyAuthCodes?: Map<string, AuthCodeEntry>;
};

if (!globalForOAuth._agentKeyAuthCodes) {
  globalForOAuth._agentKeyAuthCodes = new Map();
}

const DEFAULT_CLIENTS: OAuthClient[] = [
  {
    client_id: "cli_claude_desktop",
    client_name: "Claude Desktop & Claude Code",
    redirect_uris: ["http://localhost:3000/callback", "https://claude.ai/api/auth/callback"],
    created_at: new Date().toISOString(),
  },
  {
    client_id: "cli_chatgpt_agent",
    client_name: "ChatGPT Custom Connector",
    redirect_uris: ["https://chatgpt.com/api/auth/callback/agentkey", "https://chat.openai.com/aip/callback"],
    created_at: new Date().toISOString(),
  },
];

function loadClients(): OAuthClient[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error("Error reading oauth clients:", err);
  }
  return DEFAULT_CLIENTS;
}

function saveClients(clients: OAuthClient[]) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(clients, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving oauth clients:", err);
  }
}

export function getOAuthClients(): OAuthClient[] {
  if (!globalForOAuth._agentKeyOAuthClients) {
    globalForOAuth._agentKeyOAuthClients = loadClients();
  }
  return globalForOAuth._agentKeyOAuthClients;
}

export function getOAuthClientById(clientId: string): OAuthClient | undefined {
  const clients = getOAuthClients();
  return clients.find((c) => c.client_id === clientId);
}

export function registerOAuthClientRecord(name: string, redirectUris: string[]): OAuthClient {
  const clients = getOAuthClients();
  const idPrefix = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16) || "app";
  const newClient: OAuthClient = {
    client_id: `cli_${idPrefix}_${crypto.randomBytes(4).toString("hex")}`,
    client_name: name,
    redirect_uris: redirectUris,
    created_at: new Date().toISOString(),
  };
  clients.unshift(newClient);
  globalForOAuth._agentKeyOAuthClients = clients;
  saveClients(clients);
  return newClient;
}

export function deleteOAuthClientRecord(clientId: string): boolean {
  let clients = getOAuthClients();
  const initialLen = clients.length;
  clients = clients.filter((c) => c.client_id !== clientId);
  globalForOAuth._agentKeyOAuthClients = clients;
  saveClients(clients);
  return clients.length < initialLen;
}

export function storeAuthCode(entry: AuthCodeEntry) {
  globalForOAuth._agentKeyAuthCodes!.set(entry.code, entry);
}

export function consumeAuthCode(code: string): AuthCodeEntry | undefined {
  const entry = globalForOAuth._agentKeyAuthCodes!.get(code);
  if (entry) {
    globalForOAuth._agentKeyAuthCodes!.delete(code);
    if (Date.now() < entry.expires_at) {
      return entry;
    }
  }
  return undefined;
}
