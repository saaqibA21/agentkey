"""AgentID Passport Service.

Generates and cryptographically verifies "Verifiable Agent Passports" used for
machine-to-machine authentication ("Sign in with AgentID") across third-party websites.
"""
import base64
import hmac
import json
import time
import uuid

from app.core.config import get_settings
from app.db.models import Agent, Inbox, Workspace

PASSPORT_PREFIX = "ai_pass_"
PASSPORT_TTL_SECONDS = 30 * 86400  # 30-day validity before automated refresh


def _hmac_hex(key: str, data: bytes) -> str:
    import hashlib
    return hmac.new(key.encode(), data, hashlib.sha256).hexdigest()


def create_agent_passport(agent: Agent, inbox: Inbox, workspace: Workspace) -> str:
    """Issue a cryptographically signed verifiable passport for an autonomous agent."""
    settings = get_settings()
    now = int(time.time())
    exp = now + PASSPORT_TTL_SECONDS

    claims = {
        "v": 1,
        "aid": str(agent.id),
        "name": agent.name,
        "email": inbox.email_address,
        "avatar_url": getattr(agent, "avatar_url", "") or "",
        "owner_name": agent.owner_name,
        "owner_email": agent.owner_email,
        "wid": str(workspace.id),
        "scopes": ["read", "send"],
        "trust_score": 99.0,
        "iat": now,
        "exp": exp,
    }

    payload = base64.urlsafe_b64encode(
        json.dumps(claims, separators=(",", ":")).encode()
    ).decode().rstrip("=")

    sig = _hmac_hex(settings.signing_secret, f"passport:{payload}".encode())
    return f"{PASSPORT_PREFIX}{payload}.{sig}"


def verify_passport_signature(token: str) -> dict | None:
    """Verify that the passport was authentically signed by AgentID and has not expired."""
    if not token or not token.startswith(PASSPORT_PREFIX) or "." not in token:
        return None

    raw = token[len(PASSPORT_PREFIX):]
    payload, sig = raw.rsplit(".", 1)

    settings = get_settings()
    expected_sig = _hmac_hex(settings.signing_secret, f"passport:{payload}".encode())

    if not hmac.compare_digest(expected_sig, sig):
        return None

    try:
        padded = payload + "=" * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(padded))
    except (ValueError, UnicodeDecodeError):
        return None

    if claims.get("exp", 0) < time.time():
        return None

    return claims
