import json
import uuid
import pytest
import httpx
from unittest.mock import AsyncMock, patch

from tests.conftest import ADMIN, ingest
from app.services import mail_sender
from sqlalchemy import select
from app.db.models import VaultItem


@pytest.mark.asyncio
async def test_owner_delegated_inbox_and_headers(client, workspace):
    """Test creating an inbox with owner_name and display_title, and verifying email headers."""
    auth = workspace["auth"]

    # 1. Create inbox with Owner-Delegated Identity
    res = await client.post(
        "/v1/inboxes",
        headers=auth,
        json={
            "username": "triage-bot",
            "owner_name": "Dr. Saaqib",
            "display_title": "Dr. Saaqib (via MedicalTriageBot)",
        },
    )
    assert res.status_code == 201
    inbox = res.json()
    assert inbox["owner_name"] == "Dr. Saaqib"
    assert inbox["display_title"] == "Dr. Saaqib (via MedicalTriageBot)"

    # 2. Send email from this inbox and verify outbound headers
    mail_sender.console_outbox.clear()
    send_res = await client.post(
        f"/v1/inboxes/{inbox['id']}/messages/send",
        headers=auth,
        json={
            "to": "patient@example.com",
            "subject": "Lab Results Verification",
            "text": "Your medical report is ready for download.",
        },
    )
    assert send_res.status_code == 200
    assert len(mail_sender.console_outbox) >= 1
    sent_msg = mail_sender.console_outbox[-1]
    assert "Dr. Saaqib" in sent_msg.sender
    assert "triage-bot" in sent_msg.sender
    assert sent_msg.headers.get("X-Agent-Owner") == "Dr. Saaqib"


@pytest.mark.asyncio
async def test_resolve_link_and_vault_session(client, workspace):
    """Test resolving an auth link, extracting structured page content, and saving browser state to vault."""
    auth = workspace["auth"]

    # 1. Create an inbox with owner identity
    res = await client.post(
        "/v1/inboxes",
        headers=auth,
        json={
            "username": "portal-bot",
            "owner_name": "Saaqib Hero",
            "display_title": "Saaqib (via Cloud Portal)",
        },
    )
    assert res.status_code == 201
    inbox = res.json()
    inbox_id = inbox["id"]

    # 2. Ingest inbound email with magic link
    magic_url = "https://app.curelith.com/auth/verify?token=jwt_sample_secret_xyz123"
    await ingest(
        client,
        inbox["email_address"],
        subject="Sign in to Curelith Portal",
        text=f"Click here to sign in: {magic_url}",
    )

    mock_nav_result = {
        "status_code": 200,
        "initial_url": magic_url,
        "final_url": "https://app.curelith.com/dashboard",
        "is_authenticated": True,
        "tokens": {"token": "jwt_sample_secret_xyz123"},
        "cookies": [
            {"name": "session_id", "value": "curelith_session_8899", "domain": "app.curelith.com", "path": "/", "secure": True, "httpOnly": False}
        ],
        "browser_state": {
            "cookies": [
                {"name": "session_id", "value": "curelith_session_8899", "domain": "app.curelith.com", "path": "/", "secure": True, "httpOnly": False}
            ],
            "origins": [{"origin": "https://app.curelith.com", "localStorage": []}],
        },
        "page_metadata": {
            "title": "Curelith Patient Dashboard",
            "links_count": 5,
            "buttons_count": 2,
            "tables_count": 1,
            "sample_links": [{"href": "https://app.curelith.com/records/view", "text": "View Records"}],
            "sample_buttons": [{"text": "Book Appointment", "type": "submit"}],
            "tables": [{"headers": ["Test", "Status"], "rows": [["Blood Test", "Normal"]]}],
        },
    }

    with patch("app.api.v1.inboxes.resolve_magic_link", new_callable=AsyncMock) as mock_resolve:
        mock_resolve.return_value = mock_nav_result

        # 3. Call resolve-link endpoint (without explicit URL, will auto-detect from inbox)
        resolve_res = await client.post(
            f"/v1/inboxes/{inbox_id}/resolve-link",
            headers=auth,
            json={"save_to_vault": True},
        )
        assert resolve_res.status_code == 200
        data = resolve_res.json()
        assert data["status"] == "RESOLVED"
        assert data["owner_name"] == "Saaqib Hero"
        nav = data["navigation"]
        assert nav["page_metadata"]["title"] == "Curelith Patient Dashboard"
        assert nav["page_metadata"]["buttons_count"] >= 1
        assert nav["page_metadata"]["tables_count"] >= 1
        assert "jwt_sample_secret_xyz123" in nav["tokens"].values()

        vault_item_id = data["vault_item_id"]
        assert vault_item_id is not None

        # 4. Verify browser state export endpoint
        export_res = await client.get(
            f"/v1/vault/items/{vault_item_id}/export-browser-state",
            headers=auth,
        )
        assert export_res.status_code == 200
        export_data = export_res.json()
        assert export_data["site_host"] == "app.curelith.com"
        assert export_data["owner_name"] == "Saaqib Hero"
        assert "token" in export_data["tokens"]
        assert export_data["tokens"]["token"] == "jwt_sample_secret_xyz123"
        assert len(export_data["cookies"]) >= 1


def test_structured_html_parser():
    """Unit test the HTML structured parser directly."""
    from app.services.link_resolver import _StructuredPageParser

    sample_html = """
    <html>
      <head><title>Test Medical Console</title></head>
      <body>
        <a href="/dashboard">Home</a>
        <button id="submit-btn" type="button">Approve Rx</button>
        <table>
          <tr><th>Medication</th><th>Dosage</th></tr>
          <tr><td>Amoxicillin</td><td>500mg</td></tr>
        </table>
      </body>
    </html>
    """
    parser = _StructuredPageParser("https://health.example.com")
    parser.feed(sample_html)
    assert parser.title == "Test Medical Console"
    assert len(parser.buttons) == 1
    assert parser.buttons[0]["text"] == "Approve Rx"
    assert len(parser.links) == 1
    assert parser.links[0]["href"] == "https://health.example.com/dashboard"
    assert len(parser.tables) == 1
    assert parser.tables[0]["headers"] == ["Medication", "Dosage"]
    assert parser.tables[0]["rows"] == [["Amoxicillin", "500mg"]]
