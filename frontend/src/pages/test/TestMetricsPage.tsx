/**
 * TestMetricsPage — Test Management Dashboard
 * Tab 1: Strategy  | Tab 2: Execution | Tab 3: Control
 */
import React, { useEffect, useState, useCallback } from 'react'
import {
  getStrategyMetrics, getExecutionMetrics, getControlMetrics,
  type StrategyMetrics, type ExecutionMetrics, type ControlMetrics,
  type ModuleScope, type DefectBySeverity,
} from '../../api/test'

// ── Mini design tokens ────────────────────────────────────────────────────────
const C = {
  primary:  'var(--vib-primary)',
  success:  'var(--vib-success)',
  warning:  '#f59e0b',
  danger:   'var(--vib-danger)',
  info:     '#0ea5e9',
  neutral:  'var(--vib-neutral-500)',
  n100:     'var(--vib-neutral-100)',
  n200:     'var(--vib-neutral-200)',
  n50:      'var(--vib-neutral-50)',
  n600:     'var(--vib-neutral-600)',
  n400:     'var(--vib-neutral-400)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number, d: number) { return d > 0 ? Math.round(n / d * 100) : 0 }

const RISK_COLOR: Record<string, string> = { high: C.danger, medium: C.warning, low: C.success }
const RISK_BG:    Record<string, string> = { high: '#fee2e2', medium: '#fef9c3', low: '#dcfce7' }
const RISK_LABEL: Record<string, string> = { high: 'HIGH', medium: 'MED', low: 'LOW' }

const SEV_COLOR: Record<string, string> = {
  critical: '#7f1d1d', high: C.danger, medium: C.warning, low: '#6b7280',
}
const SEV_BG: Record<string, string> = {
  critical: '#fde8e8', high: '#fee2e2', medium: '#fef9c3', low: '#f3f4f6',
}

// ── Shared small components ────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.n200}`, borderRadius: 12,
      padding: 18, ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase',
      letterSpacing: '0.06em', marginBottom: 12, paddingBottom: 6,
      borderBottom: `1px solid ${C.n100}` }}>
      {children}
    </div>
  )
}

function KpiCard({
  label, value, sub, color = C.primary, icon,
}: { label: string; value: string | number; sub?: string; color?: string; icon?: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.n200}`, borderRadius: 12,
      padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: C.n600, display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon && <span>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.n400 }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({
  value, max = 100, color = C.primary, height = 8, showLabel = false,
}: { value: number; max?: number; color?: string; height?: number; showLabel?: boolean }) {
  const w = Math.min(100, (value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height, background: C.n100, borderRadius: height }}>
        <div style={{ width: `${w}%`, height: '100%', background: color,
          borderRadius: height, transition: 'width 0.5s ease' }} />
      </div>
      {showLabel && <span style={{ fontSize: 11, color: C.n600, minWidth: 36 }}>{value}%</span>}
    </div>
  )
}

/** Donut / radial gauge using SVG */
function Gauge({ value, max = 100, color = C.success, size = 120, label }: {
  value: number; max?: number; color?: string; size?: number; label?: string
}) {
  const pctVal = Math.min(100, (value / max) * 100)
  const r = 44
  const circ = 2 * Math.PI * r
  const dash = (pctVal / 100) * circ
  const gap  = circ - dash
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={C.n100} strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${gap}`} strokeLinecap="round" />
      </svg>
      <div style={{ marginTop: -size * 0.55, marginBottom: size * 0.15,
        fontSize: size * 0.2, fontWeight: 800, color, textAlign: 'center', lineHeight: 1 }}>
        {Math.round(pctVal)}%
      </div>
      {label && <div style={{ fontSize: 11, color: C.n600, marginTop: size * 0.05 }}>{label}</div>}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: C.n400 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
      <div style={{ fontSize: 13 }}>Đang tải dữ liệu…</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1 — Strategy
// ══════════════════════════════════════════════════════════════════════════════

function StrategyTab({ data }: { data: StrategyMetrics }) {
  const coverageColor = data.coverage_pct >= 80 ? C.success
    : data.coverage_pct >= 50 ? C.warning : C.danger

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Coverage + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <SectionTitle>Coverage</SectionTitle>
          <Gauge value={data.coverage_pct} color={coverageColor} size={130}
            label="% requirement có test" />
          <div style={{ textAlign: 'center', fontSize: 12, color: C.n600, marginTop: 4 }}>
            <span style={{ fontWeight: 700, color: C.primary }}>{data.tested_requirements}</span>
            <span> / {data.total_requirements} BRS</span>
          </div>
          <div style={{ fontSize: 11, color: C.n400 }}>requirements được cover</div>
        </Card>

        <Card>
          <SectionTitle>Test Scope & Risk by Module</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.n50, borderBottom: `2px solid ${C.n200}` }}>
                {['Module', 'Test Cases', 'Execution', 'Progress', 'Risk', 'Defects'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700, color: C.n600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.test_scope.map((m: ModuleScope) => (
                <tr key={m.module}
                  style={{ borderBottom: `1px solid ${C.n100}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{m.module}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {m.executed > 0 && (
                        <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534',
                          padding: '1px 6px', borderRadius: 8 }}>
                          {m.executed} executed
                        </span>
                      )}
                      {m.approved > 0 && (
                        <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1',
                          padding: '1px 6px', borderRadius: 8 }}>
                          {m.approved} approved
                        </span>
                      )}
                      {m.reviewed > 0 && (
                        <span style={{ fontSize: 10, background: '#f3e8ff', color: '#7c3aed',
                          padding: '1px 6px', borderRadius: 8 }}>
                          {m.reviewed} reviewed
                        </span>
                      )}
                      {m.generated > 0 && (
                        <span style={{ fontSize: 10, background: C.n100, color: C.n600,
                          padding: '1px 6px', borderRadius: 8 }}>
                          {m.generated} draft
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700,
                    color: RISK_COLOR[m.risk_level] }}>
                    {m.executed_pct}%
                  </td>
                  <td style={{ padding: '8px 10px', minWidth: 100 }}>
                    <ProgressBar value={m.executed_pct} color={RISK_COLOR[m.risk_level]} height={6} />
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                      background: RISK_BG[m.risk_level], color: RISK_COLOR[m.risk_level] }}>
                      {RISK_LABEL[m.risk_level]}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    {m.defect_count > 0 ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{m.defect_count}</span>
                        {m.defect_high > 0 && (
                          <span style={{ fontSize: 10, background: '#fee2e2', color: C.danger,
                            padding: '1px 5px', borderRadius: 8 }}>
                            {m.defect_high} high+
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: C.n400 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Risk legend */}
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.n600 }}>
        <span style={{ fontWeight: 700 }}>Risk level:</span>
        {[['high', 'Chưa execute (<40%)', RISK_COLOR.high], ['medium', 'Đang thực hiện (40–75%)', RISK_COLOR.medium], ['low', 'Đã hoàn thiện (>75%)', RISK_COLOR.low]].map(([k, l, c]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c as string, display: 'inline-block' }} />
            {l as string}
          </span>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2 — Execution
// ══════════════════════════════════════════════════════════════════════════════

function ExecutionTab({ data }: { data: ExecutionMetrics }) {
  const execPct = pct(data.by_status.executed, data.total_cases)
  const approvedPct = pct(data.by_status.approved, data.total_cases)

  const statusConfig: { key: keyof typeof data.by_status; label: string; color: string }[] = [
    { key: 'executed',  label: 'Executed',  color: C.success },
    { key: 'approved',  label: 'Approved',  color: C.info    },
    { key: 'reviewed',  label: 'Reviewed',  color: '#a855f7' },
    { key: 'generated', label: 'Draft',     color: C.n400    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label="Tổng test cases" value={data.total_cases} icon="📋"
          sub={`${execPct}% đã execute`} />
        <KpiCard label="Pass rate" value={`${data.pass_pct}%`} color={data.pass_pct >= 80 ? C.success : C.warning}
          icon="✅" sub={`${data.sum_passed} / ${data.sum_total} tests`} />
        <KpiCard label="Fail rate" value={`${data.fail_pct}%`}
          color={data.fail_pct > 20 ? C.danger : data.fail_pct > 5 ? C.warning : C.n600}
          icon="❌" sub={`${data.sum_failed} failed`} />
        <KpiCard label="Automation coverage" value={`${data.automation_pct}%`}
          color={data.automation_pct >= 60 ? C.success : C.warning}
          icon="🤖" sub={`${data.automated_count} / ${data.total_cases} có script`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Test case status breakdown */}
        <Card>
          <SectionTitle>Trạng thái Test Cases</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {statusConfig.map(({ key, label, color }) => {
              const count = data.by_status[key]
              const p = pct(count, data.total_cases)
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                      {label}
                    </span>
                    <span style={{ fontSize: 12, color: C.n600 }}>
                      <strong>{count}</strong> <span style={{ color: C.n400 }}>({p}%)</span>
                    </span>
                  </div>
                  <ProgressBar value={p} color={color} height={7} />
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.n100}`,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div style={{ color: C.n600 }}>Tiến độ execute</div>
            <div style={{ textAlign: 'right', fontWeight: 700, color: C.primary }}>{execPct}%</div>
            <div style={{ color: C.n600 }}>Cần review</div>
            <div style={{ textAlign: 'right', fontWeight: 700 }}>
              {data.by_status.generated + data.by_status.reviewed}
            </div>
          </div>
        </Card>

        {/* Execution trend */}
        <Card>
          <SectionTitle>Kết quả Test Runs ({data.run_count} lần)</SectionTitle>
          {data.trend.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.n400, fontSize: 12 }}>
              Chưa có dữ liệu
            </div>
          ) : (
            <>
              {/* Mini bar chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, marginBottom: 8 }}>
                {data.trend.map((r, i) => {
                  const maxPassed = Math.max(...data.trend.map(x => x.passed), 1)
                  const passH = Math.round((r.passed / maxPassed) * 80)
                  const failH = r.failed > 0 ? Math.max(4, Math.round((r.failed / maxPassed) * 80)) : 0
                  return (
                    <div key={i} title={`${r.date?.slice(0,10) ?? '—'}: ${r.passed}/${r.total}`}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 1 }}>
                        <div style={{ width: '70%', height: failH, background: C.danger,
                          borderRadius: '3px 3px 0 0', minWidth: 4 }} />
                        <div style={{ width: '70%', height: passH, background: C.success,
                          borderRadius: failH ? 0 : '3px 3px 0 0', minWidth: 4 }} />
                      </div>
                      <span style={{ fontSize: 9, color: C.n400 }}>{r.date?.slice(5,10) ?? '—'}</span>
                    </div>
                  )
                })}
              </div>

              {/* Summary row */}
              <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: `1px solid ${C.n100}`,
                fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: C.success, borderRadius: '50%', display: 'inline-block' }} />
                  Pass
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: C.danger, borderRadius: '50%', display: 'inline-block' }} />
                  Fail
                </span>
                <span style={{ marginLeft: 'auto', color: C.n400, fontSize: 11 }}>
                  Lần cuối: {data.last_run?.slice(0, 10) ?? '—'}
                </span>
              </div>
            </>
          )}

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.n100}`,
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
            {[
              { label: 'Total runs', val: data.run_count },
              { label: 'Total executed', val: data.sum_total },
              { label: 'Avg pass rate', val: `${data.pass_pct}%` },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.primary }}>{val}</div>
                <div style={{ fontSize: 10, color: C.n400 }}>{label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Automation */}
      <Card>
        <SectionTitle>Automation Coverage</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24, alignItems: 'center' }}>
          <Gauge value={data.automation_pct}
            color={data.automation_pct >= 60 ? C.success : data.automation_pct >= 30 ? C.warning : C.danger}
            size={140} label="có Playwright script" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: C.n600, marginBottom: 6 }}>
                <strong>{data.automated_count}</strong> / {data.total_cases} test cases có automation script
              </div>
              <ProgressBar value={data.automation_pct}
                color={data.automation_pct >= 60 ? C.success : C.warning} height={10} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <div style={{ padding: '8px 14px', background: '#dcfce7', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#166534' }}>{data.automated_count}</div>
                <div style={{ color: '#15803d', fontSize: 11 }}>Automated</div>
              </div>
              <div style={{ padding: '8px 14px', background: '#fef9c3', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#92400e' }}>{data.total_cases - data.automated_count}</div>
                <div style={{ color: '#b45309', fontSize: 11 }}>Manual only</div>
              </div>
              <div style={{ padding: '8px 14px', background: C.n100, borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 12, color: C.n600, lineHeight: 1.5 }}>
                  Target khuyến nghị: ≥ 60% automation để đảm bảo regression testing hiệu quả.
                  {data.automation_pct < 60 && (
                    <span style={{ color: C.warning, fontWeight: 600 }}>
                      {' '}Cần thêm {data.total_cases - data.automated_count - Math.max(0, Math.ceil(data.total_cases * 0.6) - data.automated_count)} scripts.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3 — Control
// ══════════════════════════════════════════════════════════════════════════════

function ReadinessScore({ score }: { score: number }) {
  const color = score >= 80 ? C.success : score >= 60 ? C.warning : C.danger
  const label = score >= 80 ? 'READY TO RELEASE' : score >= 60 ? 'CONDITIONAL RELEASE' : 'NOT READY'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 150, height: 150 }}>
        <svg width="150" height="150" viewBox="0 0 100 100"
          style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke={C.n100} strokeWidth="12" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${(score / 100) * 251.2} 251.2`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>
            {Math.round(score)}
          </div>
          <div style={{ fontSize: 10, color: C.n400 }}>/ 100</div>
        </div>
      </div>
      <div style={{ padding: '4px 16px', borderRadius: 20, background: color + '20',
        color, fontWeight: 700, fontSize: 12 }}>
        {label}
      </div>
    </div>
  )
}

function ControlTab({ data }: { data: ControlMetrics }) {
  const totalOpen = data.defects_by_severity.reduce((s, d) => s + d.open, 0)
  const criticalOpen = data.defects_by_severity.find(d => d.severity === 'critical')?.open ?? 0
  const highOpen = data.defects_by_severity.find(d => d.severity === 'high')?.open ?? 0
  const maxCount = Math.max(...data.defects_by_severity.map(d => d.total), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Release readiness + defects overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>

        {/* Readiness score card */}
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <SectionTitle>Release Readiness Score</SectionTitle>
          <ReadinessScore score={data.release_readiness_score} />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
            {[
              { label: 'Execution pass rate', score: data.readiness_breakdown.exec_pass_score, weight: '40%' },
              { label: 'Requirement coverage', score: data.readiness_breakdown.coverage_score, weight: '25%' },
              { label: 'Defect quality',       score: data.readiness_breakdown.defect_score,   weight: '25%' },
              { label: 'Stability (reopen)',   score: data.readiness_breakdown.reopen_score,   weight: '10%' },
            ].map(({ label, score, weight }) => {
              const c = score >= 80 ? C.success : score >= 50 ? C.warning : C.danger
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: C.n600 }}>{label} <span style={{ color: C.n400 }}>({weight})</span></span>
                    <span style={{ fontWeight: 700, color: c }}>{Math.round(score)}</span>
                  </div>
                  <ProgressBar value={score} color={c} height={5} />
                </div>
              )
            })}
          </div>
        </Card>

        {/* Defects by severity */}
        <Card>
          <SectionTitle>Defects by Severity</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {data.defects_by_severity.map((d: DefectBySeverity) => (
              <div key={d.severity} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 72, textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                    background: SEV_BG[d.severity], color: SEV_COLOR[d.severity],
                    textTransform: 'uppercase' }}>
                    {d.severity}
                  </span>
                </div>
                <div style={{ flex: 1, position: 'relative', height: 20, background: C.n100, borderRadius: 4 }}>
                  {/* Resolved portion */}
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${(d.resolved / maxCount) * 100}%`,
                    background: '#bbf7d0', borderRadius: 4 }} />
                  {/* Open portion on top */}
                  <div style={{ position: 'absolute', left: `${(d.resolved / maxCount) * 100}%`,
                    top: 0, height: '100%',
                    width: `${(d.open / maxCount) * 100}%`,
                    background: SEV_COLOR[d.severity] + 'aa', borderRadius: d.resolved === 0 ? 4 : '0 4px 4px 0' }} />
                </div>
                <div style={{ width: 100, display: 'flex', gap: 6, fontSize: 11, justifyContent: 'flex-end' }}>
                  <span style={{ fontWeight: 700 }}>{d.total}</span>
                  <span style={{ color: C.success }}>✔ {d.resolved}</span>
                  {d.open > 0 && <span style={{ color: SEV_COLOR[d.severity], fontWeight: 700 }}>✗ {d.open}</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: C.n600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: '#bbf7d0', borderRadius: 2, display: 'inline-block' }} />Resolved
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: '#fca5a5', borderRadius: 2, display: 'inline-block' }} />Open
            </span>
          </div>

          {/* Alert if critical/high open */}
          {(criticalOpen > 0 || highOpen > 0) && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff1f2',
              borderRadius: 8, borderLeft: `3px solid ${C.danger}`, fontSize: 12, color: '#991b1b' }}>
              ⚠️ <strong>{criticalOpen + highOpen} defect Critical/High</strong> chưa resolve —
              cần xử lý trước khi release.
            </div>
          )}
        </Card>
      </div>

      {/* Control metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

        {/* Defect leakage */}
        <Card>
          <SectionTitle>Defect Leakage</SectionTitle>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Gauge value={data.leakage_pct}
              color={data.leakage_pct === 0 ? C.success : data.leakage_pct <= 5 ? C.warning : C.danger}
              size={100} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.n600, marginBottom: 8 }}>
                Defects thoát ra môi trường <strong>Production</strong>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ fontWeight: 800, color: data.prod_defects > 0 ? C.danger : C.success,
                  fontSize: 18 }}>{data.prod_defects}</span>
                <span style={{ color: C.n400 }}> / {data.total_defects} defects</span>
              </div>

              {/* Defects by env */}
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.defects_by_env.map(e => (
                  <div key={e.env} style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: 11 }}>
                    <span style={{ color: e.env === 'PROD' ? C.danger : C.n600 }}>
                      {e.env === 'PROD' && '⚠ '}{e.env}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 50, height: 5, background: C.n100, borderRadius: 3 }}>
                        <div style={{ height: '100%', borderRadius: 3,
                          width: `${(e.count / data.total_defects) * 100}%`,
                          background: e.env === 'PROD' ? C.danger : C.info }} />
                      </div>
                      <span style={{ fontWeight: 600, minWidth: 16 }}>{e.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Reopen rate */}
        <Card>
          <SectionTitle>Reopen Rate</SectionTitle>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Gauge value={data.reopen_rate_pct}
              color={data.reopen_rate_pct === 0 ? C.success : data.reopen_rate_pct <= 10 ? C.warning : C.danger}
              size={100} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.n600, marginBottom: 8 }}>
                Defects bị reopen / tổng resolved
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ fontWeight: 800, fontSize: 18,
                  color: data.reopened_count > 0 ? C.warning : C.success }}>
                  {data.reopened_count}
                </span>
                <span style={{ color: C.n400 }}> / {data.total_resolved} resolved</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: C.n600 }}>
                {data.reopen_rate_pct === 0
                  ? '✅ Không có defect nào bị reopen'
                  : data.reopen_rate_pct <= 10
                  ? '⚠ Cần kiểm tra quy trình verify fix'
                  : '❌ Reopen rate cao — chất lượng fix cần cải thiện'}
              </div>
            </div>
          </div>
        </Card>

        {/* Open defects summary */}
        <Card>
          <SectionTitle>Open Defects Overview</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 4 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: totalOpen > 0 ? C.danger : C.success }}>
                  {totalOpen}
                </div>
                <div style={{ fontSize: 11, color: C.n400 }}>Total open</div>
              </div>
              <div style={{ width: 1, background: C.n200 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.success }}>
                  {data.total_defects - totalOpen}
                </div>
                <div style={{ fontSize: 11, color: C.n400 }}>Resolved</div>
              </div>
            </div>

            {data.defects_by_severity.filter(d => d.open > 0).map(d => (
              <div key={d.severity} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 8, background: SEV_BG[d.severity], fontSize: 12 }}>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', color: SEV_COLOR[d.severity] }}>
                  {d.severity}
                </span>
                <span style={{ fontWeight: 700, color: SEV_COLOR[d.severity] }}>{d.open} open</span>
              </div>
            ))}

            {totalOpen === 0 && (
              <div style={{ textAlign: 'center', padding: 16, fontSize: 12, color: C.success,
                background: '#dcfce7', borderRadius: 8 }}>
                ✅ Không còn defect open
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════

type Tab = 'strategy' | 'execution' | 'control'

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'strategy',  icon: '🗺',  label: 'Strategy'  },
  { key: 'execution', icon: '▶',   label: 'Execution'  },
  { key: 'control',   icon: '🎛',  label: 'Control'    },
]

export default function TestMetricsPage() {
  const [tab,        setTab]        = useState<Tab>('strategy')
  const [strategy,   setStrategy]   = useState<StrategyMetrics | null>(null)
  const [execution,  setExecution]  = useState<ExecutionMetrics | null>(null)
  const [control,    setControl]    = useState<ControlMetrics | null>(null)
  const [loading,    setLoading]    = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [s, e, c] = await Promise.all([
        getStrategyMetrics(), getExecutionMetrics(), getControlMetrics(),
      ])
      setStrategy(s); setExecution(e); setControl(c)
    } catch (err) {
      console.error('Failed to load metrics', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const tabContent = () => {
    if (loading) return <LoadingState />
    if (tab === 'strategy'  && strategy)  return <StrategyTab  data={strategy} />
    if (tab === 'execution' && execution) return <ExecutionTab data={execution} />
    if (tab === 'control'   && control)   return <ControlTab   data={control} />
    return <LoadingState />
  }

  // Mini summary badges for header
  const execBadge  = execution ? `${execution.pass_pct}% pass` : null
  const coverBadge = strategy  ? `${strategy.coverage_pct}% cov` : null
  const scoreBadge = control   ? `${Math.round(control.release_readiness_score)} readiness` : null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Test Management Dashboard</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.n600 }}>
            Strategy · Execution · Control — tổng quan chất lượng kiểm thử
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[execBadge, coverBadge, scoreBadge].filter(Boolean).map((b, i) => (
            <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12,
              background: C.n100, color: C.n600, fontWeight: 600 }}>
              {b}
            </span>
          ))}
          <button onClick={loadAll}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.n200}`,
              background: '#fff', cursor: 'pointer', fontSize: 12, color: C.n600, fontWeight: 600 }}>
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20,
        borderBottom: `2px solid ${C.n200}` }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 24px', border: 'none', cursor: 'pointer', background: 'transparent',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)',
              color: tab === t.key ? C.primary : C.n600,
              borderBottom: tab === t.key ? `2px solid ${C.primary}` : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s', display: 'flex', gap: 6, alignItems: 'center',
            }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tabContent()}
    </div>
  )
}
