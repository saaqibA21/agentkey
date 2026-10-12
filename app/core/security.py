import asyncio
import hashlib
import hmac
import ipaddress
import secrets
import socket
import time
from urllib.parse import urlsplit

from app.core.config import get_settings
from app.core.exceptions import ProblemError

API_KEY_PREFIX = "ai_live_"
SCOPES = ("read", "send", "manage")


def generate_api_key() -> str:
    return API_KEY_PREFIX + secrets.token_urlsafe(32)


def hash_api_key(api_key: str) -> str:
    # Keys carry 256 bits of entropy, so a fast unsalted digest is sufficient and lets us index it.
    return hashlib.sha256(api_key.encode()).hexdigest()


def generate_webhook_secret() -> str:
    return "whsec_" + secrets.token_urlsafe(32)


def _hmac_hex(secret: str, payload: bytes) -> str:
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


def sign_payload(secret: str, body: bytes, timestamp: int | None = None) -> str:
    """Stripe-style signature header value: ``t=<unix>,v1=<hex hmac of "t.body">``."""
    ts = int(time.time()) if timestamp is None else timestamp
    return f"t={ts},v1={_hmac_hex(secret, f'{ts}.'.encode() + body)}"


def verify_signed_payload(secret: str, body: bytes, header: str | None, tolerance: int) -> bool:
    if not header:
        return False
    parts = dict(p.split("=", 1) for p in header.split(",") if "=" in p)
    try:
        ts = int(parts.get("t", ""))
    except ValueError:
        return False
    if abs(time.time() - ts) > tolerance:
        return False
    expected = _hmac_hex(secret, f"{ts}.".encode() + body)
    return hmac.compare_digest(expected, parts.get("v1", ""))


def verify_meta_signature(app_secret: str, body: bytes, header: str | None) -> bool:
    if not header or not header.startswith("sha256="):
        return False
    return hmac.compare_digest(_hmac_hex(app_secret, body), header[len("sha256="):])


def make_hitl_token(message_id: str) -> str:
    settings = get_settings()
    exp = int(time.time()) + settings.hitl_token_ttl_seconds
    return f"{exp}.{_hmac_hex(settings.signing_secret, f'hitl:{message_id}:{exp}'.encode())}"


def verify_hitl_token(message_id: str, token: str | None) -> bool:
    if not token or "." not in token:
        return False
    exp_raw, sig = token.split(".", 1)
    try:
        exp = int(exp_raw)
    except ValueError:
        return False
    if exp < time.time():
        return False
    expected = _hmac_hex(get_settings().signing_secret, f"hitl:{message_id}:{exp}".encode())
    return hmac.compare_digest(expected, sig)


def constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


async def assert_public_url(url: str) -> None:
    """SSRF guard for customer-supplied callback URLs (webhooks, Slack destinations)."""
    settings = get_settings()
    parts = urlsplit(url)
    if parts.scheme not in ("https", "http") or not parts.hostname:
        raise ProblemError(422, "Invalid URL", "URL must be an absolute http(s) URL.")
    if settings.allow_private_webhook_targets:
        return
    if parts.scheme != "https":
        raise ProblemError(422, "Invalid URL", "URL must use https.")
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(
            parts.hostname, parts.port or 443, type=socket.SOCK_STREAM
        )
    except socket.gaierror:
        raise ProblemError(422, "Invalid URL", "URL host does not resolve.") from None
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise ProblemError(422, "Invalid URL", "URL must resolve to a public address.")
