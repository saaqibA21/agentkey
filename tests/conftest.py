import json
import os
import sys
import tempfile
from pathlib import Path

_DB = Path(tempfile.mkdtemp(prefix="agentidentity-test-")) / "test.db"
os.environ.update({
    "ENV": "test",
    "DATABASE_URL": f"sqlite+aiosqlite:///{_DB.as_posix()}",
    "REDIS_URL": "memory://",
    "ADMIN_SECRET": "test-admin-secret",
    "SIGNING_SECRET": "test-signing-secret",
    "INGEST_SECRET": "test-ingest-secret",
    "MAIL_DOMAIN": "agents.test",
    "SHARED_DOMAINS": "agents.test",
    "MAIL_PROVIDER": "console",
    "PUBLIC_BASE_URL": "http://test",
    "ALLOW_PRIVATE_WEBHOOK_TARGETS": "true",
    "RATE_LIMIT_CAPACITY": "10000",
})
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "sdk" / "python"))

import httpx  # noqa: E402
import pytest  # noqa: E402

from app.core.security import sign_payload  # noqa: E402
from app.db.models import Base  # noqa: E402
from app.db.session import get_engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import mail_sender  # noqa: E402

ADMIN = {"X-Admin-Secret": "test-admin-secret"}


@pytest.fixture
async def client():
    async with app.router.lifespan_context(app):
        async with get_engine().begin() as conn:  # fresh schema per test
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        mail_sender.console_outbox.clear()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
            yield c


@pytest.fixture
async def workspace(client):
    resp = await client.post("/v1/admin/workspaces", headers=ADMIN,
                             json={"name": "Acme Robotics", "outbound_enabled": True})
    assert resp.status_code == 201, resp.text
    data = resp.json()
    data["auth"] = {"Authorization": f"Bearer {data['api_key']}"}
    return data


@pytest.fixture
async def inbox(client, workspace):
    resp = await client.post("/v1/inboxes", headers=workspace["auth"], json={"username": "lead-bot"})
    assert resp.status_code == 201, resp.text
    return resp.json()


def signed(payload: dict) -> dict:
    """kwargs for an authenticated ingest POST."""
    body = json.dumps(payload).encode()
    return {"content": body, "headers": {"Content-Type": "application/json",
                                         "X-Ingest-Signature": sign_payload("test-ingest-secret", body)}}


async def ingest(client, to: str, **fields):
    payload = {"from": "service@example.com", "to": to, "subject": "", "text": "", **fields}
    resp = await client.post("/v1/inbound/ingest", **signed(payload))
    assert resp.status_code in (200, 202), resp.text
    return resp.json()
