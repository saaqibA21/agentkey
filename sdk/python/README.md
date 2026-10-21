# AgentKey Python SDK (`agentkey-sdk`)

[![PyPI version](https://img.shields.io/pypi/v/agentkey-sdk.svg)](https://pypi.org/project/agentkey-sdk/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official Python SDK for **[AgentKey](https://www.agentkey.in)** — The Identity & Communication OS for Autonomous AI Agents.

Give your AI agents their own dedicated email addresses, zero-token OTP verification code extraction, verifiable cryptographic passports, and outbound messaging.

---

## 📦 Installation

```bash
pip install agentkey-sdk
```

---

## 🚀 Quickstart

```python
from agentkey import AgentKey

# Initialize with your API key from https://www.agentkey.in/dashboard/keys
client = AgentKey(
    api_key="ai_live_YOUR_KEY",
    base_url="https://www.agentkey.in"
)

# 1. Create a dedicated task email inbox for your agent
inbox = client.inboxes.create(client_id="signup-task-42")
print("Agent Address:", inbox.email_address)
# Output: signup-task-42@agentkey.in

# 2. Wait for incoming verification codes (zero-token extraction)
# Blocks until a 4-8 digit OTP code arrives (204 on timeout)
otp = client.inboxes.wait_for_otp(inbox.id, timeout=60)
print("Extracted 2FA Code:", otp)

# 3. Send an outbound email from the agent
client.messages.send(
    inbox_id=inbox.id,
    to="recipient@example.com",
    subject="Task Complete",
    text="Your autonomous agent has completed the task."
)
```

---

## ⚡ Zero-Token Edge Extraction

Standard LLM setups waste thousands of context tokens parsing long HTML emails just to find a 4-digit login PIN. AgentKey executes deterministic extraction at the wire edge before messages hit storage:

```python
# Wait for sign-in or magic links:
magic_link = client.inboxes.wait_for_magic_link(inbox.id, timeout=30)
print("Magic Link:", magic_link)

# List recent messages:
messages = client.messages.list(inbox_id=inbox.id)
for msg in messages:
    print(msg.sender, msg.subject, msg.extracted_data)
```

---

## 🤖 Framework Integrations

Native tool adapters are included for leading agent frameworks:

### LangChain / LangGraph
```python
from agentkey import AgentKey, tools

client = AgentKey(api_key="ai_live_YOUR_KEY", base_url="https://www.agentkey.in")
agent_tools = tools.langchain_tools(client)
```

### Anthropic Claude API
```python
from agentkey import AgentKey, tools
import anthropic

client = AgentKey(api_key="ai_live_YOUR_KEY", base_url="https://www.agentkey.in")
claude = anthropic.Anthropic()

reply = claude.messages.create(
    model="claude-3-7-sonnet-20250219",
    max_tokens=1024,
    tools=tools.anthropic_tools(),
    messages=[{"role": "user", "content": "Create an inbox and check for codes."}],
)
```

---

## 🛡️ Model Context Protocol (MCP) Server

AgentKey provides a hosted zero-installation MCP server for Claude Code and Cursor:

```bash
claude mcp add --transport http agentkey https://www.agentkey.in/mcp \
  --header "Authorization: Bearer ai_live_YOUR_KEY"
```

---

## 📚 Documentation & Dashboard

- **Platform Dashboard:** [https://www.agentkey.in/dashboard](https://www.agentkey.in/dashboard)
- **API Documentation:** [https://www.agentkey.in/docs](https://www.agentkey.in/docs)
- **OAuth & OIDC Discovery:** [https://www.agentkey.in/.well-known/openid-configuration](https://www.agentkey.in/.well-known/openid-configuration)

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
