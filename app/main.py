import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from starlette.routing import Route

from app.api.v1 import admin, auth, domains, hitl, inbound, inboxes, messages, webhooks, websockets
from app.core.cache import close_redis, get_redis, init_redis
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.db.session import create_all, dispose_engine, get_sessionmaker
from app.mcp_hosted import MCP_PATH, hosted_mcp
from app.services.webhook_dispatcher import dispatcher


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    await init_redis()
    if settings.auto_create_tables:
        await create_all()
    dispatcher.start()
    try:
        async with hosted_mcp.lifespan(app):
            yield
    finally:
        await dispatcher.stop()
        await close_redis()
        await dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.platform_name,
        version="0.1.0",
        description="Identity and cross-channel communication (email, WhatsApp, SMS) for autonomous AI agents.",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
    )
    register_exception_handlers(app)

    @app.middleware("http")
    async def _security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Cache-Control", "no-store")
        if settings.is_production:
            response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
        return response

    for module in (admin, auth, inboxes, messages, inbound, hitl, webhooks, domains, websockets):
        app.include_router(module.router, prefix="/v1")

    # Hosted MCP (streamable HTTP). A plain route rather than a mount so POST /mcp is not redirected.
    app.router.routes.append(Route(MCP_PATH, endpoint=hosted_mcp))

    @app.get("/healthz", include_in_schema=False)
    async def healthz():
        from sqlalchemy import text

        async with get_sessionmaker()() as session:
            await session.execute(text("SELECT 1"))
        await get_redis().ping()
        return {"status": "ok"}

    return app


app = create_app()
