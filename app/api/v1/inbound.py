"""Inbound webhooks: email (Cloudflare Email Worker or any signed forwarder), WhatsApp (Meta), SMS."""
import base64
import binascii
import json
import logging

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from fastapi.responses import PlainTextResponse
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.core.security import constant_time_equals, verify_meta_signature, verify_signed_payload
from app.db.session import get_session
from app.services import inbound_processor, whatsapp_service
from app.services.inbound_processor import InboundEmail

router = APIRouter(prefix="/inbound", tags=["inbound"])
logger = logging.getLogger("agentidentity.inbound")

INGEST_SIGNATURE_HEADER = "X-Ingest-Signature"


async def _signed_body(request: Request, signature: str | None) -> bytes:
    settings = get_settings()
    body = await request.body()
    if len(body) > settings.max_inbound_bytes * 4 // 3 + 4096:
        raise ProblemError(413, "Payload too large")
    if not verify_signed_payload(
        settings.ingest_secret, body, signature, settings.ingest_signature_tolerance_seconds
    ):
        raise ProblemError(401, "Invalid signature", f"{INGEST_SIGNATURE_HEADER} is missing, stale or wrong.")
    return body


def _parse(model, body: bytes):
    try:
        return model.model_validate_json(body)
    except ValidationError as exc:
        raise ProblemError(422, "Validation failed", "Malformed ingest payload.",
                           errors=[{"field": ".".join(map(str, e["loc"])), "message": e["msg"]}
                                   for e in exc.errors()]) from None


@router.post("/ingest", status_code=202)
async def ingest_email(
    request: Request, response: Response,
    x_ingest_signature: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
):
    payload = _parse(schemas.IngestPayload, await _signed_body(request, x_ingest_signature))
    if payload.raw:
        try:
            raw = base64.b64decode(payload.raw, validate=True)
        except (binascii.Error, ValueError):
            raise ProblemError(422, "Validation failed", "'raw' must be base64.") from None
        mail = inbound_processor.parse_mime(raw, payload.envelope_from, payload.envelope_to)
    else:
        if not payload.sender or not (payload.to or payload.envelope_to):
            raise ProblemError(422, "Validation failed", "Provide 'raw' or both 'from' and 'to'.")
        mail = InboundEmail(
            sender=payload.sender.strip().lower(),
            recipients=[a.strip().lower() for a in (payload.envelope_to, payload.to) if a],
            subject=payload.subject, text=payload.text, html=payload.html, headers=payload.headers,
        )
    message, created = await inbound_processor.ingest_email(session, mail)
    if not created:
        response.status_code = 200
    return {"message_id": str(message.id), "inbox_id": str(message.inbox_id),
            "thread_id": str(message.thread_id), "duplicate": not created}


@router.post("/sms", status_code=202)
async def ingest_sms(
    request: Request, x_ingest_signature: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
):
    payload = _parse(schemas.InboundSMS, await _signed_body(request, x_ingest_signature))
    message = await inbound_processor.ingest_channel_message(
        session, channel="SMS", sender=payload.sender, recipient=payload.to,
        text=payload.text, provider_id=payload.provider_id,
    )
    if message is None:
        raise ProblemError(404, "Unknown recipient", "No inbox is paired with this conversation.")
    return {"message_id": str(message.id), "inbox_id": str(message.inbox_id)}


@router.get("/whatsapp", response_class=PlainTextResponse)
async def whatsapp_verify(
    mode: str = Query("", alias="hub.mode"),
    token: str = Query("", alias="hub.verify_token"),
    challenge: str = Query("", alias="hub.challenge"),
):
    """Meta's one-time webhook verification handshake."""
    expected = get_settings().whatsapp_verify_token
    if mode == "subscribe" and expected and constant_time_equals(token, expected):
        return challenge
    raise ProblemError(403, "Verification failed")


@router.post("/whatsapp")
async def whatsapp_webhook(
    request: Request, x_hub_signature_256: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    body = await request.body()
    if not settings.whatsapp_app_secret or not verify_meta_signature(
        settings.whatsapp_app_secret, body, x_hub_signature_256
    ):
        raise ProblemError(401, "Invalid signature")
    try:
        records = whatsapp_service.parse_inbound(json.loads(body))
    except (ValueError, AttributeError):
        raise ProblemError(422, "Validation failed", "Malformed WhatsApp payload.") from None
    stored = 0
    for record in records:
        message = await inbound_processor.ingest_channel_message(
            session, channel="WHATSAPP", sender=record["from"], recipient=record["to"],
            text=record["text"], provider_id=record["provider_id"],
        )
        stored += message is not None
    # Always 200 once authenticated, otherwise Meta retries unroutable messages for days.
    return {"received": len(records), "stored": stored}
