"""Event fan-out: Redis pub/sub for WebSocket and long-poll consumers, durable outbox rows for webhooks."""
import json
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_redis, inbox_channel
from app.db.models import Message, WebhookDelivery, WebhookSubscription, utcnow

logger = logging.getLogger("agentidentity.events")


def _iso(dt) -> str | None:
    if dt is None:
        return None
    return dt.isoformat().replace("+00:00", "Z") if dt.tzinfo else dt.isoformat() + "Z"


def serialize_message(m: Message, full: bool = False) -> dict:
    data = {
        "id": str(m.id),
        "inbox_id": str(m.inbox_id),
        "thread_id": str(m.thread_id) if m.thread_id else None,
        "channel": m.channel,
        "direction": m.direction,
        "sender": m.sender,
        "recipient": m.recipient,
        "subject": m.subject,
        "body_text": m.body_text,
        "extracted_data": m.extracted_data or {},
        "status": m.status,
        "message_id": m.message_id_header,
        "created_at": _iso(m.created_at),
    }
    if full:
        data["body_html"] = m.body_html
        data["headers"] = m.headers or {}
    return data


async def emit_events(
    session: AsyncSession, *, workspace_id, inbox_id, event_types: list[str], message: Message
) -> None:
    """Commit the caller's work together with webhook outbox rows, then publish to Redis."""
    from app.services.webhook_dispatcher import dispatcher

    subs = (
        await session.scalars(
            select(WebhookSubscription).where(
                WebhookSubscription.workspace_id == workspace_id, WebhookSubscription.is_active.is_(True)
            )
        )
    ).all()
    payloads = []
    for event_type in event_types:
        payload = {
            "id": f"evt_{uuid.uuid4().hex}",
            "type": event_type,
            "inbox_id": str(inbox_id),
            "created_at": _iso(utcnow()),
            "message": serialize_message(message),
        }
        payloads.append(payload)
        for sub in subs:
            if "*" in sub.event_types or event_type in sub.event_types:
                session.add(WebhookDelivery(subscription_id=sub.id, event_type=event_type, payload=payload))
    await session.commit()

    for payload in payloads:
        try:
            await get_redis().publish(inbox_channel(inbox_id), json.dumps(payload))
        except Exception:  # realtime is best-effort; the message itself is already durable
            logger.exception("redis publish failed for inbox %s", inbox_id)
    dispatcher.wake()
