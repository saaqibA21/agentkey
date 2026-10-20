// Copy-paste snippets shared by the docs and the dashboard quickstart.
const KEY = "ai_live_YOUR_KEY";

export const sdkInstall = process.env.NEXT_PUBLIC_SDK_INSTALL ?? "pip install agentkey";
export const nodeInstall = "npm install agentkey";

export function snippets(apiUrl: string) {
  return {
    claudeCode: `claude mcp add --transport http agentkey ${apiUrl}/mcp \\
  --header "Authorization: Bearer ${KEY}"`,

    mcpJson: `{
  "mcpServers": {
    "agentkey": {
      "url": "${apiUrl}/mcp",
      "headers": { "Authorization": "Bearer ${KEY}" }
    }
  }
}`,

    python: `from agentkey import AgentKey

client = AgentKey(api_key="${KEY}", base_url="${apiUrl}")

# 1. Create a dedicated task inbox
inbox = client.inboxes.create(client_id="signup-task-42")
print("Agent Email:", inbox.email_address)

# ... your agent submits that address on any signup/auth form ...

# 2. Wait up to 60s for edge-extracted verification code
otp = client.inboxes.wait_for_otp(inbox.id, timeout=60)
print("Extracted 2FA Code:", otp)`,

    nodeQuickstart: `import { AgentKey } from "agentkey";

const client = new AgentKey({
  apiKey: "${KEY}",
  baseUrl: "${apiUrl}",
});

// 1. Create an inbox for your agent
const inbox = await client.inboxes.create({ clientId: "auth-worker-1" });
console.log("Agent Address:", inbox.emailAddress);

// 2. Await edge-extracted verification code
const otp = await client.inboxes.waitForOtp(inbox.id, { timeout: 60 });
console.log("Received OTP:", otp);`,

    curl: `# 1. Create an inbox
curl -X POST ${apiUrl}/v1/inboxes \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"client_id": "signup-task-42"}'

# 2. Wait up to 60s for edge-extracted OTP code
curl "${apiUrl}/v1/inboxes/INBOX_ID/wait?for=otp&timeout=60" \\
  -H "Authorization: Bearer ${KEY}"`,

    passportVerify: `// Third-Party Website: Verify Autonomous Agent Passport
import express from "express";

const app = express();
app.use(express.json());

app.post("/api/agent-action", async (req, res) => {
  const passportToken = req.headers["x-agentkey-passport"];
  if (!passportToken) return res.status(401).json({ error: "Missing agent passport" });

  // Cryptographic attestation verification
  const verifyRes = await fetch("${apiUrl}/v1/auth/agent/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passport: passportToken }),
  });

  const { verified, agent, owner, trust_score } = await verifyRes.json();
  if (!verified) return res.status(403).json({ error: "Invalid or revoked agent passport" });

  console.log(\`Verified Agent \${agent.name} (Operator: \${owner.email}, Trust: \${trust_score})\`);
  return res.json({ success: true, operator: owner.email });
});`,

    nextAuth: `// NextAuth.js / Auth.js OpenID Connect Provider
export const authOptions = {
  providers: [
    {
      id: "agentkey",
      name: "AgentKey Agent ID",
      type: "oauth",
      wellKnown: "${apiUrl}/.well-known/openid-configuration",
      authorization: { params: { scope: "openid profile email agent:verify" } },
      clientId: process.env.AGENTKEY_CLIENT_ID,
      clientSecret: "none", // Public OAuth 2.1 client with PKCE S256
      idToken: false,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Verifiable Claims
          isAgent: profile.is_agent,         // true
          operatorName: profile.operator_name,
          operatorEmail: profile.operator_email,
          trustScore: profile.trust_score,   // 99.0
        };
      },
    },
  ],
};`,

    anthropic: `import anthropic
from agentkey import AgentKey, tools

agentkey = AgentKey(api_key="${KEY}", base_url="${apiUrl}")
claude = anthropic.Anthropic()
messages = [{"role": "user", "content": "Create an inbox and tell me its address."}]

while True:
    reply = claude.messages.create(
        model="claude-sonnet-5-5", max_tokens=1024,
        tools=tools.anthropic_tools(), messages=messages,
    )
    if reply.stop_reason != "tool_use":
        break
    messages.append({"role": "assistant", "content": reply.content})
    messages.append({"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": block.id,
         "content": tools.call_tool(agentkey, block.name, block.input)}
        for block in reply.content if block.type == "tool_use"
    ]})`,

    langchain: `from agentkey import AgentKey, tools

agentkey = AgentKey(api_key="${KEY}", base_url="${apiUrl}")

# LangChain / LangGraph Agent Integration
agent_tools = tools.langchain_tools(agentkey)

# Other popular frameworks:
# tools.openai_agents_tools(agentkey)    # OpenAI Agents SDK
# tools.crewai_tools(agentkey)           # CrewAI Agents
# tools.llamaindex_tools(agentkey)       # LlamaIndex Function Calling
# tools.openai_tools() + call_tool(...)  # Raw OpenAI function schemas`,

    browserSession: `# Export domain-pinned Playwright storage state for headless login
curl -H "Authorization: Bearer ${KEY}" \\
  "${apiUrl}/v1/vault/items/ITEM_ID/export-browser-state" \\
  -o storage_state.json

# Use with Playwright Python:
# browser = playwright.chromium.launch()
# context = browser.new_context(storage_state="storage_state.json")
# page = context.new_page()
# page.goto("https://target-service.com/dashboard")  # Already signed in!`,

    webhook: `from agentidentity import verify_webhook_signature

# In your webhook HTTP handler (FastAPI / Flask / Django):
ok = verify_webhook_signature(
    secret="whsec_...",
    body=raw_body,
    signature_header=headers["X-AgentIdentity-Signature"],
)
if not ok:
    return "Invalid signature", 401`,

    websocket: `import asyncio, json, websockets

async def main():
    url = "${apiUrl.replace(/^http/, "ws")}/v1/ws/inboxes/INBOX_ID"
    async with websockets.connect(url, additional_headers={"Authorization": "Bearer ${KEY}"}) as ws:
        async for frame in ws:
            event = json.loads(frame)
            print("Real-time event:", event["type"])
            print("Extracted data:", event.get("message", {}).get("extracted_data"))

asyncio.run(main())`,
  };
}
