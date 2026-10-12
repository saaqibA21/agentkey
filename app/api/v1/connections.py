"""Delegated identity: connected OAuth accounts and the saved-login vault.

Rules that hold everywhere in this module:
* secrets are encrypted at rest and never appear in list/read responses, events or logs;
* only keys with the ``connect`` scope can use an identity;
* only a signed-in person can add credentials, loosen their rules or approve access.
"""
import secrets
import uuid
from datetime import timedelta
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Principal, require_scope, require_user
from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.core.security import sign_blob, verify_blob
from app.db.models import AccessRequest, Connection, VaultItem, utcnow
from app.db.session import get_session
from app.services import vault
from app.services.audit import audit
from app.services.events import _iso

router = APIRouter(tags=["identity"])


# ---- schemas ------------------------------------------------------------------------------

class ConnectionUpdate(BaseModel):
    allow_writes: bool | None = None
    allow_export: bool | None = None


class ProxyRequest(BaseModel):
    method: str = Field(default="GET", pattern="^(?i:get|post|put|patch|delete)$")
    path: str = Field(min_length=1, max_length=2000, description="API path on the provider, e.g. /user/repos")
    query: dict[str, str] = Field(default_factory=dict)
    body: dict | list | None = None


class VaultItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    site_url: str = Field(min_length=4, max_length=1024, description="Where this login is used, e.g. https://github.com")
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=1024)
    totp_secret: str | None = Field(default=None, max_length=512)
    approval: str = Field(default="ask", pattern="^(ask|auto)$")


class VaultItemUpdate(BaseModel):
    approval: str = Field(pattern="^(ask|auto)$")


class LoginRequest(BaseModel):
    url: str = Field(min_length=8, max_length=1024, description="The page the agent is about to sign in on.")
    reason: str = Field(default="", max_length=500)


def _connection_out(c: Connection) -> dict:
    return {"id": str(c.id), "provider": c.provider, "account": c.account, "scopes": c.scopes,
            "allow_writes": c.allow_writes, "allow_export": c.allow_export,
            "last_used_at": _iso(c.last_used_at), "created_at": _iso(c.created_at)}


def _item_out(i: VaultItem) -> dict:
    return {"id": str(i.id), "name": i.name, "site_host": i.site_host, "username": i.username,
            "has_totp": i.has_totp, "approval": i.approval,
            "last_used_at": _iso(i.last_used_at), "created_at": _iso(i.created_at)}


def _dashboard(query: str) -> RedirectResponse:
    return RedirectResponse(f"{get_settings().dashboard_url.rstrip('/')}/dashboard/identity?{query}", status_code=303)


# ---- connected accounts -------------------------------------------------------------------

@router.get("/connections/providers")
async def list_providers(principal: Principal = Depends(require_scope("read"))):
    return {"data": vault.configured_providers()}


@router.post("/connections/{provider}/start")
async def start_connection(provider: str, principal: Principal = Depends(require_user)):
    """Begin "Connect <provider>". Returns the URL to send the person's browser to."""
    state = sign_blob("oauth", {"wid": str(principal.workspace.id), "p": provider,
                                "n": secrets.token_urlsafe(8)}, ttl_seconds=600)
    return {"authorize_url": vault.authorize_url(provider, state)}


@router.get("/connections/callback/{provider}", include_in_schema=False)
async def oauth_callback(
    provider: str, request: Request, code: str = Query(""), state: str = Query(""), error: str = Query(""),
    session: AsyncSession = Depends(get_session),
):
    claims = verify_blob("oauth", state)
    if error or not code or claims is None or claims.get("p") != provider:
        return _dashboard("error=connect_failed")
    try:
        record, scopes = await vault.exchange_code(provider, code)
        account = await vault.fetch_identity(provider, record["access_token"])
    except ProblemError:
        return _dashboard("error=connect_failed")
    workspace_id = uuid.UUID(claims["wid"])
    existing = await session.scalar(select(Connection).where(
        Connection.workspace_id == workspace_id, Connection.provider == provider, Connection.account == account))
    if existing:  # reconnecting refreshes the tokens but keeps the rules the owner set
        existing.token_enc, existing.scopes = vault.encrypt(record), scopes[:1024]
    else:
        session.add(Connection(workspace_id=workspace_id, provider=provider, account=account[:255],
                               scopes=scopes[:1024], token_enc=vault.encrypt(record)))
    audit(session, action="connection.connect", actor="oauth_callback", workspace_id=workspace_id,
          target=f"{provider}:{account}", request=request)
    await session.commit()
    return _dashboard(f"connected={provider}")


@router.get("/connections")
async def list_connections(
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session)
):
    rows = (await session.scalars(
        select(Connection).where(Connection.workspace_id == principal.workspace.id).order_by(Connection.created_at)
    )).all()
    return {"data": [_connection_out(c) for c in rows]}


async def _connection(session: AsyncSession, principal: Principal, connection_id: uuid.UUID) -> Connection:
    row = await session.get(Connection, connection_id)
    if row is None or row.workspace_id != principal.workspace.id:
        raise ProblemError(404, "Connection not found")
    return row


@router.patch("/connections/{connection_id}")
async def update_connection(
    connection_id: uuid.UUID, body: ConnectionUpdate, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    row = await _connection(session, principal, connection_id)
    changes = body.model_dump(exclude_none=True)
    for name, value in changes.items():
        setattr(row, name, value)
    audit(session, action="connection.update", actor=principal.actor, workspace_id=principal.workspace.id,
          target=f"{row.provider}:{row.account}", detail=changes, request=request)
    await session.commit()
    return _connection_out(row)


@router.delete("/connections/{connection_id}", status_code=204)
async def delete_connection(
    connection_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    row = await _connection(session, principal, connection_id)
    await session.delete(row)
    audit(session, action="connection.delete", actor=principal.actor, workspace_id=principal.workspace.id,
          target=f"{row.provider}:{row.account}", request=request)
    await session.commit()


async def _access_token(session: AsyncSession, row: Connection) -> str:
    token, updated = await vault.fresh_access_token(row.provider, vault.decrypt(row.token_enc))
    if updated:
        row.token_enc = vault.encrypt(updated)
    row.last_used_at = utcnow()
    return token


@router.post("/connections/{connection_id}/request")
async def proxy_request(
    connection_id: uuid.UUID, body: ProxyRequest, request: Request,
    principal: Principal = Depends(require_scope("connect")), session: AsyncSession = Depends(get_session),
):
    """Call the provider's API as the connected account. The token never leaves the server."""
    row = await _connection(session, principal, connection_id)
    method = body.method.upper()
    if method != "GET" and not row.allow_writes:
        raise ProblemError(403, "Read-only connection",
                           "The owner has not allowed changes through this connection. They can switch on "
                           "'Allow changes' in the dashboard.")
    url = vault.proxy_url(row.provider, body.path)
    token = await _access_token(session, row)
    kwargs: dict = {"headers": {"Authorization": f"Bearer {token}", "Accept": "application/json",
                                "User-Agent": get_settings().platform_name}, "params": body.query}
    if body.body is not None and method != "GET":
        kwargs["json"] = body.body
    audit(session, action="connection.request", actor=principal.actor, workspace_id=principal.workspace.id,
          target=f"{row.provider}:{row.account}", detail={"method": method, "path": body.path[:300]},
          request=request)
    await session.commit()
    resp = await vault.http(method, url, **kwargs)
    try:
        payload = resp.json()
    except ValueError:
        payload = resp.text[:vault.MAX_PROXY_BODY]
    return {"status": resp.status_code, "body": payload}


@router.post("/connections/{connection_id}/token")
async def export_token(
    connection_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_scope("connect")), session: AsyncSession = Depends(get_session),
):
    """Hand the access token itself to the agent (needed for ``git clone``/``git push`` over HTTPS).
    Off unless the owner switched on 'Allow token export' for this connection."""
    row = await _connection(session, principal, connection_id)
    if not row.allow_export:
        raise ProblemError(403, "Token export disabled",
                           "The owner has not allowed this connection's token to be handed out. They can switch "
                           "on 'Allow token export' in the dashboard.")
    token = await _access_token(session, row)
    audit(session, action="connection.export_token", actor=principal.actor,
          workspace_id=principal.workspace.id, target=f"{row.provider}:{row.account}", request=request)
    await session.commit()
    return {"provider": row.provider, "account": row.account, "access_token": token,
            "git_username": vault.PROVIDERS[row.provider]["git_username"]}


# ---- saved logins -------------------------------------------------------------------------

@router.post("/vault/items", status_code=201)
async def create_item(
    body: VaultItemCreate, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    site = body.site_url if "://" in body.site_url else f"https://{body.site_url}"
    host = (urlsplit(site).hostname or "").lower()
    if "." not in host:
        raise ProblemError(422, "Invalid site", "Enter the site's address, for example https://github.com.")
    secret = {"password": body.password}
    if body.totp_secret:
        secret["totp_secret"] = vault.normalize_totp_secret(body.totp_secret)
    item = VaultItem(workspace_id=principal.workspace.id, name=body.name, site_host=host,
                     username=body.username, secret_enc=vault.encrypt(secret),
                     has_totp="totp_secret" in secret, approval=body.approval)
    session.add(item)
    audit(session, action="vault.create", actor=principal.actor, workspace_id=principal.workspace.id,
          target=host, request=request)
    await session.commit()
    return _item_out(item)


@router.get("/vault/items")
async def list_items(
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session)
):
    rows = (await session.scalars(
        select(VaultItem).where(VaultItem.workspace_id == principal.workspace.id).order_by(VaultItem.created_at)
    )).all()
    return {"data": [_item_out(i) for i in rows]}


async def _item(session: AsyncSession, principal: Principal, item_id: uuid.UUID) -> VaultItem:
    row = await session.get(VaultItem, item_id)
    if row is None or row.workspace_id != principal.workspace.id:
        raise ProblemError(404, "Login not found")
    return row


@router.patch("/vault/items/{item_id}")
async def update_item(
    item_id: uuid.UUID, body: VaultItemUpdate, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    item = await _item(session, principal, item_id)
    item.approval = body.approval
    audit(session, action="vault.update", actor=principal.actor, workspace_id=principal.workspace.id,
          target=item.site_host, detail={"approval": body.approval}, request=request)
    await session.commit()
    return _item_out(item)


@router.delete("/vault/items/{item_id}", status_code=204)
async def delete_item(
    item_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    item = await _item(session, principal, item_id)
    await session.delete(item)
    audit(session, action="vault.delete", actor=principal.actor, workspace_id=principal.workspace.id,
          target=item.site_host, request=request)
    await session.commit()


def _release(item: VaultItem) -> dict:
    secret = vault.decrypt(item.secret_enc)
    item.last_used_at = utcnow()
    out = {"status": "GRANTED", "site_host": item.site_host, "username": item.username,
           "password": secret["password"]}
    if secret.get("totp_secret"):
        out["totp_code"] = vault.totp_code(secret["totp_secret"])
    return out


@router.post("/vault/items/{item_id}/login")
async def request_login(
    item_id: uuid.UUID, body: LoginRequest, request: Request,
    principal: Principal = Depends(require_scope("connect")), session: AsyncSession = Depends(get_session),
):
    """Ask for a saved login. Released at once for 'auto' items; otherwise a person must approve
    (HTTP 202 with a request id to collect later)."""
    item = await _item(session, principal, item_id)
    if not vault.host_matches(body.url, item.site_host):
        # Stops a phishing page (or an injected instruction) from collecting a login saved for another site.
        raise ProblemError(403, "Site mismatch",
                           f"This login is saved for https://{item.site_host} and is only released there.")
    if item.approval == "auto":
        result = _release(item)
        audit(session, action="vault.release", actor=principal.actor, workspace_id=principal.workspace.id,
              target=item.site_host, detail={"url": body.url[:300], "mode": "auto"}, request=request)
        await session.commit()
        return result
    pending = AccessRequest(
        workspace_id=principal.workspace.id, vault_item_id=item.id, requested_by=principal.actor,
        url=body.url, reason=body.reason,
        expires_at=utcnow() + timedelta(seconds=get_settings().vault_request_ttl_seconds),
    )
    session.add(pending)
    await session.commit()
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=202, content={
        "status": "PENDING", "request_id": str(pending.id),
        "detail": "A person must approve this in the dashboard. Collect it with the request id afterwards.",
    })


def _request_out(r: AccessRequest, item: VaultItem) -> dict:
    return {"id": str(r.id), "status": r.status, "item": _item_out(item), "url": r.url, "reason": r.reason,
            "requested_by": r.requested_by, "created_at": _iso(r.created_at), "expires_at": _iso(r.expires_at)}


def _expired(r: AccessRequest) -> bool:
    expires = r.expires_at if r.expires_at.tzinfo else r.expires_at.replace(tzinfo=utcnow().tzinfo)
    return expires < utcnow()


@router.get("/vault/requests")
async def list_requests(
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session)
):
    rows = (await session.execute(
        select(AccessRequest, VaultItem).join(VaultItem, VaultItem.id == AccessRequest.vault_item_id)
        .where(AccessRequest.workspace_id == principal.workspace.id, AccessRequest.status == "PENDING")
        .order_by(AccessRequest.created_at)
    )).all()
    return {"data": [_request_out(r, i) for r, i in rows if not _expired(r)]}


async def _request(session: AsyncSession, principal: Principal, request_id: uuid.UUID) -> AccessRequest:
    row = await session.get(AccessRequest, request_id)
    if row is None or row.workspace_id != principal.workspace.id:
        raise ProblemError(404, "Request not found")
    return row


@router.post("/vault/requests/{request_id}/approve")
@router.post("/vault/requests/{request_id}/deny")
async def decide_request(
    request_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    verdict = request.url.path.rsplit("/", 1)[-1]
    row = await _request(session, principal, request_id)
    if row.status != "PENDING" or _expired(row):
        raise ProblemError(409, "Already resolved", "This request is no longer waiting.")
    row.status = "APPROVED" if verdict == "approve" else "DENIED"
    audit(session, action=f"vault.{verdict}", actor=principal.actor, workspace_id=principal.workspace.id,
          target=str(row.vault_item_id), detail={"url": row.url[:300]}, request=request)
    await session.commit()
    return {"id": str(row.id), "status": row.status}


@router.post("/vault/requests/{request_id}/collect")
async def collect_request(
    request_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_scope("connect")), session: AsyncSession = Depends(get_session),
):
    """Pick up an approved login. Works once; the approval is then spent."""
    row = await _request(session, principal, request_id)
    if row.status == "PENDING" and not _expired(row):
        return {"status": "PENDING"}
    if row.status != "APPROVED" or _expired(row):
        return {"status": "EXPIRED" if row.status in ("PENDING", "APPROVED") else row.status}
    item = await session.get(VaultItem, row.vault_item_id)
    row.status = "USED"
    result = _release(item)
    audit(session, action="vault.release", actor=principal.actor, workspace_id=principal.workspace.id,
          target=item.site_host, detail={"url": row.url[:300], "mode": "approved"}, request=request)
    await session.commit()
    return result
