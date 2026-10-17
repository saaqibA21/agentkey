"""Outbound mail relay adapters: console (dev), SMTP (AWS SES SMTP or any relay), Resend."""
import base64
import html as html_lib
import logging
import uuid
from dataclasses import dataclass, field
from email.message import EmailMessage

import httpx

from app.core.config import get_settings

logger = logging.getLogger("agentidentity.mail")

class MailSendError(Exception):
    pass


@dataclass
class OutboundEmail:
    sender: str
    recipient: str
    subject: str
    text: str
    html: str | None = None
    headers: dict[str, str] = field(default_factory=dict)
    attachments: list[tuple[str, str, bytes]] = field(default_factory=list)  # (filename, content_type, data)


def new_message_id(domain: str) -> str:
    return f"<{uuid.uuid4().hex}@{domain}>"


def disclosure_footer(workspace_name: str) -> str:
    return f"🤖 Sent autonomously by an AI agent operated by {workspace_name}."


def prepare_email(
    *, workspace_id, workspace_name: str, sender: str, recipient: str, subject: str,
    text: str, html: str | None, in_reply_to: str | None = None, references: str | None = None,
    owner_name: str | None = None, display_title: str | None = None,
) -> OutboundEmail:
    """Apply the non-negotiable platform headers and, on shared domains, the AI disclosure footer."""
    domain = sender.rsplit("@", 1)[-1].lower()
    headers = {
        "Message-ID": new_message_id(domain),
        "X-Agent-Operator-ID": str(workspace_id),
        "X-Agent-Platform": get_settings().platform_name,
        # Tells well-behaved auto-responders not to answer, which breaks agent<->autoresponder loops.
        "Auto-Submitted": "auto-generated",
    }
    if owner_name:
        headers["X-Agent-Owner"] = owner_name
    if in_reply_to:
        headers["In-Reply-To"] = in_reply_to
        headers["References"] = f"{references} {in_reply_to}".strip() if references else in_reply_to
    if domain in get_settings().shared_domain_set:
        footer = disclosure_footer(workspace_name)
        text = f"{text.rstrip()}\n\n--\n{footer}\n"
        if html:
            html = f'{html}<br><br><hr><p style="color:#666;font-size:12px">{html_lib.escape(footer)}</p>'

    # Format sender with Owner Delegation attribution
    if display_title:
        sender_formatted = f'"{display_title}" <{sender}>'
    elif owner_name:
        agent_handle = sender.split("@")[0]
        sender_formatted = f'"{owner_name} (via {agent_handle})" <{sender}>'
    else:
        sender_formatted = sender

    return OutboundEmail(sender=sender_formatted, recipient=recipient, subject=subject, text=text, html=html, headers=headers)


def _to_mime(mail: OutboundEmail) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = mail.sender
    msg["To"] = mail.recipient
    msg["Subject"] = mail.subject
    for name, value in mail.headers.items():
        msg[name] = value
    msg.set_content(mail.text)
    if mail.html:
        msg.add_alternative(mail.html, subtype="html")
    for filename, content_type, data in mail.attachments:
        maintype, _, subtype = content_type.partition("/")
        msg.add_attachment(data, maintype=maintype, subtype=subtype or "octet-stream", filename=filename)
    return msg


async def _send_smtp(mail: OutboundEmail) -> None:
    import aiosmtplib

    settings = get_settings()
    try:
        await aiosmtplib.send(
            _to_mime(mail),
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username or None,
            password=settings.smtp_password or None,
            start_tls=settings.smtp_port != 465,
            use_tls=settings.smtp_port == 465,
            timeout=20,
        )
    except (aiosmtplib.SMTPException, OSError) as exc:
        raise MailSendError(f"SMTP relay rejected the message: {exc}") from exc


async def _send_resend(mail: OutboundEmail) -> None:
    payload = {
        "from": mail.sender,
        "to": [mail.recipient],
        "subject": mail.subject,
        "text": mail.text,
        "headers": mail.headers,
    }
    if mail.html:
        payload["html"] = mail.html
    if mail.attachments:
        payload["attachments"] = [
            {"filename": name, "content": base64.b64encode(data).decode()} for name, _, data in mail.attachments
        ]
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                json=payload,
                headers={"Authorization": f"Bearer {get_settings().resend_api_key}"},
            )
    except httpx.HTTPError as exc:
        raise MailSendError(f"Resend request failed: {exc}") from exc
    if resp.status_code >= 300:
        raise MailSendError(f"Resend returned {resp.status_code}: {resp.text[:200]}")


# Captured by the console provider so tests and local demos can inspect what would have been sent.
console_outbox: list[OutboundEmail] = []


async def send_email(mail: OutboundEmail) -> None:
    provider = get_settings().mail_provider
    if provider == "smtp":
        await _send_smtp(mail)
    elif provider == "resend":
        await _send_resend(mail)
    else:
        console_outbox.append(mail)
        del console_outbox[:-100]
        logger.info("[console mail] %s -> %s | %s", mail.sender, mail.recipient, mail.subject)
