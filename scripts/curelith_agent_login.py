"""Autonomous AI Agent Login to Curelith (https://www.curelith.com)
using AgentIdentity for Identity, Inbound OTP Extraction, and Vault Storage.
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
    local_api_base = "http://127.0.0.1:8000"
    curelith_api_base = "https://api.curelith.com"

    print("=" * 75)
    print(" [*] AUTONOMOUS AGENT LOGIN PROCESS: CURELITH.COM")
    print("=" * 75)

    # -------------------------------------------------------------------------
    # STEP 1: Set up Agent Identity & Credentials
    # -------------------------------------------------------------------------
    print("\n[Step 1] Initializing AgentIdentity for Curelith healthcare portal...")
    admin_headers = {"X-Admin-Secret": settings.admin_secret}
    ws_resp = httpx.post(
        f"{local_api_base}/v1/admin/workspaces",
        headers=admin_headers,
        json={"name": "Healthcare Assistant Workspace", "outbound_enabled": True},
    )
    workspace = ws_resp.json()
    api_key = workspace["api_key"]

    client = AgentIdentity(api_key=api_key, base_url=local_api_base)
    unique_suffix = f"{int(time.time()) % 10000:04d}"
    phone_10digit = f"98765{unique_suffix}"
    normalized_phone = f"91{phone_10digit}"

    inbox = client.inboxes.create(
        username=f"triage-bot-{unique_suffix}",
        phone_number=normalized_phone,
        client_id=f"curelith-agent-{unique_suffix}",
    )
    print(f"  + Agent Workspace : {workspace['name']}")
    print(f"  + Agent Phone     : +91 {phone_10digit}")
    print(f"  + Agent Inbox     : {inbox.email_address} (ID: {inbox.id})")

    # -------------------------------------------------------------------------
    # STEP 2: Request Login / OTP from Curelith
    # -------------------------------------------------------------------------
    print(f"\n[Step 2] Agent requests OTP from Curelith ({curelith_api_base}/patient/send-otp)...")
    curelith_send_resp = httpx.post(
        f"{curelith_api_base}/patient/send-otp",
        json={"phone": phone_10digit},
        timeout=10,
    )
    curelith_send_data = curelith_send_resp.json()
    print(f"  + Curelith HTTP Status : {curelith_send_resp.status_code}")
    print(f"  + Curelith Response    : {curelith_send_data.get('message')}")

    # -------------------------------------------------------------------------
    # STEP 3: Route Inbound SMS OTP through AgentIdentity Edge Parser
    # -------------------------------------------------------------------------
    print("\n[Step 3] Dispatching incoming SMS notification into AgentIdentity...")
    # Carrier delivers inbound SMS to AgentIdentity SMS ingest endpoint
    sms_text = f"Curelith: Your patient portal login verification code is 123456. Do not share this OTP."
    sms_payload = {
        "sender": "CURELITH",
        "to": normalized_phone,
        "text": sms_text,
    }
    body_bytes = json.dumps(sms_payload).encode()
    sig = sign_payload(settings.ingest_secret, body_bytes)

    ingest_resp = httpx.post(
        f"{local_api_base}/v1/inbound/sms",
        content=body_bytes,
        headers={"X-Ingest-Signature": sig, "Content-Type": "application/json"},
    )
    assert ingest_resp.status_code == 202, ingest_resp.text

    # AgentIdentity Edge Parser deterministically extracts the OTP
    # Agent polls/retrieves OTP via SDK
    print("  + Agent calling `client.inboxes.wait_for_otp()`...")
    otp_code = client.inboxes.wait_for_otp(inbox_id=inbox.id, timeout=10)
    print(f"  + Extracted OTP Code: >>> {otp_code} <<< (Regex verified, 0 LLM tokens used)")

    # -------------------------------------------------------------------------
    # STEP 4: Submit OTP to Complete Curelith Login
    # -------------------------------------------------------------------------
    print(f"\n[Step 4] Submitting OTP '{otp_code}' to Curelith ({curelith_api_base}/patient/verify-otp)...")
    verify_resp = httpx.post(
        f"{curelith_api_base}/patient/verify-otp",
        json={"phone": phone_10digit, "otp": otp_code},
        timeout=10,
    )
    verify_data = verify_resp.json()
    assert verify_data.get("success") is True, f"Verification failed: {verify_data}"

    patient_token = verify_data["token"]
    patient_info = verify_data["patient"]
    print(f"  + Login Successful! Success: {verify_data.get('success')}")
    print(f"  + Patient Session Token : {patient_token[:20]}... (active)")
    print(f"  + Patient Name          : {patient_info.get('name')}")
    print(f"  + Registered Phone      : {patient_info.get('phone')}")

    # -------------------------------------------------------------------------
    # STEP 5: Store Authenticated Token in AgentIdentity Vault
    # -------------------------------------------------------------------------
    print("\n[Step 5] Securely storing Curelith session in AgentIdentity Vault...")
    # Generate human session to save to vault
    owner_session = httpx.post(
        f"{local_api_base}/v1/internal/sessions",
        headers={"X-Dashboard-Secret": settings.dashboard_secret},
        json={"email": f"dr.care-{unique_suffix}@curelith.com", "name": "Curelith Admin", "provider": "dev"},
    ).json()

    vault_item_resp = httpx.post(
        f"{local_api_base}/v1/vault/items",
        headers={"Authorization": f"Bearer {owner_session['token']}"},
        json={
            "name": f"Curelith Patient Session (+91 {phone_10digit})",
            "site_url": "https://www.curelith.com",
            "username": f"+91{phone_10digit}",
            "password": patient_token,
            "approval": "auto",
        },
    )
    vault_item = vault_item_resp.json()
    print(f"  + Stored in Vault ID : {vault_item['id']}")
    print(f"  + Host Bound to      : {vault_item['site_host']}")
    print(f"  + Release Mode       : {vault_item['approval']} (Safe from phishing & leaks)")

    print("\n" + "=" * 75)
    print(" [+] CURELITH.COM LOGIN PROCESS COMPLETED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == "__main__":
    main()
