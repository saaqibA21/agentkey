import asyncio
import json
import re
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.api.deps import Principal, load_inbox, require_scope
from app.core.cache import get_redis, inbox_channel
from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.db.models import Inbox, Message, Thread, utcnow
from app.db.session import get_session, get_sessionmaker
from app.services import attachments as attachment_service
from app.services import domains as domain_service
from app.services.audit import audit
from app.services.events import serialize_message
from app.services.whatsapp_service import normalize_phone

router = APIRouter(prefix="/inboxes", tags=["inboxes"])

# Anti-abuse: role accounts and brand names an agent inbox must never be able to claim.
_ROLE_NAMES = {
    "admin", "administrator", "postmaster", "abuse", "hostmaster", "webmaster", "security", "support",
    "noreply", "no-reply", "root", "billing", "help", "info", "mailer-daemon", "sales", "legal",
    "compliance", "accounts", "payments", "verify", "verification", "service", "team", "official",
}
_BRANDS = {
    "google", "gmail", "microsoft", "outlook", "apple", "icloud", "amazon", "aws", "paypal", "stripe",
    "razorpay", "paytm", "phonepe", "gpay", "bhim", "upi", "npci", "sbi", "hdfc", "icici", "axis", "kotak",
    "rbi", "sebi", "uidai", "aadhaar", "irctc", "incometax", "gst", "meta", "facebook", "whatsapp",
    "instagram", "netflix", "openai", "anthropic", "github", "linkedin", "twitter", "flipkart", "zomato",
    "swiggy", "visa", "mastercard", "rupay", "binance", "coinbase", "agentidentity",
}
_LEET = str.maketrans("0134578@$", "oleastbas")


def is_reserved_username(username: str) -> bool:
    plain = username.translate(_LEET)
    squashed = re.sub(r"[._-]", "", plain)
    # Role accounts only as the whole local part ("admin" yes, "admin-helper-bot" no).
    if {username, plain, squashed} & _ROLE_NAMES:
        return True
    # Brands as any token, and longer ones as substrings ("paypal-refunds", "g00gle.security").
    if (set(re.split(r"[._-]+", plain)) | {squashed}) & _BRANDS:
        return True
    return any(len(brand) >= 5 and brand in squashed for brand in _BRANDS)


@router.post("", response_model=schemas.InboxOut, status_code=201)
async def create_inbox(
    body: schemas.InboxCreate, request: Request, response: Response,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    workspace_id = principal.workspace.id

    async def _existing_for_client_id() -> Inbox | None:
        if not body.client_id:
            return None
        return await session.scalar(
            select(Inbox).where(Inbox.workspace_id == workspace_id, Inbox.client_id == body.client_id)
        )

    if existing := await _existing_for_client_id():
        if existing.status != "ACTIVE":
            raise ProblemError(409, "Client id retired", "This client_id belongs to a deleted inbox.")
        response.status_code = 200
        return existing

    settings = get_settings()
    domain = settings.mail_domain.lower()
    if body.domain and body.domain != domain:
        if not await domain_service.is_verified_for(session, workspace_id, body.domain):
            raise ProblemError(422, "Domain not verified",
                               f"{body.domain} is not a verified domain of this workspace.")
        domain = body.domain
    shared = domain == settings.mail_domain.lower() or domain in settings.shared_domain_set

    active = await session.scalar(
        select(func.count()).select_from(Inbox).where(Inbox.workspace_id == workspace_id, Inbox.status == "ACTIVE")
    )
    if active >= principal.workspace.max_inboxes:
        raise ProblemError(403, "Inbox limit reached",
                           f"Your plan allows {principal.workspace.max_inboxes} active inboxes. "
                           "Delete one or ask for a higher limit.")

    username = body.username or f"agent-{secrets.token_hex(6)}"
    # On a shared domain nobody may pose as a brand or a role account; on your own domain you may.
    if body.username and shared and is_reserved_username(username):
        raise ProblemError(422, "Username reserved", "This username is reserved to prevent impersonation.")
    address = f"{username}@{domain}"
    inbox = Inbox(
        workspace_id=workspace_id, email_address=address, client_id=body.client_id,
        phone_number=normalize_phone(body.phone_number) if body.phone_number else None,
    )
    session.add(inbox)
    audit(session, action="inbox.create", actor=principal.actor, workspace_id=workspace_id,
          target=address, request=request)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        # Lost a race with an identical idempotent request, or the address is taken (incl. tombstones).
        if existing := await _existing_for_client_id():
            response.status_code = 200
            return existing
        raise ProblemError(409, "Address unavailable", f"{address} is already taken.") from None
    return inbox


@router.get("", response_model=list[schemas.InboxOut])
async def list_inboxes(
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    return (
        await session.scalars(
            select(Inbox)
            .where(Inbox.workspace_id == principal.workspace.id, Inbox.status == "ACTIVE")
            .order_by(Inbox.created_at.desc()).limit(limit).offset(offset)
        )
    ).all()


@router.get("/{inbox_id}", response_model=schemas.InboxOut)
async def get_inbox(
    inbox_id: uuid.UUID,
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    return await load_inbox(session, principal, inbox_id)


@router.delete("/{inbox_id}", status_code=204)
async def delete_inbox(
    inbox_id: uuid.UUID, request: Request,
    purge: bool = Query(False, description="Also erase all stored messages (DPDP erasure request)."),
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    inbox = await load_inbox(session, principal, inbox_id)
    # Tombstone instead of deleting: the address is never reissued, so a later tenant cannot
    # receive mail (password resets, OTPs) meant for the previous owner.
    inbox.status = "TOMBSTONED"
    inbox.phone_number = None
    if purge:
        await attachment_service.purge_inbox(session, inbox.id)
        await session.execute(delete(Message).where(Message.inbox_id == inbox.id))
        await session.execute(delete(Thread).where(Thread.inbox_id == inbox.id))
    audit(session, action="inbox.delete", actor=principal.actor, workspace_id=principal.workspace.id,
          target=inbox.email_address, detail={"purge": purge}, request=request)
    await session.commit()


_WAIT_FIELD = {"otp": "otp_code", "magic_link": "magic_link"}


def _wait_result(kind: str, message: dict) -> dict | None:
    if message.get("direction") != "INBOUND":
        return None
    if kind == "message":
        return {"message": message}
    value = (message.get("extracted_data") or {}).get(_WAIT_FIELD[kind])
    return {_WAIT_FIELD[kind]: value, "message": message} if value else None


@router.get("/{inbox_id}/wait")
async def wait_for(
    inbox_id: uuid.UUID,
    kind: Literal["otp", "magic_link", "message"] = Query("otp", alias="for"),
    timeout: float = Query(30, ge=0, le=120),
    lookback: float = Query(
        60, ge=0, le=3600,
        description="Also accept a match that arrived up to this many seconds before the call.",
    ),
    since: datetime | None = Query(None, description="Only accept messages created after this instant."),
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    """Long-poll until an OTP, magic link or any inbound message arrives. 204 on timeout."""
    await load_inbox(session, principal, inbox_id)
    await session.close()  # do not pin a pooled connection for the whole wait
    cutoff = since or (utcnow() - timedelta(seconds=lookback))

    pubsub = get_redis().pubsub()
    await pubsub.subscribe(inbox_channel(inbox_id))  # subscribe first so nothing slips between the two reads
    try:
        async with get_sessionmaker()() as fresh:
            recent = (
                await fresh.scalars(
                    select(Message)
                    .where(Message.inbox_id == inbox_id, Message.direction == "INBOUND",
                           Message.created_at >= cutoff)
                    .order_by(Message.created_at.desc()).limit(25)
                )
            ).all()
        for message in recent:
            if result := _wait_result(kind, serialize_message(message)):
                return result

        deadline = asyncio.get_running_loop().time() + timeout
        while (remaining := deadline - asyncio.get_running_loop().time()) > 0:
            event = await pubsub.get_message(ignore_subscribe_messages=True, timeout=min(remaining, 1.0))
            if event is None:
                continue
            payload = json.loads(event["data"])
            if payload.get("type") != "message.received":
                continue
            if result := _wait_result(kind, payload["message"]):
                return result
    finally:
        await pubsub.unsubscribe()
        await pubsub.aclose()
    return Response(status_code=204)
