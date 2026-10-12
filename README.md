# AgentIdentity

API-first identity and communication for autonomous AI agents: a real email inbox in milliseconds,
plus WhatsApp and SMS, with deterministic parsing (OTPs, magic links, invoices), human-in-the-loop
approval for risky outbound messages, realtime push, and an MCP server.

## Run it locally (nothing to install besides Python)

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt pytest pytest-asyncio
cp .env.example .env
.venv/Scripts/python scripts/seed_demo.py
.venv/Scripts/python -m uvicorn app.main:app --reload
```

Local mode uses a SQLite file and an in-process Redis emulation, and logs outbound mail instead of
sending it. `seed_demo.py` prints a workspace API key once. Interactive API docs: http://localhost:8000/docs.
Tests: `.venv/Scripts/python -m pytest`.

## What is in the box

| Area | Where | Notes |
| --- | --- | --- |
| REST API | `app/api/v1/` | Inboxes, messages, threads, HITL, webhooks, API keys, admin |
| Edge parser | `app/services/edge_parser.py` | OTP, magic link, quote/signature stripping, PII masking, invoice fields, prompt-injection signals. Regex only, no LLM |
| Inbound | `POST /v1/inbound/ingest` | HMAC-signed; raw MIME from the Cloudflare Worker or parsed JSON |
| Outbound | `app/services/outbound.py` | Quota → guardrails → hold or send; SMTP (SES), Resend, console |
| Realtime | `WS /v1/ws/inboxes/{id}`, `GET /v1/inboxes/{id}/wait` | Redis pub/sub; long-poll for OTP / magic link |
| Webhooks | `app/services/webhook_dispatcher.py` | Durable outbox, `X-AgentIdentity-Signature: t=..,v1=..`, exponential backoff |
| MCP server | `mcp/server.py` | stdio, SSE, streamable HTTP |
| Python SDK | `sdk/python/` | `AgentIdentity` and `AsyncAgentIdentity` |
| Email Worker | `workers/cloudflare-email/` | Cloudflare catch-all → ingest endpoint |

### API keys and scopes

`POST /v1/admin/workspaces` (header `X-Admin-Secret`) creates a workspace and returns its root key
once. Workspaces start with `outbound_enabled=false`; flip it with
`PATCH /v1/admin/workspaces/{id}` after you have vetted the customer. Scoped keys
(`POST /v1/api-keys`) take any of `read`, `send`, `manage`, so an agent that only needs to read
OTPs can hold a key that cannot send.

### Human-in-the-loop

```bash
curl -X POST $BASE/v1/hitl/policies -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"trigger_keywords":["refund","contract","legal","wire transfer"],"target_channel":"SLACK","target_destination":"https://hooks.slack.com/services/..."}'
```

A matching send returns `202` with status `PENDING_APPROVAL`. Slack gets a signed, expiring review
link; the page shows the message and has Approve / Reject buttons. Opening the link changes
nothing; only the button press (a POST) does. `GET /v1/hitl/pending` lists the queue, and a
`manage` key can call `POST /v1/hitl/approve/{id}` or `/reject/{id}` directly. Triggers match whole
words; prefix an entry with `re:` for a regular expression.

### MCP

```json
{
  "mcpServers": {
    "agentidentity": {
      "command": "python",
      "args": ["C:/path/to/repo/mcp/server.py"],
      "env": { "AGENTIDENTITY_API_KEY": "ai_live_...", "AGENTIDENTITY_BASE_URL": "https://your-api-host" }
    }
  }
}
```

Tools: `create_agent_inbox`, `wait_for_otp`, `wait_for_magic_link`, `send_email`, `send_whatsapp`,
`list_messages`, `get_thread_history`. Inbound bodies are wrapped in `<untrusted_content>` and
flagged when they look like instructions aimed at the agent.

### SDK

```python
from agentidentity import AgentIdentity

client = AgentIdentity(api_key="ai_live_xxxx", base_url="https://your-api-host")
inbox = client.inboxes.create(username="lead-bot", client_id="session-001")
otp = client.inboxes.wait_for_otp(inbox_id=inbox.id, timeout=30)
client.messages.send(inbox_id=inbox.id, to="client@example.com", subject="Quote Follow-up", text="Here is your quote!")
```

## Going live

1. **Domain.** Buy it at GoDaddy, add it to Cloudflare, and change the nameservers at GoDaddy to the
   two Cloudflare gives you. Cloudflare Email Routing only works when Cloudflare runs the DNS. Use a
   subdomain such as `agents.yourdomain.com` for agent mail so your main domain's reputation is separate.
2. **API.** Push this repo to GitHub and create a Render Blueprint from `render.yaml`. Fill in
   `PUBLIC_BASE_URL`, `MAIL_DOMAIN`, `SHARED_DOMAINS` and the SMTP credentials. The app refuses to
   start in production with weak secrets, without real Redis, or with the console mail provider.
3. **Inbound mail.** Cloudflare → Email → Email Routing → enable, then in `workers/cloudflare-email`:
   `npx wrangler secret put INGEST_SECRET` (same value as the API), set `INGEST_URL` in
   `wrangler.toml`, `npx wrangler deploy`, and point the catch-all rule at the Worker.
4. **Outbound mail.** In AWS SES (ap-south-1) verify the domain (DKIM CNAMEs go into Cloudflare
   DNS), add SPF and a DMARC record, request production access, and create SMTP credentials.
5. **WhatsApp.** Set the four `WHATSAPP_*` variables and register `https://your-api-host/v1/inbound/whatsapp`
   as the webhook in the Meta app (subscribe to `messages`).
6. **SMS.** Register the entity and templates on a DLT portal, map them to MSG91 flows, then set
   `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `DLT_ENTITY_ID`. Indian routes only deliver registered
   templates, so the SMS API takes `template_id` plus variables, not free text.

## Known gaps

- Email, WhatsApp and SMS provider calls are written against the providers' documented APIs but have
  not been run against live accounts yet; locally they are mocked.
- Schema is created with `create_all`; there are no versioned migrations (add Alembic before the
  first schema change in production).
- Attachments are recorded as metadata (name, type, size); their content is not stored.
- Guardrails match keywords and regular expressions. There is no sentiment scoring.
- AWS SES inbound (SNS) is not wired; inbound goes through Cloudflare.
- Every inbox lives on `MAIL_DOMAIN`. Per-customer custom domains are not built.
- `audit_logs` is written but nothing prunes or exports it yet. The security controls here support
  CERT-In and DPDP obligations (audit trail, PII masking, erasure via `DELETE ...?purge=true`); they
  are not a compliance certification.
- No Docker files, by choice: deployment is Git → Render.
