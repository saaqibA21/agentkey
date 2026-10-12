"""Human-in-the-loop: policies, the pending queue, and approve/reject (API key or signed link)."""
import html
import uuid

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.api.deps import Principal, authenticate_api_key, bearer_token, require_scope
from app.core.exceptions import ProblemError
from app.core.security import assert_public_url, verify_hitl_token
from app.db.models import HITLPolicy, Inbox, Message
from app.db.session import get_session
from app.services import outbound
from app.services.audit import audit
from app.services.events import serialize_message

router = APIRouter(prefix="/hitl", tags=["hitl"])

_PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<title>Agent message review</title><style>
body{{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;color:#111}}
dt{{font-weight:600;float:left;width:90px}}dd{{margin:0 0 6px 100px}}
pre{{white-space:pre-wrap;background:#f5f5f4;padding:16px;border-radius:8px;overflow-wrap:anywhere}}
button{{font:inherit;padding:10px 22px;border-radius:8px;border:0;color:#fff;cursor:pointer;margin-right:12px}}
.a{{background:#15803d}}.r{{background:#b91c1c}}form{{display:inline}}.s{{padding:12px 16px;border-radius:8px;background:#eef}}
</style></head><body><h1>{title}</h1>{body}</body></html>"""


def _page(title: str, body: str, status: int = 200) -> HTMLResponse:
    return HTMLResponse(_PAGE.format(title=html.escape(title), body=body), status_code=status,
                        headers={"Referrer-Policy": "no-referrer", "Cache-Control": "no-store",
                                 "X-Frame-Options": "DENY"})


# ---- policies -------------------------------------------------------------

@router.post("/policies", status_code=201, response_model=schemas.HITLPolicyOut)
async def create_policy(
    body: schemas.HITLPolicyCreate, request: Request,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    if body.target_channel != "WHATSAPP":
        await assert_public_url(body.target_destination)
    policy = HITLPolicy(workspace_id=principal.workspace.id, **body.model_dump())
    session.add(policy)
    audit(session, action="hitl_policy.create", actor=principal.actor, workspace_id=principal.workspace.id,
          detail={"action": body.action, "triggers": body.trigger_keywords}, request=request)
    await session.commit()
    return policy


@router.get("/policies", response_model=list[schemas.HITLPolicyOut])
async def list_policies(
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session)
):
    return (
        await session.scalars(select(HITLPolicy).where(HITLPolicy.workspace_id == principal.workspace.id))
    ).all()


@router.delete("/policies/{policy_id}", status_code=204)
async def delete_policy(
    policy_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    policy = await session.get(HITLPolicy, policy_id)
    if policy is None or policy.workspace_id != principal.workspace.id:
        raise ProblemError(404, "Policy not found")
    await session.delete(policy)
    audit(session, action="hitl_policy.delete", actor=principal.actor, workspace_id=principal.workspace.id,
          target=policy_id, request=request)
    await session.commit()


@router.get("/pending")
async def list_pending(
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session)
):
    rows = (
        await session.scalars(
            select(Message)
            .join(Inbox, Inbox.id == Message.inbox_id)
            .where(Inbox.workspace_id == principal.workspace.id, Message.status == "PENDING_APPROVAL")
            .order_by(Message.created_at).limit(200)
        )
    ).all()
    return {"data": [serialize_message(m) for m in rows]}


# ---- decisions ------------------------------------------------------------

async def _held_message(session: AsyncSession, message_id: uuid.UUID) -> tuple[Message, Inbox] | None:
    row = (
        await session.execute(
            select(Message, Inbox).join(Inbox, Inbox.id == Message.inbox_id).where(Message.id == message_id)
        )
    ).first()
    return (row[0], row[1]) if row else None


@router.get("/review/{message_id}", response_class=HTMLResponse, include_in_schema=False)
async def review_page(message_id: uuid.UUID, token: str = Query(""), session: AsyncSession = Depends(get_session)):
    """Read-only confirmation page. Opening the link never changes anything (safe for link unfurlers)."""
    found = await _held_message(session, message_id)
    if not verify_hitl_token(str(message_id), token) or found is None:
        return _page("Link invalid or expired", "<p>Ask the agent operator for a fresh approval link.</p>", 403)
    message, inbox = found
    if message.status != "PENDING_APPROVAL":
        return _page("Already resolved", f'<p class="s">This message is <b>{html.escape(message.status)}</b>.</p>')
    e = html.escape
    matched = ", ".join(message.extracted_data.get("hitl", {}).get("matched", []))
    forms = "".join(
        f'<form method="post" action="/v1/hitl/{action}/{message.id}">'
        f'<input type="hidden" name="token" value="{e(token)}"><button class="{css}">{label}</button></form>'
        for action, css, label in (("approve", "a", "Approve &amp; send"), ("reject", "r", "Reject"))
    )
    body = (
        f"<dl><dt>Channel</dt><dd>{e(message.channel)}</dd><dt>From</dt><dd>{e(inbox.email_address)}</dd>"
        f"<dt>To</dt><dd>{e(message.recipient)}</dd><dt>Subject</dt><dd>{e(message.subject or '—')}</dd>"
        f"<dt>Flagged</dt><dd>{e(matched)}</dd></dl><pre>{e(message.body_text)}</pre>{forms}"
    )
    return _page("An AI agent wants to send this", body)


async def _decide(
    message_id: uuid.UUID, approve: bool, request: Request, authorization: str | None, session: AsyncSession
):
    found = await _held_message(session, message_id)
    form_token = None
    is_form = request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded")
    if is_form:
        form_token = (await request.form()).get("token")
    token = form_token or request.query_params.get("token") or request.headers.get("x-hitl-token")

    if verify_hitl_token(str(message_id), token) and found:
        actor = "hitl_link"
    else:
        principal = await authenticate_api_key(session, bearer_token(authorization))
        if principal is None or "manage" not in principal.scopes:
            raise ProblemError(401, "Unauthorized", "A valid approval token or a 'manage' API key is required.")
        if found is None or found[1].workspace_id != principal.workspace.id:
            raise ProblemError(404, "Message not found")
        actor = principal.actor
    message, inbox = found

    try:
        message = await outbound.resolve_pending(session, message.id, inbox.workspace_id, approve)
    except ProblemError as exc:
        if is_form:
            return _page(exc.title, f'<p class="s">{html.escape(exc.detail or exc.title)}</p>', exc.status)
        raise
    audit(session, action="hitl.approve" if approve else "hitl.reject", actor=actor,
          workspace_id=inbox.workspace_id, target=message.id, request=request)
    await session.commit()
    if is_form:
        verdict = "approved and sent" if approve else "rejected and will not be sent"
        return _page("Done", f'<p class="s">The message was {verdict}.</p>')
    return JSONResponse(serialize_message(message))


@router.post("/approve/{message_id}")
async def approve(
    message_id: uuid.UUID, request: Request, authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
):
    return await _decide(message_id, True, request, authorization, session)


@router.post("/reject/{message_id}")
async def reject(
    message_id: uuid.UUID, request: Request, authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
):
    return await _decide(message_id, False, request, authorization, session)
