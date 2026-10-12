import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.core.rate_limiter import allow_request
from app.core.security import SCOPES, SESSION_PREFIX, constant_time_equals, hash_api_key, verify_session_token
from app.db.models import ApiKey, Inbox, User, Workspace
from app.db.session import get_session


@dataclass
class Principal:
    workspace: Workspace
    scopes: frozenset[str]
    key_id: uuid.UUID  # API key id, or the user id for dashboard sessions
    kind: str = "api_key"

    @property
    def actor(self) -> str:
        return f"{self.kind}:{self.key_id}"


def bearer_token(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


async def authenticate_api_key(session: AsyncSession, api_key: str | None) -> Principal | None:
    if not api_key:
        return None
    if api_key.startswith(SESSION_PREFIX):
        claims = verify_session_token(api_key)
        user = await session.get(User, uuid.UUID(claims["uid"])) if claims else None
        if user is None or str(user.workspace_id) != claims["wid"]:
            return None
        workspace = await session.get(Workspace, user.workspace_id)
        return Principal(workspace=workspace, scopes=frozenset(SCOPES), key_id=user.id, kind="user")
    row = (
        await session.execute(
            select(ApiKey, Workspace)
            .join(Workspace, Workspace.id == ApiKey.workspace_id)
            .where(ApiKey.key_hash == hash_api_key(api_key), ApiKey.revoked_at.is_(None))
        )
    ).first()
    if row is None:
        return None
    key, workspace = row
    return Principal(workspace=workspace, scopes=frozenset(key.scopes or []), key_id=key.id)


async def get_principal(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> Principal:
    principal = await authenticate_api_key(session, bearer_token(authorization))
    if principal is None:
        raise ProblemError(
            401, "Unauthorized", "Provide a valid API key as 'Authorization: Bearer <key>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not await allow_request(str(principal.key_id)):
        raise ProblemError(429, "Rate limit exceeded", "Too many requests for this API key.",
                           headers={"Retry-After": "1"})
    return principal


def require_scope(scope: str):
    async def _dep(principal: Principal = Depends(get_principal)) -> Principal:
        if scope not in principal.scopes:
            raise ProblemError(403, "Insufficient scope", f"This API key lacks the '{scope}' scope.")
        return principal

    return _dep


async def load_inbox(session: AsyncSession, principal: Principal, inbox_id: uuid.UUID) -> Inbox:
    inbox = await session.get(Inbox, inbox_id)
    # Same 404 for "missing" and "someone else's" so ids cannot be probed across tenants.
    if inbox is None or inbox.workspace_id != principal.workspace.id or inbox.status != "ACTIVE":
        raise ProblemError(404, "Inbox not found")
    return inbox


async def require_admin(request: Request, x_admin_secret: str | None = Header(default=None)) -> None:
    if not x_admin_secret or not constant_time_equals(x_admin_secret, get_settings().admin_secret):
        raise ProblemError(401, "Unauthorized", "Admin secret required.")


async def require_dashboard(x_dashboard_secret: str | None = Header(default=None)) -> None:
    if not x_dashboard_secret or not constant_time_equals(x_dashboard_secret, get_settings().dashboard_secret):
        raise ProblemError(401, "Unauthorized", "Dashboard secret required.")
