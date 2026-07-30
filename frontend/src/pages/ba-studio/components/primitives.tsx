/**
 * BA Studio — primitives dựng lại các component của thiết kế (Ant Design v5)
 * bằng design token VIB: Tag, Segmented, Descriptions bordered, Switch, Badge dot…
 */
import React from 'react'
import { PRIORITY_COLOR, PRIORITY_LABELS, TAG_TONES, type TagTone } from '../../../lib/ba-studio/labels'
import type { Delta, Priority } from '../../../lib/ba-studio/types'

// ── Tag ─────────────────────────────────────────────────────────────────────

export function Tag({ tone = 'neutral', mono, children, style, title }: {
  tone?: TagTone
  mono?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
  title?: string
}) {
  const t = TAG_TONES[tone]
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 7px',
      fontSize: 12, lineHeight: '20px', borderRadius: 4,
      color: t.fg, background: t.bg, border: `1px solid ${t.bd}`,
      whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
      fontFamily: mono ? 'var(--font-mono)' : 'inherit',
      ...style,
    }}>{children}</span>
  )
}

// ── Segmented ───────────────────────────────────────────────────────────────

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  title?: string
  color?: string
  mono?: boolean
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  const h = size === 'sm' ? 24 : 28
  return (
    <div style={{
      display: 'inline-flex', gap: 2, padding: 2, borderRadius: 6,
      background: 'var(--vib-neutral-100)', border: '1px solid var(--vib-neutral-200)',
    }}>
      {options.map(opt => {
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            style={{
              minHeight: h, padding: size === 'sm' ? '0 9px' : '0 11px', border: 'none',
              borderRadius: 4, cursor: 'pointer', fontSize: size === 'sm' ? 12 : 13,
              fontWeight: on ? 600 : 400, whiteSpace: 'nowrap',
              fontFamily: opt.mono ? 'var(--font-mono)' : 'var(--font)',
              background: on ? 'var(--vib-white)' : 'transparent',
              color: on ? 'var(--vib-neutral-900)' : (opt.color ?? 'var(--vib-neutral-600)'),
              boxShadow: on ? 'var(--shadow-card)' : 'none',
              transition: 'all .15s',
            }}
          >{opt.label}</button>
        )
      })}
    </div>
  )
}

// ── Switch ──────────────────────────────────────────────────────────────────

export function SwitchToggle({ checked, onChange, label }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', display: 'inline-block', width: 30, height: 16, borderRadius: 100,
          background: checked ? 'var(--vib-primary)' : 'var(--vib-neutral-400)',
          transition: 'background .2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 16 : 2, width: 12, height: 12,
          borderRadius: '50%', background: '#fff', transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        }} />
      </span>
      <span onClick={() => onChange(!checked)} style={{ color: 'var(--vib-neutral-700)' }}>{label}</span>
    </label>
  )
}

// ── Descriptions bordered ───────────────────────────────────────────────────

export interface DescItem {
  label: string
  value: React.ReactNode
  color?: string
}

export function DescGrid({ items, columns = 2 }: { items: DescItem[]; columns?: number }) {
  const rows: DescItem[][] = []
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns))
  const split = 'var(--vib-neutral-200)'

  return (
    <div style={{ border: `1px solid ${split}`, borderRadius: 6, overflow: 'hidden' }}>
      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((row, ri) => {
            const last = ri === rows.length - 1
            return (
              <tr key={ri}>
                {Array.from({ length: columns }).map((_, ci) => {
                  const cell = row[ci]
                  const lastCol = ci === columns - 1
                  return (
                    <React.Fragment key={ci}>
                      <th style={{
                        background: 'var(--vib-neutral-50)', color: 'var(--vib-neutral-600)',
                        fontWeight: 400, textAlign: 'left', fontSize: 13, padding: '9px 14px',
                        verticalAlign: 'top', width: `${100 / (columns * 2) * 0.8}%`,
                        borderRight: `1px solid ${split}`,
                        borderBottom: last ? 'none' : `1px solid ${split}`,
                      }}>{cell?.label ?? ''}</th>
                      <td style={{
                        fontSize: 13, padding: '9px 14px', verticalAlign: 'top',
                        color: cell?.color ?? 'var(--vib-neutral-900)',
                        wordBreak: 'break-word',
                        borderRight: lastCol ? 'none' : `1px solid ${split}`,
                        borderBottom: last ? 'none' : `1px solid ${split}`,
                      }}>{cell?.value ?? ''}</td>
                    </React.Fragment>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Priority dot + delta tags ───────────────────────────────────────────────

export function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', fontSize: 13 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: PRIORITY_COLOR[priority],
      }} />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

export function DeltaTags({ delta }: { delta?: Delta }) {
  const move = delta?.move ?? 0
  if (!delta || (!delta.add && !delta.modify && !delta.remove && !move)) {
    return <span style={{ color: 'var(--vib-neutral-400)' }}>—</span>
  }
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {delta.add > 0 && <Tag tone="green" mono>+{delta.add}</Tag>}
      {delta.modify > 0 && <Tag tone="gold" mono>~{delta.modify}</Tag>}
      {delta.remove > 0 && <Tag tone="red" mono>−{delta.remove}</Tag>}
      {move > 0 && <Tag tone="cyan" mono title="mục đổi vị trí">⇅{move}</Tag>}
    </span>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────

export function Panel({ title, extra, children, pad = true, style }: {
  title?: React.ReactNode
  extra?: React.ReactNode
  children: React.ReactNode
  pad?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: 'var(--vib-white)', border: '1px solid var(--vib-neutral-200)',
      borderRadius: 8, boxShadow: 'var(--shadow-card)', overflow: 'hidden', ...style,
    }}>
      {(title || extra) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          minHeight: 46, padding: '8px 18px', borderBottom: '1px solid var(--vib-neutral-200)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--vib-neutral-900)' }}>{title}</span>
          {extra}
        </div>
      )}
      <div style={pad ? { padding: '14px 18px 18px' } : undefined}>{children}</div>
    </div>
  )
}

// ── Table helpers ───────────────────────────────────────────────────────────

export function thStyle(opts: {
  width?: number | string
  align?: 'left' | 'right' | 'center'
} = {}): React.CSSProperties {
  return {
    padding: '9px 12px', textAlign: opts.align ?? 'left', fontSize: 12, fontWeight: 600,
    letterSpacing: '.02em', textTransform: 'uppercase', color: 'var(--vib-neutral-600)',
    background: 'var(--vib-neutral-50)', borderBottom: '1px solid var(--vib-neutral-200)',
    width: opts.width, whiteSpace: 'nowrap',
  }
}

export function tdStyle(opts: {
  align?: 'left' | 'right' | 'center'
  mono?: boolean
  color?: string
} = {}): React.CSSProperties {
  return {
    padding: '10px 12px', textAlign: opts.align ?? 'left', fontSize: 13,
    verticalAlign: 'top', color: opts.color ?? 'var(--vib-neutral-900)',
    borderBottom: '1px solid var(--vib-neutral-200)',
    fontFamily: opts.mono ? 'var(--font-mono)' : 'inherit',
  }
}

export function DataTable({ head, children, minWidth }: {
  head: React.ReactNode
  children: React.ReactNode
  minWidth?: number
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth, borderCollapse: 'collapse' }}>
        <thead><tr>{head}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function EmptyBox({ title, desc, action }: {
  title: string
  desc?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{ padding: '42px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--vib-neutral-500)', marginBottom: 6 }}>{title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--vib-neutral-400)', marginBottom: 12 }}>{desc}</div>}
      {action}
    </div>
  )
}

// ── Page header ─────────────────────────────────────────────────────────────

export function PageHead({ title, sub, extra }: {
  title: React.ReactNode
  sub?: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, marginBottom: 16, flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{
          margin: 0, fontSize: 21, fontWeight: 600, lineHeight: 1.35,
          color: 'var(--vib-neutral-900)',
        }}>{title}</h1>
        {sub && <div style={{ marginTop: 4, fontSize: 13, color: 'var(--vib-neutral-500)' }}>{sub}</div>}
      </div>
      {extra && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{extra}</div>}
    </div>
  )
}

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
      padding: 0, marginBottom: 10, fontSize: 13, color: 'var(--vib-primary)', cursor: 'pointer',
    }}>← {label}</button>
  )
}

/** Nhãn mono cho mã tài liệu / mã CR / version */
export function Mono({ children, color, size = 12 }: {
  children: React.ReactNode
  color?: string
  size?: number
}) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: size,
      color: color ?? 'var(--vib-neutral-500)',
    }}>{children}</span>
  )
}
