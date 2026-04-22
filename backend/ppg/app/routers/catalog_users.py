"""
Catalog — Users & Roles Router
Org-wide personnel directory + role management for workflow
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import json

from app.auth import CurrentUser
from app.database import get_db
from app.models.catalog import (
    CatalogUserCreate, CatalogUserUpdate, CatalogUserOut,
    CatalogRoleCreate, CatalogRoleUpdate, CatalogRoleOut,
    UserRoleAssign, UserRoleOut,
    UserDomainAssign, UserDomainOut,
    CatalogDomainUpdate, CatalogDomainOut,
)

router = APIRouter(tags=["catalog-users"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _user(row) -> dict:
    d = dict(row)
    for f in ("skills",):
        if isinstance(d.get(f), str):
            d[f] = json.loads(d[f])
    d.setdefault("roles", [])
    d.setdefault("domains", [])
    return d


async def _attach_domains_to_users(users: list[dict], db: asyncpg.Connection) -> None:
    """Fetch domain assignments for a list of users and attach in-place."""
    if not users:
        return
    uid_list = [str(u["id"]) for u in users]
    domain_rows = await db.fetch(
        """SELECT cud.user_id, cud.domain_code, pd.name AS domain_name,
                  cud.role_in_domain, cud.is_primary, cud.assigned_at, cud.assigned_by
           FROM catalog_user_domains cud
           JOIN project_domains pd ON pd.code = cud.domain_code
           WHERE cud.user_id = ANY($1::uuid[])
           ORDER BY cud.is_primary DESC, pd.sort_order""",
        uid_list,
    )
    from collections import defaultdict
    domain_map: dict = defaultdict(list)
    for dr in domain_rows:
        domain_map[str(dr["user_id"])].append(dict(dr))
    for u in users:
        u["domains"] = domain_map.get(str(u["id"]), [])


def _role(row) -> dict:
    d = dict(row)
    if isinstance(d.get("workflow_permissions"), str):
        d["workflow_permissions"] = json.loads(d["workflow_permissions"])
    return d


async def _get_user_or_404(user_id: UUID, db: asyncpg.Connection) -> asyncpg.Record:
    row = await db.fetchrow("SELECT * FROM catalog_users WHERE id = $1", user_id)
    if not row:
        raise HTTPException(404, "User not found")
    return row


async def _get_role_or_404(role_id: UUID, db: asyncpg.Connection) -> asyncpg.Record:
    row = await db.fetchrow("SELECT * FROM catalog_roles WHERE id = $1", role_id)
    if not row:
        raise HTTPException(404, "Role not found")
    return row


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/catalog/users", response_model=list[CatalogUserOut])
async def list_users(
    user: CurrentUser,
    user_type: str | None = None,
    department: str | None = None,
    team: str | None = None,
    status: str | None = None,
    q: str | None = None,
    db: asyncpg.Connection = Depends(get_db),
):
    conditions = ["1=1"]
    params: list = []
    i = 1
    if user_type:
        conditions.append(f"user_type = ${i}"); params.append(user_type); i += 1
    if department:
        conditions.append(f"department = ${i}"); params.append(department); i += 1
    if team:
        conditions.append(f"team = ${i}"); params.append(team); i += 1
    if status:
        conditions.append(f"status = ${i}"); params.append(status); i += 1
    if q:
        conditions.append(
            f"(full_name ILIKE ${i} OR email ILIKE ${i} OR employee_id ILIKE ${i} OR position ILIKE ${i})"
        )
        params.append(f"%{q}%"); i += 1
    where = " AND ".join(conditions)
    rows = await db.fetch(
        f"SELECT * FROM catalog_users WHERE {where} ORDER BY full_name",
        *params,
    )
    users = [_user(r) for r in rows]
    # Attach role assignments
    if users:
        uid_list = [str(u["id"]) for u in users]
        role_rows = await db.fetch(
            """SELECT ur.*, r.role_code, r.role_name, r.role_category
               FROM catalog_user_roles ur
               JOIN catalog_roles r ON r.id = ur.role_id
               WHERE ur.user_id = ANY($1::uuid[])""",
            uid_list,
        )
        from collections import defaultdict
        role_map: dict = defaultdict(list)
        for rr in role_rows:
            role_map[str(rr["user_id"])].append(dict(rr))
        for u in users:
            u["roles"] = role_map.get(str(u["id"]), [])
        await _attach_domains_to_users(users, db)
    return users


@router.post("/catalog/users", response_model=CatalogUserOut, status_code=201)
async def create_user(
    user: CurrentUser,
    body: CatalogUserCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    try:
        row = await db.fetchrow(
            """INSERT INTO catalog_users
               (employee_id, full_name, email, phone, user_type,
                department, position, manager_id, team, location,
                status, start_date, end_date, skills, notes, created_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
               RETURNING *""",
            body.employee_id, body.full_name, body.email, body.phone,
            body.user_type, body.department, body.position, body.manager_id,
            body.team, body.location, body.status, body.start_date,
            body.end_date, json.dumps(body.skills), body.notes, user.sub,
        )
    except asyncpg.UniqueViolationError as exc:
        if "email" in str(exc):
            raise HTTPException(409, f"Email '{body.email}' already exists")
        raise HTTPException(409, f"Employee ID '{body.employee_id}' already exists")
    u = _user(row)
    u["roles"] = []
    return u


@router.get("/catalog/users/{user_id}", response_model=CatalogUserOut)
async def get_user(
    user: CurrentUser,
    user_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await _get_user_or_404(user_id, db)
    u = _user(row)
    role_rows = await db.fetch(
        """SELECT ur.*, r.role_code, r.role_name, r.role_category
           FROM catalog_user_roles ur
           JOIN catalog_roles r ON r.id = ur.role_id
           WHERE ur.user_id = $1""",
        user_id,
    )
    u["roles"] = [dict(r) for r in role_rows]
    await _attach_domains_to_users([u], db)
    return u


@router.put("/catalog/users/{user_id}", response_model=CatalogUserOut)
async def update_user(
    user: CurrentUser,
    user_id: UUID,
    body: CatalogUserUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    if "skills" in updates:
        updates["skills"] = json.dumps(updates["skills"])
    if "manager_id" in updates and updates["manager_id"] is not None:
        updates["manager_id"] = str(updates["manager_id"])
    set_parts = [f"{k} = ${i+2}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE catalog_users SET {', '.join(set_parts)}, updated_at = NOW() "
        f"WHERE id = $1 RETURNING *",
        user_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "User not found")
    u = _user(row)
    role_rows = await db.fetch(
        """SELECT ur.*, r.role_code, r.role_name, r.role_category
           FROM catalog_user_roles ur
           JOIN catalog_roles r ON r.id = ur.role_id
           WHERE ur.user_id = $1""",
        user_id,
    )
    u["roles"] = [dict(r) for r in role_rows]
    await _attach_domains_to_users([u], db)
    return u


@router.delete("/catalog/users/{user_id}", status_code=204)
async def delete_user(
    user: CurrentUser,
    user_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "UPDATE catalog_users SET status = 'terminated', updated_at = NOW() WHERE id = $1",
        user_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(404, "User not found")


# ── User Role Assignments ──────────────────────────────────────────────────────

@router.get("/catalog/users/{user_id}/roles", response_model=list[UserRoleOut])
async def list_user_roles(
    user: CurrentUser,
    user_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    await _get_user_or_404(user_id, db)
    rows = await db.fetch(
        """SELECT ur.*, r.role_code, r.role_name, r.role_category
           FROM catalog_user_roles ur
           JOIN catalog_roles r ON r.id = ur.role_id
           WHERE ur.user_id = $1
           ORDER BY r.role_name""",
        user_id,
    )
    return [dict(r) for r in rows]


@router.post("/catalog/users/{user_id}/roles", response_model=UserRoleOut, status_code=201)
async def assign_role(
    user: CurrentUser,
    user_id: UUID,
    body: UserRoleAssign,
    db: asyncpg.Connection = Depends(get_db),
):
    await _get_user_or_404(user_id, db)
    await _get_role_or_404(body.role_id, db)
    try:
        row = await db.fetchrow(
            """INSERT INTO catalog_user_roles
               (user_id, role_id, scope_type, scope_id, assigned_by, expires_at)
               VALUES ($1,$2,$3,$4,$5,$6)
               RETURNING *""",
            user_id, body.role_id, body.scope_type, body.scope_id,
            body.assigned_by or user.sub, body.expires_at,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, "User already has this role in this scope")
    r = await db.fetchrow(
        """SELECT ur.*, r.role_code, r.role_name, r.role_category
           FROM catalog_user_roles ur
           JOIN catalog_roles r ON r.id = ur.role_id
           WHERE ur.id = $1""",
        row["id"],
    )
    return dict(r)


@router.delete("/catalog/users/{user_id}/roles/{role_id}", status_code=204)
async def remove_role(
    user: CurrentUser,
    user_id: UUID,
    role_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM catalog_user_roles WHERE user_id = $1 AND role_id = $2",
        user_id, role_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Role assignment not found")


# ── Roles ─────────────────────────────────────────────────────────────────────

@router.get("/catalog/roles", response_model=list[CatalogRoleOut])
async def list_roles(
    user: CurrentUser,
    role_category: str | None = None,
    is_active: bool | None = None,
    db: asyncpg.Connection = Depends(get_db),
):
    conditions = ["1=1"]
    params: list = []
    i = 1
    if role_category:
        conditions.append(f"role_category = ${i}"); params.append(role_category); i += 1
    if is_active is not None:
        conditions.append(f"is_active = ${i}"); params.append(is_active); i += 1
    where = " AND ".join(conditions)
    rows = await db.fetch(
        f"SELECT * FROM catalog_roles WHERE {where} ORDER BY role_category, role_name",
        *params,
    )
    return [_role(r) for r in rows]


@router.post("/catalog/roles", response_model=CatalogRoleOut, status_code=201)
async def create_role(
    user: CurrentUser,
    body: CatalogRoleCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    try:
        row = await db.fetchrow(
            """INSERT INTO catalog_roles
               (role_code, role_name, role_category, description,
                workflow_permissions, product_access_level, is_active, created_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *""",
            body.role_code, body.role_name, body.role_category,
            body.description, json.dumps(body.workflow_permissions),
            body.product_access_level, body.is_active, user.sub,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, f"Role code '{body.role_code}' already exists")
    return _role(row)


@router.get("/catalog/roles/{role_id}", response_model=CatalogRoleOut)
async def get_role(
    user: CurrentUser,
    role_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await _get_role_or_404(role_id, db)
    return _role(row)


@router.put("/catalog/roles/{role_id}", response_model=CatalogRoleOut)
async def update_role(
    user: CurrentUser,
    role_id: UUID,
    body: CatalogRoleUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    if "workflow_permissions" in updates:
        updates["workflow_permissions"] = json.dumps(updates["workflow_permissions"])
    set_parts = [f"{k} = ${i+2}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE catalog_roles SET {', '.join(set_parts)}, updated_at = NOW() "
        f"WHERE id = $1 RETURNING *",
        role_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Role not found")
    return _role(row)


@router.delete("/catalog/roles/{role_id}", status_code=204)
async def delete_role(
    user: CurrentUser,
    role_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    # Soft-delete: deactivate instead of hard delete (preserve history)
    result = await db.execute(
        "UPDATE catalog_roles SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
        role_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(404, "Role not found")


@router.get("/catalog/roles/{role_id}/users", response_model=list[dict])
async def list_role_users(
    user: CurrentUser,
    role_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    await _get_role_or_404(role_id, db)
    rows = await db.fetch(
        """SELECT u.id, u.full_name, u.email, u.department, u.position,
                  u.user_type, u.status, ur.scope_type, ur.assigned_at
           FROM catalog_user_roles ur
           JOIN catalog_users u ON u.id = ur.user_id
           WHERE ur.role_id = $1
           ORDER BY u.full_name""",
        role_id,
    )
    return [dict(r) for r in rows]


# ── Domains (project_domains LOV + personnel assignments) ─────────────────

@router.get("/catalog/domains", response_model=list[CatalogDomainOut])
async def list_domains(
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """Danh sách tất cả domains kèm nhân sự phụ trách."""
    domain_rows = await db.fetch(
        "SELECT * FROM project_domains ORDER BY sort_order"
    )
    personnel_rows = await db.fetch(
        """SELECT cud.domain_code, cud.user_id, cud.role_in_domain,
                  cud.is_primary, cud.assigned_at,
                  u.employee_id, u.full_name, u.email, u.position, u.department
           FROM catalog_user_domains cud
           JOIN catalog_users u ON u.id = cud.user_id
           ORDER BY cud.is_primary DESC, u.full_name"""
    )
    from collections import defaultdict
    pmap: dict = defaultdict(list)
    for p in personnel_rows:
        pmap[p["domain_code"]].append(dict(p))

    result = []
    for d in domain_rows:
        plist = pmap.get(d["code"], [])
        result.append({
            "code": d["code"],
            "name": d["name"],
            "description": d["description"],
            "sort_order": d["sort_order"],
            "is_active": d["is_active"],
            "user_count": len(plist),
            "personnel": plist,
        })
    return result


@router.get("/catalog/domains/{code}", response_model=CatalogDomainOut)
async def get_domain(
    user: CurrentUser,
    code: str,
    db: asyncpg.Connection = Depends(get_db),
):
    d = await db.fetchrow("SELECT * FROM project_domains WHERE code = $1", code.upper())
    if not d:
        raise HTTPException(404, f"Domain '{code}' not found")
    personnel_rows = await db.fetch(
        """SELECT cud.user_id, cud.role_in_domain, cud.is_primary, cud.assigned_at,
                  u.employee_id, u.full_name, u.email, u.position, u.department
           FROM catalog_user_domains cud
           JOIN catalog_users u ON u.id = cud.user_id
           WHERE cud.domain_code = $1
           ORDER BY cud.is_primary DESC, u.full_name""",
        code.upper(),
    )
    plist = [dict(p) for p in personnel_rows]
    return {
        "code": d["code"], "name": d["name"], "description": d["description"],
        "sort_order": d["sort_order"], "is_active": d["is_active"],
        "user_count": len(plist), "personnel": plist,
    }


@router.put("/catalog/domains/{code}", response_model=CatalogDomainOut)
async def update_domain(
    user: CurrentUser,
    code: str,
    body: CatalogDomainUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_parts = [f"{k} = ${i+2}" for i, k in enumerate(updates.keys())]
    try:
        row = await db.fetchrow(
            f"UPDATE project_domains SET {', '.join(set_parts)} WHERE code = $1 RETURNING *",
            code.upper(), *updates.values(),
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, f"Mã domain '{updates.get('code')}' đã tồn tại")
    if not row:
        raise HTTPException(404, f"Domain '{code}' not found")
    # Dùng new_code sau khi update (có thể đã đổi)
    new_code = row["code"]
    personnel_rows = await db.fetch(
        """SELECT cud.user_id, cud.role_in_domain, cud.is_primary, cud.assigned_at,
                  u.employee_id, u.full_name, u.email, u.position, u.department
           FROM catalog_user_domains cud
           JOIN catalog_users u ON u.id = cud.user_id
           WHERE cud.domain_code = $1
           ORDER BY cud.is_primary DESC, u.full_name""",
        new_code,
    )
    plist = [dict(p) for p in personnel_rows]
    return {
        "code": row["code"], "name": row["name"], "description": row["description"],
        "sort_order": row["sort_order"], "is_active": row["is_active"],
        "user_count": len(plist), "personnel": plist,
    }


# ── User-Domain Assignments ────────────────────────────────────────────────

@router.get("/catalog/users/{user_id}/domains", response_model=list[UserDomainOut])
async def list_user_domains(
    user: CurrentUser,
    user_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    await _get_user_or_404(user_id, db)
    rows = await db.fetch(
        """SELECT cud.*, pd.name AS domain_name
           FROM catalog_user_domains cud
           JOIN project_domains pd ON pd.code = cud.domain_code
           WHERE cud.user_id = $1
           ORDER BY cud.is_primary DESC, pd.sort_order""",
        user_id,
    )
    return [dict(r) for r in rows]


@router.post("/catalog/users/{user_id}/domains", response_model=UserDomainOut, status_code=201)
async def assign_domain(
    user: CurrentUser,
    user_id: UUID,
    body: UserDomainAssign,
    db: asyncpg.Connection = Depends(get_db),
):
    await _get_user_or_404(user_id, db)
    domain = await db.fetchrow(
        "SELECT * FROM project_domains WHERE code = $1", body.domain_code.upper()
    )
    if not domain:
        raise HTTPException(404, f"Domain '{body.domain_code}' not found")
    try:
        row = await db.fetchrow(
            """INSERT INTO catalog_user_domains
               (user_id, domain_code, role_in_domain, is_primary, assigned_by)
               VALUES ($1,$2,$3,$4,$5) RETURNING *""",
            user_id, body.domain_code.upper(),
            body.role_in_domain, body.is_primary,
            body.assigned_by or user.sub,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, f"User already assigned to domain '{body.domain_code}'")
    return {**dict(row), "domain_name": domain["name"]}


@router.put("/catalog/users/{user_id}/domains/{domain_code}", response_model=UserDomainOut)
async def update_user_domain(
    user: CurrentUser,
    user_id: UUID,
    domain_code: str,
    body: UserDomainAssign,
    db: asyncpg.Connection = Depends(get_db),
):
    domain = await db.fetchrow(
        "SELECT * FROM project_domains WHERE code = $1", domain_code.upper()
    )
    if not domain:
        raise HTTPException(404, f"Domain '{domain_code}' not found")
    row = await db.fetchrow(
        """UPDATE catalog_user_domains
           SET role_in_domain = $3, is_primary = $4
           WHERE user_id = $1 AND domain_code = $2
           RETURNING *""",
        user_id, domain_code.upper(),
        body.role_in_domain, body.is_primary,
    )
    if not row:
        raise HTTPException(404, "Domain assignment not found")
    return {**dict(row), "domain_name": domain["name"]}


@router.delete("/catalog/users/{user_id}/domains/{domain_code}", status_code=204)
async def remove_domain(
    user: CurrentUser,
    user_id: UUID,
    domain_code: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM catalog_user_domains WHERE user_id = $1 AND domain_code = $2",
        user_id, domain_code.upper(),
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Domain assignment not found")
