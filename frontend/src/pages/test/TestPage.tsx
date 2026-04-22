/**
 * Test Platform — Merged Module
 * Group 1 — Dashboard: Strategy | Execution | Control
 * Group 2 — Quản lý:   Cases | Reports | BRS | Tasks | Discussions | Timeline
 */
import React, { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, Play, CheckCircle, Plus, Code2,
  MessageSquare, CheckSquare, Calendar, ChevronRight,
} from 'lucide-react'
import {
  getBrsList, rediffBrs,
  getTestCases, testCaseAction,
  getTestReports, createTestReport, approveTestReport,
  getTestTasks, createTestTask, updateTestTask,
  getTestDiscussions, createTestDiscussion, updateTestDiscussion,
  getTestTimeline,
  getStrategyMetrics, getExecutionMetrics, getControlMetrics,
  type BrsSync, type TestCase, type TestReport, type TestTask,
  type Discussion, type TimelineEntry,
  type StrategyMetrics, type ExecutionMetrics, type ControlMetrics,
  type ModuleScope, type DefectBySeverity,
} from '../../api/test'
import { useStore } from '../../stores/auth'
import {
  StatusBadge, Btn, Modal, Field, VibInput, VibTextarea,
  VibSelect, EmptyState, ProgressBar as UiProgressBar,
} from '../../components/ui'

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  primary:  'var(--vib-primary)',
  success:  'var(--vib-success)',
  warning:  '#f59e0b',
  danger:   'var(--vib-danger)',
  info:     '#0ea5e9',
  n50:      'var(--vib-neutral-50)',
  n100:     'var(--vib-neutral-100)',
  n200:     'var(--vib-neutral-200)',
  n400:     'var(--vib-neutral-400)',
  n500:     'var(--vib-neutral-500)',
  n600:     'var(--vib-neutral-600)',
}

const TASK_STATUS_COLOR: Record<string, string> = {
  pending:     C.n400,
  in_progress: C.primary,
  done:        C.success,
  blocked:     C.danger,
}

const RISK_COLOR: Record<string, string>  = { high: C.danger,  medium: C.warning, low: C.success }
const RISK_BG:    Record<string, string>  = { high: '#fee2e2', medium: '#fef9c3', low: '#dcfce7' }
const RISK_LABEL: Record<string, string>  = { high: 'HIGH',    medium: 'MED',     low: 'LOW'     }
const SEV_COLOR:  Record<string, string>  = { critical: '#7f1d1d', high: C.danger, medium: C.warning, low: '#6b7280' }
const SEV_BG:     Record<string, string>  = { critical: '#fde8e8', high: '#fee2e2', medium: '#fef9c3', low: '#f3f4f6' }

// ══════════════════════════════════════════════════════════════════════════════
// Shared micro-components (used by Dashboard tabs)
// ══════════════════════════════════════════════════════════════════════════════

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.n200}`, borderRadius: 12, padding: 18, ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase',
      letterSpacing: '0.06em', marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${C.n100}` }}>
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub, color = C.primary, icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: string
}) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.n200}`, borderRadius: 12,
      padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: C.n600 }}>{icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.n400 }}>{sub}</div>}
    </div>
  )
}

function MiniBar({ value, color = C.primary, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <div style={{ flex: 1, height, background: C.n100, borderRadius: height }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color,
        borderRadius: height, transition: 'width 0.5s' }} />
    </div>
  )
}

function Gauge({ value, color = C.success, size = 120, label }: {
  value: number; color?: string; size?: number; label?: string
}) {
  const r = 44; const circ = 2 * Math.PI * r
  const dash = (Math.min(100, value) / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100"
          style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke={C.n100} strokeWidth="10" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: size * 0.2, fontWeight: 800, color, lineHeight: 1 }}>
            {Math.round(value)}%
          </div>
        </div>
      </div>
      {label && <div style={{ fontSize: 11, color: C.n500, textAlign: 'center' }}>{label}</div>}
    </div>
  )
}

function LoadingCard() {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: C.n400 }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
      <div style={{ fontSize: 13 }}>Đang tải dữ liệu…</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: Strategy
// ══════════════════════════════════════════════════════════════════════════════

function StrategyTab({ data }: { data: StrategyMetrics }) {
  const covColor = data.coverage_pct >= 80 ? C.success : data.coverage_pct >= 50 ? C.warning : C.danger
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Coverage gauge */}
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <SectionTitle>Coverage</SectionTitle>
          <Gauge value={data.coverage_pct} color={covColor} size={130} label="% requirement có test" />
          <div style={{ textAlign: 'center', fontSize: 12, color: C.n600 }}>
            <strong style={{ color: C.primary }}>{data.tested_requirements}</strong> / {data.total_requirements} BRS
          </div>
          <div style={{ fontSize: 11, color: C.n400 }}>requirements được cover</div>
        </Card>

        {/* Module table */}
        <Card>
          <SectionTitle>Test Scope & Risk by Module</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.n50, borderBottom: `2px solid ${C.n200}` }}>
                {['Module', 'Test Cases', 'Execution %', 'Progress', 'Risk', 'Defects'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700, color: C.n500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.test_scope.map((m: ModuleScope) => (
                <tr key={m.module} style={{ borderBottom: `1px solid ${C.n100}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{m.module}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {m.executed > 0  && <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 8 }}>{m.executed} exec</span>}
                      {m.approved > 0  && <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 8 }}>{m.approved} appr</span>}
                      {m.reviewed > 0  && <span style={{ fontSize: 10, background: '#f3e8ff', color: '#7c3aed', padding: '1px 6px', borderRadius: 8 }}>{m.reviewed} rev</span>}
                      {m.generated > 0 && <span style={{ fontSize: 10, background: C.n100, color: C.n600, padding: '1px 6px', borderRadius: 8 }}>{m.generated} draft</span>}
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: RISK_COLOR[m.risk_level] }}>
                    {m.executed_pct}%
                  </td>
                  <td style={{ padding: '8px 10px', minWidth: 100 }}>
                    <MiniBar value={m.executed_pct} color={RISK_COLOR[m.risk_level]} height={6} />
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                      background: RISK_BG[m.risk_level], color: RISK_COLOR[m.risk_level] }}>
                      {RISK_LABEL[m.risk_level]}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    {m.defect_count > 0 ? (
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {m.defect_count}
                        {m.defect_high > 0 && (
                          <span style={{ fontSize: 10, background: '#fee2e2', color: C.danger,
                            padding: '1px 5px', borderRadius: 8, marginLeft: 4 }}>
                            {m.defect_high} high+
                          </span>
                        )}
                      </span>
                    ) : <span style={{ color: C.n400 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.n600 }}>
        <strong>Risk:</strong>
        {(['high', 'medium', 'low'] as const).map(k => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLOR[k], display: 'inline-block' }} />
            {k === 'high' ? '<40%' : k === 'medium' ? '40–75%' : '>75%'} executed
          </span>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: Execution
// ══════════════════════════════════════════════════════════════════════════════

function ExecutionTab({ data }: { data: ExecutionMetrics }) {
  const pct = (n: number, d: number) => d > 0 ? Math.round(n / d * 100) : 0
  const execPct = pct(data.by_status.executed, data.total_cases)
  const statusConfig: { key: keyof typeof data.by_status; label: string; color: string }[] = [
    { key: 'executed',  label: 'Executed',  color: C.success },
    { key: 'approved',  label: 'Approved',  color: C.info    },
    { key: 'reviewed',  label: 'Reviewed',  color: '#a855f7' },
    { key: 'generated', label: 'Draft',     color: C.n400    },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="Tổng test cases" value={data.total_cases} icon="📋" sub={`${execPct}% executed`} />
        <KpiCard label="Pass rate" value={`${data.pass_pct}%`} icon="✅"
          color={data.pass_pct >= 80 ? C.success : C.warning}
          sub={`${data.sum_passed} / ${data.sum_total} tests`} />
        <KpiCard label="Fail rate" value={`${data.fail_pct}%`} icon="❌"
          color={data.fail_pct > 20 ? C.danger : data.fail_pct > 5 ? C.warning : C.n500}
          sub={`${data.sum_failed} failed`} />
        <KpiCard label="Automation" value={`${data.automation_pct}%`} icon="🤖"
          color={data.automation_pct >= 60 ? C.success : C.warning}
          sub={`${data.automated_count} / ${data.total_cases} scripts`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                    <span style={{ fontSize: 12, color: C.n500 }}>
                      <strong>{count}</strong> <span style={{ color: C.n400 }}>({p}%)</span>
                    </span>
                  </div>
                  <MiniBar value={p} color={color} height={7} />
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle>Kết quả Test Runs ({data.run_count} lần)</SectionTitle>
          {data.trend.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.n400, fontSize: 12 }}>Chưa có dữ liệu</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80, marginBottom: 8 }}>
                {data.trend.map((r, i) => {
                  const maxP = Math.max(...data.trend.map(x => x.passed), 1)
                  const pH = Math.round((r.passed / maxP) * 72)
                  const fH = r.failed > 0 ? Math.max(4, Math.round((r.failed / maxP) * 72)) : 0
                  return (
                    <div key={i} title={`${r.date?.slice(0,10)}: ${r.passed}/${r.total}`}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        {fH > 0 && <div style={{ width: '70%', height: fH, background: C.danger, borderRadius: '3px 3px 0 0' }} />}
                        <div style={{ width: '70%', height: pH, background: C.success, borderRadius: fH ? 0 : '3px 3px 0 0' }} />
                      </div>
                      <span style={{ fontSize: 9, color: C.n400 }}>{r.date?.slice(5,10) ?? '—'}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.n500, paddingTop: 8, borderTop: `1px solid ${C.n100}` }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: C.success, borderRadius: '50%', display: 'inline-block' }} />Pass
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: C.danger, borderRadius: '50%', display: 'inline-block' }} />Fail
                </span>
                <span style={{ marginLeft: 'auto', color: C.n400, fontSize: 11 }}>
                  Lần cuối: {data.last_run?.slice(0,10) ?? '—'}
                </span>
              </div>
            </>
          )}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.n100}`,
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', textAlign: 'center', gap: 8 }}>
            {[['Total runs', data.run_count], ['Executed', data.sum_total], ['Avg pass', `${data.pass_pct}%`]].map(([l, v]) => (
              <div key={String(l)}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{v}</div>
                <div style={{ fontSize: 10, color: C.n400 }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Automation */}
      <Card>
        <SectionTitle>Automation Coverage</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 24, alignItems: 'center' }}>
          <Gauge value={data.automation_pct}
            color={data.automation_pct >= 60 ? C.success : data.automation_pct >= 30 ? C.warning : C.danger}
            size={130} label="có Playwright script" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: C.n600, marginBottom: 6 }}>
                <strong>{data.automated_count}</strong> / {data.total_cases} test cases có automation script
              </div>
              <MiniBar value={data.automation_pct}
                color={data.automation_pct >= 60 ? C.success : C.warning} height={10} />
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <div style={{ padding: '8px 14px', background: '#dcfce7', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#166534' }}>{data.automated_count}</div>
                <div style={{ color: '#15803d', fontSize: 11 }}>Automated</div>
              </div>
              <div style={{ padding: '8px 14px', background: '#fef9c3', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#92400e' }}>{data.total_cases - data.automated_count}</div>
                <div style={{ color: '#b45309', fontSize: 11 }}>Manual only</div>
              </div>
              <div style={{ padding: '8px 14px', background: C.n100, borderRadius: 8, flex: 1, fontSize: 11, color: C.n600, lineHeight: 1.5 }}>
                Target khuyến nghị: ≥ 60% automation.
                {data.automation_pct < 60 && (
                  <span style={{ color: C.warning, fontWeight: 600 }}> Cần bổ sung thêm Playwright scripts.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: Control
// ══════════════════════════════════════════════════════════════════════════════

function ReadinessScore({ score }: { score: number }) {
  const color = score >= 80 ? C.success : score >= 60 ? C.warning : C.danger
  const label = score >= 80 ? 'READY TO RELEASE' : score >= 60 ? 'CONDITIONAL' : 'NOT READY'
  const circ = 251.2
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke={C.n100} strokeWidth="12" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{Math.round(score)}</div>
          <div style={{ fontSize: 10, color: C.n400 }}>/ 100</div>
        </div>
      </div>
      <div style={{ padding: '3px 14px', borderRadius: 20, background: color + '20', color, fontWeight: 700, fontSize: 11 }}>
        {label}
      </div>
    </div>
  )
}

function ControlTab({ data }: { data: ControlMetrics }) {
  const totalOpen = data.defects_by_severity.reduce((s, d) => s + d.open, 0)
  const critOpen  = data.defects_by_severity.find(d => d.severity === 'critical')?.open ?? 0
  const highOpen  = data.defects_by_severity.find(d => d.severity === 'high')?.open ?? 0
  const maxCount  = Math.max(...data.defects_by_severity.map(d => d.total), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 16 }}>
        {/* Readiness */}
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <SectionTitle>Release Readiness Score</SectionTitle>
          <ReadinessScore score={data.release_readiness_score} />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
            {([
              ['Execution pass rate', data.readiness_breakdown.exec_pass_score, '40%'],
              ['Requirement coverage', data.readiness_breakdown.coverage_score, '25%'],
              ['Defect quality',       data.readiness_breakdown.defect_score,   '25%'],
              ['Stability (reopen)',   data.readiness_breakdown.reopen_score,   '10%'],
            ] as [string, number, string][]).map(([label, score, w]) => {
              const c = score >= 80 ? C.success : score >= 50 ? C.warning : C.danger
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: C.n600 }}>{label} <span style={{ color: C.n400 }}>({w})</span></span>
                    <span style={{ fontWeight: 700, color: c }}>{Math.round(score)}</span>
                  </div>
                  <MiniBar value={score} color={c} height={5} />
                </div>
              )
            })}
          </div>
        </Card>

        {/* Defects by severity */}
        <Card>
          <SectionTitle>Defects by Severity</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {data.defects_by_severity.map((d: DefectBySeverity) => (
              <div key={d.severity} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 72, textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                    background: SEV_BG[d.severity], color: SEV_COLOR[d.severity], textTransform: 'uppercase' }}>
                    {d.severity}
                  </span>
                </div>
                <div style={{ flex: 1, position: 'relative', height: 20, background: C.n100, borderRadius: 4 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${(d.resolved / maxCount) * 100}%`, background: '#bbf7d0', borderRadius: 4 }} />
                  <div style={{ position: 'absolute', left: `${(d.resolved / maxCount) * 100}%`, top: 0, height: '100%',
                    width: `${(d.open / maxCount) * 100}%`, background: SEV_COLOR[d.severity] + 'aa',
                    borderRadius: d.resolved === 0 ? 4 : '0 4px 4px 0' }} />
                </div>
                <div style={{ width: 100, display: 'flex', gap: 6, fontSize: 11, justifyContent: 'flex-end' }}>
                  <strong>{d.total}</strong>
                  <span style={{ color: C.success }}>✔{d.resolved}</span>
                  {d.open > 0 && <span style={{ color: SEV_COLOR[d.severity], fontWeight: 700 }}>✗{d.open}</span>}
                </div>
              </div>
            ))}
          </div>
          {(critOpen > 0 || highOpen > 0) && (
            <div style={{ padding: '8px 12px', background: '#fff1f2', borderRadius: 8,
              borderLeft: `3px solid ${C.danger}`, fontSize: 12, color: '#991b1b' }}>
              ⚠️ <strong>{critOpen + highOpen} defect Critical/High</strong> chưa resolve — cần xử lý trước release.
            </div>
          )}
        </Card>
      </div>

      {/* Leakage + Reopen + Open summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <Card>
          <SectionTitle>Defect Leakage</SectionTitle>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Gauge value={data.leakage_pct}
              color={data.leakage_pct === 0 ? C.success : data.leakage_pct <= 5 ? C.warning : C.danger}
              size={90} />
            <div style={{ flex: 1, fontSize: 12 }}>
              <div style={{ color: C.n600, marginBottom: 6 }}>Defects thoát ra <strong>Production</strong></div>
              <div>
                <span style={{ fontWeight: 800, fontSize: 18, color: data.prod_defects > 0 ? C.danger : C.success }}>
                  {data.prod_defects}
                </span>
                <span style={{ color: C.n400 }}> / {data.total_defects}</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {data.defects_by_env.map(e => (
                  <div key={e.env} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: e.env === 'PROD' ? C.danger : C.n600 }}>{e.env === 'PROD' && '⚠ '}{e.env}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 40, height: 4, background: C.n100, borderRadius: 2 }}>
                        <div style={{ height: '100%', borderRadius: 2, background: e.env === 'PROD' ? C.danger : C.info,
                          width: `${(e.count / data.total_defects) * 100}%` }} />
                      </div>
                      <strong style={{ minWidth: 14 }}>{e.count}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Reopen Rate</SectionTitle>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Gauge value={data.reopen_rate_pct}
              color={data.reopen_rate_pct === 0 ? C.success : data.reopen_rate_pct <= 10 ? C.warning : C.danger}
              size={90} />
            <div style={{ flex: 1, fontSize: 12 }}>
              <div style={{ color: C.n600, marginBottom: 6 }}>Defects bị reopen / tổng resolved</div>
              <div>
                <span style={{ fontWeight: 800, fontSize: 18, color: data.reopened_count > 0 ? C.warning : C.success }}>
                  {data.reopened_count}
                </span>
                <span style={{ color: C.n400 }}> / {data.total_resolved}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: C.n600 }}>
                {data.reopen_rate_pct === 0 ? '✅ Không có defect bị reopen'
                  : data.reopen_rate_pct <= 10 ? '⚠ Kiểm tra quy trình verify fix'
                  : '❌ Reopen rate cao — cần cải thiện'}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Open Defects</SectionTitle>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: totalOpen > 0 ? C.danger : C.success }}>{totalOpen}</div>
              <div style={{ fontSize: 11, color: C.n400 }}>Open</div>
            </div>
            <div style={{ width: 1, background: C.n200 }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.success }}>{data.total_defects - totalOpen}</div>
              <div style={{ fontSize: 11, color: C.n400 }}>Resolved</div>
            </div>
          </div>
          {data.defects_by_severity.filter(d => d.open > 0).map(d => (
            <div key={d.severity} style={{ display: 'flex', justifyContent: 'space-between',
              padding: '5px 10px', borderRadius: 8, background: SEV_BG[d.severity], fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', color: SEV_COLOR[d.severity] }}>{d.severity}</span>
              <span style={{ fontWeight: 700, color: SEV_COLOR[d.severity] }}>{d.open} open</span>
            </div>
          ))}
          {totalOpen === 0 && (
            <div style={{ textAlign: 'center', padding: 14, fontSize: 12, color: C.success,
              background: '#dcfce7', borderRadius: 8 }}>✅ Không còn defect open</div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Management sub-components (from original TestPage)
// ══════════════════════════════════════════════════════════════════════════════

function ScriptModal({ testCase, open, onClose }: { testCase: TestCase; open: boolean; onClose: () => void }) {
  return (
    <Modal title={`Playwright Script — ${testCase.title}`} open={open} onClose={onClose} width="760px">
      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7,
        background: '#1a2233', color: '#e8ecf0', padding: 20, borderRadius: 8, overflowX: 'auto', maxHeight: 420 }}>
        {testCase.playwright_script || '// Script not yet generated'}
      </pre>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Btn variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(testCase.playwright_script || '')}>
          Copy Script
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
      </div>
    </Modal>
  )
}

function CreateReportModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { addToast, selectedProject } = useStore()
  const [form, setForm] = useState({ project_id: '', total: '0', passed: '0', logs: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && selectedProject) setForm(f => ({ ...f, project_id: selectedProject.id }))
  }, [open, selectedProject])

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setSaving(true)
    try {
      await createTestReport({
        project_id: form.project_id || selectedProject?.id || '',
        total: parseInt(form.total), passed: parseInt(form.passed), logs: form.logs,
      })
      addToast('Đã tạo test report', 'success'); onSaved(); onClose()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Tạo Test Report" open={open} onClose={onClose}>
      <Field label="Project ID"><VibInput value={form.project_id} onChange={s('project_id')} placeholder="UUID project" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Total Cases" required><VibInput type="number" value={form.total} onChange={s('total')} /></Field>
        <Field label="Passed" required><VibInput type="number" value={form.passed} onChange={s('passed')} /></Field>
      </div>
      <Field label="Logs"><VibTextarea value={form.logs} onChange={s('logs')} rows={4} placeholder="Test execution logs..." /></Field>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Btn onClick={submit} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Tạo Report</Btn>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
      </div>
    </Modal>
  )
}

function TestTasksTab({ projectId }: { projectId: string }) {
  const { addToast } = useStore()
  const [tasks, setTasks] = useState<TestTask[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ title: '', description: '', task_type: 'test_plan', assigned_to: '', due_date: '', status: 'pending' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setTasks(await getTestTasks({ project_id: projectId, status: statusFilter || undefined })) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [projectId, statusFilter, addToast])

  useEffect(() => { load() }, [load])

  const updateStatus = async (taskId: string, status: string) => {
    try { await updateTestTask(taskId, { status }); addToast('Đã cập nhật', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const submit = async () => {
    if (!form.title) return addToast('Cần nhập tiêu đề', 'warn')
    setSaving(true)
    try {
      await createTestTask({ ...form, project_id: projectId })
      addToast('Đã tạo task', 'success'); setShowCreate(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const fs = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const transitions: Record<string, string> = { pending: 'in_progress', in_progress: 'done', blocked: 'in_progress' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'pending', 'in_progress', 'done', 'blocked'].map(s => (
            <Btn key={s} variant={statusFilter === s ? 'primary' : 'ghost'} size="sm" onClick={() => setStatusFilter(s)}>
              {s || 'Tất cả'}
            </Btn>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /></Btn>
          <Btn size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Task</Btn>
        </div>
      </div>
      {loading ? <div className="empty-state"><div>Đang tải...</div></div>
        : tasks.length === 0
        ? <EmptyState icon="🧪" title="Chưa có test task" action={<Btn onClick={() => setShowCreate(true)}><Plus size={14} /> Tạo Task</Btn>} />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map(t => (
              <div key={t.id} className="card card-pad-sm" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 8, borderRadius: 4, alignSelf: 'stretch', background: TASK_STATUS_COLOR[t.status] || C.n200, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="txt_s_xxs">{t.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: TASK_STATUS_COLOR[t.status] + '22', color: TASK_STATUS_COLOR[t.status] }}>
                      {t.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    {t.task_type && <span style={{ fontSize: 10, color: C.n500, background: C.n100, padding: '2px 6px', borderRadius: 6 }}>{t.task_type.replace('_', ' ')}</span>}
                  </div>
                  {t.description && <p style={{ fontSize: 12, color: C.n600, marginBottom: 4 }}>{t.description}</p>}
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: C.n400 }}>
                    {t.assigned_to && <span>👤 {t.assigned_to}</span>}
                    {t.due_date && <span>📅 {new Date(t.due_date).toLocaleDateString('vi-VN')}</span>}
                  </div>
                </div>
                {transitions[t.status] && (
                  <Btn variant="ghost" size="sm" onClick={() => updateStatus(t.id, transitions[t.status])}>
                    <ChevronRight size={13} /> {transitions[t.status].replace('_', ' ')}
                  </Btn>
                )}
              </div>
            ))}
          </div>
        )
      }
      <Modal title="Tạo Test Task" open={showCreate} onClose={() => setShowCreate(false)}>
        <Field label="Tiêu đề" required><VibInput value={form.title} onChange={fs('title')} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Loại task">
            <VibSelect value={form.task_type} onChange={fs('task_type')}>
              {['test_plan','test_case_design','test_execution','bug_report','regression','uat'].map(v => (
                <option key={v} value={v}>{v.replace('_', ' ')}</option>
              ))}
            </VibSelect>
          </Field>
          <Field label="Trạng thái">
            <VibSelect value={form.status} onChange={fs('status')}>
              {['pending','in_progress','done','blocked'].map(v => <option key={v} value={v}>{v}</option>)}
            </VibSelect>
          </Field>
        </div>
        <Field label="Mô tả"><VibTextarea value={form.description} onChange={fs('description')} rows={3} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Assigned to"><VibInput value={form.assigned_to} onChange={fs('assigned_to')} /></Field>
          <Field label="Due date"><VibInput type="date" value={form.due_date} onChange={fs('due_date')} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn onClick={submit} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Tạo</Btn>
          <Btn variant="ghost" onClick={() => setShowCreate(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
        </div>
      </Modal>
    </div>
  )
}

function DiscussionsTab({ projectId }: { projectId: string }) {
  const { addToast } = useStore()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [resolving, setResolving] = useState<Discussion | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [createForm, setCreateForm] = useState({ title: '', content: '', raised_by: '', doc_id: '' })
  const [resolveForm, setResolveForm] = useState({ resolution: '', resolved_by: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setDiscussions(await getTestDiscussions({ project_id: projectId, status: statusFilter || undefined })) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [projectId, statusFilter, addToast])

  useEffect(() => { load() }, [load])

  const submitCreate = async () => {
    if (!createForm.content) return addToast('Cần nhập nội dung', 'warn')
    setSaving(true)
    try {
      await createTestDiscussion({ ...createForm, project_id: projectId })
      addToast('Đã tạo discussion', 'success'); setShowCreate(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const submitResolve = async () => {
    if (!resolving || !resolveForm.resolution) return addToast('Cần nhập giải pháp', 'warn')
    setSaving(true)
    try {
      await updateTestDiscussion(resolving.id, { status: 'resolved', resolution: resolveForm.resolution, resolved_by: resolveForm.resolved_by })
      addToast('Đã resolve', 'success'); setResolving(null); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'open', 'resolved'].map(s => (
            <Btn key={s} variant={statusFilter === s ? 'primary' : 'ghost'} size="sm" onClick={() => setStatusFilter(s)}>
              {s || 'Tất cả'}
            </Btn>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /></Btn>
          <Btn size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Discussion</Btn>
        </div>
      </div>
      {loading ? <div className="empty-state"><div>Đang tải...</div></div>
        : discussions.length === 0
        ? <EmptyState icon="💬" title="Chưa có discussion" desc="Ghi nhận vấn đề / câu hỏi về test"
            action={<Btn onClick={() => setShowCreate(true)}><Plus size={14} /> Mở Discussion</Btn>} />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {discussions.map(d => (
              <div key={d.id} className="card card-pad-sm"
                style={{ borderLeft: `3px solid ${d.status === 'resolved' ? 'var(--vib-success)' : 'var(--vib-warning)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <MessageSquare size={14} color={C.n400} />
                      <span className="txt_s_xxs">{d.title || 'Discussion'}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: d.status === 'resolved' ? 'var(--vib-success-bg)' : 'var(--vib-warning-bg)',
                        color: d.status === 'resolved' ? 'var(--vib-success)' : 'var(--vib-warning)' }}>
                        {d.status?.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--vib-neutral-700)', marginBottom: 6, lineHeight: 1.5 }}>{d.content}</p>
                    {d.resolution && (
                      <div style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--vib-success-bg)', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--vib-success)' }}>✓ </span>
                        <span style={{ fontSize: 12 }}>{d.resolution}</span>
                        {d.resolved_by && <span style={{ fontSize: 11, color: C.n500 }}> — {d.resolved_by}</span>}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: C.n400 }}>
                      {d.raised_by && <span>👤 {d.raised_by} · </span>}
                      {new Date(d.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  {d.status === 'open' && (
                    <Btn variant="secondary" size="sm" onClick={() => { setResolving(d); setResolveForm({ resolution: '', resolved_by: '' }) }}>
                      <CheckSquare size={13} /> Resolve
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
      <Modal title="Mở Discussion" open={showCreate} onClose={() => setShowCreate(false)}>
        <Field label="Tiêu đề"><VibInput value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} /></Field>
        <Field label="Nội dung" required>
          <VibTextarea value={createForm.content} onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))} rows={4} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Người tạo"><VibInput value={createForm.raised_by} onChange={e => setCreateForm(f => ({ ...f, raised_by: e.target.value }))} /></Field>
          <Field label="Doc ID liên quan"><VibInput value={createForm.doc_id} onChange={e => setCreateForm(f => ({ ...f, doc_id: e.target.value }))} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn onClick={submitCreate} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Tạo</Btn>
          <Btn variant="ghost" onClick={() => setShowCreate(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
        </div>
      </Modal>
      {resolving && (
        <Modal title="Resolve Discussion" open={!!resolving} onClose={() => setResolving(null)}>
          <div className="card card-pad-sm" style={{ marginBottom: 14, background: C.n50 }}>
            <p style={{ fontSize: 13 }}>{resolving.content}</p>
          </div>
          <Field label="Cách giải quyết" required>
            <VibTextarea value={resolveForm.resolution} onChange={e => setResolveForm(f => ({ ...f, resolution: e.target.value }))} rows={3} />
          </Field>
          <Field label="Người giải quyết">
            <VibInput value={resolveForm.resolved_by} onChange={e => setResolveForm(f => ({ ...f, resolved_by: e.target.value }))} />
          </Field>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Btn onClick={submitResolve} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Resolve</Btn>
            <Btn variant="ghost" onClick={() => setResolving(null)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function TestTimelineTab({ projectId }: { projectId: string }) {
  const { addToast } = useStore()
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setTimeline(await getTestTimeline(projectId)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [projectId, addToast])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="empty-state"><div>Đang tải...</div></div>
  if (timeline.length === 0) return (
    <EmptyState icon="📅" title="Chưa có timeline" desc="Tạo milestones cho project trong PPG để xem timeline" />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {timeline.map((entry, idx) => {
        const ms = entry.milestone; const tasks = entry.test_tasks || []
        const done = tasks.filter(t => t.status === 'done').length
        const progress = tasks.length > 0 ? Math.round(done / tasks.length * 100) : 0
        return (
          <div key={idx} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: ms ? '#1B4F72' : C.n200,
              color: ms ? '#fff' : C.n500, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Calendar size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{ms ? ms.name : 'Chưa gán milestone'}</div>
                {ms && (
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    {ms.start_date && new Date(ms.start_date).toLocaleDateString('vi-VN')}
                    {ms.end_date && ` → ${new Date(ms.end_date).toLocaleDateString('vi-VN')}`}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>{done}/{tasks.length} tasks</div>
                {tasks.length > 0 && <div style={{ opacity: 0.85 }}>{progress}%</div>}
              </div>
            </div>
            {tasks.length > 0 && (
              <div style={{ height: 4, background: C.n200 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? C.success : '#2980B9' }} />
              </div>
            )}
            {tasks.length === 0
              ? <div style={{ padding: '12px 16px', fontSize: 13, color: C.n400 }}>Chưa có test task cho milestone này</div>
              : <div style={{ padding: '6px 0' }}>
                  {tasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                      padding: '7px 16px', borderBottom: `1px solid ${C.n100}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: TASK_STATUS_COLOR[t.status] || C.n200 }} />
                      <span style={{ flex: 1, fontSize: 13 }}>{t.title}</span>
                      {t.task_type && <span style={{ fontSize: 10, color: C.n400, background: C.n100, padding: '2px 6px', borderRadius: 6 }}>{t.task_type.replace('_', ' ')}</span>}
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8,
                        background: TASK_STATUS_COLOR[t.status] + '22', color: TASK_STATUS_COLOR[t.status], fontWeight: 600 }}>
                        {t.status?.replace('_', ' ')}
                      </span>
                      {t.assigned_to && <span style={{ fontSize: 11, color: C.n400 }}>👤 {t.assigned_to}</span>}
                    </div>
                  ))}
                </div>
            }
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════

type TabId = 'strategy' | 'execution' | 'control' | 'cases' | 'reports' | 'brs' | 'tasks' | 'discussions' | 'timeline'

const TAB_GROUPS = [
  {
    label: 'Dashboard',
    tabs: [
      { id: 'strategy'  as TabId, icon: '🗺',  label: 'Strategy'  },
      { id: 'execution' as TabId, icon: '▶',   label: 'Execution' },
      { id: 'control'   as TabId, icon: '🎛',  label: 'Control'   },
    ],
  },
  {
    label: 'Quản lý',
    tabs: [
      { id: 'cases'       as TabId, icon: '🧪', label: 'Test Cases'   },
      { id: 'reports'     as TabId, icon: '📋', label: 'Reports'      },
      { id: 'brs'         as TabId, icon: '🔄', label: 'BRS Sync'     },
      { id: 'tasks'       as TabId, icon: '✅', label: 'Tasks'        },
      { id: 'discussions' as TabId, icon: '💬', label: 'Discussions'  },
      { id: 'timeline'    as TabId, icon: '📅', label: 'Timeline'     },
    ],
  },
]

const PROJECT_TABS: TabId[] = ['tasks', 'discussions', 'timeline']

export default function TestPage() {
  const { testCases, setTestCases, reports, setReports, addToast, selectedProject } = useStore()
  const [brsRecords, setBrsRecords] = useState<BrsSync[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('cases')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [scriptCase, setScriptCase] = useState<TestCase | null>(null)
  const [showCreateReport, setShowCreateReport] = useState(false)

  // Dashboard data
  const [strategy,  setStrategy]  = useState<StrategyMetrics | null>(null)
  const [execution, setExecution] = useState<ExecutionMetrics | null>(null)
  const [control,   setControl]   = useState<ControlMetrics | null>(null)
  const [metLoading, setMetLoading] = useState(false)

  const loadManagement = useCallback(async () => {
    setLoading(true)
    try {
      const [cases, rpts, brs] = await Promise.all([getTestCases(), getTestReports(), getBrsList()])
      setTestCases(cases); setReports(rpts); setBrsRecords(brs)
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [setTestCases, setReports, addToast])

  const loadMetrics = useCallback(async () => {
    setMetLoading(true)
    try {
      const [s, e, c] = await Promise.all([getStrategyMetrics(), getExecutionMetrics(), getControlMetrics()])
      setStrategy(s); setExecution(e); setControl(c)
    } catch { /**/ }
    finally { setMetLoading(false) }
  }, [])

  useEffect(() => { loadManagement(); loadMetrics() }, [loadManagement, loadMetrics])

  const caseAction = async (id: string, action: string) => {
    try {
      const res = await testCaseAction(id, action)
      addToast(`Test case → ${res.status}`, 'success'); loadManagement()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const doApproveReport = async (id: string) => {
    try {
      await approveTestReport(id)
      addToast('Report approved & pushed to PPG', 'success'); loadManagement()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const readiness = control ? Math.round(control.release_readiness_score) : null
  const readinessColor = readiness === null ? C.n400 : readiness >= 80 ? C.success : readiness >= 60 ? C.warning : C.danger

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Test Platform</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.n500 }}>
            Strategy · Execution · Control · Quản lý test cases, reports và BRS sync
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {readiness !== null && (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 700,
              background: readinessColor + '20', color: readinessColor }}>
              Readiness: {readiness}/100
            </span>
          )}
          {execution && (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12,
              background: C.n100, color: C.n600, fontWeight: 600 }}>
              Pass: {execution.pass_pct}%
            </span>
          )}
          <Btn variant="ghost" size="sm" onClick={() => { loadManagement(); loadMetrics() }}>
            <RefreshCw size={14} />
          </Btn>
        </div>
      </div>

      {selectedProject && (
        <div className="state-banner state-banner-ok" style={{ marginBottom: 14 }}>
          📁 Project: <strong>{selectedProject.name}</strong>
        </div>
      )}

      {/* Tab bar — 2 groups */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${C.n200}`, marginBottom: 20, alignItems: 'flex-end' }}>
        {TAB_GROUPS.map((group, gi) => (
          <React.Fragment key={group.label}>
            {gi > 0 && (
              <div style={{ width: 1, height: 28, background: C.n200, alignSelf: 'center', margin: '0 4px' }} />
            )}
            <div style={{ display: 'flex', gap: 0 }}>
              {group.tabs.map(tab => {
                const disabled = PROJECT_TABS.includes(tab.id) && !selectedProject
                const isActive = activeTab === tab.id
                const isDashboard = gi === 0
                return (
                  <button key={tab.id}
                    onClick={() => !disabled && setActiveTab(tab.id)}
                    disabled={disabled}
                    title={disabled ? 'Chọn project trong PPG để dùng' : undefined}
                    style={{
                      padding: '9px 16px', border: 'none', background: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.4 : 1, fontFamily: 'var(--font)', fontSize: 13, fontWeight: isActive ? 700 : 500,
                      color: isActive ? (isDashboard ? C.primary : '#7c3aed') : C.n500,
                      borderBottom: isActive
                        ? `2px solid ${isDashboard ? C.primary : '#7c3aed'}`
                        : '2px solid transparent',
                      marginBottom: -2, transition: 'all 0.15s', display: 'flex', gap: 5, alignItems: 'center',
                      whiteSpace: 'nowrap',
                    }}>
                    <span style={{ fontSize: 14 }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ── Dashboard tabs ── */}
      {activeTab === 'strategy'  && (metLoading || !strategy  ? <LoadingCard /> : <StrategyTab  data={strategy} />)}
      {activeTab === 'execution' && (metLoading || !execution ? <LoadingCard /> : <ExecutionTab data={execution} />)}
      {activeTab === 'control'   && (metLoading || !control   ? <LoadingCard /> : <ControlTab   data={control} />)}

      {/* ── Management tabs ── */}
      {activeTab === 'cases' && (() => {
        const displayCases = testCases.filter(c => !statusFilter || c.status === statusFilter)
        return (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {(['', 'generated', 'reviewed', 'approved', 'executed'] as const).map(s => {
                const active = statusFilter === s
                const count = s === '' ? testCases.length : testCases.filter(c => c.status === s).length
                return (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                      borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                      fontSize: 13, fontWeight: active ? 700 : 400,
                      background: active ? C.primary : C.n100,
                      color: active ? '#fff' : C.n600,
                    }}>
                    {s || 'Tất cả'}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
                      background: active ? 'rgba(255,255,255,0.25)' : C.n200,
                      color: active ? '#fff' : C.n500 }}>{count}</span>
                  </button>
                )
              })}
              <div style={{ flex: 1 }} />
              <Btn size="sm" onClick={() => setShowCreateReport(true)}><Plus size={14} /> Report</Btn>
            </div>
            {loading ? <div className="empty-state"><div>Đang tải...</div></div>
              : displayCases.length === 0
              ? <EmptyState icon="🧪" title="Chưa có test case" desc="Push BRS từ BA Workflow để auto-generate test cases" />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {displayCases.map(tc => (
                    <div key={tc.id} className="card card-pad-sm" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 16, flexShrink: 0,
                        background: tc.status === 'executed' ? 'var(--vib-success-bg)'
                          : tc.status === 'approved' ? 'var(--vib-info-bg)' : C.n100 }}>🧪</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span className="txt_s_xxs">{tc.title}</span>
                          <StatusBadge status={tc.status} />
                        </div>
                        {tc.module && <span style={{ fontSize: 11, color: C.n500, marginRight: 8 }}>📦 {tc.module}</span>}
                        {tc.brs_id && <span style={{ fontSize: 11, color: C.n400 }}>BRS: {tc.brs_id.slice(0, 8)}…</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {tc.playwright_script && (
                          <Btn variant="ghost" size="sm" onClick={() => setScriptCase(tc)}><Code2 size={13} /> Script</Btn>
                        )}
                        {tc.status === 'generated' && (
                          <Btn variant="secondary" size="sm" onClick={() => caseAction(tc.id, 'review')}>
                            <CheckCircle size={13} /> Review
                          </Btn>
                        )}
                        {tc.status === 'reviewed' && (
                          <Btn size="sm" onClick={() => caseAction(tc.id, 'approve')}>
                            <CheckCircle size={13} /> Approve
                          </Btn>
                        )}
                        {tc.status === 'approved' && (
                          <Btn size="sm" onClick={() => caseAction(tc.id, 'execute')}>
                            <Play size={13} /> Execute
                          </Btn>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </>
        )
      })()}

      {activeTab === 'reports' && (
        reports.length === 0
          ? <EmptyState icon="📋" title="Chưa có test report"
              action={<Btn onClick={() => setShowCreateReport(true)}><Plus size={14} /> Tạo Report</Btn>} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reports.map(r => {
                const rate = r.total > 0 ? Math.round(r.passed / r.total * 100) : 0
                return (
                  <div key={r.id} className="card card-pad-sm">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, fontSize: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: rate >= 80 ? 'var(--vib-success-bg)' : 'var(--vib-warning-bg)' }}>📋</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span className="txt_s_xxs">Test Report</span>
                          <StatusBadge status={r.status} />
                          {r.pushed_at && <span style={{ fontSize: 11, color: C.success }}>📤 PPG</span>}
                        </div>
                        <div style={{ fontSize: 12, color: C.n500 }}>
                          {r.executed_at && new Date(r.executed_at).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 20, textAlign: 'center' }}>
                        {[['Total', r.total, 'var(--vib-neutral-900)'], ['Passed', r.passed, C.success], ['Failed', r.failed, C.danger]].map(([l, v, c]) => (
                          <div key={String(l)}>
                            <div className="txt_mono" style={{ fontSize: 20, fontWeight: 700, color: String(c) }}>{v}</div>
                            <div style={{ fontSize: 11, color: C.n500 }}>{l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: C.n500 }}>Pass Rate</span>
                        <span className="txt_mono" style={{ fontSize: 13, fontWeight: 700,
                          color: rate >= 80 ? C.success : C.danger }}>{rate}%</span>
                      </div>
                      <UiProgressBar value={rate} color={rate >= 80 ? C.success : C.danger} />
                    </div>
                    {r.status === 'generated' && (
                      <Btn size="sm" onClick={() => doApproveReport(r.id)}>
                        <CheckCircle size={13} /> Approve & Push to PPG
                      </Btn>
                    )}
                  </div>
                )
              })}
            </div>
          )
      )}

      {activeTab === 'brs' && (
        brsRecords.length === 0
          ? <EmptyState icon="🔄" title="Chưa có BRS nào được sync"
              desc="Approve BRS document trong BA Workflow để tự động sync" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {brsRecords.map(b => (
                <div key={b.id} className="card card-pad-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: '#1B7A3F', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>BRS</div>
                  <div style={{ flex: 1 }}>
                    <div className="txt_s_xxs" style={{ marginBottom: 2 }}>{b.brs_id.slice(0, 20)}…</div>
                    <div style={{ fontSize: 12, color: C.n500 }}>
                      Version: <span className="txt_mono">{b.version}</span> · Synced: {new Date(b.synced_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.n500 }}>
                    {testCases.filter(c => c.brs_id === b.brs_id).length} test cases
                  </div>
                  <Btn variant="ghost" size="sm" onClick={async () => {
                    try { await rediffBrs(b.brs_id); addToast('Re-generating…', 'info'); setTimeout(loadManagement, 2000) }
                    catch (e: unknown) { addToast((e as Error).message, 'error') }
                  }}>
                    <RefreshCw size={13} /> Re-diff
                  </Btn>
                </div>
              ))}
            </div>
          )
      )}

      {activeTab === 'tasks'       && selectedProject && <TestTasksTab  projectId={selectedProject.id} />}
      {activeTab === 'discussions' && selectedProject && <DiscussionsTab projectId={selectedProject.id} />}
      {activeTab === 'timeline'    && selectedProject && <TestTimelineTab projectId={selectedProject.id} />}

      {scriptCase && <ScriptModal testCase={scriptCase} open={!!scriptCase} onClose={() => setScriptCase(null)} />}
      <CreateReportModal open={showCreateReport} onClose={() => setShowCreateReport(false)} onSaved={loadManagement} />
    </div>
  )
}
