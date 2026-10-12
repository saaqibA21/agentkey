import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.api.deps import Principal, load_inbox, require_scope
from app.core.exceptions import ProblemError
from app.api.v1.inbound import decode_attachments
from app.core.config import get_settings
from app.db.models import Attachment, Inbox, Message, Thread
from app.db.session import get_session
from app.services import outbound
from app.services.audit import audit
from app.services.events import _iso, serialize_message
from app.services.storage import get_storage
from app.services.whatsapp_service import normalize_phone

router = APIRouter(tags=["messages"])


def _sent_response(message: Message, response: Response) -> dict:
    if message.status == "PENDING_APPROVAL":
        response.status_code = 202
    return serialize_message(message)


async def _load_message(session: AsyncSession, principal: Principal, message_id: uuid.UUID) -> Message:
    row = (
        await session.execute(
            select(Message, Inbox).join(Inbox, Inbox.id == Message.inbox_id).where(Message.id == message_id)
        )
    ).first()
    if row is None or row[1].workspace_id != principal.workspace.id:
        raise ProblemError(404, "Message not found")
    return row[0]


async def _send_email(
    session, principal, inbox, request, *, to, subject, text, html, reply_to, attachments=()
) -> Message:
    files = decode_attachments(list(attachments), get_settings().max_outbound_attachment_bytes)
    message = await outbound.submit(
        session, workspace=principal.workspace, inbox=inbox, channel="EMAIL", recipient=to,
        subject=subject, text=text, html=html, reply_to=reply_to, attachments=files,
    )
    audit(session, action="message.send", actor=principal.actor, workspace_id=principal.workspace.id,
          target=message.id, detail={"channel": "EMAIL", "status": message.status}, request=request)
    await session.commit()
    return message


@router.post("/inboxes/{inbox_id}/messages/send")
async def send_email(
    inbox_id: uuid.UUID, body: schemas.SendEmail, request: Request, response: Response,
    principal: Principal = Depends(require_scope("send")), session: AsyncSession = Depends(get_session),
):
    """Send an email. Returns 202 with status PENDING_APPROVAL when a guardrail holds it for a human."""
    inbox = await load_inbox(session, principal, inbox_id)
    reply_to = None
    if body.in_reply_to:
        reply_to = await session.get(Message, body.in_reply_to)
        if reply_to is None or reply_to.inbox_id != inbox.id:
            raise ProblemError(404, "Message not found", "in_reply_to must reference a message in this inbox.")
    message = await _send_email(session, principal, inbox, request, to=str(body.to), subject=body.subject,
                                text=body.text, html=body.html, reply_to=reply_to, attachments=body.attachments)
    return _sent_response(message, response)


@router.post("/inboxes/{inbox_id}/messages/{message_id}/reply")
async def reply_to_message(
    inbox_id: uuid.UUID, message_id: uuid.UUID, body: schemas.ReplyEmail, request: Request, response: Response,
    principal: Principal = Depends(require_scope("send")), session: AsyncSession = Depends(get_session),
):
    inbox = await load_inbox(session, principal, inbox_id)
    original = await session.get(Message, message_id)
    if original is None or original.inbox_id != inbox.id or original.channel != "EMAIL":
        raise ProblemError(404, "Message not found")
    subject = original.subject or ""
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"
    to = original.sender if original.direction == "INBOUND" else original.recipient
    message = await _send_email(session, principal, inbox, request, to=to, subject=subject[:512],
                                text=body.text, html=body.html, reply_to=original, attachments=body.attachments)
    return _sent_response(message, response)


@router.post("/inboxes/{inbox_id}/whatsapp/send")
async def send_whatsapp(
    inbox_id: uuid.UUID, body: schemas.SendWhatsApp, request: Request, response: Response,
    principal: Principal = Depends(require_scope("send")), session: AsyncSession = Depends(get_session),
):
    if not body.message and not body.template:
        raise ProblemError(422, "Validation failed", "Provide 'message' or 'template'.")
    inbox = await load_inbox(session, principal, inbox_id)
    dispatch = None
    if body.template:
        dispatch = {"template": body.template, "template_language": body.template_language,
                    "template_params": body.template_params}
    text = body.message or f"[template {body.template}] " + " | ".join(body.template_params)
    message = await outbound.submit(
        session, workspace=principal.workspace, inbox=inbox, channel="WHATSAPP",
        recipient=normalize_phone(body.to_phone), text=text, dispatch=dispatch,
    )
    audit(session, action="message.send", actor=principal.actor, workspace_id=principal.workspace.id,
          target=message.id, detail={"channel": "WHATSAPP", "status": message.status}, request=request)
    await session.commit()
    return _sent_response(message, response)


@router.post("/inboxes/{inbox_id}/sms/send")
async def send_sms(
    inbox_id: uuid.UUID, body: schemas.SendSMS, request: Request, response: Response,
    principal: Principal = Depends(require_scope("send")), session: AsyncSession = Depends(get_session),
):
    inbox = await load_inbox(session, principal, inbox_id)
    text = body.preview_text or f"[template {body.template_id}] " + " | ".join(body.variables.values())
    message = await outbound.submit(
        session, workspace=principal.workspace, inbox=inbox, channel="SMS",
        recipient=normalize_phone(body.to_phone), text=text,
        dispatch={"template_id": body.template_id, "variables": body.variables},
    )
    audit(session, action="message.send", actor=principal.actor, workspace_id=principal.workspace.id,
          target=message.id, detail={"channel": "SMS", "status": message.status}, request=request)
    await session.commit()
    return _sent_response(message, response)


@router.get("/inboxes/{inbox_id}/messages")
async def list_messages(
    inbox_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    before: datetime | None = Query(None, description="Pagination cursor: created_at of the last item seen."),
    direction: Literal["INBOUND", "OUTBOUND"] | None = None,
    channel: Literal["EMAIL", "WHATSAPP", "SMS"] | None = None,
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    await load_inbox(session, principal, inbox_id)
    query = select(Message).where(Message.inbox_id == inbox_id)
    if before:
        query = query.where(Message.created_at < before)
    if direction:
        query = query.where(Message.direction == direction)
    if channel:
        query = query.where(Message.channel == channel)
    rows = (await session.scalars(query.order_by(Message.created_at.desc()).limit(limit))).all()
    return {"data": [serialize_message(m) for m in rows],
            "next_before": _iso(rows[-1].created_at) if len(rows) == limit else None}


@router.get("/messages/{message_id}")
async def get_message(
    message_id: uuid.UUID,
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    return serialize_message(await _load_message(session, principal, message_id), full=True)


@router.get("/attachments/{attachment_id}")
async def download_attachment(
    attachment_id: uuid.UUID,
    format: Literal["raw", "text"] = Query("raw", description="'text' returns text extracted from PDFs/text files."),
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    row = (
        await session.execute(
            select(Attachment, Inbox)
            .join(Message, Message.id == Attachment.message_id)
            .join(Inbox, Inbox.id == Message.inbox_id)
            .where(Attachment.id == attachment_id)
        )
    ).first()
    if row is None or row[1].workspace_id != principal.workspace.id:
        raise ProblemError(404, "Attachment not found")
    attachment = row[0]
    if format == "text":
        if not attachment.extracted_text:
            raise ProblemError(404, "No extracted text", "Text is available for PDFs and plain-text files only.")
        return {"id": str(attachment.id), "filename": attachment.filename, "text": attachment.extracted_text}
    data = await get_storage().get(attachment.storage_key)
    ascii_name = attachment.filename.encode("ascii", "replace").decode().replace('"', "_")
    # Always a download with a neutral type: attachments are untrusted and must never render on our origin.
    return Response(content=data, media_type="application/octet-stream", headers={
        "Content-Disposition": f'attachment; filename="{ascii_name}"',
        "X-Original-Content-Type": attachment.content_type,
        "Content-Security-Policy": "sandbox",
    })


def _thread_out(thread: Thread) -> dict:
    return {"id": str(thread.id), "inbox_id": str(thread.inbox_id), "subject": thread.subject,
            "participant_emails": thread.participant_emails, "message_count": thread.message_count,
            "last_message_at": _iso(thread.last_message_at)}


@router.get("/inboxes/{inbox_id}/threads")
async def list_threads(
    inbox_id: uuid.UUID, limit: int = Query(20, ge=1, le=100),
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    await load_inbox(session, principal, inbox_id)
    rows = (
        await session.scalars(
            select(Thread).where(Thread.inbox_id == inbox_id).order_by(Thread.last_message_at.desc()).limit(limit)
        )
    ).all()
    return {"data": [_thread_out(t) for t in rows]}


@router.get("/threads/{thread_id}")
async def get_thread(
    thread_id: uuid.UUID,
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    row = (
        await session.execute(
            select(Thread, Inbox).join(Inbox, Inbox.id == Thread.inbox_id).where(Thread.id == thread_id)
        )
    ).first()
    if row is None or row[1].workspace_id != principal.workspace.id:
        raise ProblemError(404, "Thread not found")
    messages = (
        await session.scalars(
            select(Message).where(Message.thread_id == thread_id).order_by(Message.created_at).limit(500)
        )
    ).all()
    return {**_thread_out(row[0]), "messages": [serialize_message(m) for m in messages]}
