/**
 * So sánh tài liệu — đối chiếu HAI TÀI LIỆU BẤT KỲ theo dòng (kiểu text-compare.com).
 *
 * Khác "So sánh phiên bản" (2 phiên bản của cùng 1 Master Doc, khớp theo mục):
 * ở đây hai bên độc lập — có thể là hai tài liệu khác nhau, khác dự án, hoặc văn bản
 * dán tay / file .md tải lên. Không có section_key để khớp nên so theo dòng, trong
 * dòng highlight tới mức từ.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, ClipboardPaste, FileText, Upload } from 'lucide-react'
import { Btn, VibSelect } from '../../../components/ui'
import * as api from '../../../api/ba-studio'
import { joinMarkdown } from '../../../lib/ba-studio/markdown'
import {
  collapseSame, diffLines, lineDiffLabel, type LineDiffOptions, type LineRow,
} from '../../../lib/ba-studio/text-diff'
import type { MasterDocDetail, MasterDocListItem } from '../../../lib/ba-studio/types'
import { EmptyBox, PageHead, Panel, Segmented, SwitchToggle, Tag } from '../components/primitives'

type SourceKind = 'doc' | 'paste'
type Side = 'left' | 'right'

interface SourceState {
  kind: SourceKind
  docId: string
  /** '' = bản hiện hành, còn lại là version_label của bản đã phát hành */
  version: string
  text: string
  fileName: string
}

interface Props {
  docs: MasterDocListItem[]
  initialLeftDocId?: string
  initialRightDocId?: string
  onError: (msg: string) => void
}

const emptySource = (docId = ''): SourceState => ({
  kind: docId ? 'doc' : 'paste', docId, version: '', text: '', fileName: '',
})

export function CompareDocView({ docs, initialLeftDocId, initialRightDocId, onError }: Props) {
  const [left, setLeft] = useState<SourceState>(() => emptySource(initialLeftDocId ?? docs[0]?.id ?? ''))
  const [right, setRight] = useState<SourceState>(
    () => emptySource(initialRightDocId ?? docs[1]?.id ?? docs[0]?.id ?? ''),
  )
  const [loaded, setLoaded] = useState<Record<string, MasterDocDetail>>({})
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'side' | 'inline'>('side')
  const [opts, setOpts] = useState<LineDiffOptions>({ ignoreWhitespace: true })
  const [onlyDiff, setOnlyDiff] = useState(true)

  const needed = [left, right]
    .filter(s => s.kind === 'doc' && s.docId && !loaded[s.docId])
    .map(s => s.docId)

  const fetchDocs = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    setLoading(true)
    try {
      const list = await Promise.all([...new Set(ids)].map(id => api.getDoc(id)))
      setLoaded(prev => {
        const next = { ...prev }
        list.forEach(d => { next[d.id] = d })
        return next
      })
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Không tải được tài liệu để so sánh')
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => { void fetchDocs(needed) }, [needed.join(','), fetchDocs]) // eslint-disable-line react-hooks/exhaustive-deps

  function textOf(s: SourceState): string {
    if (s.kind === 'paste') return s.text
    const doc = loaded[s.docId]
    if (!doc) return ''
    if (!s.version) return doc.content_md ?? joinMarkdown(doc.sections)
    const version = doc.versions.find(v => v.version_label === s.version)
    return version ? (version.content_md ?? joinMarkdown(version.sections)) : ''
  }

  function labelOf(s: SourceState): string {
    if (s.kind === 'paste') return s.fileName || 'Văn bản dán'
    const doc = loaded[s.docId]
    if (!doc) return '—'
    return `${doc.doc_code} · ${s.version || doc.current_version}`
  }

  const leftText = textOf(left)
  const rightText = textOf(right)

  const result = useMemo(
    () => diffLines(leftText, rightText, opts),
    [leftText, rightText, opts],
  )
  const rows = useMemo(
    () => (onlyDiff ? collapseSame(result.rows) : result.rows.map(row => ({ type: 'row' as const, row }))),
    [result.rows, onlyDiff],
  )

  function swap() {
    setLeft(right)
    setRight(left)
  }

  const ready = leftText.trim().length > 0 || rightText.trim().length > 0

  return (
    <div>
      <PageHead
        title="So sánh tài liệu"
        sub="Đối chiếu hai tài liệu bất kỳ theo dòng — chọn Master Doc (kể cả phiên bản cũ), dán văn bản, hoặc tải file .md lên."
        extra={
          <Btn variant="secondary" onClick={swap}>
            <ArrowLeftRight size={14} /> Đổi chiều
          </Btn>
        }
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 14, marginBottom: 14,
      }}>
        <SourcePanel
          side="left"
          state={left}
          docs={docs}
          loadedDoc={loaded[left.docId]}
          onChange={setLeft}
        />
        <SourcePanel
          side="right"
          state={right}
          docs={docs}
          loadedDoc={loaded[right.docId]}
          onChange={setRight}
        />
      </div>

      <Panel pad={false}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', flexWrap: 'wrap',
          borderBottom: '1px solid var(--vib-neutral-200)',
        }}>
          <span style={{
            fontSize: 12.5, color: 'var(--vib-neutral-700)', fontVariantNumeric: 'tabular-nums',
          }} data-testid="line-diff-stat">{lineDiffLabel(result.stat)}</span>
          {result.degraded && (
            <Tag tone="gold" title="Văn bản rất lớn — dùng thuật toán đồng bộ theo cửa sổ, diff có thể dài hơn mức tối ưu">
              chế độ rút gọn
            </Tag>
          )}
          <span style={{ flex: 1 }} />
          <Segmented<'side' | 'inline'>
            size="sm"
            value={mode}
            onChange={setMode}
            options={[{ value: 'side', label: 'Song song' }, { value: 'inline', label: 'Hợp nhất' }]}
          />
          <SwitchToggle
            checked={!!opts.ignoreWhitespace}
            onChange={v => setOpts(o => ({ ...o, ignoreWhitespace: v }))}
            label="Bỏ khoảng trắng"
          />
          <SwitchToggle
            checked={!!opts.ignoreCase}
            onChange={v => setOpts(o => ({ ...o, ignoreCase: v }))}
            label="Bỏ hoa/thường"
          />
          <SwitchToggle
            checked={!!opts.ignoreBlankLines}
            onChange={v => setOpts(o => ({ ...o, ignoreBlankLines: v }))}
            label="Bỏ dòng trống"
          />
          <SwitchToggle checked={onlyDiff} onChange={setOnlyDiff} label="Chỉ dòng khác" />
        </div>

        {loading && !ready ? (
          <div style={{ padding: 40, color: 'var(--vib-neutral-500)' }}>Đang tải tài liệu…</div>
        ) : !ready ? (
          <EmptyBox
            title="Chưa có gì để so sánh"
            desc="Chọn tài liệu ở hai bên, hoặc dán / tải nội dung lên."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: mode === 'side' ? '46px 1fr 46px 1fr' : '46px 46px 1fr',
              minWidth: 720, fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.6,
            }}>
              <HeaderCells mode={mode} leftLabel={labelOf(left)} rightLabel={labelOf(right)} />
              {rows.map((item, i) => item.type === 'gap' ? (
                <div key={`gap-${i}`} style={{
                  gridColumn: '1 / -1', padding: '4px 14px', textAlign: 'center',
                  background: 'var(--vib-neutral-50)', color: 'var(--vib-neutral-400)',
                  fontSize: 11.5, borderBottom: '1px solid var(--vib-neutral-200)',
                }}>⋯ {item.count} dòng giống nhau</div>
              ) : mode === 'side'
                ? <SideLine key={i} row={item.row} />
                : <InlineLine key={i} row={item.row} />)}
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}

// ── Bảng chọn nguồn ─────────────────────────────────────────────────────────

function SourcePanel({ side, state, docs, loadedDoc, onChange }: {
  side: Side
  state: SourceState
  docs: MasterDocListItem[]
  loadedDoc?: MasterDocDetail
  onChange: (next: SourceState) => void
}) {
  const isLeft = side === 'left'
  const accent = isLeft ? 'var(--vib-danger)' : 'var(--vib-success)'

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    onChange({ ...state, kind: 'paste', text, fileName: file.name })
    e.target.value = ''
  }

  return (
    <div data-testid={`cmp-panel-${side}`} style={{
      background: 'var(--vib-white)', border: '1px solid var(--vib-neutral-200)',
      borderRadius: 8, boxShadow: 'var(--shadow-card)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', flexWrap: 'wrap',
        borderBottom: '1px solid var(--vib-neutral-200)', background: 'var(--vib-neutral-50)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: '.04em' }}>
          {isLeft ? 'BÊN TRÁI' : 'BÊN PHẢI'}
        </span>
        <Segmented<SourceKind>
          size="sm"
          value={state.kind}
          onChange={kind => onChange({ ...state, kind })}
          options={[
            { value: 'doc', label: 'Master Doc' },
            { value: 'paste', label: 'Dán / tải file' },
          ]}
        />
        <span style={{ flex: 1 }} />
        {state.kind === 'paste' && (
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
            fontSize: 12, color: 'var(--vib-primary)',
          }}>
            <Upload size={13} /> Tải file
            <input
              type="file"
              accept=".md,.markdown,.txt"
              onChange={pickFile}
              style={{ display: 'none' }}
              data-testid={`cmp-file-${side}`}
            />
          </label>
        )}
      </div>

      <div style={{ padding: 12 }}>
        {state.kind === 'doc' ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <VibSelect
              value={state.docId}
              onChange={e => onChange({ ...state, docId: e.target.value, version: '' })}
              aria-label={isLeft ? 'Tài liệu bên trái' : 'Tài liệu bên phải'}
            >
              <option value="">— Chọn tài liệu —</option>
              {docs.map(d => (
                <option key={d.id} value={d.id}>
                  {d.doc_type} · {d.title} ({d.project_code})
                </option>
              ))}
            </VibSelect>
            <VibSelect
              value={state.version}
              onChange={e => onChange({ ...state, version: e.target.value })}
              disabled={!loadedDoc}
              aria-label={isLeft ? 'Phiên bản bên trái' : 'Phiên bản bên phải'}
            >
              <option value="">
                Bản hiện hành{loadedDoc ? ` (${loadedDoc.current_version})` : ''}
              </option>
              {(loadedDoc?.versions ?? []).map(v => (
                <option key={v.id} value={v.version_label}>
                  {v.version_label} — {v.released_on?.slice(0, 10) ?? 'chưa rõ ngày'}
                </option>
              ))}
            </VibSelect>
            {loadedDoc && (
              <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>
                <FileText size={11} style={{ verticalAlign: -1 }} /> {loadedDoc.project_name} ·{' '}
                {loadedDoc.sections.length} mục · chủ tài liệu {loadedDoc.owner ?? '—'}
              </div>
            )}
          </div>
        ) : (
          <div>
            <textarea
              value={state.text}
              onChange={e => onChange({ ...state, text: e.target.value, fileName: state.fileName })}
              rows={7}
              spellCheck={false}
              placeholder="Dán nội dung tài liệu cần so sánh vào đây..."
              data-testid={`cmp-text-${side}`}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 6,
                border: '1px solid var(--vib-neutral-300)', fontFamily: 'var(--font-mono)',
                fontSize: 12, lineHeight: 1.55, resize: 'vertical',
              }}
            />
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center', marginTop: 5,
              fontSize: 12, color: 'var(--vib-neutral-500)',
            }}>
              <ClipboardPaste size={12} />
              {state.fileName
                ? <span>{state.fileName}</span>
                : <span>{state.text ? `${state.text.split('\n').length} dòng` : 'chưa có nội dung'}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hàng diff ───────────────────────────────────────────────────────────────

const NO_STYLE: React.CSSProperties = {
  padding: '2px 6px', textAlign: 'right', color: 'var(--vib-neutral-400)', fontSize: 11,
  borderRight: '1px solid var(--vib-neutral-200)', userSelect: 'none',
  borderBottom: '1px solid var(--vib-neutral-100)',
}
const CELL_STYLE: React.CSSProperties = {
  padding: '2px 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  borderBottom: '1px solid var(--vib-neutral-100)',
}
const DEL_BG = '#FBD9D4'
const ADD_BG = '#CDEBD8'
const DEL_TOKEN: React.CSSProperties = { background: '#F5B5AC', borderRadius: 2 }
const ADD_TOKEN: React.CSSProperties = { background: '#A5DDBA', borderRadius: 2 }

function rowBg(kind: LineRow['kind'], side: Side): string {
  if (kind === '=') return 'transparent'
  if (kind === '~') return side === 'left' ? '#FFF6F4' : '#F4FBF7'
  if (kind === '-') return side === 'left' ? DEL_BG : 'var(--vib-neutral-50)'
  return side === 'right' ? ADD_BG : 'var(--vib-neutral-50)'
}

function HeaderCells({ mode, leftLabel, rightLabel }: {
  mode: 'side' | 'inline'
  leftLabel: string
  rightLabel: string
}) {
  const base: React.CSSProperties = {
    padding: '7px 10px', fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font)',
    background: 'var(--vib-neutral-50)', borderBottom: '1px solid var(--vib-neutral-200)',
    position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
  if (mode === 'inline') {
    return (
      <>
        <div style={{ ...base, borderRight: '1px solid var(--vib-neutral-200)' }} />
        <div style={{ ...base, borderRight: '1px solid var(--vib-neutral-200)' }} />
        <div style={base} data-testid="diff-doc-header">
          <span style={{ color: 'var(--vib-danger)' }}>{leftLabel}</span>
          <span style={{ color: 'var(--vib-neutral-400)' }}> → </span>
          <span style={{ color: 'var(--vib-success)' }}>{rightLabel}</span>
        </div>
      </>
    )
  }
  return (
    <>
      <div style={{ ...base, borderRight: '1px solid var(--vib-neutral-200)' }} />
      <div style={{ ...base, color: 'var(--vib-danger)' }} data-testid="diff-doc-header">{leftLabel}</div>
      <div style={{ ...base, borderRight: '1px solid var(--vib-neutral-200)', borderLeft: '1px solid var(--vib-neutral-200)' }} />
      <div style={{ ...base, color: 'var(--vib-success)' }} data-testid="diff-doc-header-right">{rightLabel}</div>
    </>
  )
}

/** Nội dung một ô: có tokens thì highlight mức từ, không thì tô cả dòng */
function LineContent({ row, side }: { row: LineRow; side: Side }) {
  const text = side === 'left' ? row.left : row.right
  if (text === null) return null
  if (row.kind !== '~' || !row.tokens) return <>{text}</>
  return (
    <>
      {row.tokens
        .filter(([kind]) => (side === 'left' ? kind !== '+' : kind !== '-'))
        .map(([kind, value], i) => kind === '='
          ? <span key={i}>{value}</span>
          : <span key={i} style={kind === '-' ? DEL_TOKEN : ADD_TOKEN}>{value}</span>)}
    </>
  )
}

function SideLine({ row }: { row: LineRow }) {
  return (
    <>
      <div style={NO_STYLE}>{row.leftNo ?? ''}</div>
      <div style={{ ...CELL_STYLE, background: rowBg(row.kind, 'left') }}>
        <LineContent row={row} side="left" />
      </div>
      <div style={{ ...NO_STYLE, borderLeft: '1px solid var(--vib-neutral-200)' }}>
        {row.rightNo ?? ''}
      </div>
      <div style={{ ...CELL_STYLE, background: rowBg(row.kind, 'right') }}>
        <LineContent row={row} side="right" />
      </div>
    </>
  )
}

function InlineLine({ row }: { row: LineRow }) {
  if (row.kind === '=') {
    return (
      <>
        <div style={NO_STYLE}>{row.leftNo ?? ''}</div>
        <div style={NO_STYLE}>{row.rightNo ?? ''}</div>
        <div style={CELL_STYLE}>{row.left}</div>
      </>
    )
  }
  return (
    <>
      {row.left !== null && (
        <>
          <div style={NO_STYLE}>{row.leftNo ?? ''}</div>
          <div style={NO_STYLE} />
          <div style={{ ...CELL_STYLE, background: DEL_BG }}>
            <span style={{ color: 'var(--vib-danger)', marginRight: 6 }}>−</span>
            <LineContent row={row} side="left" />
          </div>
        </>
      )}
      {row.right !== null && (
        <>
          <div style={NO_STYLE} />
          <div style={NO_STYLE}>{row.rightNo ?? ''}</div>
          <div style={{ ...CELL_STYLE, background: ADD_BG }}>
            <span style={{ color: 'var(--vib-success)', marginRight: 6 }}>+</span>
            <LineContent row={row} side="right" />
          </div>
        </>
      )}
    </>
  )
}
