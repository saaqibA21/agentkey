"""Meta WhatsApp Cloud API adapter."""
import logging
import uuid

import httpx

from app.core.config import get_settings

logger = logging.getLogger("agentidentity.whatsapp")

GRAPH_URL = "https://graph.facebook.com/v21.0"


class ChannelError(Exception):
    pass


class ChannelNotConfigured(ChannelError):
    pass


def normalize_phone(number: str) -> str:
    """Digits only, the form Meta and MSG91 both expect (country code, no plus)."""
    return "".join(ch for ch in number if ch.isdigit())


def is_configured() -> bool:
    s = get_settings()
    return bool(s.whatsapp_phone_number_id and s.whatsapp_access_token)


async def send_whatsapp(
    to_phone: str, text: str, *, template: str | None = None,
    template_language: str = "en", template_params: list[str] | None = None,
) -> str:
    """Send a session text message, or a pre-approved template when outside the 24h window.

    Returns the provider message id.
    """
    settings = get_settings()
    if not is_configured():
        if settings.is_production:
            raise ChannelNotConfigured("WhatsApp is not configured on this deployment.")
        logger.info("[mock whatsapp] -> %s | %s", to_phone, text)
        return f"mock-wa-{uuid.uuid4().hex}"

    payload: dict = {"messaging_product": "whatsapp", "to": normalize_phone(to_phone)}
    if template:
        payload["type"] = "template"
        payload["template"] = {"name": template, "language": {"code": template_language}}
        if template_params:
            payload["template"]["components"] = [
                {"type": "body", "parameters": [{"type": "text", "text": p} for p in template_params]}
            ]
    else:
        payload["type"] = "text"
        payload["text"] = {"body": text, "preview_url": False}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{GRAPH_URL}/{settings.whatsapp_phone_number_id}/messages",
                json=payload,
                headers={"Authorization": f"Bearer {settings.whatsapp_access_token}"},
            )
    except httpx.HTTPError as exc:
        raise ChannelError(f"WhatsApp request failed: {exc}") from exc
    if resp.status_code >= 300:
        raise ChannelError(f"WhatsApp API returned {resp.status_code}: {resp.text[:300]}")
    return resp.json().get("messages", [{}])[0].get("id", "")


def parse_inbound(payload: dict) -> list[dict]:
    """Flatten a Meta webhook payload into ``{from, to, text, provider_id}`` records (text messages only)."""
    out = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            to = value.get("metadata", {}).get("display_phone_number", "")
            for msg in value.get("messages", []):
                if msg.get("type") == "text":
                    body = msg.get("text", {}).get("body", "")
                elif msg.get("type") == "button":
                    body = msg.get("button", {}).get("text", "")
                else:
                    body = f"[{msg.get('type', 'unknown')} message]"
                out.append({"from": msg.get("from", ""), "to": to, "text": body, "provider_id": msg.get("id")})
    return out
