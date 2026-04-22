"""
Application Registry Router — FR-003, ADR-002
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import json

from app.auth import CurrentUser
from app.database import get_db
from app.models.app_registry import AppRegistryCreate, AppRegistryOut, AppRegistryUpdate

router = APIRouter(prefix="/projects/{project_id}/app-registry", tags=["app-registry"])


@router.get("", response_model=list[AppRegistryOut])
async def list_objects(
    user: CurrentUser,
    project_id: UUID,
    object_type: str | None = None,
    db: asyncpg.Connection = Depends(get_db),
):
    if object_type:
        rows = await db.fetch(
            "SELECT * FROM ppg_app_registry WHERE project_id = $1 AND object_type = $2 "
            "AND status != 'deprecated' ORDER BY name",
            project_id, object_type,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM ppg_app_registry WHERE project_id = $1 AND status != 'deprecated' "
            "ORDER BY object_type, name",
            project_id,
        )
    return [_row_to_dict(r) for r in rows]


@router.post("", response_model=AppRegistryOut, status_code=201)
async def create_object(
    user: CurrentUser,
    project_id: UUID,
    body: AppRegistryCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    try:
        row = await db.fetchrow(
            """INSERT INTO ppg_app_registry
               (project_id, object_type, name, code, description, owner_team,
                status, environment, extra, created_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *""",
            project_id, body.object_type, body.name, body.code,
            body.description, body.owner_team, body.status,
            json.dumps(body.environment), json.dumps(body.extra), user.sub,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, f"Code '{body.code}' already exists in this project")
    return _row_to_dict(row)


@router.get("/{obj_id}", response_model=AppRegistryOut)
async def get_object(
    user: CurrentUser,
    project_id: UUID,
    obj_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT * FROM ppg_app_registry WHERE id = $1 AND project_id = $2",
        obj_id, project_id,
    )
    if not row:
        raise HTTPException(404, "Object not found")
    return _row_to_dict(row)


@router.put("/{obj_id}", response_model=AppRegistryOut)
async def update_object(
    user: CurrentUser,
    project_id: UUID,
    obj_id: UUID,
    body: AppRegistryUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    if "environment" in updates:
        updates["environment"] = json.dumps(updates["environment"])
    if "extra" in updates:
        updates["extra"] = json.dumps(updates["extra"])
    set_parts = [f"{k} = ${i+3}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE ppg_app_registry SET {', '.join(set_parts)}, updated_at = NOW() "
        f"WHERE id = $1 AND project_id = $2 RETURNING *",
        obj_id, project_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Object not found")
    return _row_to_dict(row)


@router.delete("/{obj_id}", status_code=204)
async def deprecate_object(
    user: CurrentUser,
    project_id: UUID,
    obj_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "UPDATE ppg_app_registry SET status = 'deprecated', updated_at = NOW() "
        "WHERE id = $1 AND project_id = $2",
        obj_id, project_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(404, "Object not found")


def _row_to_dict(row) -> dict:
    d = dict(row)
    if isinstance(d.get("environment"), str):
        d["environment"] = json.loads(d["environment"])
    if isinstance(d.get("extra"), str):
        d["extra"] = json.loads(d["extra"])
    return d
