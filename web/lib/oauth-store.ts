import crypto from "crypto";
import fs from "fs";
import path from "path";

export type OAuthClient = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  created_at: string;
  owner_email?: string;
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

function loadClients(): OAuthClient[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (c) => c && c.client_id !== "cli_claude_desktop" && c.client_id !== "cli_chatgpt_agent"
        );
      }
    }
  } catch (err) {
    console.error("Error reading oauth clients:", err);
  }
  return [];
}

function saveClients(clients: OAuthClient[]) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(clients, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving oauth clients:", err);
  }
}

function getAllClients(): OAuthClient[] {
  if (!globalForOAuth._agentKeyOAuthClients) {
    globalForOAuth._agentKeyOAuthClients = loadClients();
  }
  return globalForOAuth._agentKeyOAuthClients;
}

export function getOAuthClients(userEmail?: string): OAuthClient[] {
  const clients = getAllClients();
  if (!userEmail) return [];
  const lower = userEmail.toLowerCase();
  return clients.filter(
    (c) =>
      c.owner_email &&
      c.owner_email.toLowerCase() === lower &&
      c.client_id !== "cli_claude_desktop" &&
      c.client_id !== "cli_chatgpt_agent"
  );
}

export function getOAuthClientById(clientId: string): OAuthClient | undefined {
  const clients = getAllClients();
  const found = clients.find((c) => c.client_id === clientId);
  if (found) return found;

  // Built-in system connectors for testing & desktop apps
  if (clientId === "cli_claude_desktop") {
    return {
      client_id: "cli_claude_desktop",
      client_name: "Claude Desktop & Claude Code",
      redirect_uris: ["http://localhost:3000/callback", "https://claude.ai/api/auth/callback"],
      created_at: new Date().toISOString(),
    };
  }
  if (clientId === "cli_chatgpt_agent") {
    return {
      client_id: "cli_chatgpt_agent",
      client_name: "ChatGPT Custom Connector",
      redirect_uris: ["https://chatgpt.com/api/auth/callback/agentkey", "https://chat.openai.com/aip/callback"],
      created_at: new Date().toISOString(),
    };
  }

  return undefined;
}

export function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function registerOAuthClientRecord(
  name: string,
  redirectUris: string[],
  ownerEmail?: string
): OAuthClient {
  const clients = getAllClients();
  const idPrefix = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16) || "app";

  // Sanitize and validate redirect URIs
  const validUris = redirectUris.filter(isValidRedirectUri);
  const finalUris = validUris.length > 0 ? validUris : ["http://localhost:3000/callback"];

  const newClient: OAuthClient = {
    client_id: `cli_${idPrefix}_${crypto.randomBytes(4).toString("hex")}`,
    client_name: name.slice(0, 64),
    redirect_uris: finalUris,
    created_at: new Date().toISOString(),
    owner_email: ownerEmail,
  };
  clients.unshift(newClient);
  globalForOAuth._agentKeyOAuthClients = clients;
  saveClients(clients);
  return newClient;
}

export function deleteOAuthClientRecord(clientId: string, userEmail?: string): boolean {
  let clients = getAllClients();
  const initialLen = clients.length;
  clients = clients.filter((c) => {
    if (c.client_id !== clientId) return true;
    if (userEmail && c.owner_email && c.owner_email.toLowerCase() !== userEmail.toLowerCase()) {
      return true; // Not owned by current user
    }
    return false;
  });
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
