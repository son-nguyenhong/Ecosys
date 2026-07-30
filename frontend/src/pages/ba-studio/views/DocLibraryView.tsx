/**
 * Master Doc — danh sách dạng BẢNG, có filter và group by (Dự án / Loại tài liệu).
 *
 * Chọn bảng thay vì card: BA làm việc với hàng chục tài liệu, cần so ngang các cột
 * (phiên bản hiện hành, CR đang chờ, chủ tài liệu, ngày phát hành) và nhóm theo
 * dự án để soát theo từng dự án một.
 */
import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, GitCompare, Plus, X } from 'lucide-react'
import { Btn, VibInput, VibSelect } from '../../../components/ui'
import {
  MERGE_STATE_LABELS, docTypeTone, fcount, fdate,
} from '../../../lib/ba-studio/labels'
import type { DocStatus, DocType, MasterDocListItem } from '../../../lib/ba-studio/types'
import {
  DataTable, EmptyBox, Mono, PageHead, Tag, tdStyle, thStyle,
} from '../components/primitives'
import type { BaStudioNav } from '../nav'

type GroupBy = 'none' | 'project' | 'type'
type SortKey = 'updated' | 'title' | 'pending' | 'versions'

interface Props {
  docs: MasterDocListItem[]
  nav: BaStudioNav
  onCreateDoc: () => void
}

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'Không nhóm' },
  { value: 'project', label: 'Nhóm theo Dự án' },
  { value: 'type', label: 'Nhóm theo Loại tài liệu' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Cập nhật mới nhất' },
  { value: 'title', label: 'Tên tài liệu A→Z' },
  { value: 'pending', label: 'CR chờ nhiều nhất' },
  { value: 'versions', label: 'Nhiều phiên bản nhất' },
]

export function DocLibraryView({ docs, nav, onCreateDoc }: Props) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocType | ''>('')
  const [projectFilter, setProjectFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocStatus | ''>('active')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('project')
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const projects = useMemo(() => {
    const map = new Map<string, string>()
    docs.forEach(d => { if (d.project_code) map.set(d.project_code, d.project_name ?? d.project_code) })
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [docs])

  const owners = useMemo(() => {
    const set = new Set<string>()
    docs.forEach(d => { if (d.owner) set.add(d.owner) })
    return [...set].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [docs])

  const filtered = useMemo(() => docs.filter(d => {
    if (typeFilter && d.doc_type !== typeFilter) return false
    if (projectFilter && d.project_code !== projectFilter) return false
    if (ownerFilter && d.owner !== ownerFilter) return false
    if (statusFilter && d.status !== statusFilter) return false
    if (pendingOnly && d.cr_pending === 0) return false
    if (query) {
      const hay = `${d.title} ${d.doc_code} ${d.abbr ?? ''} ${d.owner ?? ''} ${d.project_code ?? ''} ${d.project_name ?? ''}`
      if (!hay.toLowerCase().includes(query.toLowerCase())) return false
    }
    return true
  }), [docs, typeFilter, projectFilter, ownerFilter, statusFilter, pendingOnly, query])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title, 'vi')
      if (sortKey === 'pending') return b.cr_pending - a.cr_pending || a.title.localeCompare(b.title, 'vi')
      if (sortKey === 'versions') return b.version_count - a.version_count || a.title.localeCompare(b.title, 'vi')
      return (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
    })
    return list
  }, [filtered, sortKey])

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', label: '', docs: sorted }]
    const map = new Map<string, { key: string; label: string; docs: MasterDocListItem[] }>()
    for (const d of sorted) {
      const key = groupBy === 'project' ? (d.project_code ?? '—') : d.doc_type
      const label = groupBy === 'project'
        ? `${d.project_code ?? '—'} · ${d.project_name ?? ''}`
        : `${d.doc_type} — ${DOC_TYPE_GROUP_HINT[d.doc_type] ?? ''}`
      if (!map.has(key)) map.set(key, { key, label, docs: [] })
      map.get(key)!.docs.push(d)
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [sorted, groupBy])

  const activeFilters = [
    typeFilter && { label: `Loại: ${typeFilter}`, clear: () => setTypeFilter('') },
    projectFilter && { label: `Dự án: ${projectFilter}`, clear: () => setProjectFilter('') },
    ownerFilter && { label: `Chủ: ${ownerFilter}`, clear: () => setOwnerFilter('') },
    statusFilter && statusFilter !== 'active'
      && { label: 'Đã lưu trữ', clear: () => setStatusFilter('active') },
    pendingOnly && { label: 'Chỉ tài liệu có CR chờ', clear: () => setPendingOnly(false) },
    query && { label: `Tìm: “${query}”`, clear: () => setQuery('') },
  ].filter(Boolean) as { label: string; clear: () => void }[]

  const totalPending = filtered.reduce((n, d) => n + d.cr_pending, 0)
  const totalVersions = filtered.reduce((n, d) => n + d.version_count, 0)

  return (
    <div>
      <PageHead
        title="Master Doc"
        sub={`${filtered.length}/${docs.length} tài liệu · ${totalVersions} phiên bản đã phát hành · ${totalPending} CR đang chờ`}
        extra={<Btn onClick={onCreateDoc}><Plus size={14} /> Master Doc mới</Btn>}
      />

      {/* Thanh filter */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <VibInput
          value={query}
          placeholder="Tìm theo tiêu đề, mã tài liệu, dự án, chủ tài liệu..."
          onChange={e => setQuery(e.target.value)}
          style={{ width: 300 }}
        />
        <VibSelect
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          style={{ width: 230 }}
        >
          <option value="">Mọi dự án</option>
          {projects.map(([code, name]) => (
            <option key={code} value={code}>{code} · {name}</option>
          ))}
        </VibSelect>
        <VibSelect
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as DocType | '')}
          style={{ width: 120 }}
        >
          <option value="">Mọi loại</option>
          {(['BRS', 'FSD', 'BRD', 'FRS', 'SRS'] as DocType[]).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </VibSelect>
        <VibSelect
          value={ownerFilter}
          onChange={e => setOwnerFilter(e.target.value)}
          style={{ width: 190 }}
        >
          <option value="">Mọi chủ tài liệu</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </VibSelect>
        <VibSelect
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as DocStatus | '')}
          style={{ width: 140 }}
        >
          <option value="active">Đang dùng</option>
          <option value="archived">Đã lưu trữ</option>
          <option value="">Tất cả trạng thái</option>
        </VibSelect>

        <span style={{ flex: 1 }} />

        <VibSelect
          value={groupBy}
          onChange={e => setGroupBy(e.target.value as GroupBy)}
          style={{ width: 200 }}
          aria-label="Nhóm theo"
        >
          {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </VibSelect>
        <VibSelect
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          style={{ width: 200 }}
          aria-label="Sắp xếp"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </VibSelect>
      </div>

      {/* Chip filter đang bật */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {activeFilters.map((f, i) => (
            <button
              key={i}
              onClick={f.clear}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 8px',
                borderRadius: 4, cursor: 'pointer', fontSize: 12,
                background: 'var(--vib-info-bg)', color: 'var(--vib-primary)',
                border: '1px solid #BBD9F2',
              }}
            >{f.label} <X size={11} /></button>
          ))}
          <button
            onClick={() => {
              setQuery(''); setTypeFilter(''); setProjectFilter('')
              setOwnerFilter(''); setStatusFilter('active'); setPendingOnly(false)
            }}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', fontSize: 12,
              color: 'var(--vib-neutral-500)', textDecoration: 'underline',
            }}
          >Bỏ hết filter</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyBox
          title="Không có tài liệu nào khớp điều kiện"
          desc={docs.length === 0
            ? 'Chưa có Master Doc nào. Tạo tài liệu đầu tiên bằng cách dán / tải file .md lên.'
            : 'Thử bỏ bớt filter hoặc đổi từ khoá tìm kiếm.'}
          action={<Btn onClick={onCreateDoc}><Plus size={14} /> Master Doc mới</Btn>}
        />
      ) : (
        <div style={{
          background: 'var(--vib-white)', border: '1px solid var(--vib-neutral-200)',
          borderRadius: 8, boxShadow: 'var(--shadow-card)', overflow: 'hidden',
        }}>
          <DataTable
            minWidth={1080}
            head={<>
              <th style={thStyle({ width: 58 })}>Loại</th>
              <th style={thStyle()}>Tài liệu</th>
              {groupBy !== 'project' && <th style={thStyle({ width: 168 })}>Dự án</th>}
              <th style={thStyle({ width: 150 })}>Chủ tài liệu</th>
              <th style={thStyle({ width: 86, align: 'center' })}>Bản hiện hành</th>
              <th style={thStyle({ width: 62, align: 'right' })}>Mục</th>
              <th style={thStyle({ width: 62, align: 'right' })}>Bản</th>
              <th style={thStyle({ width: 78, align: 'right' })}>CR chờ</th>
              <th style={thStyle({ width: 78, align: 'right' })}>Đã merge</th>
              <th style={thStyle({ width: 108 })}>Phát hành</th>
              <th style={thStyle({ width: 44 })} />
            </>}
          >
            {groups.map(group => {
              const isCollapsed = !!collapsed[group.key]
              const groupPending = group.docs.reduce((n, d) => n + d.cr_pending, 0)
              return (
                <React.Fragment key={group.key || 'all'}>
                  {groupBy !== 'none' && (
                    <tr>
                      <td
                        colSpan={groupBy === 'project' ? 10 : 11}
                        data-testid="doc-group"
                        style={{
                          padding: '8px 12px', background: 'var(--vib-neutral-50)',
                          borderBottom: '1px solid var(--vib-neutral-200)',
                          borderTop: '1px solid var(--vib-neutral-200)', cursor: 'pointer',
                        }}
                        onClick={() => setCollapsed(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                      >
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13,
                          fontWeight: 600, color: 'var(--vib-neutral-800)',
                        }}>
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          {group.label}
                          <Tag tone="neutral">{group.docs.length} tài liệu</Tag>
                          {groupPending > 0 && <Tag tone="gold">{groupPending} CR chờ</Tag>}
                        </span>
                      </td>
                    </tr>
                  )}

                  {!isCollapsed && group.docs.map(d => (
                    <tr
                      key={d.id}
                      onClick={() => nav.goDoc(d.id)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--vib-neutral-50)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={tdStyle()}>
                        <Tag tone={docTypeTone(d.doc_type)}>{d.doc_type}</Tag>
                      </td>
                      <td style={tdStyle()}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.title}</div>
                        <Mono size={11}>{d.doc_code}</Mono>
                        {d.status === 'archived' && (
                          <Tag tone="neutral" style={{ marginLeft: 6 }}>Đã lưu trữ</Tag>
                        )}
                      </td>
                      {groupBy !== 'project' && (
                        <td style={tdStyle({ color: 'var(--vib-neutral-600)' })}>
                          <Mono size={12}>{d.project_code}</Mono>
                        </td>
                      )}
                      <td style={tdStyle({ color: 'var(--vib-neutral-700)' })}>{d.owner ?? '—'}</td>
                      <td style={tdStyle({ align: 'center' })}>
                        <Tag tone="blue" mono>{d.current_version}</Tag>
                      </td>
                      <td style={tdStyle({ align: 'right', mono: true })}>{fcount(d.section_count)}</td>
                      <td style={tdStyle({ align: 'right', mono: true })}>{fcount(d.version_count)}</td>
                      <td style={tdStyle({
                        align: 'right', mono: true,
                        color: d.cr_pending > 0 ? 'var(--vib-warning)' : undefined,
                      })}>{fcount(d.cr_pending)}</td>
                      <td style={tdStyle({
                        align: 'right', mono: true,
                        color: d.cr_merged > 0 ? 'var(--vib-success)' : undefined,
                      })}>{fcount(d.cr_merged)}</td>
                      <td style={tdStyle({ color: 'var(--vib-neutral-500)' })}>
                        {fdate(d.last_released_on)}
                      </td>
                      <td style={tdStyle()}>
                        <button
                          title="So sánh phiên bản"
                          onClick={e => { e.stopPropagation(); nav.goCompare(d.id) }}
                          style={{
                            border: 'none', background: 'none', cursor: 'pointer', padding: 2,
                            color: 'var(--vib-neutral-500)', display: 'inline-flex',
                          }}
                        ><GitCompare size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </DataTable>

          <div style={{
            display: 'flex', gap: 14, padding: '9px 14px', flexWrap: 'wrap',
            borderTop: '1px solid var(--vib-neutral-200)', background: 'var(--vib-neutral-50)',
            fontSize: 12, color: 'var(--vib-neutral-600)',
          }}>
            <span>{filtered.length} tài liệu</span>
            <span>·</span>
            <span>{MERGE_STATE_LABELS.pending}: {totalPending}</span>
            <span style={{ flex: 1 }} />
            <button
              onClick={() => setPendingOnly(v => !v)}
              style={{
                border: 'none', background: 'none', cursor: 'pointer', fontSize: 12,
                color: pendingOnly ? 'var(--vib-primary)' : 'var(--vib-neutral-600)',
                fontWeight: pendingOnly ? 600 : 400,
              }}
            >{pendingOnly ? '✓ ' : ''}Chỉ tài liệu có CR chờ</button>
          </div>
        </div>
      )}
    </div>
  )
}

const DOC_TYPE_GROUP_HINT: Record<string, string> = {
  BRS: 'Business Requirements Specification',
  FSD: 'Functional Specification Document',
  BRD: 'Business Requirements Document',
  FRS: 'Functional Requirements Specification',
  SRS: 'Software Requirements Specification',
}
