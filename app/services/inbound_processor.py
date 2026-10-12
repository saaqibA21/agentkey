"""Turn raw inbound traffic (MIME email, WhatsApp, SMS) into stored, parsed, threaded messages."""
import email
import email.policy
import email.utils
import re
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.core.rate_limiter import reserve_daily_send
from app.db.models import Inbox, Message, Workspace
from app.services import attachments as attachment_service
from app.services import edge_parser
from app.services.attachments import IncomingAttachment
from app.services.events import emit_events
from app.services.outbound import channel_thread_id, touch_thread
from app.services.whatsapp_service import normalize_phone

_MSG_ID = re.compile(r"<[^<>\s]+>")
MAX_HEADER_VALUE = 2000


@dataclass
class InboundEmail:
    sender: str
    recipients: list[str]
    subject: str = ""
    text: str = ""
    html: str | None = None
    headers: dict[str, str] = field(default_factory=dict)
    attachments: list[IncomingAttachment] = field(default_factory=list)
    skipped_attachments: list[dict] = field(default_factory=list)  # over the size limit; metadata only


def _address(value: str) -> str:
    return email.utils.parseaddr(value or "")[1].strip().lower()


def parse_mime(raw: bytes, envelope_from: str | None = None, envelope_to: str | None = None) -> InboundEmail:
    msg = email.message_from_bytes(raw, policy=email.policy.default)
    headers = {name: str(value)[:MAX_HEADER_VALUE] for name, value in msg.items()}

    def _content(part) -> str:
        try:
            return part.get_content() if part is not None else ""
        except (LookupError, UnicodeDecodeError):
            return (part.get_payload(decode=True) or b"").decode("utf-8", "replace")

    text = _content(msg.get_body(preferencelist=("plain",)))
    html = _content(msg.get_body(preferencelist=("html",))) or None
    attachments, skipped = [], []
    for part in msg.iter_attachments():
        data = part.get_payload(decode=True) or b""
        name = attachment_service.safe_filename(part.get_filename())
        if len(data) > get_settings().max_attachment_bytes:
            skipped.append({"filename": name, "content_type": part.get_content_type(), "size": len(data),
                            "skipped": "too_large"})
        elif data:
            attachments.append(IncomingAttachment(name, part.get_content_type(), data))
    recipients = [envelope_to] if envelope_to else []
    recipients += [addr for _, addr in email.utils.getaddresses(msg.get_all("To", []) + msg.get_all("Cc", []))]
    return InboundEmail(
        sender=_address(str(msg.get("From", ""))) or _address(envelope_from or ""),
        recipients=[r.strip().lower() for r in recipients if r],
        subject=str(msg.get("Subject", "")),
        text=text, html=html, headers=headers, attachments=attachments, skipped_attachments=skipped,
    )


def _header(headers: dict[str, str], name: str) -> str:
    name = name.lower()
    return next((v for k, v in headers.items() if k.lower() == name), "")


def _apply_attachment_text(extracted: dict, rows) -> None:
    """Documents count too: read invoices out of PDFs and flag instructions hidden in attachments."""
    for row in rows:
        if not row.extracted_text:
            continue
        if "invoice" not in extracted and (invoice := edge_parser.extract_invoice(row.extracted_text)):
            extracted["invoice"] = {**invoice, "source": row.filename}
            if extracted.get("intent") in ("general", "reply"):
                extracted["intent"] = "invoice"
        if signals := edge_parser.detect_prompt_injection(row.extracted_text):
            security = extracted.setdefault("security", {"prompt_injection_suspected": True, "signals": []})
            security["signals"] = sorted(set(security["signals"]) | {f"attachment:{s}" for s in signals})


async def ingest_email(session: AsyncSession, mail: InboundEmail) -> tuple[Message, bool]:
    """Store an inbound email. Returns ``(message, created)``; redelivery of the same Message-ID is a no-op."""
    inbox = None
    for address in dict.fromkeys(mail.recipients):
        inbox = await session.scalar(
            select(Inbox).where(Inbox.email_address == address, Inbox.status == "ACTIVE")
        )
        if inbox:
            break
    if inbox is None:
        raise ProblemError(404, "Unknown recipient", "No active inbox matches the recipient address.")

    message_id = (_MSG_ID.search(_header(mail.headers, "Message-ID")) or [None])[0]
    if message_id:
        existing = await session.scalar(
            select(Message).where(
                Message.inbox_id == inbox.id, Message.direction == "INBOUND",
                Message.message_id_header == message_id,
            )
        )
        if existing:
            return existing, False

    workspace = await session.get(Workspace, inbox.workspace_id)
    if not await reserve_daily_send(workspace.id, workspace.inbound_daily_limit, kind="inbound"):
        # 429 makes the forwarder defer, so the sending server retries after the quota resets.
        raise ProblemError(429, "Inbound limit reached", "This workspace's daily receive limit is used up.",
                           headers={"Retry-After": "3600"})
    extracted, text, html = edge_parser.parse_message(
        sender=mail.sender, subject=mail.subject, text=mail.text, html=mail.html,
        headers=mail.headers, mask=workspace.pii_masking_enabled,
    )

    # Thread on In-Reply-To / References pointing at any message we already hold for this inbox.
    referenced = _MSG_ID.findall(_header(mail.headers, "In-Reply-To") + " " + _header(mail.headers, "References"))
    thread_id = None
    if referenced:
        thread_id = await session.scalar(
            select(Message.thread_id)
            .where(Message.inbox_id == inbox.id, Message.message_id_header.in_(referenced),
                   Message.thread_id.is_not(None))
            .order_by(Message.created_at.desc())
            .limit(1)
        )
    thread = await touch_thread(
        session, inbox.id, thread_id=thread_id, subject=mail.subject, participants=[mail.sender],
    )

    message = Message(
        id=uuid.uuid4(), inbox_id=inbox.id, thread_id=thread.id, channel="EMAIL", direction="INBOUND",
        sender=mail.sender[:255], recipient=inbox.email_address, subject=mail.subject[:512],
        body_text=text, body_html=html, headers=mail.headers, extracted_data=dict(extracted),
        status="DELIVERED", message_id_header=message_id,
    )
    session.add(message)
    if mail.attachments or mail.skipped_attachments:
        await session.flush()
        rows = await attachment_service.store(
            session, workspace_id=workspace.id, message=message, items=mail.attachments
        )
        extracted["attachments"] = [attachment_service.describe(r) for r in rows] + mail.skipped_attachments
        _apply_attachment_text(extracted, rows)

    events = []
    actionable = bool(extracted.get("otp_code") or extracted.get("magic_link"))
    # Loop guard: auto-replies and bulk mail are stored but must not wake an agent that could
    # answer them. Verification mail is exempt because providers routinely mark it auto-generated.
    if not extracted.get("auto_generated") or actionable:
        events.append("message.received")
        if extracted.get("otp_code"):
            events.append("otp.extracted")
        if extracted.get("magic_link"):
            events.append("magic_link.extracted")
    else:
        extracted["wake_suppressed"] = True
    message.extracted_data = dict(extracted)  # JSON columns only persist on reassignment
    await emit_events(session, workspace_id=inbox.workspace_id, inbox_id=inbox.id,
                      event_types=events, message=message)
    return message, True


async def ingest_channel_message(
    session: AsyncSession, *, channel: str, sender: str, recipient: str, text: str, provider_id: str | None,
) -> Message | None:
    """Store an inbound WhatsApp/SMS message. Returns None when no inbox can be resolved."""
    sender, recipient = normalize_phone(sender), normalize_phone(recipient)
    # 1) an inbox that owns the destination number; 2) the inbox that last messaged this person.
    inbox = None
    if recipient:
        inbox = await session.scalar(
            select(Inbox).where(Inbox.phone_number == recipient, Inbox.status == "ACTIVE")
        )
    if inbox is None:
        inbox = await session.scalar(
            select(Inbox)
            .join(Message, Message.inbox_id == Inbox.id)
            .where(Message.channel == channel, Message.direction == "OUTBOUND",
                   Message.recipient == sender, Inbox.status == "ACTIVE")
            .order_by(Message.created_at.desc())
            .limit(1)
        )
    if inbox is None:
        return None
    if provider_id:
        existing = await session.scalar(
            select(Message).where(Message.inbox_id == inbox.id, Message.message_id_header == provider_id)
        )
        if existing:
            return existing

    workspace = await session.get(Workspace, inbox.workspace_id)
    extracted, text, _ = edge_parser.parse_message(
        sender=sender, subject=None, text=text, html=None, headers={}, mask=workspace.pii_masking_enabled,
    )
    thread = await touch_thread(
        session, inbox.id, thread_id=await channel_thread_id(session, inbox.id, channel, sender),
        subject=f"{channel} {sender}", participants=[sender],
    )
    message = Message(
        inbox_id=inbox.id, thread_id=thread.id, channel=channel, direction="INBOUND",
        sender=sender, recipient=recipient or (inbox.phone_number or ""), body_text=text,
        extracted_data=extracted, status="DELIVERED", message_id_header=provider_id,
    )
    session.add(message)
    events = ["message.received"]
    if extracted.get("otp_code"):
        events.append("otp.extracted")
    if extracted.get("magic_link"):
        events.append("magic_link.extracted")
    await emit_events(session, workspace_id=inbox.workspace_id, inbox_id=inbox.id,
                      event_types=events, message=message)
    return message
