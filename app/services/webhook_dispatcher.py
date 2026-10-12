"""Background worker delivering HMAC-signed webhooks from the outbox with exponential backoff."""
import asyncio
import json
import logging
import random
from datetime import timedelta

import httpx
from sqlalchemy import select

from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.core.security import assert_public_url, sign_payload
from app.db.models import WebhookDelivery, WebhookSubscription, utcnow
from app.db.session import get_sessionmaker

logger = logging.getLogger("agentidentity.webhooks")

SIGNATURE_HEADER = "X-AgentIdentity-Signature"
LEASE_SECONDS = 60
POLL_SECONDS = 5.0


def backoff_seconds(attempts: int) -> float:
    """10s, 20s, 40s ... capped at 1h, with jitter so retries do not synchronise."""
    return min(3600.0, 5.0 * 2 ** attempts) * random.uniform(0.8, 1.2)


class WebhookDispatcher:
    def __init__(self) -> None:
        self._wake = asyncio.Event()
        self._task: asyncio.Task | None = None
        # SQLite has no row locks; this keeps claims atomic within one process. Across processes
        # (Postgres) FOR UPDATE SKIP LOCKED does the job.
        self._claim_lock = asyncio.Lock()

    def wake(self) -> None:
        self._wake.set()

    def start(self) -> None:
        self._wake = asyncio.Event()  # bind to the running loop
        self._claim_lock = asyncio.Lock()
        self._task = asyncio.create_task(self._run(), name="webhook-dispatcher")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)
            self._task = None

    async def _run(self) -> None:
        while True:
            try:
                while await self.process_due():
                    pass
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("webhook dispatcher iteration failed")
            self._wake.clear()
            try:
                await asyncio.wait_for(self._wake.wait(), timeout=POLL_SECONDS)
            except asyncio.TimeoutError:
                pass

    async def _claim(self, limit: int = 20) -> list[tuple[WebhookDelivery, WebhookSubscription]]:
        """Lease due rows so concurrent workers (multiple instances) never double-send."""
        async with self._claim_lock, get_sessionmaker()() as session:
            now = utcnow()
            rows = (
                await session.execute(
                    select(WebhookDelivery, WebhookSubscription)
                    .join(WebhookSubscription, WebhookSubscription.id == WebhookDelivery.subscription_id)
                    .where(WebhookDelivery.status == "PENDING", WebhookDelivery.next_attempt_at <= now)
                    .order_by(WebhookDelivery.next_attempt_at)
                    .limit(limit)
                    .with_for_update(of=WebhookDelivery, skip_locked=True)
                )
            ).all()
            for delivery, _ in rows:
                delivery.next_attempt_at = now + timedelta(seconds=LEASE_SECONDS)
            await session.commit()
            return [(d, s) for d, s in rows]

    async def process_due(self) -> int:
        claimed = await self._claim()
        if claimed:
            await asyncio.gather(*(self._deliver(d, s) for d, s in claimed))
        return len(claimed)

    async def _attempt(self, delivery: WebhookDelivery, sub: WebhookSubscription) -> str | None:
        """Return None on success, otherwise a short error description."""
        if not sub.is_active:
            return "subscription disabled"
        body = json.dumps(delivery.payload, separators=(",", ":")).encode()
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "AgentIdentity-Webhooks/1.0",
            "X-AgentIdentity-Event": delivery.event_type,
            "X-AgentIdentity-Delivery": str(delivery.id),
            SIGNATURE_HEADER: sign_payload(sub.secret_token, body),
        }
        try:
            await assert_public_url(sub.target_url)
            timeout = get_settings().webhook_timeout_seconds
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
                resp = await client.post(sub.target_url, content=body, headers=headers)
        except ProblemError as exc:
            return f"blocked: {exc.detail}"
        except httpx.HTTPError as exc:
            return f"{type(exc).__name__}: {exc}"[:500]
        return None if 200 <= resp.status_code < 300 else f"HTTP {resp.status_code}"

    async def _deliver(self, delivery: WebhookDelivery, sub: WebhookSubscription) -> None:
        error = await self._attempt(delivery, sub)
        async with get_sessionmaker()() as session:
            row = await session.get(WebhookDelivery, delivery.id)
            if row is None:
                return
            row.attempts += 1
            if error is None:
                row.status, row.last_error = "DELIVERED", None
            else:
                row.last_error = error
                if row.attempts >= get_settings().webhook_max_attempts or error == "subscription disabled":
                    row.status = "FAILED"
                else:
                    row.next_attempt_at = utcnow() + timedelta(seconds=backoff_seconds(row.attempts))
                logger.warning("webhook %s attempt %s failed: %s", row.id, row.attempts, error)
            await session.commit()


dispatcher = WebhookDispatcher()
