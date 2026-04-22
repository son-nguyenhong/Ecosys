/**
 * AnnualPlanCard — Card component for a single annual plan
 * FR-019
 */

import React from 'react'
import { Calendar } from 'lucide-react'
import { StatusBadge, ProgressBar } from '../ui'
import type { AnnualPlan } from '../../lib/types/annual-plan'

interface AnnualPlanCardProps {
  plan: AnnualPlan
  selected?: boolean
  onClick?: () => void
  onActivate?: () => void
  onClose?: () => void
  onDelete?: () => void
}

export function AnnualPlanCard({
  plan,
  selected = false,
  onClick,
}: AnnualPlanCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.()
      }}
      className={`card card-pad-sm${selected ? ' ring-primary' : ''}`}
      style={{
        cursor: 'pointer',
        borderLeft: `3px solid ${selected ? 'var(--vib-primary)' : 'transparent'}`,
        marginBottom: 8,
        outline: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 6,
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Calendar size={14} style={{ color: 'var(--vib-primary)' }} />
          <span className="txt_s_xxs">{plan.year}</span>
        </div>
        <StatusBadge status={plan.status} />
      </div>

      <div className="txt_r_xxs" style={{ fontWeight: 600, marginBottom: 4 }}>
        {plan.name}
      </div>

      {plan.description && (
        <div
          className="txt_r_xxxs text-muted"
          style={{
            marginBottom: 8,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {plan.description}
        </div>
      )}

      <div style={{ marginBottom: 6 }}>
        <div
          className="txt_r_xxxs text-muted"
          style={{ marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}
        >
          <span>DoD hoàn thành</span>
          <span style={{ fontWeight: 600 }}>
            {plan.dod_completion_pct.toFixed(0)}%
          </span>
        </div>
        <ProgressBar
          value={plan.dod_completion_pct}
          color={
            plan.dod_completion_pct >= 80
              ? 'var(--vib-success)'
              : plan.dod_completion_pct >= 50
                ? 'var(--vib-warning)'
                : 'var(--vib-danger)'
          }
        />
      </div>

      {plan.domain && (
        <div style={{ marginBottom: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
            background: 'var(--vib-primary)15', color: 'var(--vib-primary)',
          }}>
            {plan.domain}
          </span>
        </div>
      )}

      {(plan.start_date || plan.end_date) && (
        <div className="txt_r_xxxs text-muted" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={10} />
          <span>{plan.start_date?.slice(0, 10) ?? '?'} → {plan.end_date?.slice(0, 10) ?? '?'}</span>
        </div>
      )}

      <div
        style={{ display: 'flex', gap: 12, marginTop: 8 }}
        className="txt_r_xxxs text-muted"
      >
        <span>{plan.projects_count} dự án</span>
        <span>{plan.objectives_count} mục tiêu</span>
        {plan.related_systems && plan.related_systems.length > 0 && (
          <span>{plan.related_systems.length} hệ thống</span>
        )}
      </div>
    </div>
  )
}
