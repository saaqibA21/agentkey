import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.api.deps import Principal, require_scope
from app.core.exceptions import ProblemError
from app.core.security import assert_public_url, generate_webhook_secret
from app.db.models import WebhookDelivery, WebhookSubscription
from app.db.session import get_session
from app.services.audit import audit
from app.services.events import _iso

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


async def _load(session: AsyncSession, principal: Principal, webhook_id: uuid.UUID) -> WebhookSubscription:
    sub = await session.get(WebhookSubscription, webhook_id)
    if sub is None or sub.workspace_id != principal.workspace.id:
        raise ProblemError(404, "Webhook not found")
    return sub


@router.post("", status_code=201, response_model=schemas.WebhookCreated)
async def create_webhook(
    body: schemas.WebhookCreate, request: Request,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    await assert_public_url(body.target_url)
    sub = WebhookSubscription(
        workspace_id=principal.workspace.id, target_url=body.target_url,
        secret_token=generate_webhook_secret(), event_types=list(body.event_types),
    )
    session.add(sub)
    audit(session, action="webhook.create", actor=principal.actor, workspace_id=principal.workspace.id,
          target=body.target_url, request=request)
    await session.commit()
    return sub


@router.get("", response_model=list[schemas.WebhookOut])
async def list_webhooks(
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session)
):
    return (
        await session.scalars(
            select(WebhookSubscription).where(WebhookSubscription.workspace_id == principal.workspace.id)
        )
    ).all()


@router.patch("/{webhook_id}", response_model=schemas.WebhookOut)
async def update_webhook(
    webhook_id: uuid.UUID, body: schemas.WebhookUpdate,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    sub = await _load(session, principal, webhook_id)
    if body.event_types is not None:
        sub.event_types = list(body.event_types)
    if body.is_active is not None:
        sub.is_active = body.is_active
    await session.commit()
    return sub


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(
    webhook_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    sub = await _load(session, principal, webhook_id)
    await session.delete(sub)
    audit(session, action="webhook.delete", actor=principal.actor, workspace_id=principal.workspace.id,
          target=sub.target_url, request=request)
    await session.commit()


@router.get("/{webhook_id}/deliveries")
async def list_deliveries(
    webhook_id: uuid.UUID, limit: int = Query(50, ge=1, le=200),
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    await _load(session, principal, webhook_id)
    rows = (
        await session.scalars(
            select(WebhookDelivery).where(WebhookDelivery.subscription_id == webhook_id)
            .order_by(WebhookDelivery.created_at.desc()).limit(limit)
        )
    ).all()
    return {"data": [
        {"id": str(d.id), "event_type": d.event_type, "status": d.status, "attempts": d.attempts,
         "last_error": d.last_error, "next_attempt_at": _iso(d.next_attempt_at), "created_at": _iso(d.created_at)}
        for d in rows
    ]}
