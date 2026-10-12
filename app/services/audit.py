from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host if request.client else None


def audit(
    session: AsyncSession, *, action: str, actor: str, workspace_id=None, target=None,
    detail: dict | None = None, request: Request | None = None,
) -> None:
    """Queue an audit row on the caller's transaction."""
    session.add(AuditLog(
        workspace_id=workspace_id, actor=actor, action=action,
        target=str(target) if target is not None else None,
        detail=detail or {}, ip_address=client_ip(request),
    ))
