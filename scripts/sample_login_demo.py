"""Sample demonstrating the two primary login processes in AgentIdentity:

1. Vault 2FA Login:
   An agent automating a browser logs into an external portal with username,
   password, and a live-generated 6-digit TOTP 2FA code (without revealing the secret).

2. Email OTP Verification Login:
   An agent signs in using email-based one-time password (OTP) verification.
"""
import asyncio
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
    print(" [*] AGENTIDENTITY: AGENT LOGIN WORKFLOW DEMONSTRATION")
    print("=" * 75)

    # =========================================================================
    # WORKFLOW 1: VAULT LOGIN (Browser/RPA Login with Live 2FA TOTP)
    # =========================================================================
    print("\n" + "-" * 75)
    print(" WORKFLOW 1: BROWSER LOGIN WITH IDENTITY VAULT & 2FA TOTP")
    print("-" * 75)
    print("Scenario: An agent driving a browser (Playwright/Claude) needs to log into")
    print("          'https://console.cloudvendor.com/login' which requires 2FA.")

    # 1. Owner signs in via Dashboard to get a user session token
    # (By design, only a human user can store credentials into the vault)
    owner_email = f"owner-{int(time.time()) % 10000}@company.com"
    session_resp = httpx.post(
        f"{base_url}/v1/internal/sessions",
        headers={"X-Dashboard-Secret": settings.dashboard_secret},
        json={"email": owner_email, "name": "DevOps Lead", "provider": "dev"},
    )
    user_session = session_resp.json()
    user_token = user_session["token"]
    user_auth = {"Authorization": f"Bearer {user_token}"}
    print(f"\n[Step 1] Owner authenticated via Dashboard Session ({owner_email})")

    # 2. Owner securely stores credentials in Vault
    totp_seed = "JBSWY3DPEHPK3PXP"  # Standard RFC 6238 Base32 Secret
    vault_item_resp = httpx.post(
        f"{base_url}/v1/vault/items",
        headers=user_auth,
        json={
            "name": "Cloud Console Production",
            "site_url": "https://console.cloudvendor.com",
            "username": "ops_agent_prod",
            "password": "SuperSecurePassword987!",
            "totp_secret": totp_seed,
            "approval": "auto",
        },
    )
    vault_item = vault_item_resp.json()
    item_id = vault_item["id"]
    print(f"[Step 2] Owner stored credentials into Vault:")
    print(f"         Site Host    : {vault_item['site_host']}")
    print(f"         Username     : {vault_item['username']}")
    print(f"         2FA Enabled  : {vault_item['has_totp']}")
    print(f"         Release Mode : {vault_item['approval']}")

    # 3. Create a scoped API key for the Autonomous Agent (with 'connect', 'manage', 'read' scopes)
    agent_key_resp = httpx.post(
        f"{base_url}/v1/api-keys",
        headers=user_auth,
        json={"name": "browser-automation-bot", "scopes": ["read", "connect", "manage"]},
    )
    agent_key = agent_key_resp.json()["api_key"]
    agent_auth = {"Authorization": f"Bearer {agent_key}"}
    print(f"[Step 3] Issued Scoped API Key to Agent: {agent_key[:16]}... (scopes: read, connect, manage)")

    # 4. Agent navigates to login page and calls POST /v1/vault/items/{item_id}/login
    target_url = "https://console.cloudvendor.com/login"
    print(f"\n[Step 4] Agent navigates browser to: {target_url}")
    print(f"         Agent requests site login from AgentIdentity Vault...")

    login_release_resp = httpx.post(
        f"{base_url}/v1/vault/items/{item_id}/login",
        headers=agent_auth,
        json={"url": target_url},
    )
    creds = login_release_resp.json()

    print(f"\n[Step 5] Credentials released safely to Agent:")
    print(f"         Username : {creds['username']}")
    print(f"         Password : {creds['password']}")
    print(f"         2FA Code : >>> {creds['totp_code']} <<< (Live 6-digit TOTP code)")
    print(f"         Security : The agent NEVER received the raw 2FA secret key!")

    # 5. Phishing / Domain Spoofing Protection
    print("\n[Step 6] Phishing / Host Spoofing Protection Test:")
    phishing_url = "https://fake-cloudvendor.com/login"
    bad_req = httpx.post(
        f"{base_url}/v1/vault/items/{item_id}/login",
        headers=agent_auth,
        json={"url": phishing_url},
    )
    print(f"         Agent visits: {phishing_url}")
    print(f"         Server Check: {bad_req.status_code} {bad_req.json().get('title')}")
    print(f"         Detail      : {bad_req.json().get('detail')}")
    print(f"         Result      : Blocked! Credentials are strictly locked to the target host.")

    # =========================================================================
    # WORKFLOW 2: EMAIL OTP VERIFICATION LOGIN
    # =========================================================================
    print("\n" + "-" * 75)
    print(" WORKFLOW 2: EMAIL OTP VERIFICATION LOGIN")
    print("-" * 75)
    print("Scenario: An agent signs up or logs into an external service that emails a code.")

    # 1. Create agent inbox using SDK
    client = AgentIdentity(api_key=agent_key, base_url=base_url)
    username = f"signup-bot-{int(time.time()) % 10000}"
    inbox = client.inboxes.create(username=username)
    print(f"\n[Step 1] Agent generates its inbox: {inbox.email_address}")

    # 2. Simulate target service emailing an OTP code to the agent
    print(f"[Step 2] Agent submits '{inbox.email_address}' on target login page.")
    print("         Service dispatches verification email...")

    simulated_email = {
        "from": "no-reply@authservice.io",
        "to": inbox.email_address,
        "subject": "Your verification code: 618492",
        "text": "Hello! Your one-time login passcode is 618492. It expires in 5 minutes.",
    }
    body_bytes = json.dumps(simulated_email).encode()
    sig = sign_payload(settings.ingest_secret, body_bytes)
    httpx.post(
        f"{base_url}/v1/inbound/ingest",
        content=body_bytes,
        headers={"X-Ingest-Signature": sig, "Content-Type": "application/json"},
    )

    # 3. Agent waits for and receives the OTP
    print(f"[Step 3] Agent calls `client.inboxes.wait_for_otp()`...")
    start_time = time.time()
    otp = client.inboxes.wait_for_otp(inbox_id=inbox.id, timeout=10)
    elapsed = round(time.time() - start_time, 2)

    print(f"         Received OTP : >>> {otp} <<< (Retrieved in {elapsed}s)")
    print(f"[Step 4] Agent enters '{otp}' into the login form and completes authentication!")

    print("\n" + "=" * 75)
    print(" [+] ALL LOGIN WORKFLOWS COMPLETED SUCCESSFULLY")
    print("=" * 75)


if __name__ == "__main__":
    main()
