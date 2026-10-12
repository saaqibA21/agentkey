"""AgentIdentity Python SDK.

    from agentidentity import AgentIdentity

    client = AgentIdentity(api_key="ai_live_xxxx")
    inbox = client.inboxes.create(username="lead-bot", client_id="session-001")
    otp = client.inboxes.wait_for_otp(inbox_id=inbox.id, timeout=30)

``AsyncAgentIdentity`` exposes the same surface with ``await``.
"""
import hashlib
import hmac
import os
import time
from typing import Any, Dict, List, Optional

import httpx

from .models import HITLPolicy, Inbox, Message, Thread, Webhook

DEFAULT_BASE_URL = "https://api.agentidentity.dev"
MAX_SERVER_WAIT = 100.0  # the API caps one long-poll at 120s; stay under it and loop


class AgentIdentityError(Exception):
    """Raised for any non-2xx response. Mirrors the API's RFC 7807 problem document."""

    def __init__(self, status: int, title: str, detail: Optional[str] = None, problem: Optional[dict] = None):
        super().__init__(f"{status} {title}" + (f": {detail}" if detail else ""))
        self.status = status
        self.title = title
        self.detail = detail
        self.problem = problem or {}


def verify_webhook_signature(secret: str, body: bytes, signature_header: str, tolerance: int = 300) -> bool:
    """Check the ``X-AgentIdentity-Signature`` header of a webhook delivery against the raw request body."""
    try:
        parts = dict(p.split("=", 1) for p in signature_header.split(","))
        timestamp = int(parts["t"])
    except (KeyError, ValueError):
        return False
    if abs(time.time() - timestamp) > tolerance:
        return False
    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts.get("v1", ""))


def _clean(params: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in params.items() if v is not None}


def _raise_for_status(resp: httpx.Response) -> Any:
    if resp.status_code == 204:
        return None
    if resp.status_code >= 400:
        try:
            problem = resp.json()
        except ValueError:
            problem = {}
        raise AgentIdentityError(resp.status_code, problem.get("title", resp.reason_phrase),
                                 problem.get("detail"), problem)
    return resp.json()


def _config(api_key: Optional[str], base_url: Optional[str]) -> Dict[str, Any]:
    api_key = api_key or os.environ.get("AGENTIDENTITY_API_KEY")
    if not api_key:
        raise ValueError("api_key is required (or set AGENTIDENTITY_API_KEY)")
    base = (base_url or os.environ.get("AGENTIDENTITY_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
    return {"base_url": base + "/v1", "headers": {"Authorization": f"Bearer {api_key}",
                                                   "User-Agent": "agentidentity-python/0.1.0"}}


def _wait_params(kind: str, remaining: float, first: bool, started_at: str) -> Dict[str, Any]:
    params: Dict[str, Any] = {"for": kind, "timeout": max(0.0, min(remaining, MAX_SERVER_WAIT))}
    if not first:
        params["since"] = started_at  # later polls must not re-match on the lookback window
    return params


# --------------------------------------------------------------------------- sync

class _Inboxes:
    def __init__(self, client: "AgentIdentity"):
        self._c = client

    def create(self, username: Optional[str] = None, client_id: Optional[str] = None,
               phone_number: Optional[str] = None) -> Inbox:
        """Create an inbox. With ``client_id`` the call is idempotent and returns the existing inbox."""
        body = _clean({"username": username, "client_id": client_id, "phone_number": phone_number})
        return Inbox(**self._c._request("POST", "/inboxes", json=body))

    def list(self, limit: int = 50, offset: int = 0) -> List[Inbox]:
        return [Inbox(**i) for i in self._c._request("GET", "/inboxes", params={"limit": limit, "offset": offset})]

    def get(self, inbox_id: str) -> Inbox:
        return Inbox(**self._c._request("GET", f"/inboxes/{inbox_id}"))

    def delete(self, inbox_id: str, purge: bool = False) -> None:
        self._c._request("DELETE", f"/inboxes/{inbox_id}", params={"purge": str(purge).lower()})

    def _wait(self, inbox_id: str, kind: str, timeout: float) -> Optional[dict]:
        deadline = time.monotonic() + timeout
        started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        first = True
        while True:
            remaining = deadline - time.monotonic()
            params = _wait_params(kind, remaining, first, started_at)
            result = self._c._request("GET", f"/inboxes/{inbox_id}/wait", params=params,
                                      timeout=params["timeout"] + 15)
            if result is not None or deadline - time.monotonic() <= 0:
                return result
            first = False

    def wait_for_otp(self, inbox_id: str, timeout: float = 30) -> Optional[str]:
        """Block until an OTP arrives (or arrived in the last 60s). Returns None on timeout."""
        result = self._wait(inbox_id, "otp", timeout)
        return result["otp_code"] if result else None

    def wait_for_magic_link(self, inbox_id: str, timeout: float = 30) -> Optional[str]:
        result = self._wait(inbox_id, "magic_link", timeout)
        return result["magic_link"] if result else None

    def wait_for_message(self, inbox_id: str, timeout: float = 30) -> Optional[Message]:
        result = self._wait(inbox_id, "message", timeout)
        return Message(**result["message"]) if result else None


class _Messages:
    def __init__(self, client: "AgentIdentity"):
        self._c = client

    def send(self, inbox_id: str, to: str, subject: str, text: str, html: Optional[str] = None,
             in_reply_to: Optional[str] = None) -> Message:
        """Send an email. Check ``message.pending_approval``: a guardrail may hold it for a human."""
        body = _clean({"to": to, "subject": subject, "text": text, "html": html, "in_reply_to": in_reply_to})
        return Message(**self._c._request("POST", f"/inboxes/{inbox_id}/messages/send", json=body))

    def reply(self, inbox_id: str, message_id: str, text: str, html: Optional[str] = None) -> Message:
        body = _clean({"text": text, "html": html})
        return Message(**self._c._request("POST", f"/inboxes/{inbox_id}/messages/{message_id}/reply", json=body))

    def send_whatsapp(self, inbox_id: str, to_phone: str, message: str = "", template: Optional[str] = None,
                      template_language: str = "en", template_params: Optional[List[str]] = None) -> Message:
        body = _clean({"to_phone": to_phone, "message": message, "template": template,
                       "template_language": template_language, "template_params": template_params})
        return Message(**self._c._request("POST", f"/inboxes/{inbox_id}/whatsapp/send", json=body))

    def send_sms(self, inbox_id: str, to_phone: str, template_id: str,
                 variables: Optional[Dict[str, str]] = None, preview_text: str = "") -> Message:
        body = {"to_phone": to_phone, "template_id": template_id, "variables": variables or {},
                "preview_text": preview_text}
        return Message(**self._c._request("POST", f"/inboxes/{inbox_id}/sms/send", json=body))

    def list(self, inbox_id: str, limit: int = 20, before: Optional[str] = None,
             direction: Optional[str] = None, channel: Optional[str] = None) -> List[Message]:
        params = _clean({"limit": limit, "before": before, "direction": direction, "channel": channel})
        return [Message(**m) for m in self._c._request("GET", f"/inboxes/{inbox_id}/messages", params=params)["data"]]

    def get(self, message_id: str) -> Message:
        return Message(**self._c._request("GET", f"/messages/{message_id}"))


class _Threads:
    def __init__(self, client: "AgentIdentity"):
        self._c = client

    def list(self, inbox_id: str, limit: int = 20) -> List[Thread]:
        data = self._c._request("GET", f"/inboxes/{inbox_id}/threads", params={"limit": limit})["data"]
        return [Thread(**t) for t in data]

    def get(self, thread_id: str) -> Thread:
        return Thread(**self._c._request("GET", f"/threads/{thread_id}"))


class _Webhooks:
    def __init__(self, client: "AgentIdentity"):
        self._c = client

    def create(self, target_url: str, event_types: Optional[List[str]] = None) -> Webhook:
        """Register a webhook. ``secret_token`` is only present on this response; store it."""
        body = {"target_url": target_url, "event_types": event_types or ["*"]}
        return Webhook(**self._c._request("POST", "/webhooks", json=body))

    def list(self) -> List[Webhook]:
        return [Webhook(**w) for w in self._c._request("GET", "/webhooks")]

    def delete(self, webhook_id: str) -> None:
        self._c._request("DELETE", f"/webhooks/{webhook_id}")


class _HITL:
    def __init__(self, client: "AgentIdentity"):
        self._c = client

    def create_policy(self, trigger_keywords: List[str], target_destination: str,
                      action: str = "HOLD_FOR_APPROVAL", target_channel: str = "SLACK") -> HITLPolicy:
        body = {"trigger_keywords": trigger_keywords, "action": action, "target_channel": target_channel,
                "target_destination": target_destination}
        return HITLPolicy(**self._c._request("POST", "/hitl/policies", json=body))

    def list_policies(self) -> List[HITLPolicy]:
        return [HITLPolicy(**p) for p in self._c._request("GET", "/hitl/policies")]

    def pending(self) -> List[Message]:
        return [Message(**m) for m in self._c._request("GET", "/hitl/pending")["data"]]

    def approve(self, message_id: str) -> Message:
        return Message(**self._c._request("POST", f"/hitl/approve/{message_id}"))

    def reject(self, message_id: str) -> Message:
        return Message(**self._c._request("POST", f"/hitl/reject/{message_id}"))


class AgentIdentity:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, timeout: float = 30.0,
                 http_client: Optional[httpx.Client] = None):
        self._http = http_client or httpx.Client(timeout=timeout, **_config(api_key, base_url))
        self.inboxes = _Inboxes(self)
        self.messages = _Messages(self)
        self.threads = _Threads(self)
        self.webhooks = _Webhooks(self)
        self.hitl = _HITL(self)

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        return _raise_for_status(self._http.request(method, path, **kwargs))

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "AgentIdentity":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()


# --------------------------------------------------------------------------- async

class _AsyncInboxes:
    def __init__(self, client: "AsyncAgentIdentity"):
        self._c = client

    async def create(self, username: Optional[str] = None, client_id: Optional[str] = None,
                     phone_number: Optional[str] = None) -> Inbox:
        body = _clean({"username": username, "client_id": client_id, "phone_number": phone_number})
        return Inbox(**await self._c._request("POST", "/inboxes", json=body))

    async def list(self, limit: int = 50, offset: int = 0) -> List[Inbox]:
        data = await self._c._request("GET", "/inboxes", params={"limit": limit, "offset": offset})
        return [Inbox(**i) for i in data]

    async def get(self, inbox_id: str) -> Inbox:
        return Inbox(**await self._c._request("GET", f"/inboxes/{inbox_id}"))

    async def delete(self, inbox_id: str, purge: bool = False) -> None:
        await self._c._request("DELETE", f"/inboxes/{inbox_id}", params={"purge": str(purge).lower()})

    async def _wait(self, inbox_id: str, kind: str, timeout: float) -> Optional[dict]:
        deadline = time.monotonic() + timeout
        started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        first = True
        while True:
            params = _wait_params(kind, deadline - time.monotonic(), first, started_at)
            result = await self._c._request("GET", f"/inboxes/{inbox_id}/wait", params=params,
                                            timeout=params["timeout"] + 15)
            if result is not None or deadline - time.monotonic() <= 0:
                return result
            first = False

    async def wait_for_otp(self, inbox_id: str, timeout: float = 30) -> Optional[str]:
        result = await self._wait(inbox_id, "otp", timeout)
        return result["otp_code"] if result else None

    async def wait_for_magic_link(self, inbox_id: str, timeout: float = 30) -> Optional[str]:
        result = await self._wait(inbox_id, "magic_link", timeout)
        return result["magic_link"] if result else None

    async def wait_for_message(self, inbox_id: str, timeout: float = 30) -> Optional[Message]:
        result = await self._wait(inbox_id, "message", timeout)
        return Message(**result["message"]) if result else None


class _AsyncMessages:
    def __init__(self, client: "AsyncAgentIdentity"):
        self._c = client

    async def send(self, inbox_id: str, to: str, subject: str, text: str, html: Optional[str] = None,
                   in_reply_to: Optional[str] = None) -> Message:
        body = _clean({"to": to, "subject": subject, "text": text, "html": html, "in_reply_to": in_reply_to})
        return Message(**await self._c._request("POST", f"/inboxes/{inbox_id}/messages/send", json=body))

    async def reply(self, inbox_id: str, message_id: str, text: str, html: Optional[str] = None) -> Message:
        body = _clean({"text": text, "html": html})
        return Message(**await self._c._request(
            "POST", f"/inboxes/{inbox_id}/messages/{message_id}/reply", json=body))

    async def send_whatsapp(self, inbox_id: str, to_phone: str, message: str = "",
                            template: Optional[str] = None, template_language: str = "en",
                            template_params: Optional[List[str]] = None) -> Message:
        body = _clean({"to_phone": to_phone, "message": message, "template": template,
                       "template_language": template_language, "template_params": template_params})
        return Message(**await self._c._request("POST", f"/inboxes/{inbox_id}/whatsapp/send", json=body))

    async def send_sms(self, inbox_id: str, to_phone: str, template_id: str,
                       variables: Optional[Dict[str, str]] = None, preview_text: str = "") -> Message:
        body = {"to_phone": to_phone, "template_id": template_id, "variables": variables or {},
                "preview_text": preview_text}
        return Message(**await self._c._request("POST", f"/inboxes/{inbox_id}/sms/send", json=body))

    async def list(self, inbox_id: str, limit: int = 20, before: Optional[str] = None,
                   direction: Optional[str] = None, channel: Optional[str] = None) -> List[Message]:
        params = _clean({"limit": limit, "before": before, "direction": direction, "channel": channel})
        data = await self._c._request("GET", f"/inboxes/{inbox_id}/messages", params=params)
        return [Message(**m) for m in data["data"]]

    async def get(self, message_id: str) -> Message:
        return Message(**await self._c._request("GET", f"/messages/{message_id}"))


class _AsyncThreads:
    def __init__(self, client: "AsyncAgentIdentity"):
        self._c = client

    async def list(self, inbox_id: str, limit: int = 20) -> List[Thread]:
        data = await self._c._request("GET", f"/inboxes/{inbox_id}/threads", params={"limit": limit})
        return [Thread(**t) for t in data["data"]]

    async def get(self, thread_id: str) -> Thread:
        return Thread(**await self._c._request("GET", f"/threads/{thread_id}"))


class AsyncAgentIdentity:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, timeout: float = 30.0,
                 http_client: Optional[httpx.AsyncClient] = None):
        self._http = http_client or httpx.AsyncClient(timeout=timeout, **_config(api_key, base_url))
        self.inboxes = _AsyncInboxes(self)
        self.messages = _AsyncMessages(self)
        self.threads = _AsyncThreads(self)

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        return _raise_for_status(await self._http.request(method, path, **kwargs))

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> "AsyncAgentIdentity":
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self.aclose()
