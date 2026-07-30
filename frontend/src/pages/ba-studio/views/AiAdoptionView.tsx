/**
 * AI Adoption — tổng quan 6 trụ cột + bảng ma trận cho từng trụ cột.
 * Nội dung là chính sách nội bộ đã chốt (src/data/ba-ai-adoption.ts) — không diễn giải lại.
 */
import React from 'react'
import {
  Database, Eye, GitBranch, LayoutGrid, Route, ShieldCheck, Sparkles, Target, Terminal, Workflow,
  type LucideIcon,
} from 'lucide-react'
import { Btn } from '../../../components/ui'
import {
  BA_AI_ADOPTION, type AiIconName, type GovernanceItem, type KbItem, type PillarId,
  type RoadmapItem, type SkillItem, type ToolItem, type UseCaseItem,
} from '../../../data/ba-ai-adoption'
import { BackLink, Mono, PageHead, Panel, Tag, tdStyle, thStyle } from '../components/primitives'
import type { BaStudioNav } from '../nav'

const ICONS: Record<AiIconName, LucideIcon> = {
  sparkle: Sparkles, flow: Workflow, database: Database, git: GitBranch,
  shield: ShieldCheck, eye: Eye, target: Target, grid: LayoutGrid,
  command: Terminal, route: Route,
}

function Icon({ name, size = 16, color = 'var(--vib-primary)' }: {
  name: AiIconName; size?: number; color?: string
}) {
  const C = ICONS[name] ?? Sparkles
  return <C size={size} color={color} />
}

function IconBox({ name, size = 32 }: { name: AiIconName; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: 'var(--vib-info-bg)', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
    }}><Icon name={name} size={Math.round(size / 2)} /></span>
  )
}

// ── Tổng quan ───────────────────────────────────────────────────────────────

export function AiOverviewView({ nav }: { nav: BaStudioNav }) {
  const roadmap = BA_AI_ADOPTION.pillars.find(p => p.id === 'roadmap')
  const steps = (roadmap?.items ?? []) as RoadmapItem[]

  return (
    <div>
      <PageHead title={BA_AI_ADOPTION.title} sub={<span style={{ maxWidth: 840, display: 'block', lineHeight: 1.6 }}>{BA_AI_ADOPTION.lead}</span>} />

      <Panel title="Nguyên tắc xuyên suốt" pad={false} style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {BA_AI_ADOPTION.principles.map(p => (
            <div key={p.title} style={{
              display: 'flex', gap: 12, padding: '14px 18px',
              borderRight: '1px solid var(--vib-neutral-200)',
              borderBottom: '1px solid var(--vib-neutral-200)',
            }}>
              <IconBox name={p.icon} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: 'var(--vib-neutral-600)', lineHeight: 1.55 }}>{p.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 14, marginBottom: 16,
      }}>
        {BA_AI_ADOPTION.pillars.map(p => (
          <div key={p.id} style={{
            background: 'var(--vib-white)', border: '1px solid var(--vib-neutral-200)',
            borderRadius: 8, boxShadow: 'var(--shadow-card)', padding: '16px 18px',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <IconBox name={p.icon} />
              <span style={{ flex: 1 }} />
              <Mono>{p.code}</Mono>
            </div>
            <button
              onClick={() => nav.goAi(p.id)}
              style={{
                border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer',
                fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--vib-neutral-900)',
              }}
            >{p.name}</button>
            <div style={{ fontSize: 13, color: 'var(--vib-neutral-600)', lineHeight: 1.55, flex: 1, marginBottom: 12 }}>
              {p.summary}
            </div>
            <Btn variant="secondary" size="sm" style={{ alignSelf: 'flex-start' }}
              onClick={() => nav.goAi(p.id)}>{p.items.length} mục →</Btn>
          </div>
        ))}
      </div>

      <Panel title="Lộ trình triển khai" pad={false}>
        <div style={{ display: 'flex', overflowX: 'auto', padding: '18px 18px 22px' }}>
          {steps.map((r, i) => (
            <div key={r.phase} style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--vib-primary)', color: '#fff', fontSize: 14, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</span>
                {i < steps.length - 1 && (
                  <span style={{ flex: 1, height: 1, background: 'var(--vib-neutral-200)' }} />
                )}
              </div>
              <div style={{ paddingRight: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>{r.phase}</div>
                <div style={{ fontSize: 13, color: 'var(--vib-neutral-500)', lineHeight: 1.5, marginBottom: 8 }}>
                  {r.objective}
                </div>
                <Tag tone="green">{r.deliverable}</Tag>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ── Trụ cột ─────────────────────────────────────────────────────────────────

interface Column { label: string; width?: number }

const COLUMNS: Record<PillarId, Column[]> = {
  usecases: [
    { label: 'Use case', width: 170 }, { label: 'Phase', width: 120 },
    { label: 'Input', width: 200 }, { label: 'Output', width: 200 },
    { label: 'Công cụ', width: 130 }, { label: 'Cách thực hiện' },
  ],
  tools: [
    { label: 'Công cụ', width: 150 }, { label: 'Vai trò', width: 110 },
    { label: 'Dùng cho', width: 230 }, { label: 'Ưu tiên', width: 120 }, { label: 'Ghi chú' },
  ],
  skills: [
    { label: 'Tác vụ', width: 170 }, { label: 'Command', width: 220 },
    { label: 'Skill sử dụng', width: 230 }, { label: 'Output', width: 210 }, { label: 'Ghi chú' },
  ],
  governance: [
    { label: 'Nguyên tắc', width: 200 }, { label: 'Quy định bắt buộc', width: 320 },
    { label: 'Ghi chú thực thi' },
  ],
  kb: [
    { label: 'Thành phần', width: 160 }, { label: 'Quản lý tại', width: 190 },
    { label: 'Phạm vi', width: 140 }, { label: 'Mục đích', width: 270 }, { label: 'Ghi chú' },
  ],
  roadmap: [
    { label: 'Giai đoạn', width: 190 }, { label: 'Mục tiêu', width: 280 },
    { label: 'Công việc chính', width: 280 }, { label: 'Deliverable' },
  ],
}

function renderRow(pillarId: PillarId, item: unknown): React.ReactNode[] {
  if (pillarId === 'usecases') {
    const u = item as UseCaseItem
    return [
      <span style={{ fontWeight: 600 }}>{u.name}</span>,
      <Tag tone="neutral">{u.phase}</Tag>,
      <span style={{ color: 'var(--vib-neutral-600)' }}>{u.input}</span>,
      <span style={{ color: 'var(--vib-success)' }}>{u.output}</span>,
      <Tag tone="blue">{u.tool}</Tag>,
      <span style={{ color: 'var(--vib-neutral-600)' }}>{u.how}</span>,
    ]
  }
  if (pillarId === 'tools') {
    const t = item as ToolItem
    return [
      <span style={{
        fontWeight: 600,
        color: t.primary ? 'var(--vib-primary)' : 'var(--vib-neutral-900)',
      }}>{t.name}</span>,
      <Tag tone={t.role === 'Chủ lực' ? 'blue' : t.role === 'Thay thế' ? 'gold' : 'neutral'}>{t.role}</Tag>,
      <span>{t.usedFor}</span>,
      <Tag tone={t.priority === 'Chính' ? 'green' : t.priority === 'Kèm Claude' ? 'cyan' : 'neutral'}>
        {t.priority}
      </Tag>,
      <span style={{ color: 'var(--vib-neutral-600)' }}>{t.note}</span>,
    ]
  }
  if (pillarId === 'skills') {
    const s = item as SkillItem
    return [
      <span style={{ fontWeight: 600 }}>{s.task}</span>,
      <Tag tone="blue" mono>{s.cmd}</Tag>,
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--vib-neutral-600)' }}>{s.skills}</span>,
      <span>{s.output}</span>,
      <span style={{ color: 'var(--vib-neutral-500)' }}>{s.note || '—'}</span>,
    ]
  }
  if (pillarId === 'governance') {
    const g = item as GovernanceItem
    return [
      <span style={{ fontWeight: 600 }}>{g.principle}</span>,
      <span style={{
        display: 'block', padding: '6px 8px', borderRadius: 4,
        background: 'var(--vib-danger-bg)', color: 'var(--vib-danger)', fontWeight: 500,
      }}>{g.rule}</span>,
      <span style={{ color: 'var(--vib-neutral-600)' }}>{g.note}</span>,
    ]
  }
  if (pillarId === 'kb') {
    const k = item as KbItem
    return [
      <span style={{ fontWeight: 600 }}>{k.component}</span>,
      <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
        {k.managedIn.map(m => <Tag key={m} tone={m === 'Git' ? 'neutral' : 'blue'} mono>{m}</Tag>)}
      </span>,
      <span style={{ color: 'var(--vib-neutral-600)' }}>{k.scope}</span>,
      <span>{k.purpose}</span>,
      <span style={{ color: 'var(--vib-neutral-600)' }}>{k.note}</span>,
    ]
  }
  const r = item as RoadmapItem
  return [
    <span style={{ fontWeight: 600 }}>{r.phase}</span>,
    <span>{r.objective}</span>,
    <span style={{ color: 'var(--vib-neutral-600)' }}>{r.work}</span>,
    <Tag tone="green">{r.deliverable}</Tag>,
  ]
}

export function AiPillarView({ pillarId, nav }: { pillarId: PillarId; nav: BaStudioNav }) {
  const pillar = BA_AI_ADOPTION.pillars.find(p => p.id === pillarId)
  if (!pillar) return null
  const columns = COLUMNS[pillarId]

  return (
    <div>
      <BackLink label="AI Adoption" onClick={() => nav.goAi()} />
      <PageHead
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {pillar.name}
            <Tag tone="blue" mono>{pillar.code}</Tag>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--vib-neutral-500)' }}>
              {pillar.items.length} mục
            </span>
          </span>
        }
        sub={<span style={{ maxWidth: 820, display: 'block' }}>{pillar.summary}</span>}
      />

      {pillarId === 'governance' && (
        <div style={{
          display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          background: 'var(--vib-danger-bg)', border: '1px solid #F0C4C0',
        }}>
          <ShieldCheck size={16} color="var(--vib-danger)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 13, lineHeight: 1.55 }}>
            Cả 5 nguyên tắc là điều kiện <strong>bắt buộc</strong> khi dùng AI với dữ liệu ngân hàng —
            tuân thủ PDPL và quy định SBV.
          </span>
        </div>
      )}

      {pillarId === 'kb' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
          marginBottom: 14, background: 'var(--vib-info-bg)', border: '1px solid #BBD9F2',
        }}>
          <span style={{ fontSize: 13, flex: 1 }}>
            Master Doc và CR Documents được quản lý trực tiếp trong thư viện tài liệu của BA Studio.
          </span>
          <Btn variant="secondary" size="sm" onClick={nav.goDocs}>Mở thư viện →</Btn>
        </div>
      )}

      <Panel pad={false}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle({ width: 46, align: 'right' })}>#</th>
                {columns.map(c => <th key={c.label} style={thStyle({ width: c.width })}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {pillar.items.map((item, i) => (
                <tr key={i}>
                  <td style={tdStyle({ align: 'right', mono: true, color: 'var(--vib-neutral-400)' })}>
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  {renderRow(pillarId, item).map((cell, ci) => (
                    <td key={ci} style={tdStyle()}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
