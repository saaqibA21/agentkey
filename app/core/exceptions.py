"""RFC 7807 (application/problem+json) error responses."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("agentidentity")

PROBLEM_BASE = "https://docs.agentidentity.dev/problems/"


class ProblemError(Exception):
    def __init__(
        self,
        status: int,
        title: str,
        detail: str | None = None,
        *,
        code: str | None = None,
        headers: dict[str, str] | None = None,
        **extra,
    ):
        self.status = status
        self.title = title
        self.detail = detail
        self.code = code or title.lower().replace(" ", "-")
        self.headers = headers
        self.extra = extra


def _problem(request: Request, status: int, title: str, detail=None, code=None, headers=None, **extra):
    body = {
        "type": PROBLEM_BASE + (code or "about:blank"),
        "title": title,
        "status": status,
        "instance": request.url.path,
    }
    if detail is not None:
        body["detail"] = detail
    body.update(extra)
    return JSONResponse(body, status_code=status, media_type="application/problem+json", headers=headers)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ProblemError)
    async def _problem_error(request: Request, exc: ProblemError):
        return _problem(request, exc.status, exc.title, exc.detail, exc.code, exc.headers, **exc.extra)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException):
        return _problem(request, exc.status_code, str(exc.detail), headers=getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):
        errors = [
            {"field": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]), "message": e["msg"]}
            for e in exc.errors()
        ]
        return _problem(
            request, 422, "Validation failed", "Request parameters failed validation.",
            "validation-failed", errors=errors,
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        logger.exception("unhandled error on %s", request.url.path)
        return _problem(request, 500, "Internal server error", code="internal-error")
