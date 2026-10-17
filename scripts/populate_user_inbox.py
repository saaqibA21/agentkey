"""Populate the logged-in user's workspace (saaqibheroindia@gmail.com) with inboxes and messages.
"""
import asyncio
import json
import os
import sys
import time
import uuid
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx

from app.core.config import get_settings
from app.core.security import sign_payload


def main():
    settings = get_settings()
    local_api_base = "http://127.0.0.1:8000"

    print("=" * 70)
    print(" [*] POPULATING USER INBOX WITH EMAILS & EXTRACTED OTPs")
    print("=" * 70)

    # 1. Connect to user's session
    owner_session = httpx.post(
        f"{local_api_base}/v1/internal/sessions",
        headers={"X-Dashboard-Secret": settings.dashboard_secret},
        json={"email": "saaqibheroindia@gmail.com", "name": "Saaqib", "provider": "dev"},
    ).json()
    user_token = owner_session["token"]
    user_auth = {"Authorization": f"Bearer {user_token}"}
    workspace = owner_session["workspace"]
    print(f"Logged in User Workspace: {workspace['name']} ({workspace['id']})")

    # 2. Get or create inboxes in this workspace
    inboxes_resp = httpx.get(f"{local_api_base}/v1/inboxes", headers=user_auth)
    inboxes = inboxes_resp.json() if isinstance(inboxes_resp.json(), list) else inboxes_resp.json().get("data", [])

    # Create additional friendly inboxes if not present
    created_inboxes = []
    for username in ["curelith-triage", "sales-agent"]:
        try:
            ib_resp = httpx.post(
                f"{local_api_base}/v1/inboxes",
                headers=user_auth,
                json={"username": username, "client_id": f"saaqib-{username}"},
            )
            if ib_resp.status_code in (200, 201):
                created_inboxes.append(ib_resp.json())
        except Exception:
            pass

    # Refresh list of inboxes
    raw = httpx.get(f"{local_api_base}/v1/inboxes", headers=user_auth).json()
    inboxes = raw if isinstance(raw, list) else raw.get("data", [])
    print(f"Total inboxes in your workspace: {len(inboxes)}")
    for ib in inboxes:
        print(f"  - {ib['email_address']} (ID: {ib['id']})")

    # Pick the target inbox
    target_inbox = inboxes[0]
    target_email = target_inbox["email_address"]
    print(f"\n[Injecting Messages] into: {target_email}...")

    # Email 1: Curelith Patient Verification Code
    email_1 = {
        "from": "no-reply@curelith.com",
        "to": target_email,
        "subject": "Curelith Portal: Your Verification Code is 582910",
        "text": """Hello,

Your verification passcode for the Curelith Patient Portal is 582910.
This OTP code will expire in 10 minutes.

If you did not request this, please ignore this email.

Best regards,
The Curelith Care Team
https://www.curelith.com
--
Automated secure notification.
""",
        "html": "<p>Your verification code is <b>582910</b></p><p>Visit <a href='https://www.curelith.com/patient-login.html'>Curelith Portal</a> to log in.</p>",
    }

    # Email 2: Magic Link Sign-in
    email_2 = {
        "from": "security@cloudplatform.io",
        "to": target_email,
        "subject": "Instant sign-in link for Cloud Console",
        "text": """Hi Saaqib,

Click the link below to securely sign into your Cloud Console without a password:
https://console.cloudvendor.com/auth/verify?token=magic_sec_994821&next=%2Fdashboard

This link can only be used once and expires in 15 minutes.

-- 
Security Operations
""",
        "html": "<p>Sign in instantly: <a href='https://console.cloudvendor.com/auth/verify?token=magic_sec_994821&next=%2Fdashboard'>Authenticate Now</a></p>",
    }

    # Email 3: Quote Request with Invoice Attachment info
    email_3 = {
        "from": "procurement@healthcorp.com",
        "to": target_email,
        "subject": "Invoice INV-2026-442 Follow-up",
        "text": """Hi team,

We received invoice INV-2026-442 for $3,450.00 due on 30-10-2026.
Can you please confirm if this covers the surgical kit batch?

Regards,
Priya Sharma
Procurement Lead
+91 98765 12345
""",
    }

    # Send each via ingest endpoint
    for idx, em in enumerate([email_1, email_2, email_3], 1):
        b = json.dumps(em).encode()
        sig = sign_payload(settings.ingest_secret, b)
        resp = httpx.post(
            f"{local_api_base}/v1/inbound/ingest",
            content=b,
            headers={"X-Ingest-Signature": sig, "Content-Type": "application/json"},
        )
        print(f"  + Ingested Message {idx}: '{em['subject'][:45]}...' (Status: {resp.status_code})")

    print("\n" + "=" * 70)
    print(" [+] INBOX POPULATED! REFRESH YOUR DASHBOARD AT http://localhost:3000")
    print("=" * 70)


if __name__ == "__main__":
    main()
