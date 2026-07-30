/**
 * Chi tiết Change Request — view quan trọng nhất: BA thấy chính xác tài liệu
 * sẽ thay đổi thế nào TRƯỚC khi merge, rồi Merge / Từ chối tại đây.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CircleSlash, Download, GitMerge, Pencil, Trash2 } from 'lucide-react'
import { Btn, Modal, VibTextarea } from '../../../components/ui'
import * as api from '../../../api/ba-studio'
import { diffSections, diffStatLabel } from '../../../lib/ba-studio/diff'
import {
  CHANGE_TYPE_LABELS, MERGE_STATE_LABELS, OP_LABELS, STAGE_LABELS,
  fdate, fdatetime, mergeStateTone, opTone, stageTone,
} from '../../../lib/ba-studio/labels'
import type {
  CrHistoryEntry, DocCrDetail, MasterDocDetail, OpenStage,
} from '../../../lib/ba-studio/types'
import { DiffView, type DiffMode, type DiffRender } from '../components/DiffView'
import { downloadMarkdown } from '../components/MarkdownEditor'
import {
  BackLink, DescGrid, EmptyBox, Mono, Panel, PriorityDot, Segmented, SwitchToggle, Tag,
} from '../components/primitives'
import type { BaStudioNav } from '../nav'

interface Props {
  crId: string
  refreshKey: number
  nav: BaStudioNav
  onChanged: () => void
  onEdit: (cr: DocCrDetail, doc: MasterDocDetail) => void
  onError: (msg: string) => void
  onToast: (msg: string) => void
}

const NEXT_STAGE: Record<string, OpenStage | undefined> = {
  submitted: 'reviewing',
  reviewing: 'approved',
}
const PREV_STAGE: Record<string, OpenStage | undefined> = {
  reviewing: 'submitted',
  approved: 'reviewing',
}

export function CrDetailView({ crId, refreshKey, nav, onChanged, onEdit, onError, onToast }: Props) {
  const [cr, setCr] = useState<DocCrDetail | null>(null)
  const [history, setHistory] = useState<CrHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<DiffMode>('inline')
  const [render, setRender] = useState<DiffRender>('markdown')
  const [showSame, setShowSame] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detail, hist] = await Promise.all([api.getDocCr(crId), api.getCrHistory(crId)])
      setCr(detail)
      setHistory(hist)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Không tải được Change Request')
    } finally {
      setLoading(false)
    }
  }, [crId, onError])

  useEffect(() => { void load() }, [load, refreshKey])

  const statLabel = useMemo(
    () => (cr ? diffStatLabel(diffSections(cr.before_sections, cr.after_sections)) : ''),
    [cr],
  )

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  async function handleStage(stage: OpenStage) {
    if (!cr) return
    await withBusy(async () => {
      try {
        await api.changeCrStage(cr.id, stage)
        onToast(`${cr.request_code} → ${STAGE_LABELS[stage]}`)
        await load()
        onChanged()
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Không đổi được giai đoạn')
      }
    })
  }

  async function handleMerge() {
    if (!cr) return
    const needApprove = cr.stage !== 'approved'
    if (needApprove) {
      const ok = window.confirm(
        `CR đang ở bước "${STAGE_LABELS[cr.stage]}".\n\n` +
        `Phê duyệt và merge luôn vào ${cr.next_version_label}? ` +
        'Cả hai bước đều được ghi vào nhật ký CR.',
      )
      if (!ok) return
    } else if (!window.confirm(`Merge ${cr.request_code} vào ${cr.next_version_label}?`)) {
      return
    }
    await withBusy(async () => {
      try {
        const res = await api.mergeDocCr(cr.id, { force_approve: needApprove })
        onToast(`Đã merge ${res.request_code} vào ${res.version_label}`)
        await load()
        onChanged()
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Merge thất bại')
      }
    })
  }

  async function handleReject() {
    if (!cr || !rejectReason.trim()) return
    await withBusy(async () => {
      try {
        await api.rejectDocCr(cr.id, rejectReason.trim())
        onToast(`Đã từ chối ${cr.request_code}`)
        setRejectOpen(false)
        setRejectReason('')
        await load()
        onChanged()
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Từ chối thất bại')
      }
    })
  }

  async function handleDelete() {
    if (!cr) return
    if (!window.confirm(`Xoá ${cr.request_code}? Chỉ xoá được CR đang chờ xử lý.`)) return
    await withBusy(async () => {
      try {
        await api.deleteDocCr(cr.id)
        onToast(`Đã xoá ${cr.request_code}`)
        onChanged()
        nav.goCrs()
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Không xoá được CR')
      }
    })
  }

  async function openEdit() {
    if (!cr) return
    try {
      const doc = await api.getDoc(cr.target_doc_id)
      onEdit(cr, doc)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Không tải được tài liệu đích')
    }
  }

  if (loading && !cr) {
    return <div style={{ padding: 40, color: 'var(--vib-neutral-500)' }}>Đang tải Change Request…</div>
  }
  if (!cr) {
    return <EmptyBox title="Không tìm thấy Change Request" action={<Btn onClick={() => nav.goCrs()}>Về sổ CR</Btn>} />
  }

  const pending = cr.merge_state === 'pending'
  const nextStage = NEXT_STAGE[cr.stage]
  const prevStage = PREV_STAGE[cr.stage]
  const diffTitle = cr.merge_state === 'merged'
    ? `Thay đổi đã áp dụng vào ${cr.merged_version ?? 'master'}`
    : cr.merge_state === 'rejected'
      ? 'Thay đổi đã đề xuất (bị từ chối)'
      : 'Master Doc trước và sau khi merge'

  return (
    <div>
      <BackLink label="Sổ Change Request" onClick={() => nav.goCrs()} />

      <Panel style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, lineHeight: 1.35 }}>{cr.title}</h1>
              <Tag tone={mergeStateTone(cr.merge_state)}>{MERGE_STATE_LABELS[cr.merge_state]}</Tag>
              <Tag tone={stageTone(cr.stage)}>{STAGE_LABELS[cr.stage]}</Tag>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              fontSize: 13, color: 'var(--vib-neutral-500)',
            }}>
              <Mono size={13} color="var(--vib-primary)">{cr.request_code}</Mono>
              <span>·</span>
              <PriorityDot priority={cr.priority} />
              <span>·</span>
              <span>
                Tài liệu đích:{' '}
                <button
                  onClick={() => nav.goDoc(cr.target_doc_id)}
                  style={{
                    border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--vib-primary)', fontSize: 13,
                  }}
                >{cr.doc_title}</button>{' '}
                <Mono>{cr.doc_current_version}</Mono>
              </span>
            </div>
          </div>

          {pending && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {prevStage && (
                <Btn variant="secondary" size="sm" disabled={busy} onClick={() => handleStage(prevStage)}>
                  ← {STAGE_LABELS[prevStage]}
                </Btn>
              )}
              {nextStage && (
                <Btn variant="secondary" disabled={busy} onClick={() => handleStage(nextStage)}>
                  <Check size={14} /> {STAGE_LABELS[nextStage]}
                </Btn>
              )}
              <Btn variant="secondary" disabled={busy} onClick={openEdit}>
                <Pencil size={14} /> Sửa
              </Btn>
              <Btn variant="secondary" disabled={busy} onClick={() => setRejectOpen(true)}
                style={{ color: 'var(--vib-danger)' }}>
                <CircleSlash size={14} /> Từ chối
              </Btn>
              <Btn disabled={busy} onClick={handleMerge}>
                <GitMerge size={14} /> Merge vào {cr.next_version_label}
              </Btn>
              <Btn variant="ghost" disabled={busy} onClick={handleDelete} title="Xoá CR">
                <Trash2 size={14} />
              </Btn>
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <DescGrid
            columns={3}
            items={[
              { label: 'Loại thay đổi', value: CHANGE_TYPE_LABELS[cr.change_type] },
              { label: 'Dự án', value: `${cr.project_code ?? ''} · ${cr.project_name ?? ''}` },
              { label: 'Giai đoạn', value: STAGE_LABELS[cr.stage] },
              { label: 'Người đề nghị', value: cr.requested_by },
              { label: 'Người review', value: cr.reviewer ?? '—' },
              { label: 'Ngày gửi', value: fdate(cr.created_at) },
              { label: 'Ngày xử lý', value: fdatetime(cr.reviewed_at) },
              { label: 'Người phê duyệt', value: cr.approved_by ?? '—' },
              {
                label: 'Phiên bản sinh ra',
                value: cr.merged_version ? <Mono size={13}>{cr.merged_version}</Mono> : '—',
                color: 'var(--vib-success)',
              },
            ]}
          />
        </div>
      </Panel>

      {pending && cr.drift?.length > 0 && (
        <div style={{
          display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: 'var(--vib-warning-bg)', border: '1px solid #F0D9A8', flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: 12, fontWeight: 600, flexShrink: 0, color: 'var(--vib-warning)',
          }}>CẦN CẬP NHẬT</span>
          <span style={{ fontSize: 13, lineHeight: 1.55, flex: 1, minWidth: 240 }}>
            Tài liệu đã thay đổi sau khi CR này được tạo nên không merge được:{' '}
            {cr.drift.join('; ')}. Bấm “Sửa” để dựng lại CR trên bản {cr.doc_current_version}.
          </span>
          <Btn variant="secondary" size="sm" onClick={openEdit}>
            <Pencil size={13} /> Cập nhật CR
          </Btn>
        </div>
      )}

      {cr.notes && (
        <div style={{
          display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: cr.merge_state === 'rejected' ? 'var(--vib-danger-bg)' : 'var(--vib-warning-bg)',
          border: `1px solid ${cr.merge_state === 'rejected' ? '#F0C4C0' : '#F0D9A8'}`,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 600, flexShrink: 0, paddingTop: 2,
            color: cr.merge_state === 'rejected' ? 'var(--vib-danger)' : 'var(--vib-warning)',
          }}>GHI CHÚ</span>
          <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--vib-neutral-800)' }}>{cr.notes}</span>
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16, marginBottom: 16,
      }}>
        <Panel title="Mô tả thay đổi">
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--vib-neutral-800)' }}>
            {cr.description || <span style={{ color: 'var(--vib-neutral-400)' }}>Không có mô tả.</span>}
          </div>
        </Panel>
        <Panel title="Đánh giá ảnh hưởng">
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--vib-neutral-800)' }}>
            {cr.impact_scope || <span style={{ color: 'var(--vib-neutral-400)' }}>Chưa đánh giá ảnh hưởng.</span>}
          </div>
        </Panel>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
        gap: 16, marginBottom: 16,
      }}>
        <Panel title="Tiêu chí nghiệm thu" pad={false}>
          {cr.acceptance.length === 0 ? (
            <div style={{ padding: '14px 18px', fontSize: 13, color: 'var(--vib-neutral-400)' }}>
              — Không có tiêu chí nghiệm thu được ghi nhận.
            </div>
          ) : cr.acceptance.map((a, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '10px 18px',
              borderBottom: '1px solid var(--vib-neutral-200)', fontSize: 13,
            }}>
              <Check size={15} color="var(--vib-success)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ lineHeight: 1.55 }}>{a}</span>
            </div>
          ))}
        </Panel>

        <Panel title="Phụ thuộc" pad={false}>
          {cr.dependencies.length === 0 ? (
            <div style={{ padding: '14px 18px', fontSize: 13, color: 'var(--vib-neutral-400)' }}>
              — Không phụ thuộc CR nào.
            </div>
          ) : cr.dependencies.map(code => (
            <div key={code} style={{
              display: 'flex', gap: 10, alignItems: 'center', padding: '10px 18px',
              borderBottom: '1px solid var(--vib-neutral-200)', fontSize: 13,
            }}>
              <Tag tone="blue" mono>{code}</Tag>
              <span style={{ color: 'var(--vib-neutral-600)' }}>phải xử lý trước / cùng đợt</span>
            </div>
          ))}
        </Panel>
      </div>

      <Panel
        title={diffTitle}
        pad={false}
        style={{ marginBottom: 16 }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)', fontVariantNumeric: 'tabular-nums' }}>
              {statLabel}
            </span>
            <Btn
              variant="secondary"
              size="sm"
              title="Tải bản đề nghị dưới dạng file Markdown"
              onClick={() => downloadMarkdown(
                `${cr.doc_code ?? 'tai-lieu'}-${cr.request_code}.md`, cr.after_content_md ?? '')}
            ><Download size={13} /> .md</Btn>
            <Segmented<DiffRender>
              size="sm"
              value={render}
              onChange={setRender}
              options={[
                { value: 'markdown', label: 'Markdown', title: 'Render tài liệu như khi đọc' },
                { value: 'tokens', label: 'Nguồn .md', title: 'Nguồn Markdown, highlight tới từng từ' },
              ]}
            />
            <Segmented<DiffMode>
              size="sm"
              value={mode}
              onChange={setMode}
              options={[{ value: 'inline', label: 'Hợp nhất' }, { value: 'side', label: 'Song song' }]}
            />
            <SwitchToggle checked={showSame} onChange={setShowSame} label="Mục không đổi" />
          </div>
        }
      >
        <DiffView
          before={cr.before_sections}
          after={cr.after_sections}
          mode={mode}
          render={render}
          showSame={showSame}
          beforeLabel={cr.doc_current_version ?? ''}
          afterLabel={cr.merge_state === 'merged'
            ? (cr.merged_version ?? '')
            : `${cr.next_version_label} (dự kiến)`}
        />
      </Panel>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16,
      }}>
        <Panel title={`Thay đổi mục (${cr.ops.length})`} pad={false}>
          {cr.ops.map((op, i) => (
            <div key={op.id ?? i} style={{
              display: 'flex', gap: 10, alignItems: 'center', padding: '9px 18px',
              borderBottom: '1px solid var(--vib-neutral-200)', fontSize: 13, flexWrap: 'wrap',
            }}>
              <Tag tone={opTone(op.op)}>{OP_LABELS[op.op]}</Tag>
              <Mono>{op.section_key}</Mono>
              {(op.op === 'add' || op.op === 'move') && (
                <span style={{ color: 'var(--vib-neutral-500)', fontSize: 12 }}>
                  {op.after_section_key
                    ? <>chèn sau <Mono>{op.after_section_key}</Mono></>
                    : op.op === 'move' ? 'đưa lên đầu tài liệu' : 'đẩy xuống cuối tài liệu'}
                </span>
              )}
              <span style={{ color: 'var(--vib-neutral-800)' }}>{op.heading ?? ''}</span>
            </div>
          ))}
        </Panel>

        <Panel title="Nhật ký xử lý" pad={false}>
          {history.length === 0 ? (
            <div style={{ padding: '14px 18px', fontSize: 13, color: 'var(--vib-neutral-400)' }}>
              Chưa có bản ghi nào.
            </div>
          ) : history.map(h => (
            <div key={h.id} style={{
              padding: '9px 18px', borderBottom: '1px solid var(--vib-neutral-200)', fontSize: 13,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--vib-neutral-500)', fontSize: 12 }}>{fdatetime(h.created_at)}</span>
                <strong style={{ fontWeight: 600 }}>{h.actor || '—'}</strong>
                {h.from_status && h.to_status && (
                  <span style={{ fontSize: 12, color: 'var(--vib-neutral-600)' }}>
                    {STAGE_LABELS[h.from_status as keyof typeof STAGE_LABELS] ?? h.from_status}
                    {' → '}
                    {STAGE_LABELS[h.to_status as keyof typeof STAGE_LABELS] ?? h.to_status}
                  </span>
                )}
                {!h.from_status && h.to_status && (
                  <span style={{ fontSize: 12, color: 'var(--vib-neutral-600)' }}>
                    tạo mới → {STAGE_LABELS[h.to_status as keyof typeof STAGE_LABELS] ?? h.to_status}
                  </span>
                )}
              </div>
              {h.comment && (
                <div style={{ color: 'var(--vib-neutral-600)', marginTop: 2 }}>{h.comment}</div>
              )}
            </div>
          ))}
        </Panel>
      </div>

      <Modal title={`Từ chối ${cr.request_code}`} open={rejectOpen} onClose={() => setRejectOpen(false)} width="520px">
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--vib-neutral-600)' }}>
            Lý do từ chối sẽ được ghi vào ghi chú CR và nhật ký xử lý — bắt buộc nhập.
          </div>
          <VibTextarea
            rows={4}
            value={rejectReason}
            placeholder="Ví dụ: đa ngôn ngữ là yêu cầu bắt buộc theo cam kết với chi nhánh..."
            onChange={e => setRejectReason(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="secondary" onClick={() => setRejectOpen(false)}>Huỷ</Btn>
            <Btn variant="danger" disabled={!rejectReason.trim() || busy} onClick={handleReject}>
              Từ chối CR
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
