"""Encryption for stored credentials, TOTP codes, and the OAuth plumbing behind connected accounts."""
import base64
import hashlib
import hmac
import json
import struct
import time
from urllib.parse import parse_qs, urlencode, urlsplit

import httpx
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings
from app.core.exceptions import ProblemError

# ---- encryption at rest -------------------------------------------------------------------


def _fernet() -> Fernet:
    settings = get_settings()
    if settings.vault_key:
        return Fernet(settings.vault_key.encode())
    # Development only (production refuses to start without VAULT_KEY).
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(f"vault:{settings.signing_secret}".encode()).digest()))


def encrypt(data: dict) -> str:
    return _fernet().encrypt(json.dumps(data).encode()).decode()


def decrypt(blob: str) -> dict:
    try:
        return json.loads(_fernet().decrypt(blob.encode()))
    except InvalidToken:
        raise ProblemError(500, "Credential unreadable",
                           "Stored credential could not be decrypted (was VAULT_KEY changed?).") from None


# ---- TOTP (RFC 6238) ----------------------------------------------------------------------

def normalize_totp_secret(value: str) -> str:
    """Accept a bare base32 secret or a full otpauth:// URI; return the base32 secret."""
    value = value.strip()
    if value.lower().startswith("otpauth://"):
        value = (parse_qs(urlsplit(value).query).get("secret") or [""])[0]
    value = value.replace(" ", "").replace("-", "").upper()
    try:
        if not value or len(base64.b32decode(value + "=" * (-len(value) % 8))) < 10:
            raise ValueError
    except (ValueError, TypeError):
        raise ProblemError(422, "Invalid 2FA secret",
                           "Paste the base32 setup key (or otpauth:// link) shown when enabling 2FA.") from None
    return value


def totp_code(secret: str, at: float | None = None, digits: int = 6, step: int = 30) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    counter = struct.pack(">Q", int((time.time() if at is None else at) // step))
    digest = hmac.new(key, counter, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    number = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(number % 10 ** digits).zfill(digits)


# ---- OAuth providers ----------------------------------------------------------------------

PROVIDERS: dict[str, dict] = {
    "github": {
        "name": "GitHub",
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "api_base": "https://api.github.com",
        "identity_path": "/user",
        "identity_field": "login",
        "authorize_extra": {},
        "git_username": "x-access-token",
    },
    "google": {
        "name": "Google",
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "api_base": "https://www.googleapis.com",
        "identity_path": "/oauth2/v3/userinfo",
        "identity_field": "email",
        "authorize_extra": {"access_type": "offline", "prompt": "consent"},
        "git_username": None,
    },
}
ALLOWED_METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE")
MAX_PROXY_BODY = 200_000


def provider_config(provider: str) -> dict:
    settings = get_settings()
    if provider not in PROVIDERS:
        raise ProblemError(404, "Unknown provider")
    config = {
        **PROVIDERS[provider],
        "client_id": getattr(settings, f"{provider}_oauth_client_id"),
        "client_secret": getattr(settings, f"{provider}_oauth_client_secret"),
        "scopes": getattr(settings, f"{provider}_oauth_scopes"),
        "redirect_uri": f"{settings.public_base_url.rstrip('/')}/v1/connections/callback/{provider}",
    }
    if not config["client_id"] or not config["client_secret"]:
        raise ProblemError(503, "Provider not configured",
                           f"{config['name']} connections are not set up on this deployment.")
    return config


def configured_providers() -> list[dict]:
    settings = get_settings()
    return [
        {"id": pid, "name": p["name"]}
        for pid, p in PROVIDERS.items()
        if getattr(settings, f"{pid}_oauth_client_id") and getattr(settings, f"{pid}_oauth_client_secret")
    ]


async def http(method: str, url: str, **kwargs) -> httpx.Response:
    """Single outbound seam for provider calls (tests replace it)."""
    async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
        return await client.request(method, url, **kwargs)


def authorize_url(provider: str, state: str) -> str:
    config = provider_config(provider)
    query = {"client_id": config["client_id"], "redirect_uri": config["redirect_uri"], "scope": config["scopes"],
             "state": state, "response_type": "code", **config["authorize_extra"]}
    return f"{config['authorize_url']}?{urlencode(query)}"


def _token_record(payload: dict, previous: dict | None = None) -> dict:
    if "access_token" not in payload:
        raise ProblemError(502, "Provider refused", str(payload.get("error_description") or payload.get("error")
                                                         or "The provider did not return a token.")[:200])
    record = {"access_token": payload["access_token"],
              "refresh_token": payload.get("refresh_token") or (previous or {}).get("refresh_token")}
    if payload.get("expires_in"):
        record["expires_at"] = int(time.time()) + int(payload["expires_in"])
    return record


async def exchange_code(provider: str, code: str) -> tuple[dict, str]:
    """Swap an authorization code for tokens. Returns (token record, granted scopes)."""
    config = provider_config(provider)
    resp = await http("POST", config["token_url"], headers={"Accept": "application/json"}, data={
        "client_id": config["client_id"], "client_secret": config["client_secret"], "code": code,
        "redirect_uri": config["redirect_uri"], "grant_type": "authorization_code",
    })
    payload = resp.json()
    return _token_record(payload), str(payload.get("scope") or config["scopes"])


async def fresh_access_token(provider: str, record: dict) -> tuple[str, dict | None]:
    """Return a usable access token, refreshing it when it is about to expire.
    The second value is the updated record to persist, or None when unchanged."""
    if not record.get("expires_at") or record["expires_at"] - 60 > time.time() or not record.get("refresh_token"):
        return record["access_token"], None
    config = provider_config(provider)
    resp = await http("POST", config["token_url"], headers={"Accept": "application/json"}, data={
        "client_id": config["client_id"], "client_secret": config["client_secret"],
        "refresh_token": record["refresh_token"], "grant_type": "refresh_token",
    })
    updated = _token_record(resp.json(), previous=record)
    return updated["access_token"], updated


async def fetch_identity(provider: str, access_token: str) -> str:
    config = PROVIDERS[provider]
    resp = await http("GET", config["api_base"] + config["identity_path"],
                      headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"})
    if resp.status_code >= 300:
        raise ProblemError(502, "Provider refused", "Could not read the connected account's profile.")
    return str(resp.json().get(config["identity_field"]) or "unknown")


def proxy_url(provider: str, path: str) -> str:
    """Build the provider API URL for ``path``, refusing anything that could leave the provider's host."""
    base = PROVIDERS[provider]["api_base"]
    if not path.startswith("/") or path.startswith("//") or "\\" in path or any(c in path for c in "\r\n\t "):
        raise ProblemError(422, "Invalid path", "Path must be an absolute API path such as /user/repos.")
    url = base + path
    if urlsplit(url).hostname != urlsplit(base).hostname or urlsplit(url).scheme != "https":
        raise ProblemError(422, "Invalid path", "Path must stay on the provider's API host.")
    return url


def host_matches(url: str, site_host: str) -> bool:
    """A login is only released for the https site it was saved for (or a subdomain of it)."""
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    return parts.scheme == "https" and (host == site_host or host.endswith("." + site_host))
