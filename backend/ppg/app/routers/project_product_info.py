"""
Project Product Info Router
Covers: Product Registry, Environment, App Details, Batch/Job
Prefix: /projects/{project_id}/products
"""
from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import asyncpg, json

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/projects", tags=["project-products"])


# ── Pydantic Models ───────────────────────────────────────────────────────────

class SystemMapping(BaseModel):
    system_name: str
    relation_type: str = "related"   # upstream/downstream/related
    notes: Optional[str] = None


class ProductCreate(BaseModel):
    product_name: str = Field(..., max_length=255)
    product_type: str = Field(..., pattern=r'^(application|batch_job|api|service)$')
    business_owner: Optional[str] = None
    technical_owner: Optional[str] = None
    owner_team: Optional[str] = None
    system_mappings: List[SystemMapping] = []
    description: Optional[str] = None
    status: str = "active"


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    product_type: Optional[str] = None
    business_owner: Optional[str] = None
    technical_owner: Optional[str] = None
    owner_team: Optional[str] = None
    system_mappings: Optional[List[SystemMapping]] = None
    description: Optional[str] = None
    status: Optional[str] = None


class EnvironmentUpsert(BaseModel):
    infra_info: dict = {}
    access_info: dict = {}
    deployment_info: dict = {}
    monitoring_setup: dict = {}
    is_active: bool = True
    notes: Optional[str] = None


class TechStackItem(BaseModel):
    name: str
    version: Optional[str] = None
    category: str = "backend"  # backend/frontend/database/infrastructure


class Dependency(BaseModel):
    system_name: str
    dep_type: str = "upstream"  # upstream/downstream/shared
    criticality: str = "medium"  # low/medium/high/critical
    notes: Optional[str] = None


class AppDetailUpsert(BaseModel):
    architecture_description: Optional[str] = None
    tech_stack: List[TechStackItem] = []
    source_repo_url: Optional[str] = None
    current_version: Optional[str] = None
    release_notes: Optional[str] = None
    dependencies: List[Dependency] = []


class BatchJobCreate(BaseModel):
    job_name: str = Field(..., max_length=255)
    schedule: Optional[str] = None
    trigger_type: str = "scheduled"
    input_info: dict = {}
    output_info: dict = {}
    failure_handling: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None


class BatchJobUpdate(BaseModel):
    job_name: Optional[str] = None
    schedule: Optional[str] = None
    trigger_type: Optional[str] = None
    input_info: Optional[dict] = None
    output_info: Optional[dict] = None
    failure_handling: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ── Product Registry CRUD ─────────────────────────────────────────────────────

@router.get("/{project_id}/products")
async def list_products(
    user: CurrentUser,
    project_id: str,
    product_type: Optional[str] = None,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    if product_type:
        rows = await db.fetch(
            "SELECT * FROM project_product_registry WHERE project_id=$1 AND product_type=$2 ORDER BY product_name",
            project_id, product_type,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM project_product_registry WHERE project_id=$1 ORDER BY product_name",
            project_id,
        )
    return [dict(r) for r in rows]


@router.post("/{project_id}/products", status_code=201)
async def create_product(
    user: CurrentUser,
    project_id: str,
    body: ProductCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    row = await db.fetchrow("""
        INSERT INTO project_product_registry
            (id, project_id, product_name, product_type, business_owner,
             technical_owner, owner_team, system_mappings, description, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING *
    """, str(uuid4()), project_id, body.product_name, body.product_type,
        body.business_owner, body.technical_owner, body.owner_team,
        json.dumps([m.model_dump() for m in body.system_mappings]),
        body.description, body.status)
    return dict(row)


@router.get("/{project_id}/products/{product_id}")
async def get_product(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT * FROM project_product_registry WHERE id=$1 AND project_id=$2",
        product_id, project_id,
    )
    if not row:
        raise HTTPException(404, "Product not found")
    return dict(row)


@router.put("/{project_id}/products/{product_id}")
async def update_product(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    body: ProductUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    mappings_json = json.dumps([m.model_dump() for m in body.system_mappings]) if body.system_mappings is not None else None
    row = await db.fetchrow("""
        UPDATE project_product_registry SET
            product_name    = COALESCE($3, product_name),
            product_type    = COALESCE($4, product_type),
            business_owner  = COALESCE($5, business_owner),
            technical_owner = COALESCE($6, technical_owner),
            owner_team      = COALESCE($7, owner_team),
            system_mappings = COALESCE($8::jsonb, system_mappings),
            description     = COALESCE($9, description),
            status          = COALESCE($10, status),
            updated_at      = NOW()
        WHERE id=$1 AND project_id=$2 RETURNING *
    """, product_id, project_id, body.product_name, body.product_type,
        body.business_owner, body.technical_owner, body.owner_team,
        mappings_json, body.description, body.status)
    if not row:
        raise HTTPException(404, "Product not found")
    return dict(row)


@router.delete("/{project_id}/products/{product_id}", status_code=204)
async def delete_product(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_product_registry WHERE id=$1 AND project_id=$2",
        product_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Product not found")


# ── Environment CRUD ──────────────────────────────────────────────────────────

ENV_NAMES = ["DEV", "SIT", "UAT", "PROD", "DR"]


@router.get("/{project_id}/products/{product_id}/environments")
async def list_environments(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    rows = await db.fetch("""
        SELECT * FROM project_environments
        WHERE product_id=$1
        ORDER BY ARRAY_POSITION(ARRAY['DEV','SIT','UAT','PROD','DR'], env_name)
    """, product_id)
    return [dict(r) for r in rows]


@router.put("/{project_id}/products/{product_id}/environments/{env_name}")
async def upsert_environment(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    env_name: str,
    body: EnvironmentUpsert,
    db: asyncpg.Connection = Depends(get_db),
):
    if env_name.upper() not in ENV_NAMES:
        raise HTTPException(400, f"env_name must be one of {ENV_NAMES}")
    await _assert_product(product_id, project_id, db)
    existing = await db.fetchrow(
        "SELECT id FROM project_environments WHERE product_id=$1 AND env_name=$2",
        product_id, env_name.upper(),
    )
    if existing:
        row = await db.fetchrow("""
            UPDATE project_environments SET
                infra_info       = $3::jsonb,
                access_info      = $4::jsonb,
                deployment_info  = $5::jsonb,
                monitoring_setup = $6::jsonb,
                is_active        = $7,
                notes            = COALESCE($8, notes),
                updated_at       = NOW()
            WHERE product_id=$1 AND env_name=$2 RETURNING *
        """, product_id, env_name.upper(),
            json.dumps(body.infra_info), json.dumps(body.access_info),
            json.dumps(body.deployment_info), json.dumps(body.monitoring_setup),
            body.is_active, body.notes)
    else:
        row = await db.fetchrow("""
            INSERT INTO project_environments
                (id, project_id, product_id, env_name, infra_info,
                 access_info, deployment_info, monitoring_setup, is_active, notes)
            VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10) RETURNING *
        """, str(uuid4()), project_id, product_id, env_name.upper(),
            json.dumps(body.infra_info), json.dumps(body.access_info),
            json.dumps(body.deployment_info), json.dumps(body.monitoring_setup),
            body.is_active, body.notes)
    return dict(row)


@router.delete("/{project_id}/products/{product_id}/environments/{env_name}", status_code=204)
async def delete_environment(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    env_name: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_environments WHERE product_id=$1 AND env_name=$2",
        product_id, env_name.upper(),
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Environment not found")


# ── App Detail (upsert per product) ──────────────────────────────────────────

@router.get("/{project_id}/products/{product_id}/app-detail")
async def get_app_detail(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    row = await db.fetchrow(
        "SELECT * FROM project_app_details WHERE product_id=$1", product_id
    )
    return dict(row) if row else {}


@router.put("/{project_id}/products/{product_id}/app-detail")
async def upsert_app_detail(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    body: AppDetailUpsert,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    tech_json = json.dumps([t.model_dump() for t in body.tech_stack])
    dep_json = json.dumps([d.model_dump() for d in body.dependencies])

    existing = await db.fetchrow(
        "SELECT id FROM project_app_details WHERE product_id=$1", product_id
    )
    if existing:
        row = await db.fetchrow("""
            UPDATE project_app_details SET
                architecture_description = COALESCE($3, architecture_description),
                tech_stack               = $4::jsonb,
                source_repo_url          = COALESCE($5, source_repo_url),
                current_version          = COALESCE($6, current_version),
                release_notes            = COALESCE($7, release_notes),
                dependencies             = $8::jsonb,
                updated_at               = NOW()
            WHERE product_id=$2 RETURNING *
        """, existing["id"], product_id, body.architecture_description,
            tech_json, body.source_repo_url, body.current_version,
            body.release_notes, dep_json)
    else:
        row = await db.fetchrow("""
            INSERT INTO project_app_details
                (id, project_id, product_id, architecture_description, tech_stack,
                 source_repo_url, current_version, release_notes, dependencies)
            VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb) RETURNING *
        """, str(uuid4()), project_id, product_id, body.architecture_description,
            tech_json, body.source_repo_url, body.current_version,
            body.release_notes, dep_json)
    return dict(row)


# ── Batch Jobs CRUD ───────────────────────────────────────────────────────────

@router.get("/{project_id}/products/{product_id}/jobs")
async def list_batch_jobs(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    rows = await db.fetch(
        "SELECT * FROM project_batch_jobs WHERE product_id=$1 ORDER BY job_name",
        product_id,
    )
    return [dict(r) for r in rows]


@router.post("/{project_id}/products/{product_id}/jobs", status_code=201)
async def create_batch_job(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    body: BatchJobCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    row = await db.fetchrow("""
        INSERT INTO project_batch_jobs
            (id, project_id, product_id, job_name, schedule, trigger_type,
             input_info, output_info, failure_handling, status, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11) RETURNING *
    """, str(uuid4()), project_id, product_id, body.job_name, body.schedule,
        body.trigger_type, json.dumps(body.input_info), json.dumps(body.output_info),
        body.failure_handling, body.status, body.notes)
    return dict(row)


@router.put("/{project_id}/products/{product_id}/jobs/{job_id}")
async def update_batch_job(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    job_id: str,
    body: BatchJobUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    input_json = json.dumps(body.input_info) if body.input_info is not None else None
    output_json = json.dumps(body.output_info) if body.output_info is not None else None
    row = await db.fetchrow("""
        UPDATE project_batch_jobs SET
            job_name         = COALESCE($4, job_name),
            schedule         = COALESCE($5, schedule),
            trigger_type     = COALESCE($6, trigger_type),
            input_info       = COALESCE($7::jsonb, input_info),
            output_info      = COALESCE($8::jsonb, output_info),
            failure_handling = COALESCE($9, failure_handling),
            status           = COALESCE($10, status),
            notes            = COALESCE($11, notes),
            updated_at       = NOW()
        WHERE id=$1 AND product_id=$2 AND project_id=$3 RETURNING *
    """, job_id, product_id, project_id, body.job_name, body.schedule,
        body.trigger_type, input_json, output_json,
        body.failure_handling, body.status, body.notes)
    if not row:
        raise HTTPException(404, "Job not found")
    return dict(row)


@router.delete("/{project_id}/products/{product_id}/jobs/{job_id}", status_code=204)
async def delete_batch_job(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    job_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_batch_jobs WHERE id=$1 AND product_id=$2 AND project_id=$3",
        job_id, product_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Job not found")


# ── App Standard Info (Upsert) ────────────────────────────────────────────────

class AppStandardUpsert(BaseModel):
    app_code: Optional[str] = None
    app_full_name: Optional[str] = None
    app_type: Optional[str] = None
    criticality_level: str = "medium"
    platform: Optional[str] = None
    primary_language: Optional[str] = None
    framework: Optional[str] = None
    ui_framework: Optional[str] = None
    database_tech: List[dict] = []
    message_queue: Optional[str] = None
    api_style: Optional[str] = None
    architecture_style: Optional[str] = None
    hosting_type: Optional[str] = None
    server_os: Optional[str] = None
    network_zone: Optional[str] = None
    container_platform: Optional[str] = None
    source_repo_url: Optional[str] = None
    source_repo_type: Optional[str] = None
    current_version: Optional[str] = None
    release_date: Optional[str] = None
    next_release_date: Optional[str] = None
    user_count_internal: Optional[int] = Field(None, ge=0)
    user_count_external: Optional[int] = Field(None, ge=0)
    peak_concurrent_users: Optional[int] = Field(None, ge=0)
    sla_uptime_pct: Optional[float] = Field(None, ge=0, le=100)
    rto_hours: Optional[int] = Field(None, ge=0)
    rpo_hours: Optional[int] = Field(None, ge=0)
    maintenance_window: Optional[str] = None
    integration_count: Optional[int] = Field(None, ge=0)
    integration_list: List[dict] = []
    data_classification: str = "internal"
    compliance_standards: List[str] = []
    last_security_audit: Optional[str] = None
    next_security_audit: Optional[str] = None
    last_pen_test: Optional[str] = None
    monitoring_tool: Optional[str] = None
    log_management: Optional[str] = None
    deployment_tool: Optional[str] = None
    backup_policy: Optional[str] = None
    business_function: Optional[str] = None
    target_users: Optional[str] = None
    notes: Optional[str] = None


@router.get("/{project_id}/products/{product_id}/app-standard")
async def get_app_standard(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    row = await db.fetchrow(
        "SELECT * FROM project_app_standard_info WHERE product_id=$1", product_id
    )
    return dict(row) if row else {}


@router.put("/{project_id}/products/{product_id}/app-standard")
async def upsert_app_standard(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    body: AppStandardUpsert,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    db_json = json.dumps(body.database_tech)
    integ_json = json.dumps(body.integration_list)
    std_json = json.dumps(body.compliance_standards)
    existing = await db.fetchrow(
        "SELECT id FROM project_app_standard_info WHERE product_id=$1", product_id
    )
    if existing:
        row = await db.fetchrow("""
            UPDATE project_app_standard_info SET
                app_code             = COALESCE($3, app_code),
                app_full_name        = COALESCE($4, app_full_name),
                app_type             = COALESCE($5, app_type),
                criticality_level    = $6,
                platform             = COALESCE($7, platform),
                primary_language     = COALESCE($8, primary_language),
                framework            = COALESCE($9, framework),
                ui_framework         = COALESCE($10, ui_framework),
                database_tech        = $11::jsonb,
                message_queue        = COALESCE($12, message_queue),
                api_style            = COALESCE($13, api_style),
                architecture_style   = COALESCE($14, architecture_style),
                hosting_type         = COALESCE($15, hosting_type),
                server_os            = COALESCE($16, server_os),
                network_zone         = COALESCE($17, network_zone),
                container_platform   = COALESCE($18, container_platform),
                source_repo_url      = COALESCE($19, source_repo_url),
                source_repo_type     = COALESCE($20, source_repo_type),
                current_version      = COALESCE($21, current_version),
                release_date         = COALESCE($22::date, release_date),
                next_release_date    = COALESCE($23::date, next_release_date),
                user_count_internal  = COALESCE($24, user_count_internal),
                user_count_external  = COALESCE($25, user_count_external),
                peak_concurrent_users= COALESCE($26, peak_concurrent_users),
                sla_uptime_pct       = COALESCE($27, sla_uptime_pct),
                rto_hours            = COALESCE($28, rto_hours),
                rpo_hours            = COALESCE($29, rpo_hours),
                maintenance_window   = COALESCE($30, maintenance_window),
                integration_count    = COALESCE($31, integration_count),
                integration_list     = $32::jsonb,
                data_classification  = $33,
                compliance_standards = $34::jsonb,
                last_security_audit  = COALESCE($35::date, last_security_audit),
                next_security_audit  = COALESCE($36::date, next_security_audit),
                last_pen_test        = COALESCE($37::date, last_pen_test),
                monitoring_tool      = COALESCE($38, monitoring_tool),
                log_management       = COALESCE($39, log_management),
                deployment_tool      = COALESCE($40, deployment_tool),
                backup_policy        = COALESCE($41, backup_policy),
                business_function    = COALESCE($42, business_function),
                target_users         = COALESCE($43, target_users),
                notes                = COALESCE($44, notes),
                updated_at           = NOW()
            WHERE product_id=$1 AND project_id=$2 RETURNING *
        """, product_id, project_id,
            body.app_code, body.app_full_name, body.app_type, body.criticality_level,
            body.platform, body.primary_language, body.framework, body.ui_framework,
            db_json, body.message_queue, body.api_style, body.architecture_style,
            body.hosting_type, body.server_os, body.network_zone, body.container_platform,
            body.source_repo_url, body.source_repo_type, body.current_version,
            body.release_date, body.next_release_date, body.user_count_internal,
            body.user_count_external, body.peak_concurrent_users, body.sla_uptime_pct,
            body.rto_hours, body.rpo_hours, body.maintenance_window, body.integration_count,
            integ_json, body.data_classification, std_json,
            body.last_security_audit, body.next_security_audit, body.last_pen_test,
            body.monitoring_tool, body.log_management, body.deployment_tool,
            body.backup_policy, body.business_function, body.target_users, body.notes)
    else:
        row = await db.fetchrow("""
            INSERT INTO project_app_standard_info
                (id, product_id, project_id, app_code, app_full_name, app_type,
                 criticality_level, platform, primary_language, framework, ui_framework,
                 database_tech, message_queue, api_style, architecture_style,
                 hosting_type, server_os, network_zone, container_platform,
                 source_repo_url, source_repo_type, current_version, release_date,
                 next_release_date, user_count_internal, user_count_external,
                 peak_concurrent_users, sla_uptime_pct, rto_hours, rpo_hours,
                 maintenance_window, integration_count, integration_list,
                 data_classification, compliance_standards, last_security_audit,
                 next_security_audit, last_pen_test, monitoring_tool, log_management,
                 deployment_tool, backup_policy, business_function, target_users, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,
                    $17,$18,$19,$20,$21,$22,$23::date,$24::date,$25,$26,$27,$28,
                    $29,$30,$31,$32::jsonb,$33,$34::jsonb,$35::date,$36::date,$37::date,
                    $38,$39,$40,$41,$42,$43,$44) RETURNING *
        """, str(uuid4()), product_id, project_id,
            body.app_code, body.app_full_name, body.app_type, body.criticality_level,
            body.platform, body.primary_language, body.framework, body.ui_framework,
            db_json, body.message_queue, body.api_style, body.architecture_style,
            body.hosting_type, body.server_os, body.network_zone, body.container_platform,
            body.source_repo_url, body.source_repo_type, body.current_version,
            body.release_date, body.next_release_date, body.user_count_internal,
            body.user_count_external, body.peak_concurrent_users, body.sla_uptime_pct,
            body.rto_hours, body.rpo_hours, body.maintenance_window, body.integration_count,
            integ_json, body.data_classification, std_json,
            body.last_security_audit, body.next_security_audit, body.last_pen_test,
            body.monitoring_tool, body.log_management, body.deployment_tool,
            body.backup_policy, body.business_function, body.target_users, body.notes)
    return dict(row)


# ── Job Standard Info (Upsert) ────────────────────────────────────────────────

class JobStandardUpsert(BaseModel):
    job_code: Optional[str] = None
    job_full_name: Optional[str] = None
    job_type: Optional[str] = None
    criticality_level: str = "medium"
    run_platform: Optional[str] = None
    run_language: Optional[str] = None
    run_framework: Optional[str] = None
    run_server: Optional[str] = None
    frequency: Optional[str] = None
    schedule_cron: Optional[str] = None
    schedule_description: Optional[str] = None
    expected_start_time: Optional[str] = None
    deadline_time: Optional[str] = None
    expected_runtime_min: Optional[int] = Field(None, ge=0)
    max_runtime_min: Optional[int] = Field(None, ge=0)
    input_sources: List[dict] = []
    output_targets: List[dict] = []
    data_volume_estimate: Optional[str] = None
    retry_policy: dict = {}
    failure_action: Optional[str] = None
    error_notification: dict = {}
    success_criteria: Optional[str] = None
    reconciliation_check: Optional[str] = None
    monitoring_url: Optional[str] = None
    last_run_date: Optional[str] = None
    last_run_status: Optional[str] = None
    avg_runtime_min: Optional[int] = Field(None, ge=0)
    success_rate_pct: Optional[float] = Field(None, ge=0, le=100)
    depends_on_jobs: List[dict] = []
    dependent_jobs: List[dict] = []
    runbook_url: Optional[str] = None
    on_call_contact: Optional[str] = None
    data_classification: str = "internal"
    notes: Optional[str] = None


@router.get("/{project_id}/products/{product_id}/job-standard")
async def get_job_standard(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    row = await db.fetchrow(
        "SELECT * FROM project_job_standard_info WHERE product_id=$1", product_id
    )
    return dict(row) if row else {}


@router.put("/{project_id}/products/{product_id}/job-standard")
async def upsert_job_standard(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    body: JobStandardUpsert,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    inp_json = json.dumps(body.input_sources)
    out_json = json.dumps(body.output_targets)
    retry_json = json.dumps(body.retry_policy)
    notif_json = json.dumps(body.error_notification)
    dep_on_json = json.dumps(body.depends_on_jobs)
    dep_by_json = json.dumps(body.dependent_jobs)

    existing = await db.fetchrow(
        "SELECT id FROM project_job_standard_info WHERE product_id=$1", product_id
    )
    if existing:
        row = await db.fetchrow("""
            UPDATE project_job_standard_info SET
                job_code             = COALESCE($3, job_code),
                job_full_name        = COALESCE($4, job_full_name),
                job_type             = COALESCE($5, job_type),
                criticality_level    = $6,
                run_platform         = COALESCE($7, run_platform),
                run_language         = COALESCE($8, run_language),
                run_framework        = COALESCE($9, run_framework),
                run_server           = COALESCE($10, run_server),
                frequency            = COALESCE($11, frequency),
                schedule_cron        = COALESCE($12, schedule_cron),
                schedule_description = COALESCE($13, schedule_description),
                expected_start_time  = COALESCE($14, expected_start_time),
                deadline_time        = COALESCE($15, deadline_time),
                expected_runtime_min = COALESCE($16, expected_runtime_min),
                max_runtime_min      = COALESCE($17, max_runtime_min),
                input_sources        = $18::jsonb,
                output_targets       = $19::jsonb,
                data_volume_estimate = COALESCE($20, data_volume_estimate),
                retry_policy         = $21::jsonb,
                failure_action       = COALESCE($22, failure_action),
                error_notification   = $23::jsonb,
                success_criteria     = COALESCE($24, success_criteria),
                reconciliation_check = COALESCE($25, reconciliation_check),
                monitoring_url       = COALESCE($26, monitoring_url),
                last_run_date        = COALESCE($27::date, last_run_date),
                last_run_status      = COALESCE($28, last_run_status),
                avg_runtime_min      = COALESCE($29, avg_runtime_min),
                success_rate_pct     = COALESCE($30, success_rate_pct),
                depends_on_jobs      = $31::jsonb,
                dependent_jobs       = $32::jsonb,
                runbook_url          = COALESCE($33, runbook_url),
                on_call_contact      = COALESCE($34, on_call_contact),
                data_classification  = $35,
                notes                = COALESCE($36, notes),
                updated_at           = NOW()
            WHERE product_id=$1 AND project_id=$2 RETURNING *
        """, product_id, project_id,
            body.job_code, body.job_full_name, body.job_type, body.criticality_level,
            body.run_platform, body.run_language, body.run_framework, body.run_server,
            body.frequency, body.schedule_cron, body.schedule_description,
            body.expected_start_time, body.deadline_time, body.expected_runtime_min,
            body.max_runtime_min, inp_json, out_json, body.data_volume_estimate,
            retry_json, body.failure_action, notif_json, body.success_criteria,
            body.reconciliation_check, body.monitoring_url, body.last_run_date,
            body.last_run_status, body.avg_runtime_min, body.success_rate_pct,
            dep_on_json, dep_by_json, body.runbook_url, body.on_call_contact,
            body.data_classification, body.notes)
    else:
        row = await db.fetchrow("""
            INSERT INTO project_job_standard_info
                (id, product_id, project_id, job_code, job_full_name, job_type,
                 criticality_level, run_platform, run_language, run_framework,
                 run_server, frequency, schedule_cron, schedule_description,
                 expected_start_time, deadline_time, expected_runtime_min, max_runtime_min,
                 input_sources, output_targets, data_volume_estimate, retry_policy,
                 failure_action, error_notification, success_criteria, reconciliation_check,
                 monitoring_url, last_run_date, last_run_status, avg_runtime_min,
                 success_rate_pct, depends_on_jobs, dependent_jobs,
                 runbook_url, on_call_contact, data_classification, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                    $19::jsonb,$20::jsonb,$21,$22::jsonb,$23,$24::jsonb,$25,$26,$27,
                    $28::date,$29,$30,$31,$32::jsonb,$33::jsonb,$34,$35,$36,$37) RETURNING *
        """, str(uuid4()), product_id, project_id,
            body.job_code, body.job_full_name, body.job_type, body.criticality_level,
            body.run_platform, body.run_language, body.run_framework, body.run_server,
            body.frequency, body.schedule_cron, body.schedule_description,
            body.expected_start_time, body.deadline_time, body.expected_runtime_min,
            body.max_runtime_min, inp_json, out_json, body.data_volume_estimate,
            retry_json, body.failure_action, notif_json, body.success_criteria,
            body.reconciliation_check, body.monitoring_url, body.last_run_date,
            body.last_run_status, body.avg_runtime_min, body.success_rate_pct,
            dep_on_json, dep_by_json, body.runbook_url, body.on_call_contact,
            body.data_classification, body.notes)
    return dict(row)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _assert_project(project_id: str, db: asyncpg.Connection) -> None:
    row = await db.fetchrow("SELECT id FROM projects WHERE id=$1", project_id)
    if not row:
        raise HTTPException(404, "Project not found")


async def _assert_product(product_id: str, project_id: str, db: asyncpg.Connection) -> None:
    row = await db.fetchrow(
        "SELECT id FROM project_product_registry WHERE id=$1 AND project_id=$2",
        product_id, project_id,
    )
    if not row:
        raise HTTPException(404, "Product not found")
