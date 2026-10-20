// Copy-paste snippets shared by the docs and the dashboard quickstart.
const KEY = "ai_live_YOUR_KEY";

export const sdkInstall = process.env.NEXT_PUBLIC_SDK_INSTALL ?? "pip install agentkey";

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

# One inbox per task. The same client_id always returns the same inbox.
inbox = client.inboxes.create(client_id="signup-task-42")
print(inbox.email_address)

# ...your agent submits that address on a signup form...

otp = client.inboxes.wait_for_otp(inbox.id, timeout=60)
print("Code:", otp)`,

    curl: `# Create an inbox
curl -X POST ${apiUrl}/v1/inboxes \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"client_id": "signup-task-42"}'

# Wait up to 60s for a one-time code
curl "${apiUrl}/v1/inboxes/INBOX_ID/wait?for=otp&timeout=60" \\
  -H "Authorization: Bearer ${KEY}"`,

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

agent_tools = tools.langchain_tools(agentkey)        # LangChain / LangGraph
# tools.openai_agents_tools(agentkey)                # OpenAI Agents SDK
# tools.llamaindex_tools(agentkey)                   # LlamaIndex
# tools.crewai_tools(agentkey)                       # CrewAI
# tools.openai_tools() + tools.call_tool(...)      # raw OpenAI-style function calling`,

    webhook: `from agentidentity import verify_webhook_signature

# In your HTTP handler, with the raw request body:
ok = verify_webhook_signature(
    secret="whsec_...",
    body=raw_body,
    signature_header=headers["X-AgentIdentity-Signature"],
)`,

    websocket: `import asyncio, json, websockets

async def main():
    url = "${apiUrl.replace(/^http/, "ws")}/v1/ws/inboxes/INBOX_ID"
    async with websockets.connect(url, additional_headers={"Authorization": "Bearer ${KEY}"}) as ws:
        async for frame in ws:
            event = json.loads(frame)
            print(event["type"], event.get("message", {}).get("extracted_data"))

asyncio.run(main())`,
  };
}
