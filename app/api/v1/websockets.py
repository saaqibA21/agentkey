"""Live event stream for agents behind firewalls that cannot receive webhooks."""
import asyncio
import contextlib
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.deps import authenticate_api_key, bearer_token
from app.core.cache import get_redis, inbox_channel
from app.db.models import Inbox
from app.db.session import get_sessionmaker

router = APIRouter(tags=["realtime"])
logger = logging.getLogger("agentidentity.ws")

WS_UNAUTHORIZED = 4401
WS_FORBIDDEN = 4403
WS_NOT_FOUND = 4404


@router.websocket("/ws/inboxes/{inbox_id}")
async def inbox_stream(websocket: WebSocket, inbox_id: uuid.UUID):
    api_key = bearer_token(websocket.headers.get("authorization")) or websocket.query_params.get("token")
    async with get_sessionmaker()() as session:
        principal = await authenticate_api_key(session, api_key)
        inbox = await session.get(Inbox, inbox_id) if principal else None
    await websocket.accept()
    if principal is None:
        return await websocket.close(WS_UNAUTHORIZED, "invalid api key")
    if "read" not in principal.scopes:
        return await websocket.close(WS_FORBIDDEN, "read scope required")
    if inbox is None or inbox.workspace_id != principal.workspace.id or inbox.status != "ACTIVE":
        return await websocket.close(WS_NOT_FOUND, "inbox not found")

    pubsub = get_redis().pubsub()
    await pubsub.subscribe(inbox_channel(inbox_id))
    await websocket.send_json({"type": "connection.ready", "inbox_id": str(inbox_id)})

    async def _forward() -> None:
        while True:
            event = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if event is not None:
                await websocket.send_text(event["data"])

    async def _receive() -> None:
        # Drain client frames so pings and disconnects are noticed; "ping" gets an app-level pong.
        while True:
            if await websocket.receive_text() == "ping":
                await websocket.send_json({"type": "pong"})

    tasks = [asyncio.create_task(_forward()), asyncio.create_task(_receive())]
    try:
        done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            exc = task.exception()
            if exc and not isinstance(exc, WebSocketDisconnect):
                logger.warning("websocket stream for inbox %s ended: %r", inbox_id, exc)
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        with contextlib.suppress(Exception):
            await pubsub.unsubscribe()
            await pubsub.aclose()
        with contextlib.suppress(Exception):
            await websocket.close()
