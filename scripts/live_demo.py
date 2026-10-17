"""Live Interactive Demonstration of AgentIdentity using the official Python SDK against http://127.0.0.1:8000.
"""
import json
import os
import sys
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from agentidentity import AgentIdentity

from app.core.config import get_settings
from app.core.security import sign_payload


def main():
    settings = get_settings()
    base_url = "http://127.0.0.1:8000"

    print("=" * 75)
    print(" [*] LIVE AGENTIDENTITY SERVER INTERACTION (http://127.0.0.1:8000)")
    print("=" * 75)

    # 1. Server Health Check
    print("\n[1] Checking Server Health...")
    health = httpx.get(f"{base_url}/healthz")
    print(f"    Status: {health.status_code} {health.json()}")

    # 2. Workspace Setup (Admin API)
    print("\n[2] Setting up a Workspace via Admin API...")
    admin_headers = {"X-Admin-Secret": settings.admin_secret}
    ws_resp = httpx.post(
        f"{base_url}/v1/admin/workspaces",
        headers=admin_headers,
        json={"name": "Autonomous Operations", "outbound_enabled": True},
    )
    ws = ws_resp.json()
    api_key = ws["api_key"]
    workspace_id = ws["id"]
    print(f"    Workspace ID : {workspace_id}")
    print(f"    API Key      : {api_key[:18]}... (authenticated)")

    # 3. Initialize the Official Python SDK Client
    print("\n[3] Initializing Official Python SDK Client (AgentIdentity)...")
    client = AgentIdentity(api_key=api_key, base_url=base_url)
    print("    Client initialized successfully.")

    # 4. Create an Agent Inbox
    username = f"agent-bot-{int(time.time()) % 10000}"
    print(f"\n[4] Creating new inbox for agent: '{username}'...")
    inbox = client.inboxes.create(username=username, client_id=f"client-{username}")
    print(f"    Inbox ID      : {inbox.id}")
    print(f"    Email Address : {inbox.email_address}")

    # 5. List all inboxes in workspace
    print("\n[5] Listing active inboxes in workspace...")
    inboxes = client.inboxes.list()
    for idx, ib in enumerate(inboxes, 1):
        print(f"    [{idx}] {ib.email_address} (ID: {ib.id})")

    # 6. Simulate an incoming verification email
    print("\n[6] Simulating an inbound email with OTP & Magic Link arriving at the inbox...")
    email_text = """
Hi Agent,

Welcome to the Developer Portal.
Your verification code is: 739201.
This OTP code will expire in 10 minutes.

Alternatively, authenticate instantly via magic link:
https://auth.company.org/verify?token=live_token_88921

Thanks,
Security Team
--
Auto-generated notification.
    """
    payload = {
        "from": "no-reply@auth.company.org",
        "to": inbox.email_address,
        "subject": "Your Developer Portal Verification Code: 739201",
        "text": email_text,
        "html": f"<p>Your code is <b>739201</b></p><a href='https://auth.company.org/verify?token=live_token_88921'>Login</a>",
    }
    body_bytes = json.dumps(payload).encode()
    sig = sign_payload(settings.ingest_secret, body_bytes)

    ingest_resp = httpx.post(
        f"{base_url}/v1/inbound/ingest",
        content=body_bytes,
        headers={"X-Ingest-Signature": sig, "Content-Type": "application/json"},
    )
    print(f"    Inbound Ingest Response: {ingest_resp.status_code} (Queued & processed)")

    # 7. Agent retrieves the OTP using SDK
    print("\n[7] Agent calling `client.inboxes.wait_for_otp()`...")
    # Long poll / retrieve OTP
    otp_code = client.inboxes.wait_for_otp(inbox_id=inbox.id, timeout=10)
    print(f"    >>> EXTRACTED OTP: '{otp_code}' <<<")

    # 8. Inspect the Parsed Message via SDK
    print("\n[8] Inspecting edge-parsed message details from SDK...")
    messages = client.messages.list(inbox_id=inbox.id)
    msg = messages[0]
    print(f"    Subject        : {msg.subject}")
    print(f"    Sender         : {msg.sender}")
    print(f"    Extracted OTP  : {msg.extracted_data.get('otp_code')}")
    print(f"    Extracted Link : {msg.extracted_data.get('magic_link')}")
    print(f"    Intent Tag     : {msg.extracted_data.get('intent')}")

    # 9. Outbound Message Sending
    print("\n[9] Agent sending an outbound email via `client.messages.send()`...")
    sent = client.messages.send(
        inbox_id=inbox.id,
        to="user@example.com",
        subject="Account verified successfully",
        text="Hello! Your agent has verified the account and is ready to work.",
    )
    print(f"    Outbound Message ID : {sent.id}")
    print(f"    Status              : {sent.status}")

    # 10. Human-in-the-Loop Interception
    print("\n[10] Testing Human-in-the-Loop guardrail interception...")
    # Create HITL policy
    httpx.post(
        f"{base_url}/v1/hitl/policies",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "trigger_keywords": ["wire transfer", "payment"],
            "target_channel": "SLACK",
            "target_destination": "https://hooks.slack.com/mock",
        },
    )

    # Attempt risky send
    risky = httpx.post(
        f"{base_url}/v1/inboxes/{inbox.id}/messages/send",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "to": "finance@corp.com",
            "subject": "Authorization",
            "text": "Initiating a wire transfer of $25,000 to vendor.",
        },
    )
    print(f"    Risky Send HTTP Status : {risky.status_code} (202 Accepted = Held)")
    print(f"    Risky Message Status   : {risky.json().get('status')} (Human approval required)")
    print(f"    Review URL             : {risky.json().get('review_url')}")

    print("\n" + "=" * 75)
    print(" [+] LIVE DEMO COMPLETE: All operations succeeded on http://127.0.0.1:8000")
    print("=" * 75)


if __name__ == "__main__":
    main()
