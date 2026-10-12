"""OAuth 2.1 authorization server for the hosted MCP endpoint.

This is what lets ChatGPT, Claude and other apps connect without an API key: the app registers
itself, sends the person here, the person signs in to the dashboard and approves, and the app
receives a token limited to the permissions that person ticked.

Public clients only: PKCE (S256) is mandatory and there are no client secrets.
"""
import base64
import hashlib
import secrets
from datetime import timedelta
from urllib.parse import urlencode, urlsplit

from fastapi import APIRouter, Depends, Form, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import OAUTH_ACCESS_PREFIX, Principal, require_user
from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.core.security import SCOPES, hash_api_key, sign_blob, verify_blob
from app.db.models import OAuthClient, OAuthCode, OAuthToken, utcnow
from app.db.session import get_session
from app.services.audit import audit
from app.services.events import _iso

root_router = APIRouter(tags=["oauth"])
v1_router = APIRouter(prefix="/oauth", tags=["oauth"])

REFRESH_PREFIX = "ai_ort_"
ACCESS_TTL = timedelta(hours=1)
REFRESH_TTL = timedelta(days=60)
CODE_TTL = timedelta(minutes=2)
MCP_PATH = "/mcp"


def _base() -> str:
    return get_settings().public_base_url.rstrip("/")


def resource_metadata_url() -> str:
    return f"{_base()}/.well-known/oauth-protected-resource"


# ---- discovery ----------------------------------------------------------------------------

@root_router.get("/.well-known/oauth-protected-resource", include_in_schema=False)
@root_router.get("/.well-known/oauth-protected-resource/mcp", include_in_schema=False)
async def protected_resource():
    return {"resource": f"{_base()}{MCP_PATH}", "authorization_servers": [_base()],
            "bearer_methods_supported": ["header"], "scopes_supported": list(SCOPES)}


@root_router.get("/.well-known/oauth-authorization-server", include_in_schema=False)
@root_router.get("/.well-known/oauth-authorization-server/mcp", include_in_schema=False)
async def authorization_server():
    base = _base()
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "registration_endpoint": f"{base}/oauth/register",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
        "scopes_supported": list(SCOPES),
    }


# ---- dynamic client registration ----------------------------------------------------------

class ClientRegistration(BaseModel):
    redirect_uris: list[str] = Field(min_length=1, max_length=10)
    client_name: str = Field(default="", max_length=120)


def _valid_redirect(uri: str) -> bool:
    parts = urlsplit(uri)
    if len(uri) > 1024 or parts.fragment or not parts.hostname:
        return False
    # https everywhere; plain http only for apps running on the person's own machine.
    return parts.scheme == "https" or (parts.scheme == "http" and parts.hostname in ("localhost", "127.0.0.1"))


@root_router.post("/oauth/register", status_code=201, include_in_schema=False)
async def register_client(body: ClientRegistration, session: AsyncSession = Depends(get_session)):
    if not all(_valid_redirect(u) for u in body.redirect_uris):
        return JSONResponse({"error": "invalid_redirect_uri",
                             "error_description": "Redirect URIs must be https (or http on localhost)."}, 400)
    client = OAuthClient(id=secrets.token_urlsafe(24), name=body.client_name.strip(),
                         redirect_uris=body.redirect_uris)
    session.add(client)
    await session.commit()
    return {"client_id": client.id, "client_name": client.name, "redirect_uris": client.redirect_uris,
            "token_endpoint_auth_method": "none", "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"]}


# ---- authorization ------------------------------------------------------------------------

def _back(redirect_uri: str, **params) -> RedirectResponse:
    joiner = "&" if urlsplit(redirect_uri).query else "?"
    return RedirectResponse(redirect_uri + joiner + urlencode({k: v for k, v in params.items() if v}), 302)


@root_router.get("/oauth/authorize", include_in_schema=False)
async def authorize(
    client_id: str = Query(""), redirect_uri: str = Query(""), response_type: str = Query(""),
    code_challenge: str = Query(""), code_challenge_method: str = Query(""), state: str = Query(""),
    scope: str = Query(""), session: AsyncSession = Depends(get_session),
):
    client = await session.get(OAuthClient, client_id) if client_id else None
    # Never redirect to an address the client did not register: that would make this an open redirector.
    if client is None or redirect_uri not in client.redirect_uris:
        raise ProblemError(400, "Invalid client", "Unknown client_id or unregistered redirect_uri.")
    if response_type != "code" or code_challenge_method != "S256" or not (43 <= len(code_challenge) <= 128):
        return _back(redirect_uri, error="invalid_request", state=state,
                     error_description="response_type=code and PKCE with S256 are required")
    wanted = [s for s in scope.split() if s in SCOPES]
    blob = sign_blob("oauth_authz", {"cid": client.id, "ru": redirect_uri, "cc": code_challenge,
                                     "st": state, "sc": wanted}, ttl_seconds=900)
    # The person signs in and decides on the dashboard, which is where their session lives.
    return RedirectResponse(
        f"{get_settings().dashboard_url.rstrip('/')}/connect/authorize?{urlencode({'request': blob})}", 302)


class ConsentRequest(BaseModel):
    request: str


class ConsentDecision(BaseModel):
    request: str
    approve: bool
    scopes: list[str] = Field(default_factory=list)


async def _pending(session: AsyncSession, blob: str) -> tuple[dict, OAuthClient]:
    claims = verify_blob("oauth_authz", blob)
    client = await session.get(OAuthClient, claims["cid"]) if claims else None
    if client is None or claims["ru"] not in client.redirect_uris:
        raise ProblemError(400, "Request expired", "Start the connection again from the app.")
    return claims, client


@v1_router.post("/consent")
async def describe_consent(
    body: ConsentRequest, principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session)
):
    """What the consent screen shows: who is asking and where the person will be sent back to."""
    claims, client = await _pending(session, body.request)
    return {"client_name": client.name or "An app", "redirect_host": urlsplit(claims["ru"]).hostname,
            "requested_scopes": claims["sc"], "workspace": principal.workspace.name}


@v1_router.post("/decision")
async def decide(
    body: ConsentDecision, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    claims, client = await _pending(session, body.request)
    scopes = [s for s in SCOPES if s in body.scopes]
    if not body.approve or not scopes:
        return {"redirect_to": _back(claims["ru"], error="access_denied", state=claims["st"]).headers["location"]}
    code = secrets.token_urlsafe(32)
    session.add(OAuthCode(
        code_hash=hash_api_key(code), client_id=client.id, user_id=principal.key_id,
        workspace_id=principal.workspace.id, redirect_uri=claims["ru"], code_challenge=claims["cc"],
        scopes=scopes, expires_at=utcnow() + CODE_TTL,
    ))
    audit(session, action="oauth.grant", actor=principal.actor, workspace_id=principal.workspace.id,
          target=client.name or client.id, detail={"scopes": scopes, "redirect": claims["ru"][:200]}, request=request)
    await session.commit()
    return {"redirect_to": _back(claims["ru"], code=code, state=claims["st"]).headers["location"]}


# ---- tokens -------------------------------------------------------------------------------

def _error(code: str, description: str) -> JSONResponse:
    return JSONResponse({"error": code, "error_description": description}, 400,
                        headers={"Cache-Control": "no-store"})


def _issue(session: AsyncSession, *, client_id: str, user_id, workspace_id, scopes: list[str]) -> dict:
    access = OAUTH_ACCESS_PREFIX + secrets.token_urlsafe(32)
    refresh = REFRESH_PREFIX + secrets.token_urlsafe(32)
    session.add(OAuthToken(
        access_hash=hash_api_key(access), refresh_hash=hash_api_key(refresh), client_id=client_id,
        user_id=user_id, workspace_id=workspace_id, scopes=scopes,
        access_expires_at=utcnow() + ACCESS_TTL, refresh_expires_at=utcnow() + REFRESH_TTL,
    ))
    return {"access_token": access, "token_type": "Bearer", "expires_in": int(ACCESS_TTL.total_seconds()),
            "refresh_token": refresh, "scope": " ".join(scopes)}


def _aware(dt):
    return dt if dt.tzinfo else dt.replace(tzinfo=utcnow().tzinfo)


@root_router.post("/oauth/token", include_in_schema=False)
async def token(
    grant_type: str = Form(""), code: str = Form(""), redirect_uri: str = Form(""), client_id: str = Form(""),
    code_verifier: str = Form(""), refresh_token: str = Form(""), session: AsyncSession = Depends(get_session),
):
    if grant_type == "authorization_code":
        row = await session.get(OAuthCode, hash_api_key(code)) if code else None
        if row is None or row.client_id != client_id or row.redirect_uri != redirect_uri \
                or _aware(row.expires_at) < utcnow():
            return _error("invalid_grant", "The authorization code is invalid or expired.")
        challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).decode().rstrip("=")
        if not secrets.compare_digest(challenge, row.code_challenge):
            return _error("invalid_grant", "PKCE verification failed.")
        # Single use, enforced atomically so two racing exchanges cannot both win.
        claimed = await session.execute(
            update(OAuthCode).where(OAuthCode.code_hash == row.code_hash, OAuthCode.used.is_(False)).values(used=True))
        if claimed.rowcount != 1:
            return _error("invalid_grant", "The authorization code was already used.")
        result = _issue(session, client_id=row.client_id, user_id=row.user_id,
                        workspace_id=row.workspace_id, scopes=list(row.scopes))
        await session.commit()
        return JSONResponse(result, headers={"Cache-Control": "no-store"})

    if grant_type == "refresh_token":
        old = await session.scalar(select(OAuthToken).where(OAuthToken.refresh_hash == hash_api_key(refresh_token))) \
            if refresh_token else None
        if old is None or old.client_id != client_id or old.revoked_at is not None \
                or _aware(old.refresh_expires_at) < utcnow():
            return _error("invalid_grant", "The refresh token is invalid, expired or revoked.")
        old.revoked_at = utcnow()  # rotation: each refresh token works once
        result = _issue(session, client_id=old.client_id, user_id=old.user_id,
                        workspace_id=old.workspace_id, scopes=list(old.scopes))
        await session.commit()
        return JSONResponse(result, headers={"Cache-Control": "no-store"})

    return _error("unsupported_grant_type", "Use authorization_code or refresh_token.")


# ---- the person's view of what they have authorised ---------------------------------------

@v1_router.get("/grants")
async def list_grants(principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(OAuthToken, OAuthClient).join(OAuthClient, OAuthClient.id == OAuthToken.client_id)
        .where(OAuthToken.workspace_id == principal.workspace.id, OAuthToken.revoked_at.is_(None))
        .order_by(OAuthToken.created_at.desc())
    )).all()
    grants: dict[str, dict] = {}
    for tok, client in rows:
        if _aware(tok.refresh_expires_at) < utcnow():
            continue
        grants.setdefault(client.id, {
            "client_id": client.id, "client_name": client.name or "An app", "scopes": list(tok.scopes),
            "redirect_host": urlsplit(client.redirect_uris[0]).hostname, "last_authorized_at": _iso(tok.created_at),
        })
    return {"data": list(grants.values())}


@v1_router.delete("/grants/{client_id}", status_code=204)
async def revoke_grant(
    client_id: str, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    await session.execute(
        update(OAuthToken)
        .where(OAuthToken.workspace_id == principal.workspace.id, OAuthToken.client_id == client_id,
               OAuthToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )
    audit(session, action="oauth.revoke", actor=principal.actor, workspace_id=principal.workspace.id,
          target=client_id, request=request)
    await session.commit()
