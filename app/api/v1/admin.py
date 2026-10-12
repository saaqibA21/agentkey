"""Operator endpoints (admin secret) and workspace self-service for API keys."""
import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.api.deps import Principal, get_principal, require_admin, require_scope
from app.core.exceptions import ProblemError
from app.core.security import SCOPES, generate_api_key, hash_api_key
from app.db.models import ApiKey, Workspace, utcnow
from app.db.session import get_session
from app.services.audit import audit

router = APIRouter(tags=["workspaces"])


def _new_key(workspace_id, name: str, scopes: list[str]) -> tuple[str, ApiKey]:
    api_key = generate_api_key()
    return api_key, ApiKey(
        workspace_id=workspace_id, name=name, key_hash=hash_api_key(api_key),
        key_prefix=api_key[:12], scopes=scopes,
    )


async def create_workspace(session: AsyncSession, body: schemas.WorkspaceCreate) -> tuple[Workspace, str]:
    workspace = Workspace(id=uuid.uuid4(), api_key_hash="", **body.model_dump())
    api_key, key_row = _new_key(workspace.id, "root", list(SCOPES))
    workspace.api_key_hash = key_row.key_hash
    session.add(workspace)
    await session.flush()
    session.add(key_row)
    return workspace, api_key


@router.post("/admin/workspaces", status_code=201, response_model=schemas.WorkspaceCreated,
             dependencies=[Depends(require_admin)])
async def admin_create_workspace(
    body: schemas.WorkspaceCreate, request: Request, session: AsyncSession = Depends(get_session)
):
    workspace, api_key = await create_workspace(session, body)
    audit(session, action="workspace.create", actor="admin", workspace_id=workspace.id, request=request)
    await session.commit()
    return schemas.WorkspaceCreated(**schemas.WorkspaceOut.model_validate(workspace).model_dump(), api_key=api_key)


@router.get("/admin/workspaces", response_model=list[schemas.WorkspaceOut], dependencies=[Depends(require_admin)])
async def admin_list_workspaces(session: AsyncSession = Depends(get_session)):
    return (await session.scalars(select(Workspace).order_by(Workspace.created_at.desc()).limit(500))).all()


@router.patch("/admin/workspaces/{workspace_id}", response_model=schemas.WorkspaceOut,
              dependencies=[Depends(require_admin)])
async def admin_update_workspace(
    workspace_id: uuid.UUID, body: schemas.WorkspaceUpdate, request: Request,
    session: AsyncSession = Depends(get_session),
):
    workspace = await session.get(Workspace, workspace_id)
    if workspace is None:
        raise ProblemError(404, "Workspace not found")
    changes = body.model_dump(exclude_none=True)
    for name, value in changes.items():
        setattr(workspace, name, value)
    audit(session, action="workspace.update", actor="admin", workspace_id=workspace.id,
          detail=changes, request=request)
    await session.commit()
    return workspace


@router.get("/workspace", response_model=schemas.WorkspaceOut)
async def get_workspace(principal: Principal = Depends(get_principal)):
    return principal.workspace


@router.post("/api-keys", status_code=201, response_model=schemas.ApiKeyCreated)
async def create_api_key(
    body: schemas.ApiKeyCreate, request: Request,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    api_key, row = _new_key(principal.workspace.id, body.name, sorted(set(body.scopes)))
    session.add(row)
    audit(session, action="api_key.create", actor=principal.actor, workspace_id=principal.workspace.id,
          target=row.key_prefix, detail={"scopes": row.scopes}, request=request)
    await session.commit()
    return schemas.ApiKeyCreated(**schemas.ApiKeyOut.model_validate(row).model_dump(), api_key=api_key)


@router.get("/api-keys", response_model=list[schemas.ApiKeyOut])
async def list_api_keys(
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session)
):
    return (
        await session.scalars(
            select(ApiKey).where(ApiKey.workspace_id == principal.workspace.id).order_by(ApiKey.created_at)
        )
    ).all()


@router.delete("/api-keys/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: uuid.UUID, request: Request,
    principal: Principal = Depends(require_scope("manage")), session: AsyncSession = Depends(get_session),
):
    row = await session.get(ApiKey, key_id)
    if row is None or row.workspace_id != principal.workspace.id:
        raise ProblemError(404, "API key not found")
    if row.id == principal.key_id:
        raise ProblemError(409, "Cannot revoke current key", "Use a different key to revoke this one.")
    row.revoked_at = utcnow()
    audit(session, action="api_key.revoke", actor=principal.actor, workspace_id=principal.workspace.id,
          target=row.key_prefix, request=request)
    await session.commit()
