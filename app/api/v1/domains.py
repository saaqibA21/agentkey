import secrets
import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.api.deps import Principal, require_scope
from app.core.config import get_settings
from app.core.exceptions import ProblemError
from app.db.models import Domain, Inbox
from app.db.session import get_session
from app.services import domains as domain_service
from app.services.audit import audit
from app.services.events import _iso

router = APIRouter(prefix="/domains", tags=["domains"])


def _out(domain: Domain) -> dict:
    return {
        "id": str(domain.id), "name": domain.name, "status": domain.status, "checks": domain.checks or {},
        "records": domain_service.dns_records(domain), "verified_at": _iso(domain.verified_at),
        "created_at": _iso(domain.created_at),
    }


async def _load(session: AsyncSession, principal: Principal, domain_id: uuid.UUID) -> Domain:
    domain = await session.get(Domain, domain_id)
    if domain is None or domain.workspace_id != principal.workspace.id:
        raise ProblemError(404, "Domain not found")
    return domain


@router.post("", status_code=201)
async def add_domain(
    body: schemas.DomainCreate, request: Request,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    name = body.name
    settings = get_settings()
    if name in settings.shared_domain_set or name == settings.mail_domain.lower():
        raise ProblemError(422, "Domain unavailable", "This domain is operated by the platform.")
    if await session.scalar(select(Domain.id).where(Domain.name == name)):
        # Deliberately the same answer whoever holds it; ownership is proven by DNS, not by asking first.
        raise ProblemError(409, "Domain already registered",
                           "This domain is already connected to a workspace. Contact support if it is yours.")
    domain = Domain(
        workspace_id=principal.workspace.id, name=name, verification_token=secrets.token_hex(20),
        dkim_records=await domain_service.provider_create(name),
    )
    session.add(domain)
    audit(session, action="domain.create", actor=principal.actor, workspace_id=principal.workspace.id,
          target=name, request=request)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise ProblemError(409, "Domain already registered") from None
    return _out(domain)


@router.get("")
async def list_domains(
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session)
):
    rows = (await session.scalars(
        select(Domain).where(Domain.workspace_id == principal.workspace.id).order_by(Domain.created_at)
    )).all()
    return {"data": [_out(d) for d in rows]}


@router.get("/{domain_id}")
async def get_domain(
    domain_id: uuid.UUID,
    principal: Principal = Depends(require_scope("read")), session: AsyncSession = Depends(get_session),
):
    return _out(await _load(session, principal, domain_id))


@router.post("/{domain_id}/verify")
async def verify_domain(
    domain_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    """Re-check DNS now. Safe to call repeatedly while records propagate."""
    domain = await _load(session, principal, domain_id)
    before = domain.status
    await domain_service.verify(domain)
    if domain.status != before:
        audit(session, action="domain.status", actor=principal.actor, workspace_id=principal.workspace.id,
              target=domain.name, detail={"status": domain.status}, request=request)
    await session.commit()
    return _out(domain)


@router.delete("/{domain_id}", status_code=204)
async def delete_domain(
    domain_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    domain = await _load(session, principal, domain_id)
    in_use = await session.scalar(
        select(func.count()).select_from(Inbox).where(
            Inbox.workspace_id == principal.workspace.id, Inbox.status == "ACTIVE",
            Inbox.email_address.like(f"%@{domain.name}"),
        )
    )
    if in_use:
        raise ProblemError(409, "Domain in use", f"Delete the {in_use} inbox(es) on this domain first.")
    await domain_service.provider_delete(domain.name)
    await session.delete(domain)
    audit(session, action="domain.delete", actor=principal.actor, workspace_id=principal.workspace.id,
          target=domain.name, request=request)
    await session.commit()
