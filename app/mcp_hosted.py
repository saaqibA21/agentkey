"""Hosted MCP endpoint (streamable HTTP) served by the API itself at ``/mcp``.

Customers paste one URL plus their API key into any MCP client; nothing to install. Requests are
stateless, so this scales horizontally with the API.
"""
import json
from contextlib import asynccontextmanager

import httpx
from mcp.server.transport_security import TransportSecuritySettings

from app import mcp_server
from app.api.deps import authenticate_api_key, bearer_token
from app.core.rate_limiter import allow_request
from app.db.session import get_sessionmaker

MCP_PATH = "/mcp"


class HostedMCP:
    def __init__(self) -> None:
        self._inner = None

    @asynccontextmanager
    async def lifespan(self, api_app):
        server = mcp_server.build_server()
        self._inner = server.streamable_http_app(
            streamable_http_path=MCP_PATH, stateless_http=True, json_response=True,
            # Host-header checks guard localhost servers against DNS rebinding; this one is public
            # and every request must carry an API key.
            transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
        )
        # Tools call the REST API in-process (no network hop), with the caller's own key.
        mcp_server.configure(base_url="http://aigent.internal", transport=httpx.ASGITransport(app=api_app))
        try:
            async with server.session_manager.run():
                yield
        finally:
            mcp_server.configure(transport=None)
            self._inner = None

    @staticmethod
    async def _reject(send, status: int, title: str, headers: tuple = ()) -> None:
        body = json.dumps({"title": title, "status": status}).encode()
        await send({"type": "http.response.start", "status": status,
                    "headers": [(b"content-type", b"application/problem+json"), *headers]})
        await send({"type": "http.response.body", "body": body})

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http" or self._inner is None:
            return await self._reject(send, 503, "MCP endpoint unavailable")
        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope["headers"]}
        api_key = bearer_token(headers.get("authorization"))
        async with get_sessionmaker()() as session:
            principal = await authenticate_api_key(session, api_key)
        if principal is None:
            return await self._reject(send, 401, "Unauthorized", ((b"www-authenticate", b"Bearer"),))
        if not await allow_request(str(principal.key_id)):
            return await self._reject(send, 429, "Rate limit exceeded", ((b"retry-after", b"1"),))
        token = mcp_server.request_api_key.set(api_key)
        try:
            await self._inner({**scope, "path": MCP_PATH, "raw_path": MCP_PATH.encode()}, receive, send)
        finally:
            mcp_server.request_api_key.reset(token)


hosted_mcp = HostedMCP()
