"""Store attachments and pull readable text out of them (PDF, plain text) without an LLM."""
import asyncio
import hashlib
import io
import logging
import re
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Attachment, Message
from app.services.storage import get_storage

logger = logging.getLogger("agentidentity.attachments")

MAX_TEXT_CHARS = 100_000
MAX_PDF_PAGES = 30
# File types that can execute on open; surfaced to agents as a warning, never auto-opened.
_RISKY = re.compile(
    r"\.(?:exe|scr|bat|cmd|com|pif|js|jse|vbs|vbe|wsf|hta|msi|jar|ps1|lnk|iso|img|dll|apk|html?|svg|docm|xlsm|pptm)$",
    re.IGNORECASE,
)
_TEXT_TYPES = ("text/plain", "text/csv", "text/markdown", "application/json", "text/calendar")


@dataclass
class IncomingAttachment:
    filename: str
    content_type: str
    data: bytes


def safe_filename(name: str | None) -> str:
    name = re.sub(r"[\x00-\x1f\\/:*?\"<>|]+", "_", (name or "").strip()).strip(". ")
    return name[:200] or "attachment"


def _pdf_text(data: bytes) -> str | None:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            return None
        parts, total = [], 0
        for page in reader.pages[:MAX_PDF_PAGES]:
            text = page.extract_text() or ""
            parts.append(text)
            total += len(text)
            if total >= MAX_TEXT_CHARS:
                break
        return "\n".join(parts)[:MAX_TEXT_CHARS].strip() or None
    except Exception as exc:  # malformed PDFs are routine in the wild
        logger.info("pdf text extraction failed: %s", exc)
        return None


async def extract_text(item: IncomingAttachment) -> str | None:
    content_type = item.content_type.lower()
    if content_type == "application/pdf" or item.filename.lower().endswith(".pdf"):
        return await asyncio.to_thread(_pdf_text, item.data)
    if content_type in _TEXT_TYPES:
        return item.data[:MAX_TEXT_CHARS].decode("utf-8", "replace").strip() or None
    return None


async def store(
    session: AsyncSession, *, workspace_id, message: Message, items: list[IncomingAttachment],
    with_text: bool = True,
) -> list[Attachment]:
    """Persist blobs + rows for ``message`` and return the rows (caller commits)."""
    rows = []
    for item in items:
        attachment_id = uuid.uuid4()
        key = f"{workspace_id}/{message.inbox_id}/{message.id}/{attachment_id}"
        await get_storage().put(key, item.data, item.content_type)
        row = Attachment(
            id=attachment_id, message_id=message.id, filename=safe_filename(item.filename),
            content_type=item.content_type[:127], size=len(item.data),
            sha256=hashlib.sha256(item.data).hexdigest(), storage_key=key,
            extracted_text=await extract_text(item) if with_text else None,
        )
        session.add(row)
        rows.append(row)
    return rows


def describe(row: Attachment) -> dict:
    info = {"id": str(row.id), "filename": row.filename, "content_type": row.content_type,
            "size": row.size, "has_text": bool(row.extracted_text)}
    if _RISKY.search(row.filename):
        info["risky"] = True
    return info


async def for_message(session: AsyncSession, message_id) -> list[Attachment]:
    return list((await session.scalars(
        select(Attachment).where(Attachment.message_id == message_id).order_by(Attachment.created_at)
    )).all())


async def purge_inbox(session: AsyncSession, inbox_id) -> None:
    """Delete every stored blob belonging to an inbox (rows go with the message delete)."""
    rows = (await session.scalars(
        select(Attachment).join(Message, Message.id == Attachment.message_id).where(Message.inbox_id == inbox_id)
    )).all()
    for row in rows:
        try:
            await get_storage().delete(row.storage_key)
        except Exception:
            logger.exception("failed to delete attachment blob %s", row.storage_key)
        await session.delete(row)
