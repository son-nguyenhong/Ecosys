/**
 * Sổ Change Request — toàn bộ CR gắn với Master Doc, sort giảm theo ưu tiên.
 */
import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Btn, VibInput } from '../../../components/ui'
import {
  CHANGE_TYPE_LABELS, MERGE_STATE_LABELS, PRIORITY_WEIGHT, STAGE_LABELS,
  fdate, mergeStateTone, stageTone,
} from '../../../lib/ba-studio/labels'
import type { DocCr } from '../../../lib/ba-studio/types'
import {
  DataTable, DeltaTags, EmptyBox, Panel, PageHead, PriorityDot, Segmented, Tag, tdStyle, thStyle,
} from '../components/primitives'
import type { BaStudioNav, CrFilter } from '../nav'

interface Props {
  crs: DocCr[]
  filter: CrFilter
  onFilterChange: (f: CrFilter) => void
  nav: BaStudioNav
  onCreateCr: () => void
}

export function CrRegisterView({ crs, filter, onFilterChange, nav, onCreateCr }: Props) {
  const [query, setQuery] = useState('')

  const counts = useMemo(() => ({
    all: crs.length,
    pending: crs.filter(c => c.merge_state === 'pending').length,
    merged: crs.filter(c => c.merge_state === 'merged').length,
    rejected: crs.filter(c => c.merge_state === 'rejected').length,
  }), [crs])

  const rows = useMemo(() => {
    return crs
      .filter(c => (filter === 'all' ? true : c.merge_state === filter))
      .filter(c => {
        if (!query) return true
        const hay = `${c.request_code} ${c.title} ${c.doc_title ?? ''} ${c.requested_by} ${c.reviewer ?? ''}`.toLowerCase()
        return hay.includes(query.toLowerCase())
      })
      .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority])
  }, [crs, filter, query])

  return (
    <div>
      <PageHead
        title="Sổ Change Request"
        sub={`Hiển thị ${rows.length} trong tổng ${crs.length} bản ghi · CR gắn với Master Doc`}
        extra={<Btn onClick={onCreateCr}><Plus size={14} /> Change Request mới</Btn>}
      />

      <Panel pad={false}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
          borderBottom: '1px solid var(--vib-neutral-200)', flexWrap: 'wrap',
        }}>
          <Segmented<CrFilter>
            value={filter}
            onChange={onFilterChange}
            options={[
              { value: 'all', label: `Tất cả (${counts.all})` },
              { value: 'pending', label: `Chờ duyệt (${counts.pending})` },
              { value: 'merged', label: `Đã merge (${counts.merged})` },
              { value: 'rejected', label: `Từ chối (${counts.rejected})` },
            ]}
          />
          <span style={{ flex: 1 }} />
          <VibInput
            value={query}
            placeholder="Tìm mã CR, tiêu đề, người đề nghị..."
            onChange={e => setQuery(e.target.value)}
            style={{ width: 280 }}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyBox
            title="Không có Change Request nào"
            desc="Mở một Master Doc và tạo CR để thay đổi nội dung tài liệu."
          />
        ) : (
          <DataTable
            minWidth={1180}
            head={<>
              <th style={thStyle({ width: 118 })}>Ưu tiên</th>
              <th style={thStyle({ width: 142 })}>Mã CR</th>
              <th style={thStyle()}>Tiêu đề &amp; tài liệu đích</th>
              <th style={thStyle({ width: 96 })}>Loại</th>
              <th style={thStyle({ width: 106 })}>Trạng thái</th>
              <th style={thStyle({ width: 118 })}>Giai đoạn</th>
              <th style={thStyle({ width: 110 })}>Δ Mục</th>
              <th style={thStyle({ width: 140 })}>Người đề nghị</th>
              <th style={thStyle({ width: 96 })}>Ngày gửi</th>
            </>}
          >
            {rows.map(c => (
              <tr
                key={c.id}
                onClick={() => nav.goCr(c.id)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--vib-neutral-50)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={tdStyle()}><PriorityDot priority={c.priority} /></td>
                <td style={tdStyle({ mono: true, color: 'var(--vib-primary)' })}>{c.request_code}</td>
                <td style={tdStyle()}>
                  <div>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)', marginTop: 2 }}>
                    {c.doc_type} · {c.doc_title}
                  </div>
                </td>
                <td style={tdStyle({ color: 'var(--vib-neutral-600)' })}>
                  {CHANGE_TYPE_LABELS[c.change_type]}
                </td>
                <td style={tdStyle()}>
                  <Tag tone={mergeStateTone(c.merge_state)}>{MERGE_STATE_LABELS[c.merge_state]}</Tag>
                </td>
                <td style={tdStyle()}>
                  <Tag tone={stageTone(c.stage)}>{STAGE_LABELS[c.stage]}</Tag>
                </td>
                <td style={tdStyle()}><DeltaTags delta={c.delta} /></td>
                <td style={tdStyle({ color: 'var(--vib-neutral-600)' })}>{c.requested_by}</td>
                <td style={tdStyle({ color: 'var(--vib-neutral-500)' })}>{fdate(c.created_at)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </div>
  )
}
