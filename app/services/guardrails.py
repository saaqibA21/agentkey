"""Human-in-the-loop guardrails: decide whether an outbound message must wait for a person."""
import logging
import re
from dataclasses import dataclass, field

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import assert_public_url, make_hitl_token
from app.db.models import HITLPolicy, Inbox, Message
from app.services import whatsapp_service

logger = logging.getLogger("agentidentity.guardrails")

HOLD = "HOLD_FOR_APPROVAL"
NOTIFY = "NOTIFY_ONLY"
REGEX_PREFIX = "re:"
MAX_SCAN_CHARS = 50_000


@dataclass
class GuardrailDecision:
    action: str = "ALLOW"  # ALLOW | HOLD_FOR_APPROVAL | NOTIFY_ONLY
    policy: HITLPolicy | None = None
    matched: list[str] = field(default_factory=list)


def compile_trigger(trigger: str) -> re.Pattern:
    if trigger.startswith(REGEX_PREFIX):
        return re.compile(trigger[len(REGEX_PREFIX):], re.IGNORECASE)
    # Whole-word/phrase match with flexible whitespace, so "wire transfer" also hits "wire  transfer".
    words = r"\s+".join(re.escape(w) for w in trigger.split())
    return re.compile(rf"(?<!\w){words}(?!\w)", re.IGNORECASE)


def match_triggers(text: str, triggers: list[str]) -> list[str]:
    text = text[:MAX_SCAN_CHARS]
    matched = []
    for trigger in triggers:
        try:
            if trigger.strip() and compile_trigger(trigger).search(text):
                matched.append(trigger)
        except re.error:
            logger.warning("skipping invalid guardrail pattern %r", trigger)
    return matched


async def evaluate(session: AsyncSession, workspace_id, text: str) -> GuardrailDecision:
    """A HOLD policy always wins over a NOTIFY policy."""
    policies = (await session.scalars(select(HITLPolicy).where(HITLPolicy.workspace_id == workspace_id))).all()
    decision = GuardrailDecision()
    for policy in policies:
        matched = match_triggers(text, policy.trigger_keywords or [])
        if not matched:
            continue
        if policy.action == HOLD:
            return GuardrailDecision(HOLD, policy, matched)
        if decision.action == "ALLOW":
            decision = GuardrailDecision(NOTIFY, policy, matched)
    return decision


def review_url(message_id) -> str:
    base = get_settings().public_base_url.rstrip("/")
    return f"{base}/v1/hitl/review/{message_id}?token={make_hitl_token(str(message_id))}"


def _slack_payload(message: Message, inbox: Inbox, matched: list[str], hold: bool) -> dict:
    preview = message.body_text[:1200] + ("…" if len(message.body_text) > 1200 else "")
    title = "Approval needed for an outbound agent message" if hold else "FYI: flagged outbound agent message sent"
    lines = [
        f"*{title}*",
        f"*Channel:* {message.channel}   *From:* {inbox.email_address}   *To:* {message.recipient}",
    ]
    if message.subject:
        lines.append(f"*Subject:* {message.subject}")
    lines.append(f"*Matched:* {', '.join(matched)}")
    blocks = [
        {"type": "section", "text": {"type": "mrkdwn", "text": "\n".join(lines)}},
        {"type": "section", "text": {"type": "plain_text", "text": preview or "(empty body)"}},
    ]
    if hold:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"<{review_url(message.id)}|Review, then approve or reject>"},
        })
    return {"text": title, "blocks": blocks}


async def notify(decision: GuardrailDecision, message: Message, inbox: Inbox) -> str | None:
    """Tell the configured human. Returns an error string instead of raising: the message stays
    held (and approvable through the API) even when the notification channel is down."""
    policy = decision.policy
    if policy is None:
        return None
    hold = decision.action == HOLD
    try:
        if policy.target_channel == "WHATSAPP":
            text = (
                f"Agent message to {message.recipient} matched {', '.join(decision.matched)}."
                + (f" Review: {review_url(message.id)}" if hold else " It was sent.")
            )
            await whatsapp_service.send_whatsapp(policy.target_destination, text)
            return None
        await assert_public_url(policy.target_destination)
        if policy.target_channel == "SLACK":
            payload = _slack_payload(message, inbox, decision.matched, hold)
        else:  # WEBHOOK
            base = get_settings().public_base_url.rstrip("/")
            payload = {
                "type": "hitl.approval_required" if hold else "hitl.notification",
                "message_id": str(message.id),
                "inbox": inbox.email_address,
                "channel": message.channel,
                "recipient": message.recipient,
                "subject": message.subject,
                "body_text": message.body_text,
                "matched": decision.matched,
            }
            if hold:
                token = make_hitl_token(str(message.id))
                payload["approve_url"] = f"{base}/v1/hitl/approve/{message.id}"
                payload["reject_url"] = f"{base}/v1/hitl/reject/{message.id}"
                payload["token"] = token
                payload["review_url"] = review_url(message.id)
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            resp = await client.post(policy.target_destination, json=payload)
        return None if resp.status_code < 300 else f"approver channel returned HTTP {resp.status_code}"
    except Exception as exc:
        logger.warning("HITL notification failed for message %s: %s", message.id, exc)
        return f"{type(exc).__name__}: {exc}"[:300]
