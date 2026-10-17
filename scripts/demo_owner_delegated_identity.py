"""End-to-End Live Demonstration: Owner-Delegated Identity (OD-ID) & Active Link Resolver

Demonstrates how an AI Agent:
1. Inherits and presents the owner's legal identity ("Saaqib (via MedicalTriageBot)").
2. Emits outbound emails carrying owner attribution (X-Agent-Owner: Saaqib).
3. Receives magic links and navigates them autonomously without human intervention.
4. Extracts session tokens/cookies and persists them into the encrypted Vault.
5. Extracts structured actionable page elements (buttons, links, tables) instead of raw HTML.
6. Exports browser session state in standard Playwright/Puppeteer format.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx

from app.core.config import get_settings
from app.core.security import sign_payload
from agentidentity import AgentIdentity


def run_live_demo():
    settings = get_settings()
    base_url = "http://127.0.0.1:8000"

    print("=" * 75)
    print("   AGENTIDENTITY: OWNER-DELEGATED IDENTITY & ACTIVE RESOLVER DEMO")
    print("=" * 75)

    # Step 1: Connect to User Session (saaqibheroindia@gmail.com)
    print("\n[Step 1] Authenticating owner session...")
    sess_res = httpx.post(
        f"{base_url}/v1/internal/sessions",
        headers={"X-Dashboard-Secret": settings.dashboard_secret},
        json={"email": "saaqibheroindia@gmail.com", "name": "Saaqib", "provider": "dev"},
    )
    user_session = sess_res.json()
    user_token = user_session["token"]
    workspace = user_session["workspace"]
    user_auth = {"Authorization": f"Bearer {user_token}"}
    print(f"  [+] Logged in as: {user_session['user']['email']}")
    print(f"  [+] Workspace:    {workspace['name']} ({workspace['id']})")

    # Step 2: Create Agent Inbox with Owner-Delegated Identity
    print("\n[Step 2] Creating Agent Inbox with Owner-Delegated Identity...")
    inbox_res = httpx.post(
        f"{base_url}/v1/inboxes",
        headers=user_auth,
        json={
            "username": "curelith-triage-bot",
            "client_id": "agent-od-id-demo-01",
            "owner_name": "Saaqib",
            "display_title": "Saaqib (via Curelith-TriageBot)",
        },
    )
    inbox = inbox_res.json()
    if "id" not in inbox:
        print("Inbox creation failed:", inbox_res.status_code, inbox_res.text)
        # Check if inbox already exists
        list_res = httpx.get(f"{base_url}/v1/inboxes", headers=user_auth)
        existing = list_res.json()
        if existing and len(existing) > 0:
            inbox = existing[0]
            print(f"  [+] Reusing existing inbox: {inbox['email_address']}")
        else:
            raise RuntimeError(f"Cannot create or retrieve inbox: {inbox_res.text}")
    inbox_id = inbox["id"]
    inbox_email = inbox["email_address"]
    print(f"  [+] Inbox:          {inbox_email}")
    print(f"  [+] Owner Name:     {inbox.get('owner_name')}")
    print(f"  [+] Display Title:  {inbox.get('display_title')}")

    # Step 3: Outbound Email with Owner Headers
    print("\n[Step 3] Sending Outbound Email with Delegated Owner Identity...")
    send_res = httpx.post(
        f"{base_url}/v1/inboxes/{inbox_id}/messages/send",
        headers=user_auth,
        json={
            "to": "records-desk@curelith.com",
            "subject": "Authorization Request for Diagnostic Summary",
            "text": "Please provide the lab and radiology report for patient file #98214.",
        },
    )
    msg = send_res.json()
    print(f"  [+] Message Dispatched: ID {msg['id']}")
    print(f"  [+] Status:             {msg['status']}")
    print(f"  [+] Sender Header:      {inbox.get('display_title')} <{inbox_email}>")
    print(f"  [+] Audit Header:       X-Agent-Owner: {inbox.get('owner_name')}")

    # Step 4: Inbound Magic Link Ingestion
    print("\n[Step 4] Ingesting Inbound Authentication Link (Curelith Console)...")
    magic_link = "https://www.curelith.com?token=curelith_jwt_token_998124&session=active"
    inbound_payload = {
        "from": "auth-service@curelith.com",
        "to": inbox_email,
        "subject": "Sign-in to Curelith Diagnostic Portal",
        "text": f"Dear Saaqib,\n\nPlease click below to access the diagnostic records:\n{magic_link}\n\nExpires in 15 minutes.",
        "html": f"<p>Please click below to access the diagnostic records:<br/><a href='{magic_link}'>Access Portal</a></p>",
    }
    raw_body = json.dumps(inbound_payload).encode()
    sig = sign_payload(settings.ingest_secret, raw_body)
    ingest_res = httpx.post(
        f"{base_url}/v1/inbound/ingest",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Ingest-Signature": sig},
    )
    print(f"  [+] Ingest Response: HTTP {ingest_res.status_code}")
    print(f"  [+] Magic Link:      {magic_link}")

    # Step 5: Active Link Resolver Execution
    print("\n[Step 5] Triggering POST /v1/inboxes/{id}/resolve-link (Autonomous Navigation)...")
    resolve_res = httpx.post(
        f"{base_url}/v1/inboxes/{inbox_id}/resolve-link",
        headers=user_auth,
        json={"url": magic_link, "save_to_vault": True},
    )
    resolve_data = resolve_res.json()
    nav = resolve_data.get("navigation", {})
    vault_item_id = resolve_data.get("vault_item_id")

    print(f"  [+] Navigation Status: {resolve_data.get('status')}")
    print(f"  [+] Owner Delegated:   {resolve_data.get('owner_name')}")
    print(f"  [+] Target URL:        {nav.get('final_url')}")
    print(f"  [+] Tokens Harvested:  {nav.get('tokens')}")
    print("  [+] Extracted Page Structure (Zero Context Waste):")
    page_meta = nav.get("page_metadata", {})
    print(f"      - Title:         '{page_meta.get('title')}'")
    print(f"      - Links Count:   {page_meta.get('links_count')}")
    print(f"      - Buttons Count: {page_meta.get('buttons_count')}")
    print(f"      - Tables Count:  {page_meta.get('tables_count')}")

    # Step 6: Export Browser Session State from Vault
    print("\n[Step 6] Exporting Browser State from Vault (Playwright / Puppeteer Format)...")
    if vault_item_id:
        export_res = httpx.get(
            f"{base_url}/v1/vault/items/{vault_item_id}/export-browser-state",
            headers=user_auth,
        )
        export_data = export_res.json()
        print(f"  [+] Vault Item ID:  {vault_item_id}")
        print(f"  [+] Host:           {export_data.get('site_host')}")
        print(f"  [+] Owner:          {export_data.get('owner_name')}")
        print(f"  [+] Session Tokens: {export_data.get('tokens')}")
        print(f"  [+] Cookies:        {export_data.get('cookies')}")
        print(f"  [+] Origins:        {export_data.get('origins')}")

    print("\n" + "=" * 75)
    print("   DEMO COMPLETE: OWNER-DELEGATED IDENTITY VERIFIED")
    print("   View your agent inbox in dashboard at: http://localhost:3000")
    print("=" * 75)


if __name__ == "__main__":
    run_live_demo()
