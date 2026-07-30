/**
 * Bảng điều khiển tài liệu — toàn cảnh Master Doc × Change Request.
 */
import { Plus } from 'lucide-react'
import { Btn } from '../../../components/ui'
import { BA_AI_ADOPTION } from '../../../data/ba-ai-adoption'
import {
  CHANGE_TYPE_LABELS, CHANGE_TYPE_ORDER, PRIORITY_WEIGHT, STAGE_LABELS,
  docTypeTone, fcount, fdate, stageTone,
} from '../../../lib/ba-studio/labels'
import type { DocCr, MasterDocListItem } from '../../../lib/ba-studio/types'
import {
  DataTable, EmptyBox, Mono, Panel, PageHead, PriorityDot, Tag, tdStyle, thStyle,
} from '../components/primitives'
import type { BaStudioNav } from '../nav'

interface Props {
  docs: MasterDocListItem[]
  crs: DocCr[]
  nav: BaStudioNav
  onCreateDoc: () => void
}

function KpiTile({ label, value, unit, sub, color }: {
  label: string
  value: number | string
  unit?: string
  sub?: string
  color?: string
}) {
  return (
    <div style={{
      background: 'var(--vib-white)', border: '1px solid var(--vib-neutral-200)',
      borderRadius: 8, boxShadow: 'var(--shadow-card)', padding: '14px 18px',
    }}>
      <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{
          fontSize: 24, lineHeight: 1.2, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
          color: color ?? 'var(--vib-neutral-900)',
        }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

export function ConsoleView({ docs, crs, nav, onCreateDoc }: Props) {
  const pending = crs.filter(c => c.merge_state === 'pending')
  const merged = crs.filter(c => c.merge_state === 'merged')
  const rejected = crs.filter(c => c.merge_state === 'rejected')
  const versions = docs.reduce((n, d) => n + d.version_count, 0)
  const sections = docs.reduce((n, d) => n + d.section_count, 0)

  const queue = [...pending].sort(
    (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority],
  )

  const maxTypeCount = Math.max(
    1, ...CHANGE_TYPE_ORDER.map(t => crs.filter(c => c.change_type === t).length),
  )

  return (
    <div>
      <PageHead
        title="Bảng điều khiển tài liệu"
        sub={`Toàn cảnh Master Doc và Change Request · ${docs.length} tài liệu · ${crs.length} CR`}
        extra={<Btn onClick={onCreateDoc}><Plus size={14} /> Master Doc mới</Btn>}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12, marginBottom: 16,
      }}>
        <KpiTile label="Master Doc" value={docs.length} unit="tài liệu"
          sub={`${versions} phiên bản đã phát hành`} />
        <KpiTile label="Mục nội dung" value={sections} unit="mục" sub="trên bản mới nhất" />
        <KpiTile label="Change Request" value={crs.length} unit="CR" sub="toàn bộ vòng đời" />
        <KpiTile label="Chờ xử lý" value={pending.length} unit="CR"
          sub="cần review / phê duyệt" color="var(--vib-warning)" />
        <KpiTile label="Đã merge" value={merged.length} unit="CR"
          sub="đã vào master" color="var(--vib-success)" />
        <KpiTile label="Từ chối" value={rejected.length} unit="CR"
          sub="không đưa vào phạm vi" color="var(--vib-danger)" />
      </div>

      <Panel
        title="Ma trận Tài liệu × Change Request"
        pad={false}
        style={{ marginBottom: 16 }}
        extra={<Btn variant="link" size="sm" onClick={nav.goDocs}>Xem thư viện →</Btn>}
      >
        {docs.length === 0 ? (
          <EmptyBox
            title="Chưa có Master Doc nào"
            desc="Tạo tài liệu đầu tiên để bắt đầu quản lý phiên bản và Change Request."
            action={<Btn onClick={onCreateDoc}><Plus size={14} /> Master Doc mới</Btn>}
          />
        ) : (
          <DataTable
            minWidth={1080}
            head={<>
              <th style={thStyle()}>Master Doc</th>
              <th style={thStyle({ width: 78 })}>Loại</th>
              <th style={thStyle({ width: 170 })}>Dự án</th>
              <th style={thStyle({ width: 78 })}>Bản</th>
              <th style={thStyle({ width: 62, align: 'right' })}>Mục</th>
              <th style={thStyle({ width: 96, align: 'center' })}>Chờ duyệt</th>
              <th style={thStyle({ width: 90, align: 'center' })}>Đã merge</th>
              <th style={thStyle({ width: 82, align: 'center' })}>Từ chối</th>
              <th style={thStyle({ width: 150 })}>Chủ tài liệu</th>
              <th style={thStyle({ width: 96 })}>Cập nhật</th>
            </>}
          >
            {docs.map(d => (
              <tr
                key={d.id}
                onClick={() => nav.goDoc(d.id)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--vib-neutral-50)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={tdStyle()}>
                  <div style={{ color: 'var(--vib-primary)', fontWeight: 500 }}>{d.title}</div>
                  <Mono>{d.doc_code}</Mono>
                </td>
                <td style={tdStyle()}><Tag tone={docTypeTone(d.doc_type)}>{d.doc_type}</Tag></td>
                <td style={tdStyle({ color: 'var(--vib-neutral-600)' })}>{d.project_name ?? d.project_code}</td>
                <td style={tdStyle()}><Tag mono>{d.current_version}</Tag></td>
                <td style={tdStyle({ align: 'right', mono: true })}>{d.section_count}</td>
                <td style={{ ...tdStyle({ align: 'center' }) }}>
                  {d.cr_pending > 0 ? <Tag tone="gold" mono>{d.cr_pending}</Tag>
                    : <span style={{ color: 'var(--vib-neutral-400)' }}>—</span>}
                </td>
                <td style={{ ...tdStyle({ align: 'center' }) }}>
                  {d.cr_merged > 0 ? <Tag tone="green" mono>{d.cr_merged}</Tag>
                    : <span style={{ color: 'var(--vib-neutral-400)' }}>—</span>}
                </td>
                <td style={{ ...tdStyle({ align: 'center' }) }}>
                  {d.cr_rejected > 0 ? <Tag tone="red" mono>{d.cr_rejected}</Tag>
                    : <span style={{ color: 'var(--vib-neutral-400)' }}>—</span>}
                </td>
                <td style={tdStyle({ color: 'var(--vib-neutral-600)' })}>{d.owner ?? '—'}</td>
                <td style={tdStyle({ color: 'var(--vib-neutral-500)' })}>
                  {fdate(d.last_released_on ?? d.updated_at)}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 16 }}>
        <Panel
          title={<>Hàng đợi cần xử lý {pending.length > 0 && <Tag tone="gold" style={{ marginLeft: 8 }}>{pending.length}</Tag>}</>}
          pad={false}
        >
          {queue.length === 0 ? (
            <EmptyBox title="Không có CR nào đang chờ" desc="Mọi Change Request đã được xử lý." />
          ) : (
            <DataTable
              minWidth={620}
              head={<>
                <th style={thStyle({ width: 118 })}>Ưu tiên</th>
                <th style={thStyle({ width: 140 })}>Mã CR</th>
                <th style={thStyle()}>Nội dung</th>
                <th style={thStyle({ width: 120 })}>Giai đoạn</th>
              </>}
            >
              {queue.map(c => (
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
                      {c.doc_type} · {c.project_name ?? c.project_code} · {CHANGE_TYPE_LABELS[c.change_type]}
                    </div>
                  </td>
                  <td style={tdStyle()}><Tag tone={stageTone(c.stage)}>{STAGE_LABELS[c.stage]}</Tag></td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Panel title="Phân bổ loại thay đổi">
            <div style={{ display: 'grid', gap: 10 }}>
              {CHANGE_TYPE_ORDER.map(t => {
                const n = crs.filter(c => c.change_type === t).length
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 92, flexShrink: 0, fontSize: 13 }}>{CHANGE_TYPE_LABELS[t]}</span>
                    <span style={{
                      flex: 1, height: 8, borderRadius: 100, overflow: 'hidden',
                      background: 'var(--vib-neutral-200)',
                    }}>
                      <span style={{
                        display: 'block', height: '100%', borderRadius: 100,
                        width: `${Math.round((n / maxTypeCount) * 100)}%`,
                        background: 'var(--vib-primary)', transition: 'width .3s',
                      }} />
                    </span>
                    <span style={{
                      width: 22, textAlign: 'right', flexShrink: 0, fontSize: 13,
                      color: 'var(--vib-neutral-500)', fontFamily: 'var(--font-mono)',
                    }}>{fcount(n)}</span>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel
            title="AI Adoption"
            pad={false}
            extra={<Btn variant="link" size="sm" onClick={() => nav.goAi()}>Tổng quan →</Btn>}
          >
            {BA_AI_ADOPTION.pillars.map(p => (
              <button
                key={p.id}
                onClick={() => nav.goAi(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--vib-neutral-200)', textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--vib-neutral-50)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Mono color="var(--vib-primary)">{p.code}</Mono>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--vib-neutral-900)' }}>{p.name}</span>
                <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>{p.items.length} mục</span>
              </button>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  )
}
