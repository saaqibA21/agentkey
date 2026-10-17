"""Create an agent in one step: a unique email address, an API key, and the owner it acts for.

This is what the dashboard's "Create API" button calls. The owner's email always comes from the
signed-in account, never from the request body, so nobody can register an agent in someone else's name.
"""
import re
import secrets
import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Principal, require_scope, require_user
from app.api.v1.admin import _new_key
from app.api.v1.inboxes import is_reserved_username
from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.db.models import Agent, ApiKey, Inbox, User, utcnow
from app.db.session import get_session
from app.services.audit import audit
from app.services.events import _iso

router = APIRouter(prefix="/agents", tags=["agents"])

# What a dashboard-created agent's key may do: read its mail and send. Creating more inboxes,
# changing rules and acting through the owner's accounts stay with the owner.
AGENT_SCOPES = ["read", "send"]
MAX_SLUG = 40


class AgentCreate(BaseModel):
    agent_name: str = Field(min_length=1, max_length=64)
    owner_name: str = Field(min_length=1, max_length=255)

    @field_validator("agent_name", "owner_name")
    @classmethod
    def _clean(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v or any(c in v for c in "\r\n<>"):
            raise ValueError("enter a plain name")
        return v


def slugify(name: str) -> str:
    """"Sales Bot #1" -> "sales-bot-1": the local part of the agent's address."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:MAX_SLUG].strip("-")
    return slug if len(slug) >= 3 else f"{slug or 'agent'}-agent".strip("-")


async def _free_address(session: AsyncSession, slug: str, domain: str) -> str:
    """The agent's name if free, otherwise name-2, name-3 ... then a random suffix.
    Deleted addresses count as taken: they are never handed to someone else."""
    candidates = [slug] + [f"{slug}-{n}" for n in range(2, 10)] + [f"{slug}-{secrets.token_hex(3)}" for _ in range(5)]
    for local in candidates:
        address = f"{local}@{domain}"
        if not await session.scalar(select(Inbox.id).where(Inbox.email_address == address)):
            return address
    raise ProblemError(409, "Address unavailable", "Could not find a free address for this name; try another.")


def _out(agent: Agent, inbox: Inbox, key: ApiKey) -> dict:
    return {
        "id": str(agent.id), "agent_name": agent.name, "owner_name": agent.owner_name,
        "owner_email": agent.owner_email, "email_address": inbox.email_address, "inbox_id": str(inbox.id),
        "api_key_prefix": key.key_prefix, "scopes": key.scopes, "status": agent.status,
        "created_at": _iso(agent.created_at),
    }


@router.post("", status_code=201)
async def create_agent(
    body: AgentCreate, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    user = await session.get(User, principal.key_id)
    workspace = principal.workspace
    slug = slugify(body.agent_name)
    if is_reserved_username(slug):
        raise ProblemError(422, "Name not allowed",
                           "This name is reserved to prevent impersonating brands or role accounts. Pick another.")
    active = await session.scalar(
        select(func.count()).select_from(Inbox).where(Inbox.workspace_id == workspace.id, Inbox.status == "ACTIVE"))
    if active >= workspace.max_inboxes:
        raise ProblemError(403, "Agent limit reached",
                           f"Your plan allows {workspace.max_inboxes} active agents and inboxes. Delete one first.")

    address = await _free_address(session, slug, get_settings().mail_domain.lower())
    inbox = Inbox(id=uuid.uuid4(), workspace_id=workspace.id, email_address=address,
                  owner_name=body.owner_name, display_title=f"{body.owner_name} (via {body.agent_name})")
    api_key, key_row = _new_key(workspace.id, f"agent: {body.agent_name}"[:255], AGENT_SCOPES)
    key_row.id = uuid.uuid4()
    agent = Agent(workspace_id=workspace.id, name=body.agent_name, owner_name=body.owner_name,
                  owner_email=user.email, inbox_id=inbox.id, api_key_id=key_row.id)
    session.add_all([inbox, key_row])
    await session.flush()
    session.add(agent)
    audit(session, action="agent.create", actor=principal.actor, workspace_id=workspace.id, target=address,
          detail={"agent": body.agent_name, "owner": body.owner_name, "key": key_row.key_prefix}, request=request)
    try:
        await session.commit()
    except IntegrityError:  # someone took the same address in the same instant
        await session.rollback()
        raise ProblemError(409, "Address unavailable", "That address was just taken. Please try again.") from None
    return {**_out(agent, inbox, key_row), "api_key": api_key}


@router.get("")
async def list_agents(principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(Agent, Inbox, ApiKey)
        .join(Inbox, Inbox.id == Agent.inbox_id).join(ApiKey, ApiKey.id == Agent.api_key_id)
        .where(Agent.workspace_id == principal.workspace.id, Agent.status == "ACTIVE")
        .order_by(Agent.created_at.desc())
    )).all()
    return {"data": [_out(a, i, k) for a, i, k in rows]}


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_user), session: AsyncSession = Depends(get_session),
):
    agent = await session.get(Agent, agent_id)
    if agent is None or agent.workspace_id != principal.workspace.id or agent.status != "ACTIVE":
        raise ProblemError(404, "Agent not found")
    inbox = await session.get(Inbox, agent.inbox_id)
    key = await session.get(ApiKey, agent.api_key_id)
    agent.status = "DELETED"
    key.revoked_at = utcnow()
    inbox.status = "TOMBSTONED"  # the address is retired for good, like any deleted inbox
    audit(session, action="agent.delete", actor=principal.actor, workspace_id=principal.workspace.id,
          target=inbox.email_address, request=request)
    await session.commit()
