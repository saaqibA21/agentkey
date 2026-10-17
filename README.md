# AgentIdentity

API-first identity and communication for autonomous AI agents: a real email inbox in milliseconds,
plus WhatsApp and SMS, with deterministic parsing (OTPs, magic links, invoices), human-in-the-loop
approval for risky outbound messages, realtime push, and an MCP server.

## Run it locally (Python and Node only)

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt pytest pytest-asyncio langchain-core
cp .env.example .env
.venv/Scripts/python -m uvicorn app.main:app --reload
```

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 and sign in with the development login (any email). Local mode uses a
SQLite file, an in-process Redis emulation, local-disk attachments and mock DKIM records, and logs
outbound mail instead of sending it. API docs: http://localhost:8000/docs. Tests:
`.venv/Scripts/python -m pytest`.

## What is in the box

| Area | Where | Notes |
| --- | --- | --- |
| REST API | `app/api/v1/` | Inboxes, messages, threads, attachments, domains, HITL, webhooks, API keys, admin |
| Edge parser | `app/services/edge_parser.py` | OTP, magic link, quote/signature stripping, PII masking, invoice fields, prompt-injection signals. Regex only, no LLM |
| Inbound | `POST /v1/inbound/ingest`, `/v1/inbound/ses` | Shared domain via the Cloudflare Worker; customer domains via Amazon SES + SNS |
| Outbound | `app/services/outbound.py` | Quota, guardrails, then hold or send; SMTP (SES), Resend, console |
| Attachments | `app/services/attachments.py` | Stored on S3/R2 (local disk in dev); PDF and text files are read so invoices inside them are extracted |
| Custom domains | `app/services/domains.py` | DNS records to publish, live verification, unlocks sending |
| Realtime | `WS /v1/ws/inboxes/{id}`, `GET /v1/inboxes/{id}/wait` | Redis pub/sub; long-poll for OTP / magic link |
| Webhooks | `app/services/webhook_dispatcher.py` | Durable outbox, `X-AgentIdentity-Signature: t=..,v1=..`, exponential backoff |
| Hosted MCP | `POST /mcp` (`app/mcp_hosted.py`) | Streamable HTTP, stateless, authenticated per request with the caller's API key |
| Local MCP | `mcp/server.py` | stdio, SSE, streamable HTTP |
| Python SDK | `sdk/python/` | `AgentIdentity`, `AsyncAgentIdentity`, and `agentidentity.tools` for LangChain, OpenAI Agents, LlamaIndex, CrewAI, and raw OpenAI/Claude tool calling |
| Dashboard | `web/` | Next.js: landing page, docs, sign-in, inboxes, keys, domains, approvals, webhooks |
| Email Worker | `workers/cloudflare-email/` | Cloudflare catch-all to the ingest endpoint |

### Create API (one agent, one click)

After signing in with Google, the dashboard's **API** page has a **Create API** button. The person
enters the agent name and the owner name; the owner email is filled in from their Google account
and cannot be changed. One click (`POST /v1/agents`, dashboard session only) then creates:

- a unique email address made from the agent name (`Sales Bot` becomes `sales-bot@<MAIL_DOMAIN>`,
  then `sales-bot-2@...` if taken; deleted addresses are never reused),
- an API key for that agent with `read` and `send` permissions, shown once,
- the agent record linking both to its owner (`GET /v1/agents`, `DELETE /v1/agents/{id}`).

Deleting an agent revokes its key and retires its address. Agent names that impersonate brands or
role accounts are refused, and agents count toward the plan's inbox limit.

### Self-serve accounts

People sign in to the dashboard with Google or GitHub. The dashboard's server exchanges the verified
email for a one-hour, workspace-scoped session token (`POST /v1/internal/sessions`, guarded by
`DASHBOARD_SECRET`); the first sign-in creates a free workspace (5 inboxes, 500 received per day).
Receiving works immediately. Sending is allowed when either you set `outbound_enabled` on the
workspace through the admin API, or the mail leaves from an inbox on a custom domain the workspace
has verified.

### Identity: letting an agent act as a person

Two ways for an agent to use its owner's existing accounts, both under `Identity` in the dashboard
and both usable only by API keys that carry the `connect` scope.

**Connected accounts (OAuth).** The owner clicks "Connect GitHub" (or Google) and approves on the
provider's own page. The token is stored encrypted. The agent calls
`POST /v1/connections/{id}/request` with a method and an API path, and the server makes the call
with the owner's token, so the agent never holds it. Connections start read-only; the owner can
switch on "Allow changes", and separately "Allow token export", which lets the agent fetch the
token itself for `git clone` / `git push` over HTTPS.

**Saved logins (vault).** For sites with no OAuth: username, password and optional 2FA setup key,
encrypted with `VAULT_KEY`. An agent that is driving a browser calls
`POST /v1/vault/items/{id}/login` with the URL it is about to sign in on. The login is released
only if that URL is on the site it was saved for (https, same host or a subdomain). In "ask" mode
(the default) the call returns 202 and the owner must press "Allow once" in the dashboard; the
agent then collects it once. In "auto" mode it is returned immediately. The response includes the
current 6-digit 2FA code, never the 2FA secret.

Only a signed-in person can add credentials, change these switches or approve a request; an API
key cannot, whatever its scopes. Every use is written to the audit log.

MCP tools: `list_identities`, `account_request`, `get_git_credentials`, `get_site_login`.

**Connecting from ChatGPT, Claude and other apps (no API key).** The hosted MCP endpoint is also an
OAuth 2.1 server (`app/api/oauth.py`): discovery at `/.well-known/oauth-protected-resource` and
`/.well-known/oauth-authorization-server`, dynamic client registration at `/oauth/register`,
PKCE-only authorization at `/oauth/authorize`, and rotating refresh tokens at `/oauth/token`. The
user adds `https://<api-host>/mcp` as a custom connector in the app; the app sends them to the
dashboard's approval screen (`/connect/authorize`), where they sign in and tick the permissions
(read, manage, send, connect). The app's token carries only those permissions and can never do
what requires a signed-in person. Apps are listed, and can be removed, under Identity. For this to
work the API and dashboard must be deployed on public HTTPS URLs with `PUBLIC_BASE_URL` and
`DASHBOARD_URL` set correctly.

What this does not do: it does not run a browser for the agent, and it does not solve CAPTCHAs or
get around a site's bot detection or new-device checks. The agent brings its own browser (Claude
in Chrome, a computer-use agent, Playwright); this supplies the identity.

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
      "url": "https://your-api-host/mcp",
      "headers": { "Authorization": "Bearer ai_live_..." }
    }
  }
}
```

That is the hosted endpoint; `python mcp/server.py` runs the same tools locally over stdio with
`AGENTIDENTITY_API_KEY` and `AGENTIDENTITY_BASE_URL` in the environment.

Tools: `create_agent_inbox`, `wait_for_otp`, `wait_for_magic_link`, `send_email`, `send_whatsapp`,
`list_messages`, `get_thread_history`, `read_attachment`. Inbound bodies are wrapped in `<untrusted_content>` and
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
   `PUBLIC_BASE_URL`, `DASHBOARD_URL`, `MAIL_DOMAIN`, `SHARED_DOMAINS`, the SMTP credentials, and the
   S3/R2 bucket. The app refuses to start in production with weak secrets, without real Redis, with
   the console mail provider, or with local-disk attachment storage.
3. **Dashboard.** Import the repo in Vercel with root directory `web`. Set `AUTH_SECRET`, the Google
   and GitHub OAuth credentials, `AIGENT_API_URL`, `NEXT_PUBLIC_API_URL`, and `AIGENT_DASHBOARD_SECRET`
   (copy the generated `DASHBOARD_SECRET` from Render). Leave `AIGENT_DEV_LOGIN` unset.
4. **Inbound mail, shared domain.** Cloudflare, Email Routing, enable; then in
   `workers/cloudflare-email`: `npx wrangler secret put INGEST_SECRET` (same value as the API), set
   `INGEST_URL` in `wrangler.toml`, `npx wrangler deploy`, and point the catch-all rule at the Worker.
5. **Outbound mail.** In AWS SES verify the shared domain (DKIM CNAMEs go into Cloudflare DNS), add
   SPF and DMARC, request production access, and create SMTP credentials.
6. **Customer domains.** In the same SES region: create an S3 bucket and an SNS topic, add a receipt
   rule (no recipient filter) with an S3 action that notifies the topic, and subscribe
   `https://your-api-host/v1/inbound/ses` to the topic over HTTPS. Set `SES_INBOUND_TOPIC_ARN`,
   `CUSTOM_DOMAIN_MX_HOST` (`inbound-smtp.<region>.amazonaws.com`) and `DOMAIN_PROVIDER=ses`. SES
   receiving exists only in some regions; pick one that has it.
7. **WhatsApp.** Set the four `WHATSAPP_*` variables and register `https://your-api-host/v1/inbound/whatsapp`
   as the webhook in the Meta app (subscribe to `messages`).
8. **SMS.** Register the entity and templates on a DLT portal, map them to MSG91 flows, then set
   `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `DLT_ENTITY_ID`. Indian routes only deliver registered
   templates, so the SMS API takes `template_id` plus variables, not free text.
9. **SDK.** Publish `sdk/python` to PyPI (the docs page tells people to `pip install agentidentity`),
   or set `NEXT_PUBLIC_SDK_INSTALL` in Vercel to the install command you want shown.

## Known gaps

- No provider has been exercised with live credentials yet: Cloudflare, SES (SMTP, identities,
  receiving via SNS), S3/R2, Meta, MSG91, Slack, and Google/GitHub sign-in are written against their
  documented APIs and mocked or bypassed locally.
- Schema is created with `create_all`; there are no versioned migrations (add Alembic before the
  first schema change in production).
- The sign-in-and-approve flow for ChatGPT/Claude is tested with a stand-in app locally. It has not
  been connected from the real ChatGPT or Claude apps, which requires a public deployment first.
- Identity: the GitHub/Google connect flow is tested against a faked provider, not the real ones.
  A password released from the vault enters the agent's context, so a compromised or tricked agent
  could misuse it on the right site; prefer connected accounts, and keep vault items on "ask".
  Disconnecting removes the token here but does not revoke it at the provider.
- Billing is not built; the free plan's limits are the only plan.
- One user per workspace. No team seats or roles yet.
- Verified domains are re-checked only when someone presses "Check DNS now", not on a schedule.
- The LangChain adapter and the raw OpenAI/Claude tool formats are tested; the OpenAI Agents,
  LlamaIndex and CrewAI adapters are written to those libraries' interfaces but untested here.
- Guardrails match keywords and regular expressions. There is no sentiment scoring.
- `audit_logs` is written but nothing prunes or exports it yet. The security controls here support
  CERT-In and DPDP obligations (audit trail, PII masking, erasure via `DELETE ...?purge=true`); they
  are not a compliance certification.
- No Docker files, by choice: deployment is Git to Render and Vercel.
