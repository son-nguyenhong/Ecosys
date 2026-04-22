/**
 * AnnualPlanDashboard — FR-022: summary stats for an annual plan
 */

import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { KpiCard, StatusBadge, ProgressBar, Btn, EmptyState } from '../ui'
import { getAnnualPlanSummary } from '../../lib/api/annual-plans'
import type { AnnualPlanSummary } from '../../lib/types/annual-plan'

interface AnnualPlanDashboardProps {
  planId: string
  onError?: (msg: string) => void
}

export function AnnualPlanDashboard({
  planId,
  onError,
}: AnnualPlanDashboardProps) {
  const [summary, setSummary] = useState<AnnualPlanSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAnnualPlanSummary(planId)
      setSummary(res.data)
    } catch (e: unknown) {
      onError?.((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [planId, onError])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !summary) {
    return (
      <div className="empty-state">
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginTop: 8 }}>Đang tải dashboard...</span>
      </div>
    )
  }

  if (!summary) {
    return (
      <EmptyState
        icon="📊"
        title="Không có dữ liệu dashboard"
        action={
          <Btn variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={13} /> Thử lại
          </Btn>
        }
      />
    )
  }

  const totalProjects =
    summary.projects_by_status.active +
    summary.projects_by_status.on_hold +
    summary.projects_by_status.completed +
    summary.projects_by_status.archived

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h4 className="txt_s_xxs">
          Dashboard — {summary.plan.year} · {summary.plan.name}
        </h4>
        <Btn variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} />
        </Btn>
      </div>

      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <KpiCard label="Tổng dự án" value={totalProjects} />
        <KpiCard
          label="Active"
          value={summary.projects_by_status.active}
          changePositive
        />
        <KpiCard
          label="Completed"
          value={summary.projects_by_status.completed}
          changePositive
        />
        <KpiCard
          label="DoD hoàn thành"
          value={`${summary.dod_completion_pct.toFixed(0)}%`}
          changePositive={summary.dod_completion_pct >= 80}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}
          className="txt_r_xxxs text-muted"
        >
          <span>Tiến độ DoD tổng thể</span>
          <span style={{ fontWeight: 700 }}>
            {summary.dod_completion_pct.toFixed(1)}%
          </span>
        </div>
        <ProgressBar
          value={summary.dod_completion_pct}
          color={
            summary.dod_completion_pct >= 80
              ? 'var(--vib-success)'
              : 'var(--vib-warning)'
          }
        />
      </div>

      {summary.projects.length > 0 && (
        <div>
          <div className="txt_s_xxs" style={{ marginBottom: 10 }}>
            Danh sách dự án
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto auto',
              gap: '8px 16px',
              alignItems: 'center',
            }}
          >
            <div
              className="txt_r_xxxs text-muted"
              style={{ fontWeight: 700 }}
            >
              Dự án
            </div>
            <div className="txt_r_xxxs text-muted" style={{ fontWeight: 700 }}>
              Trạng thái
            </div>
            <div className="txt_r_xxxs text-muted" style={{ fontWeight: 700 }}>
              Milestone
            </div>
            <div className="txt_r_xxxs text-muted" style={{ fontWeight: 700 }}>
              BA Docs
            </div>
            <div className="txt_r_xxxs text-muted" style={{ fontWeight: 700 }}>
              Coverage
            </div>

            {summary.projects.map((proj) => (
              <React.Fragment key={proj.id}>
                <div className="txt_r_xxs" style={{ fontWeight: 600 }}>
                  {proj.name}
                </div>
                <StatusBadge status={proj.status} />
                <span className="txt_r_xxxs text-muted">
                  {proj.milestone_progress}
                </span>
                <span className="txt_r_xxxs">{proj.ba_docs_approved}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ProgressBar
                    value={proj.test_coverage_pct}
                    color={
                      proj.test_coverage_pct >= 80
                        ? 'var(--vib-success)'
                        : 'var(--vib-warning)'
                    }
                  />
                  <span
                    className="txt_r_xxxs"
                    style={{ whiteSpace: 'nowrap', minWidth: 36 }}
                  >
                    {proj.test_coverage_pct.toFixed(0)}%
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
