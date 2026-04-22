"""
Projects Router — using reference schema (projects / project_milestones tables)
"""
from datetime import date
from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import asyncpg, json, os, logging

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/projects", tags=["projects"])
logger = logging.getLogger(__name__)

UPLOAD_BASE = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))


class ProjectCreate(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    status: str = "active"
    owner: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    plan_id: Optional[str] = None
    domain_code: Optional[str] = Field(None, max_length=50)


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    plan_id: Optional[str] = None
    domain_code: Optional[str] = Field(None, max_length=50)


class ProjectBriefUpsert(BaseModel):
    # Section 1 — Business Overview & Objectives
    purpose: Optional[str] = None
    general_info: Optional[str] = None
    success_metrics: Optional[List[str]] = None
    enduser_value: Optional[str] = None
    # Section 2 — Target Users & Personas
    primary_users: Optional[str] = None
    pain_points: Optional[str] = None
    user_role_matrix: Optional[List[str]] = None
    # Section 3 — Functional Requirements
    must_have_features: Optional[List[str]] = None
    nice_to_have_features: Optional[List[str]] = None
    system_integrations: Optional[List[str]] = None
    # Section 4 — Non-Functional Requirements
    performance_scalability: Optional[str] = None
    compliance_security: Optional[str] = None
    availability_reliability: Optional[str] = None
    # Section 5 — Data & Reporting Needs
    data_needs: Optional[str] = None
    reporting_needs: Optional[str] = None
    # Section 6 — Constraints, Risks & Assumptions
    time_constraints: Optional[str] = None
    dependencies: Optional[List[str]] = None
    potential_risks: Optional[List[str]] = None
    # Section 7 — Project Timeline & Roadmap
    key_milestones_notes: Optional[List[str]] = None
    methodology: Optional[str] = None
    decision_makers: Optional[List[str]] = None


@router.get("/domains")
async def list_domains(
    db: asyncpg.Connection = Depends(get_db),
):
    """LOV — active project domains ordered by sort_order."""
    rows = await db.fetch(
        "SELECT code, name, description, sort_order FROM project_domains "
        "WHERE is_active = TRUE ORDER BY sort_order"
    )
    return [dict(r) for r in rows]


@router.get("")
async def list_projects(
    user: CurrentUser,
    status: Optional[str] = Query(None),
    year: Optional[int] = Query(None, description="Filter by start_date year. Defaults to current year."),
    all_years: bool = Query(False, description="Set true to return all years without year filter"),
    db: asyncpg.Connection = Depends(get_db),
):
    from datetime import date
    effective_year = year if year else (None if all_years else date.today().year)

    conditions = []
    params: list = []

    if status:
        params.append(status)
        conditions.append(f"status = ${len(params)}")

    if effective_year:
        params.append(effective_year)
        conditions.append(
            f"(EXTRACT(YEAR FROM start_date) = ${len(params)} "
            f"OR (start_date IS NULL AND EXTRACT(YEAR FROM created_at) = ${len(params)}))"
        )

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await db.fetch(
        f"SELECT * FROM projects {where} ORDER BY created_at DESC", *params
    )
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_project(
    user: CurrentUser,
    body: ProjectCreate,
    auto_milestones: bool = True,
    db: asyncpg.Connection = Depends(get_db),
):
    project_id = str(uuid4())
    try:
        row = await db.fetchrow("""
            INSERT INTO projects (id, code, name, description, status, owner, start_date, end_date, plan_id, domain_code)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
        """, project_id, body.code, body.name, body.description,
            body.status, body.owner,
            body.start_date, body.end_date, body.plan_id, body.domain_code)
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, f"Project code '{body.code}' already exists")

    if auto_milestones:
        from app.services.milestone_generator import (
            generate_milestones, generate_ba_milestones, generate_test_milestones,
            generate_activity_tasks,
            MILESTONE_TEMPLATES, BA_MILESTONE_TEMPLATES, TEST_MILESTONE_TEMPLATES,
        )
        from app.services.project_template import (
            create_project_dirs, write_template_file, build_folder_records,
        )
        try:
            create_project_dirs(project_id, body.code, UPLOAD_BASE, domain_code=body.domain_code)
        except Exception as e:
            logger.warning(f"Dir creation warning: {e}")

        file_template_map = {
            **{k: (v, "project") for k, v in MILESTONE_TEMPLATES.items()},
            **{k: (v, "ba")      for k, v in BA_MILESTONE_TEMPLATES.items()},
            **{k: (v, "test")    for k, v in TEST_MILESTONE_TEMPLATES.items()},
        }
        all_milestones = (
            generate_milestones(project_id, body.start_date, body.end_date)
            + generate_ba_milestones(project_id, body.start_date, body.end_date)
            + generate_test_milestones(project_id, body.start_date, body.end_date)
        )

        try:
            async with db.transaction():
                for folder in build_folder_records(project_id, body.code, domain_code=body.domain_code):
                    await db.execute("""
                        INSERT INTO project_folders
                            (id, project_id, parent_id, folder_name, folder_path, track, sort_order)
                        VALUES ($1,$2,$3,$4,$5,$6,$7)
                    """, str(uuid4()), folder["project_id"], folder["parent_id"],
                        folder["folder_name"], folder["folder_path"],
                        folder["track"], folder["sort_order"])

                for ms in all_milestones:
                    ba_tasks   = ms.pop("_ba_tasks", [])
                    test_tasks = ms.pop("_test_tasks", [])
                    track      = ms.get("track", "project")
                    ms_id = str(uuid4())
                    await db.execute("""
                        INSERT INTO project_milestones
                            (id, project_id, name, milestone_type, description,
                             start_date, end_date, status, sort_order, preconditions, done_criteria, track)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                    """, ms_id, project_id, ms["name"], ms["milestone_type"], ms.get("description"),
                        ms["start_date"], ms["end_date"], ms["status"],
                        ms["sort_order"], json.dumps(ms["preconditions"]), ms["done_criteria"], track)

                    for title, task_type in ba_tasks:
                        await db.execute("""
                            INSERT INTO ba_tasks (id, project_id, milestone_id, task_type, title, preconditions, status, due_date)
                            VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)
                        """, str(uuid4()), project_id, ms_id, task_type, title,
                            json.dumps(ms["preconditions"]), ms["end_date"])

                    for title, task_type in test_tasks:
                        await db.execute("""
                            INSERT INTO test_tasks (id, project_id, milestone_id, task_type, title, preconditions, status, due_date)
                            VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)
                        """, str(uuid4()), project_id, ms_id, task_type, title,
                            json.dumps(ms["preconditions"]), ms["end_date"])

                    ms_type = ms["milestone_type"]
                    templates_for_type, file_track = file_template_map.get(ms_type, ([], track))
                    for fname, category in templates_for_type:
                        file_id = str(uuid4())
                        try:
                            storage_path = write_template_file(
                                project_id=project_id, project_code=body.code,
                                project_name=body.name, milestone_type=ms_type,
                                file_name=fname, upload_base=UPLOAD_BASE,
                                track=file_track, domain_code=body.domain_code,
                            )
                        except Exception:
                            storage_path = None
                        await db.execute("""
                            INSERT INTO project_files
                                (id, project_id, milestone_id, name, file_type, doc_category,
                                 current_version, storage_path, status)
                            VALUES ($1,$2,$3,$4,'template',$5,'v0.1',$6,'draft')
                        """, file_id, project_id, ms_id, fname, category, storage_path)

                # ── Activity tasks (5-domain governance checklist) ─────
                for act in generate_activity_tasks(project_id):
                    await db.execute("""
                        INSERT INTO project_activity_tasks
                            (id, project_id, activity_domain, title, status, sort_order)
                        VALUES ($1,$2,$3,$4,'pending',$5)
                    """, str(uuid4()), act["project_id"],
                        act["activity_domain"], act["title"], act["sort_order"])

        except Exception as e:
            logger.warning(f"Auto-milestone generation warning: {e}")

    return dict(row)


@router.get("/{project_id}")
async def get_project(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM projects WHERE id=$1", project_id)
    if not row:
        raise HTTPException(404, "Project not found")
    return dict(row)


@router.put("/{project_id}")
async def update_project(
    user: CurrentUser,
    project_id: str,
    body: ProjectUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        UPDATE projects SET
            name=COALESCE($2, name),
            description=COALESCE($3, description),
            status=COALESCE($4, status),
            owner=COALESCE($5, owner),
            domain_code=COALESCE($6, domain_code),
            updated_at=NOW()
        WHERE id=$1 RETURNING *
    """, project_id, body.name, body.description, body.status, body.owner, body.domain_code)
    if not row:
        raise HTTPException(404, "Project not found")
    return dict(row)


@router.delete("/{project_id}", status_code=204)
async def archive_project(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "UPDATE projects SET status='archived', updated_at=NOW() WHERE id=$1", project_id
    )
    if result == "UPDATE 0":
        raise HTTPException(404, "Project not found")


@router.get("/{project_id}/dashboard")
async def get_dashboard(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    project = await db.fetchrow("SELECT * FROM projects WHERE id=$1", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    docs   = await db.fetch("SELECT * FROM project_documents WHERE project_id=$1", project_id)
    tests  = await db.fetch("SELECT * FROM test_results WHERE project_id=$1", project_id)
    total  = sum(r["total_cases"] for r in tests)
    passed = sum(r["passed"] for r in tests)
    return {
        "project": dict(project),
        "doc_count": len(docs),
        "docs_by_type": {
            "BRD": len([d for d in docs if d["doc_type"] == "BRD"]),
            "BRS": len([d for d in docs if d["doc_type"] == "BRS"]),
            "ERD": len([d for d in docs if d["doc_type"] == "ERD"]),
            "API": len([d for d in docs if d["doc_type"] == "API"]),
        },
        "test_coverage": round(passed / total * 100, 1) if total > 0 else 0,
        "total_test_cases": total,
        "passed_tests": passed,
        "failed_tests": total - passed,
    }


# ── Project Brief (GET + PUT) ────────────────────────────────────────

_BRIEF_JSONB_COLS = (
    "success_metrics", "user_role_matrix",
    "must_have_features", "nice_to_have_features", "system_integrations",
    "dependencies", "potential_risks", "key_milestones_notes", "decision_makers",
)


@router.get("/{project_id}/brief")
async def get_project_brief(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM project_briefs WHERE project_id=$1", project_id)
    if not row:
        return {}
    result = dict(row)
    for col in _BRIEF_JSONB_COLS:
        if isinstance(result.get(col), str):
            result[col] = json.loads(result[col])
    return result


@router.put("/{project_id}/brief")
async def upsert_project_brief(
    user: CurrentUser,
    project_id: str,
    body: ProjectBriefUpsert,
    db: asyncpg.Connection = Depends(get_db),
):
    # Ensure project exists
    exists = await db.fetchval("SELECT id FROM projects WHERE id=$1", project_id)
    if not exists:
        raise HTTPException(404, "Project not found")

    data = body.model_dump(exclude_none=False)
    # Serialize list fields to JSON strings for asyncpg
    for col in _BRIEF_JSONB_COLS:
        if data.get(col) is not None:
            data[col] = json.dumps(data[col])

    existing = await db.fetchrow("SELECT id FROM project_briefs WHERE project_id=$1", project_id)
    if existing:
        row = await db.fetchrow("""
            UPDATE project_briefs SET
                purpose=$2, general_info=$3, success_metrics=$4::jsonb, enduser_value=$5,
                primary_users=$6, pain_points=$7, user_role_matrix=$8::jsonb,
                must_have_features=$9::jsonb, nice_to_have_features=$10::jsonb,
                system_integrations=$11::jsonb,
                performance_scalability=$12, compliance_security=$13,
                availability_reliability=$14,
                data_needs=$15, reporting_needs=$16,
                time_constraints=$17, dependencies=$18::jsonb, potential_risks=$19::jsonb,
                key_milestones_notes=$20::jsonb, methodology=$21, decision_makers=$22::jsonb,
                updated_at=NOW()
            WHERE project_id=$1 RETURNING *
        """, project_id,
            data["purpose"], data["general_info"],
            data["success_metrics"] or "[]", data["enduser_value"],
            data["primary_users"], data["pain_points"],
            data["user_role_matrix"] or "[]",
            data["must_have_features"] or "[]", data["nice_to_have_features"] or "[]",
            data["system_integrations"] or "[]",
            data["performance_scalability"], data["compliance_security"],
            data["availability_reliability"],
            data["data_needs"], data["reporting_needs"],
            data["time_constraints"],
            data["dependencies"] or "[]", data["potential_risks"] or "[]",
            data["key_milestones_notes"] or "[]", data["methodology"],
            data["decision_makers"] or "[]",
        )
    else:
        row = await db.fetchrow("""
            INSERT INTO project_briefs (
                id, project_id,
                purpose, general_info, success_metrics, enduser_value,
                primary_users, pain_points, user_role_matrix,
                must_have_features, nice_to_have_features, system_integrations,
                performance_scalability, compliance_security, availability_reliability,
                data_needs, reporting_needs,
                time_constraints, dependencies, potential_risks,
                key_milestones_notes, methodology, decision_makers
            ) VALUES (
                $1,$2,$3,$4,$5::jsonb,$6,
                $7,$8,$9::jsonb,
                $10::jsonb,$11::jsonb,$12::jsonb,
                $13,$14,$15,
                $16,$17,
                $18,$19::jsonb,$20::jsonb,
                $21::jsonb,$22,$23::jsonb
            ) RETURNING *
        """, str(uuid4()), project_id,
            data["purpose"], data["general_info"],
            data["success_metrics"] or "[]", data["enduser_value"],
            data["primary_users"], data["pain_points"],
            data["user_role_matrix"] or "[]",
            data["must_have_features"] or "[]", data["nice_to_have_features"] or "[]",
            data["system_integrations"] or "[]",
            data["performance_scalability"], data["compliance_security"],
            data["availability_reliability"],
            data["data_needs"], data["reporting_needs"],
            data["time_constraints"],
            data["dependencies"] or "[]", data["potential_risks"] or "[]",
            data["key_milestones_notes"] or "[]", data["methodology"],
            data["decision_makers"] or "[]",
        )

    result = dict(row)
    for col in _BRIEF_JSONB_COLS:
        if isinstance(result.get(col), str):
            result[col] = json.loads(result[col])
    return result
