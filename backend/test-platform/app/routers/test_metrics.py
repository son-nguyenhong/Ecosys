"""
Test Metrics Router — Dashboard 3 tabs
GET /metrics/strategy  — coverage, risk, test scope
GET /metrics/execution — case counts, pass/fail, automation
GET /metrics/control   — defects, leakage, reopen rate, readiness score
"""
from fastapi import APIRouter, Depends
import asyncpg
from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/metrics", tags=["test-metrics"])


def _risk_level(executed_pct: float) -> str:
    if executed_pct < 40:
        return "high"
    if executed_pct < 75:
        return "medium"
    return "low"


# ── Tab 1: Strategy ───────────────────────────────────────────────────────────

@router.get("/strategy")
async def get_strategy_metrics(
    project_id: str | None = None,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    # Total BRS requirements
    brs_rows = await db.fetch(
        "SELECT COUNT(*) AS cnt FROM brs_sync" +
        (" WHERE project_id = $1" if project_id else ""),
        *([project_id] if project_id else [])
    )
    total_requirements = brs_rows[0]["cnt"] if brs_rows else 0

    # Test cases with BRS linkage
    tested_brs = await db.fetchval(
        "SELECT COUNT(DISTINCT brs_id) FROM test_cases WHERE brs_id IS NOT NULL"
    )

    coverage_pct = round((tested_brs / total_requirements * 100) if total_requirements > 0 else 0, 1)

    # Test scope + risk by module
    module_rows = await db.fetch("""
        SELECT
            module,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'executed') AS executed,
            COUNT(*) FILTER (WHERE status = 'approved') AS approved,
            COUNT(*) FILTER (WHERE status = 'reviewed') AS reviewed,
            COUNT(*) FILTER (WHERE status = 'generated') AS generated
        FROM test_cases
        WHERE module IS NOT NULL
        GROUP BY module
        ORDER BY total DESC
    """)

    test_scope = []
    for r in module_rows:
        total = r["total"] or 0
        executed = r["executed"] or 0
        executed_pct = round(executed / total * 100, 1) if total > 0 else 0
        test_scope.append({
            "module":       r["module"],
            "total":        total,
            "executed":     executed,
            "approved":     r["approved"] or 0,
            "reviewed":     r["reviewed"] or 0,
            "generated":    r["generated"] or 0,
            "executed_pct": executed_pct,
            "risk_level":   _risk_level(executed_pct),
        })

    # Defects per module (từ test_defects)
    defect_rows = await db.fetch("""
        SELECT module, COUNT(*) AS total,
               COUNT(*) FILTER (WHERE severity IN ('critical','high')) AS high_count
        FROM test_defects
        WHERE module IS NOT NULL
        GROUP BY module
    """)
    defect_by_module = {r["module"]: {"total": r["total"], "high": r["high_count"]} for r in defect_rows}

    for item in test_scope:
        d = defect_by_module.get(item["module"], {"total": 0, "high": 0})
        item["defect_count"] = d["total"]
        item["defect_high"]  = d["high"]

    return {
        "coverage_pct":        coverage_pct,
        "total_requirements":  total_requirements,
        "tested_requirements": tested_brs,
        "test_scope":          test_scope,
    }


# ── Tab 2: Execution ──────────────────────────────────────────────────────────

@router.get("/execution")
async def get_execution_metrics(
    project_id: str | None = None,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    # Test cases by status
    case_rows = await db.fetch("""
        SELECT status, COUNT(*) AS cnt
        FROM test_cases
        GROUP BY status
    """)
    by_status: dict[str, int] = {r["status"]: r["cnt"] for r in case_rows}
    total_cases = sum(by_status.values())

    # Automation coverage
    automated = await db.fetchval(
        "SELECT COUNT(*) FROM test_cases WHERE playwright_script IS NOT NULL AND playwright_script <> ''"
    )
    automation_pct = round(automated / total_cases * 100, 1) if total_cases > 0 else 0

    # Test reports — aggregate
    report_filter = "WHERE project_id = $1" if project_id else ""
    report_params = [project_id] if project_id else []

    agg_row = await db.fetchrow(f"""
        SELECT
            COUNT(*)              AS run_count,
            COALESCE(SUM(total),  0) AS sum_total,
            COALESCE(SUM(passed), 0) AS sum_passed,
            COALESCE(SUM(failed), 0) AS sum_failed,
            MAX(executed_at)         AS last_run
        FROM test_reports {report_filter}
    """, *report_params)

    sum_total  = agg_row["sum_total"]  or 0
    sum_passed = agg_row["sum_passed"] or 0
    sum_failed = agg_row["sum_failed"] or 0
    pass_pct   = round(sum_passed / sum_total * 100, 1) if sum_total > 0 else 0
    fail_pct   = round(sum_failed / sum_total * 100, 1) if sum_total > 0 else 0

    # Recent 6 reports (for mini-chart)
    trend_rows = await db.fetch(f"""
        SELECT total, passed, failed, coverage, executed_at, status
        FROM test_reports {report_filter}
        ORDER BY executed_at DESC
        LIMIT 6
    """, *report_params)

    trend = []
    for r in reversed(trend_rows):
        total = r["total"] or 0
        passed = r["passed"] or 0
        trend.append({
            "date":      r["executed_at"].isoformat() if r["executed_at"] else None,
            "total":     total,
            "passed":    passed,
            "failed":    r["failed"] or 0,
            "pass_pct":  round(passed / total * 100, 1) if total > 0 else 0,
            "coverage":  float(r["coverage"]) if r["coverage"] else 0,
            "status":    r["status"],
        })

    return {
        "total_cases":    total_cases,
        "by_status":      {
            "generated":  by_status.get("generated",  0),
            "reviewed":   by_status.get("reviewed",   0),
            "approved":   by_status.get("approved",   0),
            "executed":   by_status.get("executed",   0),
        },
        "automated_count": automated,
        "automation_pct":  automation_pct,
        "run_count":       agg_row["run_count"],
        "sum_total":       sum_total,
        "sum_passed":      sum_passed,
        "sum_failed":      sum_failed,
        "pass_pct":        pass_pct,
        "fail_pct":        fail_pct,
        "last_run":        agg_row["last_run"].isoformat() if agg_row["last_run"] else None,
        "trend":           trend,
    }


# ── Tab 3: Control ────────────────────────────────────────────────────────────

@router.get("/control")
async def get_control_metrics(
    project_id: str | None = None,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    df = "WHERE project_id = $1" if project_id else ""
    dp = [project_id] if project_id else []

    # Defects by severity
    sev_rows = await db.fetch(f"""
        SELECT
            severity,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved
        FROM test_defects {df}
        GROUP BY severity
        ORDER BY CASE severity
            WHEN 'critical' THEN 1 WHEN 'high' THEN 2
            WHEN 'medium'   THEN 3 WHEN 'low'  THEN 4
        END
    """, *dp)
    defects_by_severity = [
        {
            "severity":   r["severity"],
            "total":      r["total"],
            "resolved":   r["resolved"],
            "open":       r["total"] - r["resolved"],
        }
        for r in sev_rows
    ]
    total_defects = sum(r["total"] for r in defects_by_severity)

    # Defect leakage: found in PROD / total
    prod_defects = await db.fetchval(
        f"SELECT COUNT(*) FROM test_defects {df} AND found_in_env = 'PROD'"
        if project_id else
        "SELECT COUNT(*) FROM test_defects WHERE found_in_env = 'PROD'",
        *dp,
    )
    leakage_pct = round(prod_defects / total_defects * 100, 1) if total_defects > 0 else 0

    # Reopen rate: defects that were reopened (reopen_count > 0) / resolved
    reopen_row = await db.fetchrow(f"""
        SELECT
            COUNT(*) FILTER (WHERE reopen_count > 0) AS reopened,
            COUNT(*) FILTER (WHERE status IN ('resolved','closed','reopened')) AS total_resolved
        FROM test_defects {df}
    """, *dp)
    total_resolved  = reopen_row["total_resolved"] or 0
    reopened        = reopen_row["reopened"] or 0
    reopen_rate_pct = round(reopened / total_resolved * 100, 1) if total_resolved > 0 else 0

    # Execution pass rate (from execution tab for score)
    exec_row = await db.fetchrow(f"""
        SELECT COALESCE(SUM(total),0) AS t, COALESCE(SUM(passed),0) AS p
        FROM test_reports {df}
    """, *dp)
    exec_pass = round(exec_row["p"] / exec_row["t"] * 100, 1) if (exec_row["t"] or 0) > 0 else 0

    # Coverage from strategy
    tested_brs     = await db.fetchval("SELECT COUNT(DISTINCT brs_id) FROM test_cases WHERE brs_id IS NOT NULL")
    total_brs      = await db.fetchval("SELECT COUNT(*) FROM brs_sync")
    coverage_score = round(tested_brs / total_brs * 100, 1) if total_brs > 0 else 0

    # Release readiness score (0–100, weighted)
    open_defects_critical = next(
        (r["open"] for r in defects_by_severity if r["severity"] == "critical"), 0
    )
    defect_score = max(0, 100 - (open_defects_critical * 20) - leakage_pct)
    readiness_score = round(
        exec_pass        * 0.40 +
        coverage_score   * 0.25 +
        defect_score     * 0.25 +
        max(0, 100 - reopen_rate_pct * 2) * 0.10,
        1,
    )

    # Defects by env (for leakage breakdown)
    env_rows = await db.fetch(f"""
        SELECT found_in_env, COUNT(*) AS cnt
        FROM test_defects {df}
        GROUP BY found_in_env
        ORDER BY CASE found_in_env
            WHEN 'DEV' THEN 1 WHEN 'SIT' THEN 2
            WHEN 'UAT' THEN 3 WHEN 'STAGING' THEN 4 WHEN 'PROD' THEN 5
        END
    """, *dp)

    return {
        "total_defects":        total_defects,
        "defects_by_severity":  defects_by_severity,
        "defects_by_env":       [{"env": r["found_in_env"], "count": r["cnt"]} for r in env_rows],
        "prod_defects":         prod_defects,
        "leakage_pct":          leakage_pct,
        "reopened_count":       reopened,
        "total_resolved":       total_resolved,
        "reopen_rate_pct":      reopen_rate_pct,
        "release_readiness_score": readiness_score,
        "readiness_breakdown": {
            "exec_pass_score":  exec_pass,
            "coverage_score":   coverage_score,
            "defect_score":     defect_score,
            "reopen_score":     max(0, 100 - reopen_rate_pct * 2),
        },
    }
