/**
 * TestWorkflowPage — Unified Test Module
 * Group 1 — Dashboard: Strategy | Execution | Control
 * Group 2 — Tài liệu: Test Documents (Test Plan · Bug Report · UAT Sign-off)
 */

import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { Btn, EmptyState, VibSelect, Modal } from '../../components/ui'
import { getProjects, type Project } from '../../api/ppg'
import { TestDocumentList } from '../../components/test-workflow/TestDocumentList'
import { TestDocumentForm } from '../../components/test-workflow/TestDocumentForm'
import { CoverageIndicator } from '../../components/test-workflow/CoverageIndicator'
import {
  getTestDocuments,
  createTestDocument,
  updateTestDocument,
  transitionTestDocumentStatus,
  getObjectTestCoverage,
} from '../../lib/api/workflow-docs'
import { getProjectObjects } from '../../lib/api/project-objects'
import {
  getStrategyMetrics, getExecutionMetrics, getControlMetrics,
  type StrategyMetrics, type ExecutionMetrics, type ControlMetrics,
  type ModuleScope, type DefectBySeverity,
} from '../../api/test'
import { useStore } from '../../stores/auth'
import type {
  TestDocument,
  TestDocumentCreate,
  TestStatusAction,
  ObjectTestCoverage,
} from '../../lib/types/workflow-doc'
import type { ProjectObject } from '../../lib/types/project-object'

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  primary: 'var(--vib-primary)',
  success: 'var(--vib-success)',
  warning: '#f59e0b',
  danger:  'var(--vib-danger)',
  info:    '#0ea5e9',
  n50:     'var(--vib-neutral-50)',
  n100:    'var(--vib-neutral-100)',
  n200:    'var(--vib-neutral-200)',
  n400:    'var(--vib-neutral-400)',
  n500:    'var(--vib-neutral-500)',
  n600:    'var(--vib-neutral-600)',
}

const RISK_COLOR: Record<string, string> = { high: C.danger,   medium: C.warning, low: C.success }
const RISK_BG:    Record<string, string> = { high: '#fee2e2', medium: '#fef9c3', low: '#dcfce7' }
const RISK_LABEL: Record<string, string> = { high: 'HIGH',    medium: 'MED',     low: 'LOW'     }
const SEV_COLOR:  Record<string, string> = { critical: '#7f1d1d', high: C.danger, medium: C.warning, low: '#6b7280' }
const SEV_BG:     Record<string, string> = { critical: '#fde8e8', high: '#fee2e2', medium: '#fef9c3', low: '#f3f4f6' }

// ── Tab definitions ───────────────────────────────────────────────────────────
type TabId = 'strategy' | 'execution' | 'control' | 'documents'
const TAB_GROUPS = [
  { label: 'Dashboard', color: C.primary, tabs: [
    { id: 'strategy'  as TabId, icon: '🗺',  label: 'Strategy'  },
    { id: 'execution' as TabId, icon: '▶',   label: 'Execution' },
    { id: 'control'   as TabId, icon: '🎛',  label: 'Control'   },
  ]},
  { label: 'Tài liệu', color: '#7c3aed', tabs: [
    { id: 'documents' as TabId, icon: '📄', label: 'Tài liệu Test' },
  ]},
]

// ══════════════════════════════════════════════════════════════════════════════
// Micro-components
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
  const r = 44; const circ = 2 * Math.PI * r; const dash = (Math.min(100, value) / 100) * circ
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

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: C.n500 }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
      <div style={{ fontSize: 13, marginBottom: 16 }}>Không thể tải dữ liệu. Kiểm tra kết nối backend.</div>
      <button
        onClick={onRetry}
        style={{
          padding: '6px 18px', borderRadius: 8, border: `1px solid ${C.n200}`,
          background: '#fff', cursor: 'pointer', fontSize: 13, color: C.primary,
          fontFamily: 'var(--font)',
        }}
      >
        Thử lại
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Dashboard tab: Strategy
// ══════════════════════════════════════════════════════════════════════════════
function StrategyTab({ data }: { data: StrategyMetrics }) {
  const covColor = data.coverage_pct >= 80 ? C.success : data.coverage_pct >= 50 ? C.warning : C.danger
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 16, alignItems: 'start' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <SectionTitle>Coverage</SectionTitle>
          <Gauge value={data.coverage_pct} color={covColor} size={130} label="% requirement có test" />
          <div style={{ textAlign: 'center', fontSize: 12, color: C.n600 }}>
            <strong style={{ color: C.primary }}>{data.tested_requirements}</strong> / {data.total_requirements} BRS
          </div>
          <div style={{ fontSize: 11, color: C.n400 }}>requirements được cover</div>
        </Card>

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
                      {m.executed  > 0 && <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 8 }}>{m.executed} exec</span>}
                      {m.approved  > 0 && <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 8 }}>{m.approved} appr</span>}
                      {m.reviewed  > 0 && <span style={{ fontSize: 10, background: '#f3e8ff', color: '#7c3aed', padding: '1px 6px', borderRadius: 8 }}>{m.reviewed} rev</span>}
                      {m.generated > 0 && <span style={{ fontSize: 10, background: C.n100, color: C.n600, padding: '1px 6px', borderRadius: 8 }}>{m.generated} draft</span>}
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: RISK_COLOR[m.risk_level] }}>{m.executed_pct}%</td>
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
// Dashboard tab: Execution
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
// Dashboard tab: Control
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
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <SectionTitle>Release Readiness Score</SectionTitle>
          <ReadinessScore score={data.release_readiness_score} />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
            {([
              ['Execution pass rate', data.readiness_breakdown.exec_pass_score,  '40%'],
              ['Requirement coverage', data.readiness_breakdown.coverage_score,  '25%'],
              ['Defect quality',       data.readiness_breakdown.defect_score,    '25%'],
              ['Stability (reopen)',   data.readiness_breakdown.reopen_score,    '10%'],
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
// Documents Tab — self-contained with project + object picker
// ══════════════════════════════════════════════════════════════════════════════
type TransitionStep = { action: TestStatusAction; label: string }
const TEST_PLAN_TRANSITIONS: TransitionStep[]   = [{ action: 'submit_review', label: 'Gửi Review' }, { action: 'approve', label: 'Approve' }, { action: 'archive', label: 'Archive' }]
const BUG_REPORT_TRANSITIONS: TransitionStep[]  = [{ action: 'start', label: 'Bắt đầu xử lý' },    { action: 'resolve', label: 'Resolve' }, { action: 'close',   label: 'Close'   }]
const UAT_SIGNOFF_TRANSITIONS: TransitionStep[] = [{ action: 'submit', label: 'Submit to Sign' },    { action: 'sign',    label: 'Sign'    }, { action: 'archive', label: 'Archive' }]
function getTransitionsForDoc(doc: TestDocument): TransitionStep[] {
  switch (doc.doc_type) {
    case 'TEST_PLAN':   return TEST_PLAN_TRANSITIONS
    case 'BUG_REPORT':  return BUG_REPORT_TRANSITIONS
    case 'UAT_SIGNOFF': return UAT_SIGNOFF_TRANSITIONS
    default:            return []
  }
}

function DocumentsTab() {
  const { addToast } = useStore()
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [projectId,   setProjectId]   = useState<string>('')
  const [objects,     setObjects]     = useState<ProjectObject[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState<string>('')
  const [coverage,    setCoverage]    = useState<ObjectTestCoverage | null>(null)
  const [coverageLoading, setCoverageLoading] = useState(false)
  const [documents,   setDocuments]   = useState<TestDocument[]>([])
  const [loading,     setLoading]     = useState(false)
  const [docTypeFilter, setDocTypeFilter] = useState<'TEST_PLAN' | 'BUG_REPORT' | 'UAT_SIGNOFF' | ''>('')
  const [showForm,    setShowForm]    = useState(false)
  const [editing,     setEditing]     = useState<TestDocument | null>(null)
  const [transitionTarget, setTransitionTarget] = useState<TestDocument | null>(null)
  const [showCoverageModal, setShowCoverageModal] = useState(false)

  useEffect(() => {
    getProjects({ all_years: true }).then(setAllProjects).catch(() => {})
  }, [])

  const loadObjects = useCallback(async () => {
    if (!projectId) { setObjects([]); return }
    try { const res = await getProjectObjects(projectId); setObjects(res.data) }
    catch { /* silent */ }
  }, [projectId])

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getTestDocuments({
        project_id: projectId || undefined,
        object_id:  selectedObjectId || undefined,
      })
      setDocuments(res.data)
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [projectId, selectedObjectId, addToast])

  const loadCoverage = useCallback(async () => {
    if (!selectedObjectId) { setCoverage(null); return }
    setCoverageLoading(true)
    try { const res = await getObjectTestCoverage(selectedObjectId); setCoverage(res.data) }
    catch { setCoverage(null) }
    finally { setCoverageLoading(false) }
  }, [selectedObjectId])

  useEffect(() => { setSelectedObjectId(''); loadObjects() }, [loadObjects])
  useEffect(() => { loadDocuments(); loadCoverage() }, [loadDocuments, loadCoverage])

  const handleSave = async (data: TestDocumentCreate) => {
    try {
      if (editing) {
        await updateTestDocument(editing.id, { title: data.title, content: data.content, milestone_id: data.milestone_id, metadata: data.metadata })
        addToast('Đã cập nhật tài liệu', 'success')
      } else {
        await createTestDocument(data)
        addToast('Đã tạo tài liệu test', 'success')
      }
      setShowForm(false); setEditing(null); loadDocuments()
    } catch (e: unknown) { addToast((e as Error).message, 'error'); throw e }
  }

  const handleTransition = async (action: TestStatusAction) => {
    if (!transitionTarget) return
    try {
      await transitionTestDocumentStatus(transitionTarget.id, { action })
      addToast('Đã chuyển trạng thái', 'success')
      setTransitionTarget(null); loadDocuments()
      if (selectedObjectId) loadCoverage()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const belowThresholdCount = coverage?.milestone_coverage.filter(m => m.is_below_threshold).length ?? 0

  return (
    <>
      {/* Filters row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <VibSelect
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          style={{ minWidth: 200, maxWidth: 280 }}
        >
          <option value="">— Tất cả project —</option>
          {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </VibSelect>

        <VibSelect
          value={selectedObjectId}
          onChange={e => setSelectedObjectId(e.target.value)}
          style={{ maxWidth: 260 }}
          disabled={!projectId}
        >
          <option value="">— Tất cả đối tượng —</option>
          {objects.map(obj => (
            <option key={obj.id} value={obj.id}>
              {obj.object_type.replace('_', ' ').toUpperCase()} — {obj.name}
            </option>
          ))}
        </VibSelect>

        {selectedObjectId && !coverageLoading && coverage && (
          <button
            onClick={() => setShowCoverageModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: coverage.coverage_pct >= 80 ? '#D1FAE5' : '#FEF3C7',
              fontSize: 12, fontWeight: 600,
              color: coverage.coverage_pct >= 80 ? '#065F46' : '#92400E',
            }}>
            {belowThresholdCount > 0 && <AlertTriangle size={12} />}
            Coverage {coverage.coverage_pct.toFixed(0)}%
          </button>
        )}

        <div style={{ flex: 1 }} />
        <Btn variant="ghost" size="sm" onClick={loadDocuments}><RefreshCw size={13} /></Btn>
      </div>

      {/* Doc type + create */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {([
          { key: '' as const, label: 'Tất cả' },
          { key: 'TEST_PLAN' as const, label: 'Test Plan' },
          { key: 'BUG_REPORT' as const, label: 'Bug Report' },
          { key: 'UAT_SIGNOFF' as const, label: 'UAT Sign-off' },
        ]).map(({ key, label }) => {
          const isActive = docTypeFilter === key
          const count = key === '' ? documents.length : documents.filter(d => d.doc_type === key).length
          return (
            <button key={key} onClick={() => setDocTypeFilter(key)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', fontSize: 13, fontWeight: isActive ? 700 : 400,
              background: isActive ? 'var(--vib-primary)' : C.n100,
              color: isActive ? '#fff' : C.n600, transition: 'all 0.15s',
            }}>
              {label}
              <span style={{
                fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center',
                padding: '1px 5px', borderRadius: 10,
                background: isActive ? 'rgba(255,255,255,0.25)' : C.n200,
                color: isActive ? '#fff' : C.n500,
              }}>{count}</span>
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <Btn size="sm" onClick={() => { setEditing(null); setShowForm(true) }}>+ Tạo tài liệu</Btn>
      </div>

      <TestDocumentList
        documents={docTypeFilter ? documents.filter(d => d.doc_type === docTypeFilter) : documents}
        loading={loading}
        coveragePct={coverage?.coverage_pct}
        totalTests={coverage?.total_test_cases}
        passedTests={coverage?.passed}
        failedTests={coverage?.failed}
        onAdd={() => { setEditing(null); setShowForm(true) }}
        onEdit={doc => { setEditing(doc); setShowForm(true) }}
        onTransition={doc => setTransitionTarget(doc)}
      />

      <TestDocumentForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSave={handleSave}
        editing={editing ?? undefined}
        projectId={projectId}
        objectId={selectedObjectId || undefined}
      />

      {transitionTarget && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, width: 420,
          background: '#fff', border: `1px solid ${C.n200}`,
          borderRadius: 12, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 100,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div className="txt_r_xxs" style={{ fontWeight: 700, marginBottom: 2 }}>Chuyển trạng thái</div>
              <div className="txt_r_xxxs text-muted">{transitionTarget.doc_type} — {transitionTarget.title}</div>
              <div className="txt_r_xxxs text-muted" style={{ marginTop: 2 }}>
                Trạng thái: <strong>{transitionTarget.status}</strong>
              </div>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setTransitionTarget(null)}>✕</Btn>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {getTransitionsForDoc(transitionTarget).map(t => (
              <Btn key={t.action} size="sm" variant="ghost" onClick={() => handleTransition(t.action)}>{t.label}</Btn>
            ))}
          </div>
        </div>
      )}

      <Modal
        title={`Coverage Detail — ${coverage?.object_name ?? ''}`}
        open={showCoverageModal}
        onClose={() => setShowCoverageModal(false)}
        width="680px"
      >
        {coverage
          ? <CoverageIndicator coverage={coverage} />
          : <EmptyState icon="📊" title="Không có dữ liệu coverage" />}
      </Modal>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
export default function TestWorkflowPage() {
  const { addToast } = useStore()

  // ── Tab ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('strategy')

  // ── Metrics (aggregate — no project filter) ──────────────────────
  const [strategy,   setStrategy]  = useState<StrategyMetrics  | null>(null)
  const [execution,  setExecution] = useState<ExecutionMetrics | null>(null)
  const [control,    setControl]   = useState<ControlMetrics   | null>(null)
  const [metLoading, setMetLoading] = useState(true)
  const [metError,   setMetError]  = useState(false)
  const [totalCases, setTotalCases] = useState(0)

  const loadMetrics = useCallback(async () => {
    setMetLoading(true)
    setMetError(false)
    try {
      const [s, e, c] = await Promise.all([
        getStrategyMetrics(), getExecutionMetrics(), getControlMetrics(),
      ])
      setStrategy(s); setExecution(e); setControl(c)
      setTotalCases(e.total_cases)
    } catch (err: unknown) {
      addToast((err as Error).message, 'error')
      setMetError(true)
    } finally { setMetLoading(false) }
  }, [addToast])

  useEffect(() => { loadMetrics() }, [loadMetrics])

  const readinessScore = control?.release_readiness_score
  const passRate       = execution?.pass_pct

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {readinessScore !== undefined && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                background: readinessScore >= 80 ? '#dcfce7' : readinessScore >= 60 ? '#fef9c3' : '#fee2e2',
                color: readinessScore >= 80 ? '#166534' : readinessScore >= 60 ? '#92400e' : '#991b1b',
              }}>Readiness {Math.round(readinessScore)}</span>
            )}
            {passRate !== undefined && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                background: passRate >= 80 ? '#dcfce7' : passRate >= 60 ? '#fef9c3' : '#fee2e2',
                color: passRate >= 80 ? '#166534' : passRate >= 60 ? '#92400e' : '#991b1b',
              }}>Pass {passRate}%</span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.n500 }}>
            {totalCases} test cases · {strategy?.total_requirements ?? 0} requirements
          </p>
        </div>
        <Btn variant="ghost" size="sm" onClick={loadMetrics} title="Refresh"><RefreshCw size={13} /></Btn>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2,
        borderBottom: `2px solid ${C.n200}`, marginBottom: 20, flexShrink: 0 }}>
        {TAB_GROUPS.map((group, gi) => (
          <React.Fragment key={group.label}>
            {gi > 0 && <div style={{ width: 1, height: 28, background: C.n200, margin: '0 6px', alignSelf: 'center' }} />}
            {group.tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '8px 14px', border: 'none', cursor: 'pointer', background: 'transparent',
                  fontFamily: 'var(--font)', fontSize: 13, fontWeight: isActive ? 700 : 400,
                  color: isActive ? group.color : C.n500,
                  borderBottom: isActive ? `3px solid ${group.color}` : '3px solid transparent',
                  marginBottom: -2, transition: 'all 0.15s',
                }}>
                  <span>{tab.icon}</span><span>{tab.label}</span>
                </button>
              )
            })}
          </React.Fragment>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'strategy'  && (
          metLoading ? <LoadingCard /> :
          metError || !strategy  ? <ErrorCard onRetry={loadMetrics} /> :
          <StrategyTab  data={strategy}  />
        )}
        {activeTab === 'execution' && (
          metLoading ? <LoadingCard /> :
          metError || !execution ? <ErrorCard onRetry={loadMetrics} /> :
          <ExecutionTab data={execution} />
        )}
        {activeTab === 'control'   && (
          metLoading ? <LoadingCard /> :
          metError || !control   ? <ErrorCard onRetry={loadMetrics} /> :
          <ControlTab   data={control}   />
        )}
        {activeTab === 'documents' && <DocumentsTab />}
      </div>
    </div>
  )
}
