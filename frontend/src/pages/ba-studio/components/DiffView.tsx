/**
 * BA Studio — renderer diff dùng chung cho CR detail và So sánh phiên bản.
 * Hai chế độ: hợp nhất (inline) và song song (side-by-side), highlight tới mức từ.
 */
import React, { useMemo } from 'react'
import {
  cleanupSemantic, diffSections, sectionLevel, wordDiff, type DiffOpKind, type DiffRow,
} from '../../../lib/ba-studio/diff'
import { DIFF_ROW_BG, DIFF_SIDE_BG, OP_LABELS, opTone } from '../../../lib/ba-studio/labels'
import type { Section } from '../../../lib/ba-studio/types'
import { Markdown } from './Markdown'
import { Tag } from './primitives'

export type DiffMode = 'inline' | 'side'
/**
 * Cách hiển thị nội dung mục:
 *   markdown — render tài liệu như khi đọc (bảng, danh sách, in đậm…), tô nền theo
 *              loại thay đổi. Mặc định vì nội dung tài liệu là Markdown.
 *   tokens   — nguồn .md thô, highlight tới từng từ. Dùng khi cần soát chính xác câu chữ.
 */
export type DiffRender = 'markdown' | 'tokens'

const DEL_STYLE: React.CSSProperties = {
  background: '#FBD9D4', color: '#8F211D', textDecoration: 'line-through',
  borderRadius: 2, padding: '0 1px',
}
const ADD_STYLE: React.CSSProperties = {
  background: '#CDEBD8', color: '#12602F', borderRadius: 2, padding: '0 1px',
}
const GHOST_STYLE: React.CSSProperties = { color: 'var(--vib-neutral-400)', fontStyle: 'italic' }

const BODY_STYLE: React.CSSProperties = {
  fontSize: 13, lineHeight: 1.6, color: 'var(--vib-neutral-800)', whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

/** Diff mức từ; side='before' bỏ token thêm, side='after' bỏ token xoá */
function Tokens({ before, after, side }: {
  before: string | null
  after: string | null
  side: 'inline' | 'before' | 'after'
}) {
  // cleanupSemantic: gom khối thay đổi để BA đọc được, thay vì đỏ/xanh vụn từng chữ
  const tokens = useMemo(
    () => cleanupSemantic(wordDiff(before ?? '', after ?? '')),
    [before, after],
  )

  if (side === 'before' && before === null) return <span style={GHOST_STYLE}>(mục mới — chưa tồn tại)</span>
  if (side === 'after' && after === null) return <span style={GHOST_STYLE}>(đã xoá khỏi tài liệu)</span>
  if (side === 'inline' && before === null) return <span style={ADD_STYLE}>{after}</span>
  if (side === 'inline' && after === null) return <span style={DEL_STYLE}>{before}</span>

  const visible = tokens.filter(([kind]) => {
    if (side === 'before') return kind !== '+'
    if (side === 'after') return kind !== '-'
    return true
  })

  return (
    <>
      {visible.map(([kind, text], i) => {
        if (kind === '=') return <React.Fragment key={i}>{text}</React.Fragment>
        return <span key={i} style={kind === '-' ? DEL_STYLE : ADD_STYLE}>{text}</span>
      })}
    </>
  )
}

function OpTag({ op }: { op: DiffOpKind }) {
  return <Tag tone={opTone(op)}>{OP_LABELS[op]}</Tag>
}

function MovedTag({ moved }: { moved?: boolean }) {
  return moved ? <Tag tone="cyan">Đổi vị trí</Tag> : null
}

/** Khối nội dung render Markdown, có nhãn + nền theo phía trước/sau */
function MdBlock({ label, tone, body }: {
  label?: string
  tone?: 'del' | 'add'
  body: string
}) {
  const bg = tone === 'del' ? '#FFF6F4' : tone === 'add' ? '#F4FBF7' : undefined
  const bar = tone === 'del' ? 'var(--vib-danger)' : tone === 'add' ? 'var(--vib-success)' : undefined
  return (
    <div style={{
      background: bg, borderLeft: bar ? `3px solid ${bar}` : undefined,
      padding: bar ? '2px 0 2px 10px' : 0, borderRadius: 3, marginTop: label ? 6 : 0,
    }}>
      {label && (
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.04em', marginBottom: 2,
          color: tone === 'del' ? 'var(--vib-danger)' : 'var(--vib-success)',
        }}>{label}</div>
      )}
      <Markdown text={body} />
    </div>
  )
}

function InlineRow({ row, index, render }: {
  row: DiffRow
  index: number
  render: DiffRender
}) {
  const heading = row.after?.heading ?? row.before?.heading ?? ''
  const level = sectionLevel(row.after ?? row.before ?? {})

  if (render === 'markdown') {
    return (
      <div style={{
        display: 'flex', gap: 14, padding: '13px 18px',
        borderBottom: '1px solid var(--vib-neutral-200)',
        background: DIFF_ROW_BG[row.op],
      }}>
        <span style={{
          width: 24, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--vib-neutral-400)', paddingTop: 3,
        }}>{String(index + 1).padStart(2, '0')}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <OpTag op={row.op} />
            <MovedTag moved={row.moved} />
            <span style={{
              fontSize: level <= 1 ? 16 : 14, fontWeight: 600, color: 'var(--vib-neutral-900)',
            }}>{heading || '(phần mở đầu)'}</span>
            {row.op === 'modify' && row.before && row.before.heading !== heading && (
              <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>
                (trước: {row.before.heading || '(phần mở đầu)'})
              </span>
            )}
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--vib-neutral-400)' }}>
              {row.section_key}
            </span>
          </div>

          {row.op === 'modify' ? (
            <>
              <MdBlock label="TRƯỚC" tone="del" body={row.before?.body ?? ''} />
              <MdBlock label="SAU" tone="add" body={row.after?.body ?? ''} />
            </>
          ) : row.op === 'remove' ? (
            <MdBlock tone="del" body={row.before?.body ?? ''} />
          ) : row.op === 'add' ? (
            <MdBlock tone="add" body={row.after?.body ?? ''} />
          ) : (
            <Markdown text={row.after?.body ?? ''} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '13px 18px',
      borderBottom: '1px solid var(--vib-neutral-200)',
      background: DIFF_ROW_BG[row.op],
    }}>
      <span style={{
        width: 24, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 12,
        color: 'var(--vib-neutral-400)', paddingTop: 3,
      }}>{String(index + 1).padStart(2, '0')}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <OpTag op={row.op} />
          <MovedTag moved={row.moved} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--vib-neutral-900)' }}>
            {row.op === 'modify' && row.before && row.before.heading !== heading
              ? <Tokens before={row.before.heading} after={heading} side="inline" />
              : heading}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--vib-neutral-400)' }}>
            {row.section_key}
          </span>
        </div>
        <div style={BODY_STYLE}>
          {row.op === 'same'
            ? row.after?.body
            : <Tokens before={row.before?.body ?? null} after={row.after?.body ?? null} side="inline" />}
        </div>
      </div>
    </div>
  )
}

function SideRow({ row, index, render }: {
  row: DiffRow
  index: number
  render: DiffRender
}) {
  const bg = DIFF_SIDE_BG[row.op]

  if (render === 'markdown') {
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '38px 1fr 1fr',
        borderBottom: '1px solid var(--vib-neutral-200)',
      }}>
        <div style={{
          padding: '13px 0 13px 14px', fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--vib-neutral-400)',
        }}>{String(index + 1).padStart(2, '0')}</div>
        <div style={{
          padding: '13px 14px', borderLeft: '1px solid var(--vib-neutral-200)',
          background: bg.before, minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <OpTag op={row.op} />
            <MovedTag moved={row.moved} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {row.before ? (row.before.heading || '(phần mở đầu)') : '—'}
            </span>
          </div>
          {row.before
            ? <Markdown text={row.before.body} />
            : <span style={GHOST_STYLE}>(mục mới — chưa tồn tại)</span>}
        </div>
        <div style={{
          padding: '13px 14px', borderLeft: '1px solid var(--vib-neutral-200)',
          background: bg.after, minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {row.after ? (row.after.heading || '(phần mở đầu)') : '—'}
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--vib-neutral-400)' }}>
              {row.section_key}
            </span>
          </div>
          {row.after
            ? <Markdown text={row.after.body} />
            : <span style={GHOST_STYLE}>(đã xoá khỏi tài liệu)</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '38px 1fr 1fr',
      borderBottom: '1px solid var(--vib-neutral-200)',
    }}>
      <div style={{
        padding: '13px 0 13px 14px', fontFamily: 'var(--font-mono)', fontSize: 12,
        color: 'var(--vib-neutral-400)',
      }}>{String(index + 1).padStart(2, '0')}</div>
      <div style={{
        padding: '13px 14px', borderLeft: '1px solid var(--vib-neutral-200)',
        background: bg.before, minWidth: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <OpTag op={row.op} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{row.before?.heading ?? '—'}</span>
        </div>
        <div style={BODY_STYLE}>
          {row.op === 'same'
            ? row.before?.body
            : <Tokens before={row.before?.body ?? null} after={row.after?.body ?? null} side="before" />}
        </div>
      </div>
      <div style={{
        padding: '13px 14px', borderLeft: '1px solid var(--vib-neutral-200)',
        background: bg.after, minWidth: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{row.after?.heading ?? '—'}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--vib-neutral-400)' }}>
            {row.section_key}
          </span>
        </div>
        <div style={BODY_STYLE}>
          {row.op === 'same'
            ? row.after?.body
            : <Tokens before={row.before?.body ?? null} after={row.after?.body ?? null} side="after" />}
        </div>
      </div>
    </div>
  )
}

export function DiffView({
  before, after, mode, showSame, beforeLabel, afterLabel, render = 'tokens',
}: {
  before: Section[]
  after: Section[]
  mode: DiffMode
  showSame: boolean
  beforeLabel: string
  afterLabel: string
  render?: DiffRender
}) {
  const rows = useMemo(() => diffSections(before, after), [before, after])
  const visible = showSame ? rows : rows.filter(r => r.op !== 'same')

  if (visible.length === 0) {
    return (
      <div style={{ padding: '36px 18px', textAlign: 'center', color: 'var(--vib-neutral-500)', fontSize: 13 }}>
        Không có mục nào thay đổi giữa hai phiên bản.
        {!showSame && <> Bật “Mục không đổi” để xem toàn bộ nội dung.</>}
      </div>
    )
  }

  return (
    <div data-testid="diff-view">
      {mode === 'side' && (
        <div style={{
          display: 'grid', gridTemplateColumns: '38px 1fr 1fr',
          background: 'var(--vib-neutral-50)', borderBottom: '1px solid var(--vib-neutral-200)',
        }}>
          <div />
          <div style={{
            padding: '9px 14px', fontSize: 12, fontWeight: 600, color: 'var(--vib-danger)',
            borderLeft: '1px solid var(--vib-neutral-200)', textTransform: 'uppercase',
          }}>Trước · {beforeLabel}</div>
          <div style={{
            padding: '9px 14px', fontSize: 12, fontWeight: 600, color: 'var(--vib-success)',
            borderLeft: '1px solid var(--vib-neutral-200)', textTransform: 'uppercase',
          }}>Sau · {afterLabel}</div>
        </div>
      )}
      {visible.map((row, i) => mode === 'inline'
        ? <InlineRow key={row.section_key + i} row={row} index={i} render={render} />
        : <SideRow key={row.section_key + i} row={row} index={i} render={render} />)}
    </div>
  )
}
