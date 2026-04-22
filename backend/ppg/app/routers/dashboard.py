"""
Dashboard Router — Aggregated views across projects, budget, risks, and resources
GET /dashboard/summary   → KPI cards + status distribution + budget overview
GET /dashboard/projects  → Full project list with member count
GET /dashboard/financial → Budget vs Actual breakdown
GET /dashboard/risks     → Top risks by risk_score
GET /dashboard/resources → Headcount per project
"""
from fastapi import APIRouter, Depends, Query
from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_summary(
    user: CurrentUser,
    db=Depends(get_db),
):
    """KPI cards + status distribution pie + budget bar chart data."""
    # ── KPI: project counts per status ─────────────────────────
    status_rows = await db.fetch(
        """
        SELECT status, COUNT(*) AS cnt
        FROM projects
        GROUP BY status
        ORDER BY cnt DESC
        """
    )
    status_dist = [{"status": r["status"], "count": r["cnt"]} for r in status_rows]
    total_projects = sum(r["count"] for r in status_dist)
    active_count   = next((r["count"] for r in status_dist if r["status"] == "active"), 0)
    completed_count = next((r["count"] for r in status_dist if r["status"] == "completed"), 0)

    # ── KPI: open risks ─────────────────────────────────────────
    open_risks_row = await db.fetchrow(
        "SELECT COUNT(*) AS cnt FROM ppg_plan_risks WHERE status = 'open'"
    )
    open_risks = open_risks_row["cnt"] if open_risks_row else 0

    # ── KPI: avg risk score ─────────────────────────────────────
    avg_risk_row = await db.fetchrow(
        "SELECT ROUND(AVG(risk_score)::numeric, 1) AS avg FROM ppg_plan_risks WHERE status = 'open'"
    )
    avg_risk_score = float(avg_risk_row["avg"]) if avg_risk_row and avg_risk_row["avg"] else 0.0

    # ── Budget overview (total across all plans) ─────────────────
    budget_row = await db.fetchrow(
        """
        SELECT
            COALESCE(SUM(amount_planned), 0) AS total_planned,
            COALESCE(SUM(amount_actual),  0) AS total_actual
        FROM ppg_plan_budget
        """
    )
    total_planned = float(budget_row["total_planned"]) if budget_row else 0.0
    total_actual  = float(budget_row["total_actual"])  if budget_row else 0.0

    # ── Budget by quarter (bar chart) ───────────────────────────
    budget_quarters = await db.fetch(
        """
        SELECT
            COALESCE(quarter, 'Full-Year') AS quarter,
            COALESCE(SUM(amount_planned), 0) AS planned,
            COALESCE(SUM(amount_actual),  0) AS actual
        FROM ppg_plan_budget
        GROUP BY quarter
        ORDER BY quarter NULLS LAST
        """
    )
    budget_chart = [
        {
            "quarter": r["quarter"],
            "planned": float(r["planned"]),
            "actual":  float(r["actual"]),
        }
        for r in budget_quarters
    ]

    # ── Budget by type (capex/opex) ──────────────────────────────
    budget_type_rows = await db.fetch(
        """
        SELECT
            budget_type,
            COALESCE(SUM(amount_planned), 0) AS planned,
            COALESCE(SUM(amount_actual),  0) AS actual
        FROM ppg_plan_budget
        GROUP BY budget_type
        ORDER BY budget_type
        """
    )
    budget_by_type = [
        {
            "budget_type": r["budget_type"],
            "planned": float(r["planned"]),
            "actual":  float(r["actual"]),
        }
        for r in budget_type_rows
    ]

    return {
        "kpi": {
            "total_projects":    total_projects,
            "active_projects":   active_count,
            "completed_projects": completed_count,
            "open_risks":        open_risks,
            "avg_risk_score":    avg_risk_score,
            "total_budget_planned": total_planned,
            "total_budget_actual":  total_actual,
            "budget_utilization_pct": round(total_actual / total_planned * 100, 1) if total_planned > 0 else 0.0,
        },
        "status_distribution": status_dist,
        "budget_chart":   budget_chart,
        "budget_by_type": budget_by_type,
    }


@router.get("/projects")
async def get_dashboard_projects(
    user: CurrentUser,
    db=Depends(get_db),
):
    """Full project table with member count and domain label."""
    rows = await db.fetch(
        """
        SELECT
            p.id::text,
            p.code,
            p.name,
            p.status,
            p.owner,
            p.start_date,
            p.end_date,
            p.domain_code,
            pd.name          AS domain_label,
            p.created_at,
            COUNT(pm.id)     AS member_count
        FROM projects p
        LEFT JOIN project_domains pd  ON pd.code = p.domain_code
        LEFT JOIN project_members pm  ON pm.project_id = p.id AND pm.is_active = true
        GROUP BY p.id, pd.name
        ORDER BY p.created_at DESC
        """
    )
    return [
        {
            "id":           r["id"],
            "code":         r["code"],
            "name":         r["name"],
            "status":       r["status"],
            "owner":        r["owner"],
            "start_date":   r["start_date"].isoformat() if r["start_date"] else None,
            "end_date":     r["end_date"].isoformat()   if r["end_date"]   else None,
            "domain_code":  r["domain_code"],
            "domain_label": r["domain_label"],
            "created_at":   r["created_at"].isoformat() if r["created_at"] else None,
            "member_count": r["member_count"],
        }
        for r in rows
    ]


@router.get("/financial")
async def get_financial(
    user: CurrentUser,
    db=Depends(get_db),
):
    """Budget vs Actual — per plan, per quarter, per type."""
    # ── Per-plan summary ─────────────────────────────────────────
    plan_rows = await db.fetch(
        """
        SELECT
            a.id::text      AS plan_id,
            a.name          AS plan_name,
            a.year,
            a.status        AS plan_status,
            COALESCE(SUM(b.amount_planned), 0) AS total_planned,
            COALESCE(SUM(b.amount_actual),  0) AS total_actual,
            COUNT(b.id)                         AS line_count
        FROM ppg_annual_plans a
        LEFT JOIN ppg_plan_budget b ON b.plan_id = a.id
        GROUP BY a.id, a.name, a.year, a.status
        ORDER BY a.year DESC, a.name
        """
    )
    plan_summary = [
        {
            "plan_id":      r["plan_id"],
            "plan_name":    r["plan_name"],
            "year":         r["year"],
            "plan_status":  r["plan_status"],
            "total_planned": float(r["total_planned"]),
            "total_actual":  float(r["total_actual"]),
            "variance":      float(r["total_actual"]) - float(r["total_planned"]),
            "utilization_pct": round(
                float(r["total_actual"]) / float(r["total_planned"]) * 100, 1
            ) if float(r["total_planned"]) > 0 else 0.0,
            "line_count":   r["line_count"],
        }
        for r in plan_rows
    ]

    # ── Per-quarter breakdown ─────────────────────────────────────
    qtr_rows = await db.fetch(
        """
        SELECT
            a.name          AS plan_name,
            a.year,
            COALESCE(b.quarter, 'Full-Year') AS quarter,
            b.budget_type,
            COALESCE(SUM(b.amount_planned), 0) AS planned,
            COALESCE(SUM(b.amount_actual),  0) AS actual,
            b.currency
        FROM ppg_plan_budget b
        JOIN ppg_annual_plans a ON a.id = b.plan_id
        GROUP BY a.name, a.year, b.quarter, b.budget_type, b.currency
        ORDER BY a.year DESC, b.quarter NULLS LAST, b.budget_type
        """
    )
    quarterly_detail = [
        {
            "plan_name":    r["plan_name"],
            "year":         r["year"],
            "quarter":      r["quarter"],
            "budget_type":  r["budget_type"],
            "planned":      float(r["planned"]),
            "actual":       float(r["actual"]),
            "variance":     float(r["actual"]) - float(r["planned"]),
            "currency":     r["currency"],
        }
        for r in qtr_rows
    ]

    return {
        "plan_summary":     plan_summary,
        "quarterly_detail": quarterly_detail,
    }


@router.get("/risks")
async def get_top_risks(
    user: CurrentUser,
    limit: int = 20,
    db=Depends(get_db),
):
    """Top risks ordered by risk_score (probability × impact) descending."""
    rows = await db.fetch(
        """
        SELECT
            r.id::text,
            r.title,
            r.description,
            r.category,
            r.probability,
            r.impact,
            r.risk_score,
            r.mitigation,
            r.owner,
            r.quarter,
            r.status,
            a.name  AS plan_name,
            a.year  AS plan_year,
            r.created_at
        FROM ppg_plan_risks r
        JOIN ppg_annual_plans a ON a.id = r.plan_id
        ORDER BY r.risk_score DESC NULLS LAST, r.probability DESC, r.impact DESC
        LIMIT $1
        """,
        limit,
    )
    return [
        {
            "id":          r["id"],
            "title":       r["title"],
            "description": r["description"],
            "category":    r["category"],
            "probability": r["probability"],
            "impact":      r["impact"],
            "risk_score":  r["risk_score"],
            "mitigation":  r["mitigation"],
            "owner":       r["owner"],
            "quarter":     r["quarter"],
            "status":      r["status"],
            "plan_name":   r["plan_name"],
            "plan_year":   r["plan_year"],
            "created_at":  r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]


@router.get("/resources")
async def get_resources(
    user: CurrentUser,
    db=Depends(get_db),
):
    """Headcount per project (from project_members) + plan resource allocations."""
    # ── Headcount from project_members ──────────────────────────
    member_rows = await db.fetch(
        """
        SELECT
            p.id::text     AS project_id,
            p.code,
            p.name         AS project_name,
            p.status       AS project_status,
            p.domain_code,
            pd.name        AS domain_label,
            COUNT(pm.id)   AS headcount,
            COALESCE(
                json_agg(
                    json_build_object(
                        'name', pm.full_name,
                        'role', pm.role,
                        'email', pm.email
                    ) ORDER BY pm.full_name
                ) FILTER (WHERE pm.id IS NOT NULL),
                '[]'
            ) AS members
        FROM projects p
        LEFT JOIN project_domains pd ON pd.code = p.domain_code
        LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.is_active = true
        GROUP BY p.id, p.code, p.name, p.status, p.domain_code, pd.name
        ORDER BY headcount DESC, p.name
        """
    )
    project_headcount = [
        {
            "project_id":    r["project_id"],
            "code":          r["code"],
            "project_name":  r["project_name"],
            "project_status": r["project_status"],
            "domain_code":   r["domain_code"],
            "domain_label":  r["domain_label"],
            "headcount":     r["headcount"],
            "members":       r["members"] if isinstance(r["members"], list) else [],
        }
        for r in member_rows
    ]

    # ── Plan resource allocations summary ───────────────────────
    plan_resource_rows = await db.fetch(
        """
        SELECT
            a.name          AS plan_name,
            a.year,
            pr.team,
            pr.role,
            COUNT(DISTINCT pr.member_name)          AS unique_members,
            ROUND(AVG(pr.allocation_pct)::numeric, 1) AS avg_allocation_pct,
            COALESCE(pr.quarter, 'Full-Year')        AS quarter
        FROM ppg_plan_resources pr
        JOIN ppg_annual_plans a ON a.id = pr.plan_id
        GROUP BY a.name, a.year, pr.team, pr.role, pr.quarter
        ORDER BY a.year DESC, pr.team NULLS LAST, pr.role NULLS LAST
        """
    )
    plan_resources = [
        {
            "plan_name":         r["plan_name"],
            "year":              r["year"],
            "team":              r["team"],
            "role":              r["role"],
            "unique_members":    r["unique_members"],
            "avg_allocation_pct": float(r["avg_allocation_pct"]) if r["avg_allocation_pct"] else 0.0,
            "quarter":           r["quarter"],
        }
        for r in plan_resource_rows
    ]

    return {
        "project_headcount": project_headcount,
        "plan_resources":    plan_resources,
    }
