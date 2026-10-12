"""Dashboard sign-in bridge and the signed-in user's overview.

The dashboard authenticates people (Google / GitHub) on its own server, then exchanges the verified
identity here for a short-lived, workspace-scoped session token. The dashboard secret is only ever
used for that exchange.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.api.deps import Principal, get_principal, require_dashboard
from app.api.v1.admin import create_workspace
from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.core.rate_limiter import daily_usage
from app.core.security import make_session_token
from app.db.models import ApiKey, Domain, Inbox, Message, User, Workspace, utcnow
from app.db.session import get_session
from app.services.audit import audit

router = APIRouter(tags=["auth"])


@router.post("/internal/sessions", dependencies=[Depends(require_dashboard)], include_in_schema=False)
async def create_session(
    body: schemas.SessionCreate, request: Request, session: AsyncSession = Depends(get_session)
):
    settings = get_settings()
    if body.provider == "dev" and settings.is_production:
        raise ProblemError(403, "Dev login disabled", "The development login is not available in production.")
    email = body.email.strip().lower()
    user = await session.scalar(select(User).where(User.email == email))
    created = user is None
    if created:
        display = body.name.strip() or email.split("@")[0]
        workspace, _ = await create_workspace(session, schemas.WorkspaceCreate(
            name=f"{display}'s workspace"[:255], daily_send_limit=settings.free_daily_send_limit,
            max_inboxes=settings.free_max_inboxes, inbound_daily_limit=settings.free_inbound_daily_limit,
        ))
        user = User(workspace_id=workspace.id, email=email, name=body.name.strip()[:255],
                    avatar_url=body.avatar_url, auth_provider=body.provider)
        session.add(user)
        await session.flush()
        audit(session, action="user.signup", actor=f"user:{user.id}", workspace_id=workspace.id,
              detail={"provider": body.provider}, request=request)
    else:
        workspace = await session.get(Workspace, user.workspace_id)
        user.last_login_at = utcnow()
        if body.avatar_url:
            user.avatar_url = body.avatar_url
    await session.commit()
    token, expires_at = make_session_token(str(user.id), str(workspace.id))
    return {
        "token": token, "expires_at": expires_at, "created": created,
        "user": {"id": str(user.id), "email": user.email, "name": user.name, "avatar_url": user.avatar_url},
        "workspace": schemas.WorkspaceOut.model_validate(workspace).model_dump(mode="json"),
    }


@router.get("/overview")
async def overview(principal: Principal = Depends(get_principal), session: AsyncSession = Depends(get_session)):
    """One call for the dashboard home: limits, today's usage and what still needs setting up."""
    workspace = principal.workspace

    async def count(query) -> int:
        return await session.scalar(query) or 0

    inbox_ids = select(Inbox.id).where(Inbox.workspace_id == workspace.id)
    return {
        "workspace": schemas.WorkspaceOut.model_validate(workspace).model_dump(mode="json"),
        "usage": await daily_usage(workspace.id),
        "counts": {
            "inboxes": await count(select(func.count()).select_from(Inbox).where(
                Inbox.workspace_id == workspace.id, Inbox.status == "ACTIVE")),
            "messages": await count(select(func.count()).select_from(Message).where(
                Message.inbox_id.in_(inbox_ids))),
            "pending_approvals": await count(select(func.count()).select_from(Message).where(
                Message.inbox_id.in_(inbox_ids), Message.status == "PENDING_APPROVAL")),
            "api_keys": await count(select(func.count()).select_from(ApiKey).where(
                ApiKey.workspace_id == workspace.id, ApiKey.revoked_at.is_(None), ApiKey.name != "root")),
            "verified_domains": await count(select(func.count()).select_from(Domain).where(
                Domain.workspace_id == workspace.id, Domain.status == "VERIFIED")),
        },
        "mail_domain": get_settings().mail_domain,
    }
