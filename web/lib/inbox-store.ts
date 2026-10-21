import fs from "fs";
import path from "path";
import type { Message } from "./api";

// In-memory cache across serverless warm invocations
const globalForStore = globalThis as unknown as {
  _agentKeyMessages?: Message[];
};

const STORE_PATH = process.env.NODE_ENV === "production"
  ? "/tmp/agentkey_messages.json"
  : path.join(process.cwd(), ".agentkey_messages.json");

function loadFromDisk(): Message[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to read inbox store from disk:", err);
  }
  return [];
}

function saveToDisk(messages: Message[]) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(messages, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write inbox store to disk:", err);
  }
}

export function getAllMessages(): Message[] {
  if (!globalForStore._agentKeyMessages) {
    globalForStore._agentKeyMessages = loadFromDisk();
  }
  return globalForStore._agentKeyMessages;
}

export function getMessagesForInbox(inboxId: string, limit = 50): Message[] {
  const all = getAllMessages();
  // Match by inbox_id or matching the primary agent
  const filtered = all.filter(
    (m) =>
      m.inbox_id === inboxId ||
      inboxId === "inbox_primary_agent" ||
      m.recipient.toLowerCase().includes(inboxId.toLowerCase())
  );
  return filtered.slice(0, limit);
}

export function storeMessage(message: Message): Message {
  const all = getAllMessages();
  // Prepend new message so newest is first
  all.unshift(message);
  globalForStore._agentKeyMessages = all;
  saveToDisk(all);
  return message;
}
