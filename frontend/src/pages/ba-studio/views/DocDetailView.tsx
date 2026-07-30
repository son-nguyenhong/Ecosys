/**
 * Chi tiết Master Doc — 3 tab: Nội dung (chọn phiên bản, kể cả bản dự kiến),
 * Phiên bản (timeline), Change Request (bảng CR của tài liệu).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Files, GitBranch, GitCompare, Pencil, Plus, Trash2 } from 'lucide-react'
import { Btn } from '../../../components/ui'
import * as api from '../../../api/ba-studio'
import { diffSections } from '../../../lib/ba-studio/diff'
import { joinMarkdown } from '../../../lib/ba-studio/markdown'
import {
  CHANGE_TYPE_LABELS, MERGE_STATE_LABELS, STAGE_LABELS,
  docTypeTone, fdate, mergeStateTone, stageTone,
} from '../../../lib/ba-studio/labels'
import type { DocCr, MasterDocDetail, Section } from '../../../lib/ba-studio/types'
import { buildVersionEntries, type VersionEntry } from '../../../lib/ba-studio/versions'
import { Markdown } from '../components/Markdown'
import { downloadMarkdown } from '../components/MarkdownEditor'
import {
  BackLink, DataTable, DeltaTags, DescGrid, EmptyBox, Mono, Panel, PriorityDot,
  Segmented, Tag, tdStyle, thStyle,
} from '../components/primitives'
import type { BaStudioNav, DocTab } from '../nav'

interface Props {
  docId: string
  tab: DocTab
  refreshKey: number
  nav: BaStudioNav
  onTabChange: (tab: DocTab) => void
  onEdit: (doc: MasterDocDetail) => void
  onCreateCr: (doc: MasterDocDetail) => void
  onDeleted: () => void
  onError: (msg: string) => void
}

/** Cách xem nội dung: bản render Markdown / danh sách mục / nguồn .md */
type ReadMode = 'read' | 'sections' | 'source'

export function DocDetailView({
  docId, tab, refreshKey, nav, onTabChange, onEdit, onCreateCr, onDeleted, onError,
}: Props) {
  const [doc, setDoc] = useState<MasterDocDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [versionKey, setVersionKey] = useState<string>('')
  const [previewSections, setPreviewSections] = useState<Record<string, Section[]>>({})
  const [deleting, setDeleting] = useState(false)
  const [readMode, setReadMode] = useState<ReadMode>('read')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getDoc(docId)
      setDoc(data)
      const entries = buildVersionEntries(data)
      const released = entries.filter(e => e.kind !== 'preview')
      setVersionKey(prev => (entries.some(e => e.key === prev) ? prev : released[released.length - 1]?.key ?? ''))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Không tải được tài liệu')
    } finally {
      setLoading(false)
    }
  }, [docId, onError])

  useEffect(() => { void load() }, [load, refreshKey])

  const entries = useMemo(() => (doc ? buildVersionEntries(doc) : []), [doc])
  const selected: VersionEntry | undefined = entries.find(e => e.key === versionKey) ?? entries[0]

  // bản dự kiến: lấy after_sections do backend tính cho CR đang chờ
  useEffect(() => {
    if (!selected || selected.kind !== 'preview' || !selected.crId) return
    if (previewSections[selected.crId]) return
    let cancelled = false
    void api.getDocCr(selected.crId)
      .then(cr => { if (!cancelled) setPreviewSections(prev => ({ ...prev, [cr.id]: cr.after_sections })) })
      .catch(e => onError(e instanceof Error ? e.message : 'Không tải được bản dự kiến'))
    return () => { cancelled = true }
  }, [selected, previewSections, onError])

  const shownSections: Section[] = useMemo(() => {
    if (!selected) return []
    if (selected.kind === 'preview') return selected.crId ? previewSections[selected.crId] ?? [] : []
    return selected.sections ?? []
  }, [selected, previewSections])

  const prevSections: Section[] | null = useMemo(() => {
    if (!selected) return null
    const idx = entries.findIndex(e => e.key === selected.key)
    if (idx <= 0) return null
    const prev = entries[idx - 1]
    if (selected.kind === 'preview') {
      const released = entries.filter(e => e.kind !== 'preview')
      return released[released.length - 1]?.sections ?? null
    }
    return prev.sections ?? null
  }, [entries, selected])

  const shownMarkdown = useMemo(() => joinMarkdown(shownSections), [shownSections])

  const changedKeys = useMemo(() => {
    if (!prevSections) return new Map<string, 'add' | 'modify'>()
    const rows = diffSections(prevSections, shownSections)
    const map = new Map<string, 'add' | 'modify'>()
    rows.forEach(r => {
      if (r.op === 'add') map.set(r.section_key, 'add')
      if (r.op === 'modify') map.set(r.section_key, 'modify')
    })
    return map
  }, [prevSections, shownSections])

  async function handleDelete() {
    if (!doc) return
    if (!window.confirm(`Xoá tài liệu ${doc.doc_code}? Chỉ xoá được khi chưa có CR và chưa phát hành thêm bản.`)) return
    setDeleting(true)
    try {
      await api.deleteDoc(doc.id)
      onDeleted()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Không xoá được tài liệu')
    } finally {
      setDeleting(false)
    }
  }

  if (loading && !doc) {
    return <div style={{ padding: 40, color: 'var(--vib-neutral-500)' }}>Đang tải tài liệu…</div>
  }
  if (!doc) {
    return <EmptyBox title="Không tìm thấy tài liệu" action={<Btn onClick={nav.goDocs}>Về thư viện</Btn>} />
  }

  const pendingCrs = doc.change_requests.filter(c => c.merge_state === 'pending')

  return (
    <div>
      <BackLink label="Master Doc" onClick={nav.goDocs} />

      <Panel pad={false} style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 18px 0' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, lineHeight: 1.35 }}>{doc.title}</h1>
                <Tag tone={docTypeTone(doc.doc_type)}>{doc.doc_type}</Tag>
                <Tag tone="blue" mono>{doc.current_version}</Tag>
                {doc.status === 'archived' && <Tag tone="neutral">Đã lưu trữ</Tag>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--vib-neutral-500)' }}>
                {doc.project_name} · <Mono>{doc.project_code}</Mono>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn variant="secondary" onClick={() => nav.goCompare(doc.id)}>
                <GitCompare size={14} /> So sánh phiên bản
              </Btn>
              <Btn variant="secondary" onClick={() => nav.goCompareDoc(doc.id)}>
                <Files size={14} /> So sánh tài liệu
              </Btn>
              <Btn variant="secondary" onClick={() => onEdit(doc)}>
                <Pencil size={14} /> Sửa
              </Btn>
              {doc.change_requests.length === 0 && doc.versions.length <= 1 && (
                <Btn variant="secondary" onClick={handleDelete} loading={deleting}>
                  <Trash2 size={14} /> Xoá
                </Btn>
              )}
              <Btn onClick={() => onCreateCr(doc)}>
                <GitBranch size={14} /> Change Request
              </Btn>
            </div>
          </div>

          <div style={{ margin: '14px 0' }}>
            <DescGrid
              columns={3}
              items={[
                { label: 'Viết tắt', value: doc.abbr ?? '—' },
                { label: 'Chủ tài liệu', value: doc.owner ?? '—' },
                { label: 'Khởi tạo', value: fdate(doc.created_at) },
                { label: 'Mã tài liệu', value: <Mono size={13}>{doc.doc_code}</Mono> },
                {
                  label: 'CR chờ duyệt', color: 'var(--vib-warning)',
                  value: String(doc.change_requests.filter(c => c.merge_state === 'pending').length),
                },
                {
                  label: 'CR đã merge', color: 'var(--vib-success)',
                  value: String(doc.change_requests.filter(c => c.merge_state === 'merged').length),
                },
              ]}
            />
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 24, padding: '0 18px',
          borderTop: '1px solid var(--vib-neutral-200)',
        }}>
          {([
            { key: 'content', label: 'Nội dung', n: doc.sections.length },
            { key: 'versions', label: 'Phiên bản', n: doc.versions.length },
            { key: 'crs', label: 'Change Request', n: doc.change_requests.length },
          ] as { key: DocTab; label: string; n: number }[]).map(t => {
            const on = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none',
                  border: 'none', padding: '11px 0', cursor: 'pointer', fontSize: 13,
                  fontWeight: on ? 600 : 400,
                  color: on ? 'var(--vib-primary)' : 'var(--vib-neutral-700)',
                  borderBottom: `2px solid ${on ? 'var(--vib-primary)' : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {t.label}
                <Tag tone={on ? 'blue' : 'neutral'} style={{ height: 19, lineHeight: '17px' }}>{t.n}</Tag>
              </button>
            )
          })}
        </div>
      </Panel>

      {tab === 'content' && (
        <Panel pad={false}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
            borderBottom: '1px solid var(--vib-neutral-200)', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, color: 'var(--vib-neutral-600)' }}>Phiên bản</span>
            <Segmented
              size="sm"
              value={selected?.key ?? ''}
              onChange={setVersionKey}
              options={entries.map(e => ({
                value: e.key,
                label: e.label,
                title: e.title,
                mono: true,
                color: e.kind === 'preview' ? 'var(--vib-warning)' : undefined,
              }))}
            />
            <span style={{
              flex: 1, minWidth: 120, fontSize: 13, color: 'var(--vib-neutral-500)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {selected?.kind === 'preview'
                ? 'Bản dự kiến nếu merge CR này — chưa áp dụng vào master.'
                : selected?.note ?? ''}
            </span>
            <span style={{ fontSize: 13, color: 'var(--vib-neutral-500)' }}>{shownSections.length} mục</span>
            <Segmented<ReadMode>
              size="sm"
              value={readMode}
              onChange={setReadMode}
              options={[
                { value: 'read', label: 'Đọc' },
                { value: 'sections', label: 'Theo mục' },
                { value: 'source', label: 'Nguồn .md' },
              ]}
            />
            <Btn
              variant="secondary"
              size="sm"
              title="Tải phiên bản đang xem dưới dạng file Markdown"
              onClick={() => downloadMarkdown(
                `${doc.doc_code}-${selected?.versionLabel ?? doc.current_version}.md`, shownMarkdown)}
            ><Download size={13} /> .md</Btn>
          </div>

          {shownSections.length === 0 ? (
            <EmptyBox title="Đang tải nội dung phiên bản…" />
          ) : readMode === 'read' ? (
            <div style={{ padding: '4px 24px 24px', maxWidth: 980 }}>
              <Markdown text={shownMarkdown} style={{ fontSize: 14 }} />
            </div>
          ) : readMode === 'source' ? (
            <pre style={{
              margin: 0, padding: '14px 18px', overflowX: 'auto',
              fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.6,
              color: 'var(--vib-neutral-800)', whiteSpace: 'pre-wrap',
            }}>{shownMarkdown}</pre>
          ) : shownSections.map((s, i) => {
            const change = changedKeys.get(s.section_key)
            return (
              <div key={s.section_key} style={{
                display: 'flex', gap: 14, padding: '14px 18px',
                borderBottom: '1px solid var(--vib-neutral-200)',
              }}>
                <span style={{
                  width: 24, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--vib-neutral-400)', paddingTop: 3,
                }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <Mono size={11}>{'#'.repeat(Math.max(1, s.heading_level ?? 2))}</Mono>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      {s.heading || '(phần mở đầu)'}
                    </span>
                    {change === 'add' && <Tag tone="green">Mục mới</Tag>}
                    {change === 'modify' && <Tag tone="gold">Đã sửa</Tag>}
                    <span style={{ flex: 1 }} />
                    <Mono size={11}>{s.section_key}</Mono>
                  </div>
                  <Markdown text={s.body} />
                </div>
              </div>
            )
          })}
        </Panel>
      )}

      {tab === 'versions' && (
        <Panel>
          {doc.versions.map((v, i) => {
            const last = i === doc.versions.length - 1
            return (
              <div key={v.id} style={{ display: 'flex', gap: 14, paddingBottom: 18 }}>
                <div style={{ width: 10, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', marginTop: 5, background: '#fff',
                    border: `2px solid ${last ? 'var(--vib-success)' : 'var(--vib-primary)'}`,
                  }} />
                  {!last && <span style={{ flex: 1, width: 2, background: 'var(--vib-neutral-200)', margin: '4px 0 -4px' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <Tag tone={last ? 'green' : 'neutral'} mono>{v.version_label}</Tag>
                    <span style={{ fontSize: 13, color: 'var(--vib-neutral-500)' }}>{fdate(v.released_on)}</span>
                    {v.source_cr_code && v.source_cr_id && (
                      <button
                        onClick={() => nav.goCr(v.source_cr_id as string)}
                        style={{
                          border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--vib-primary)',
                        }}
                      >{v.source_cr_code}</button>
                    )}
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 13, color: 'var(--vib-neutral-500)' }}>{v.sections.length} mục</span>
                    {v.kind === 'base'
                      ? <span style={{ fontSize: 12, color: 'var(--vib-neutral-400)' }}>bản gốc</span>
                      : <DeltaTags delta={v.delta} />}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--vib-neutral-600)', marginBottom: 8 }}>
                    {v.note ?? ''}
                  </div>
                  <Btn variant="secondary" size="sm" onClick={() => {
                    setVersionKey(v.version_label)
                    onTabChange('content')
                  }}>Xem nội dung bản này</Btn>
                </div>
              </div>
            )
          })}

          {pendingCrs.length > 0 && (
            <div style={{
              marginTop: 4, padding: '10px 12px', borderRadius: 6, fontSize: 13,
              background: 'var(--vib-warning-bg)', border: '1px solid #F0D9A8',
              color: 'var(--vib-neutral-800)',
            }}>
              {pendingCrs.length} CR đang chờ — bản kế tiếp dự kiến là{' '}
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{doc.next_version_label}</strong>.
            </div>
          )}
        </Panel>
      )}

      {tab === 'crs' && (
        <Panel
          pad={false}
          extra={<Btn size="sm" onClick={() => onCreateCr(doc)}><Plus size={13} /> CR mới</Btn>}
          title={`Change Request của tài liệu — ${doc.change_requests.length}`}
        >
          {doc.change_requests.length === 0 ? (
            <EmptyBox
              title="Chưa có Change Request nào"
              desc="Mọi thay đổi nội dung tài liệu đã phát hành đều phải đi qua CR để có vết review."
              action={<Btn onClick={() => onCreateCr(doc)}><Plus size={14} /> Tạo CR đầu tiên</Btn>}
            />
          ) : (
            <DataTable
              minWidth={960}
              head={<>
                <th style={thStyle({ width: 118 })}>Ưu tiên</th>
                <th style={thStyle({ width: 142 })}>Mã CR</th>
                <th style={thStyle()}>Tiêu đề</th>
                <th style={thStyle({ width: 96 })}>Loại</th>
                <th style={thStyle({ width: 106 })}>Trạng thái</th>
                <th style={thStyle({ width: 118 })}>Giai đoạn</th>
                <th style={thStyle({ width: 110 })}>Δ Mục</th>
                <th style={thStyle({ width: 96 })}>Ngày gửi</th>
              </>}
            >
              {(doc.change_requests as DocCr[]).map(c => (
                <tr
                  key={c.id}
                  onClick={() => nav.goCr(c.id)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--vib-neutral-50)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={tdStyle()}><PriorityDot priority={c.priority} /></td>
                  <td style={tdStyle({ mono: true, color: 'var(--vib-primary)' })}>{c.request_code}</td>
                  <td style={tdStyle()}>{c.title}</td>
                  <td style={tdStyle({ color: 'var(--vib-neutral-600)' })}>{CHANGE_TYPE_LABELS[c.change_type]}</td>
                  <td style={tdStyle()}>
                    <Tag tone={mergeStateTone(c.merge_state)}>{MERGE_STATE_LABELS[c.merge_state]}</Tag>
                  </td>
                  <td style={tdStyle()}><Tag tone={stageTone(c.stage)}>{STAGE_LABELS[c.stage]}</Tag></td>
                  <td style={tdStyle()}><DeltaTags delta={c.delta} /></td>
                  <td style={tdStyle({ color: 'var(--vib-neutral-500)' })}>{fdate(c.created_at)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>
      )}
    </div>
  )
}
