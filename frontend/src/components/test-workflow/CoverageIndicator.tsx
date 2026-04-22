/**
 * CoverageIndicator — FR-031: coverage bar + milestone status with threshold alerts
 */

import React from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { ProgressBar } from '../ui'
import type { ObjectTestCoverage, MilestoneCoverage } from '../../lib/types/workflow-doc'

const DEFAULT_THRESHOLD = 80

interface CoverageSummaryProps {
  coverage_pct: number
  total: number
  passed: number
  failed: number
  executed: number
  threshold?: number
  compact?: boolean
}

export function CoverageSummary({
  coverage_pct,
  total,
  passed,
  failed,
  executed,
  threshold = DEFAULT_THRESHOLD,
  compact = false,
}: CoverageSummaryProps) {
  const isBelowThreshold = coverage_pct < threshold
  const color = isBelowThreshold
    ? 'var(--vib-danger)'
    : coverage_pct >= 90
      ? 'var(--vib-success)'
      : 'var(--vib-warning)'

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ProgressBar value={coverage_pct} color={color} />
        <span
          className="txt_r_xxxs"
          style={{ fontWeight: 700, color, whiteSpace: 'nowrap', minWidth: 36 }}
        >
          {coverage_pct.toFixed(0)}%
        </span>
        {isBelowThreshold && (
          <AlertTriangle
            size={12}
            style={{ color: 'var(--vib-warning)', flexShrink: 0 }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 12,
        }}
      >
        {[
          { label: 'Tổng test cases', value: total },
          { label: 'Đã thực thi', value: executed },
          { label: 'Passed', value: passed },
          { label: 'Failed', value: failed },
        ].map(({ label, value }) => (
          <div key={label} className="kpi-card">
            <div className="kpi-card__label">{label}</div>
            <div className="kpi-card__value">{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span className="txt_r_xxxs text-muted">Coverage</span>
          <span style={{ fontWeight: 700, color, fontSize: 14 }}>
            {coverage_pct.toFixed(1)}%
          </span>
        </div>
        <ProgressBar value={coverage_pct} color={color} />
        <div className="txt_r_xxxs text-muted" style={{ marginTop: 3 }}>
          Ngưỡng: {threshold}%
        </div>
      </div>

      {isBelowThreshold && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#FEF3C7',
            borderRadius: 6,
            border: '1px solid #F59E0B',
          }}
        >
          <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#92400E' }}>
            Coverage {coverage_pct.toFixed(1)}% thấp hơn ngưỡng {threshold}%
          </span>
        </div>
      )}

      {!isBelowThreshold && coverage_pct >= threshold && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: '#D1FAE5',
            borderRadius: 6,
            border: '1px solid #10B981',
          }}
        >
          <CheckCircle size={14} style={{ color: '#059669', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#065F46' }}>
            Coverage đạt ngưỡng {threshold}%
          </span>
        </div>
      )}
    </div>
  )
}

interface MilestoneCoverageCardProps {
  milestone: MilestoneCoverage
}

function MilestoneCoverageCard({ milestone }: MilestoneCoverageCardProps) {
  const color = milestone.is_below_threshold
    ? 'var(--vib-danger)'
    : 'var(--vib-success)'

  return (
    <div
      className="card card-pad-sm"
      style={{
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span className="txt_r_xxs" style={{ fontWeight: 600 }}>
          {milestone.milestone_name}
        </span>
        <span style={{ fontWeight: 700, fontSize: 14, color }}>
          {milestone.coverage_pct.toFixed(1)}%
        </span>
      </div>
      <ProgressBar value={milestone.coverage_pct} color={color} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
        }}
        className="txt_r_xxxs text-muted"
      >
        <span>Ngưỡng: {milestone.threshold_pct}%</span>
        {milestone.is_below_threshold && (
          <span style={{ color: 'var(--vib-warning)', fontWeight: 600 }}>
            Dưới ngưỡng
          </span>
        )}
      </div>
      {milestone.alert && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            padding: '4px 8px',
            background: '#FEF3C7',
            borderRadius: 4,
          }}
        >
          <AlertTriangle size={12} style={{ color: '#D97706', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#92400E' }}>{milestone.alert}</span>
        </div>
      )}
    </div>
  )
}

interface CoverageIndicatorProps {
  coverage: ObjectTestCoverage
}

export function CoverageIndicator({ coverage }: CoverageIndicatorProps) {
  const alertCount = coverage.milestone_coverage.filter(
    (m) => m.is_below_threshold,
  ).length

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h4 className="txt_s_xxs">{coverage.object_name}</h4>
        {alertCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              background: '#FEF3C7',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              color: '#D97706',
            }}
          >
            <AlertTriangle size={12} />
            {alertCount} cảnh báo coverage
          </div>
        )}
      </div>

      <CoverageSummary
        coverage_pct={coverage.coverage_pct}
        total={coverage.total_test_cases}
        passed={coverage.passed}
        failed={coverage.failed}
        executed={coverage.executed}
      />

      {coverage.milestone_coverage.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="txt_r_xxs" style={{ fontWeight: 700, marginBottom: 8 }}>
            Coverage theo Milestone
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {coverage.milestone_coverage.map((m) => (
              <MilestoneCoverageCard key={m.milestone_id} milestone={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
