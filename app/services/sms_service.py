"""MSG91 adapter for Indian SMS over TRAI DLT routes.

DLT only delivers pre-registered templates, so a send is always ``template_id`` + variables;
free-form text is not possible on Indian routes.
"""
import logging
import uuid

import httpx

from app.core.config import get_settings
from app.services.whatsapp_service import ChannelError, ChannelNotConfigured, normalize_phone

logger = logging.getLogger("agentidentity.sms")

MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow"


def is_configured() -> bool:
    return bool(get_settings().msg91_auth_key)


async def send_sms(to_phone: str, template_id: str, variables: dict[str, str] | None = None) -> str:
    """Send a DLT template SMS. ``template_id`` is the MSG91 flow id mapped to the DLT template."""
    settings = get_settings()
    if not is_configured():
        if settings.is_production:
            raise ChannelNotConfigured("SMS is not configured on this deployment.")
        logger.info("[mock sms] -> %s | template=%s vars=%s", to_phone, template_id, variables)
        return f"mock-sms-{uuid.uuid4().hex}"

    mobile = normalize_phone(to_phone)
    if len(mobile) == 10:
        mobile = "91" + mobile
    payload: dict = {"template_id": template_id, "recipients": [{"mobiles": mobile, **(variables or {})}]}
    if settings.msg91_sender_id:
        payload["sender"] = settings.msg91_sender_id
    if settings.dlt_entity_id:
        payload["PE_ID"] = settings.dlt_entity_id
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(MSG91_FLOW_URL, json=payload, headers={"authkey": settings.msg91_auth_key})
    except httpx.HTTPError as exc:
        raise ChannelError(f"MSG91 request failed: {exc}") from exc
    body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    if resp.status_code >= 300 or body.get("type") == "error":
        raise ChannelError(f"MSG91 returned {resp.status_code}: {resp.text[:300]}")
    return str(body.get("message") or body.get("request_id") or "")
