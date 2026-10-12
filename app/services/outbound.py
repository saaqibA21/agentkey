"""Outbound pipeline shared by every channel: quota -> guardrails -> (hold | dispatch)."""
import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ProblemError
from app.core.rate_limiter import release_daily_send, reserve_daily_send
from app.db.models import Inbox, Message, Thread, Workspace, utcnow
from app.services import guardrails, mail_sender, sms_service, whatsapp_service
from app.services.events import emit_events
from app.services.mail_sender import MailSendError, OutboundEmail
from app.services.whatsapp_service import ChannelError, ChannelNotConfigured

logger = logging.getLogger("agentidentity.outbound")


async def touch_thread(
    session: AsyncSession, inbox_id, *, thread_id=None, subject: str = "", participants: list[str],
) -> Thread:
    """Attach a message to ``thread_id`` or open a new thread, keeping counters current."""
    thread = await session.get(Thread, thread_id) if thread_id else None
    if thread is None:
        thread = Thread(inbox_id=inbox_id, subject=subject[:512], participant_emails=[], message_count=0)
        session.add(thread)
    thread.message_count = (thread.message_count or 0) + 1
    thread.last_message_at = utcnow()
    known = list(thread.participant_emails or [])
    thread.participant_emails = known + [p for p in dict.fromkeys(participants) if p and p not in known]
    await session.flush()
    return thread


async def channel_thread_id(session: AsyncSession, inbox_id, channel: str, counterpart: str):
    """WhatsApp/SMS conversations thread per counterpart number."""
    return await session.scalar(
        select(Thread.id).where(Thread.inbox_id == inbox_id, Thread.subject == f"{channel} {counterpart}")
    )


async def _dispatch(message: Message) -> None:
    dispatch = (message.extracted_data or {}).get("dispatch", {})
    if message.channel == "EMAIL":
        await mail_sender.send_email(OutboundEmail(
            sender=message.sender, recipient=message.recipient, subject=message.subject or "",
            text=message.body_text, html=message.body_html, headers=dict(message.headers or {}),
        ))
    elif message.channel == "WHATSAPP":
        message.message_id_header = await whatsapp_service.send_whatsapp(
            message.recipient, message.body_text,
            template=dispatch.get("template"),
            template_language=dispatch.get("template_language", "en"),
            template_params=dispatch.get("template_params"),
        )
    else:
        message.message_id_header = await sms_service.send_sms(
            message.recipient, dispatch.get("template_id", ""), dispatch.get("variables")
        )


async def deliver(session: AsyncSession, message: Message, workspace_id) -> Message:
    """Send a message that is already in SENDING state and record the outcome."""
    try:
        await _dispatch(message)
    except (MailSendError, ChannelError) as exc:
        message.status = "FAILED"
        message.extracted_data = {**(message.extracted_data or {}), "error": str(exc)[:500]}
        await release_daily_send(workspace_id)
        await emit_events(session, workspace_id=workspace_id, inbox_id=message.inbox_id,
                          event_types=["message.failed"], message=message)
        logger.warning("outbound message %s failed: %s", message.id, exc)
        if isinstance(exc, ChannelNotConfigured):
            raise ProblemError(503, "Channel not configured", str(exc)) from exc
        raise ProblemError(502, "Upstream delivery failed", "The delivery provider rejected the message.",
                           message_id=str(message.id)) from exc
    message.status = "SENT"
    await emit_events(session, workspace_id=workspace_id, inbox_id=message.inbox_id,
                      event_types=["message.sent"], message=message)
    return message


async def submit(
    session: AsyncSession, *, workspace: Workspace, inbox: Inbox, channel: str, recipient: str,
    text: str, subject: str | None = None, html: str | None = None,
    reply_to: Message | None = None, dispatch: dict | None = None,
) -> Message:
    if not workspace.outbound_enabled:
        raise ProblemError(
            403, "Outbound disabled",
            "Outbound sending is not enabled for this workspace yet. Inbound works immediately; "
            "sending unlocks after verification.",
        )
    if not await reserve_daily_send(workspace.id, workspace.daily_send_limit):
        raise ProblemError(
            429, "Daily send limit reached",
            f"This workspace may send {workspace.daily_send_limit} messages per day (UTC).",
            headers={"Retry-After": "3600"},
        )
    try:
        decision = await guardrails.evaluate(session, workspace.id, f"{subject or ''}\n{text}")

        headers: dict = {}
        if channel == "EMAIL":
            mail = mail_sender.prepare_email(
                workspace_id=workspace.id, workspace_name=workspace.name, sender=inbox.email_address,
                recipient=recipient, subject=subject or "", text=text, html=html,
                in_reply_to=reply_to.message_id_header if reply_to else None,
                references=(reply_to.headers or {}).get("References") if reply_to else None,
            )
            text, html, headers = mail.text, mail.html, mail.headers
            thread = await touch_thread(
                session, inbox.id, thread_id=reply_to.thread_id if reply_to else None,
                subject=subject or "", participants=[recipient],
            )
            sender = inbox.email_address
        else:
            thread = await touch_thread(
                session, inbox.id, thread_id=await channel_thread_id(session, inbox.id, channel, recipient),
                subject=f"{channel} {recipient}", participants=[recipient],
            )
            sender = inbox.phone_number or inbox.email_address

        extracted: dict = {}
        if dispatch:
            extracted["dispatch"] = dispatch
        hold = decision.action == guardrails.HOLD
        if decision.action != "ALLOW":
            extracted["hitl"] = {"action": decision.action, "matched": decision.matched,
                                 "policy_id": str(decision.policy.id)}
        message = Message(
            inbox_id=inbox.id, thread_id=thread.id, channel=channel, direction="OUTBOUND",
            sender=sender, recipient=recipient, subject=subject, body_text=text, body_html=html,
            headers=headers, extracted_data=extracted, message_id_header=headers.get("Message-ID"),
            status="PENDING_APPROVAL" if hold else "SENDING",
        )
        session.add(message)
        await session.commit()
    except Exception:
        await release_daily_send(workspace.id)
        raise

    if hold:
        error = await guardrails.notify(decision, message, inbox)
        if error:
            message.extracted_data = {**message.extracted_data,
                                      "hitl": {**message.extracted_data["hitl"], "notification_error": error}}
        await emit_events(session, workspace_id=workspace.id, inbox_id=inbox.id,
                          event_types=["message.pending_approval"], message=message)
        return message

    await deliver(session, message, workspace.id)
    if decision.action == guardrails.NOTIFY:
        await guardrails.notify(decision, message, inbox)
    return message


async def resolve_pending(session: AsyncSession, message_id, workspace_id, approve: bool) -> Message:
    """Atomically claim a held message so two approvers cannot both release it."""
    claimed = await session.execute(
        update(Message)
        .where(Message.id == message_id, Message.status == "PENDING_APPROVAL")
        .values(status="SENDING" if approve else "REJECTED")
    )
    await session.commit()
    message = await session.get(Message, message_id, populate_existing=True)
    if message is None:
        raise ProblemError(404, "Message not found")
    if claimed.rowcount != 1:
        raise ProblemError(409, "Already resolved", f"This message is already {message.status}.")
    if approve:
        return await deliver(session, message, workspace_id)
    await release_daily_send(workspace_id)
    await emit_events(session, workspace_id=workspace_id, inbox_id=message.inbox_id,
                      event_types=["message.rejected"], message=message)
    return message
