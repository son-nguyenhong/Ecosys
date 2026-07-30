/**
 * Form tạo / sửa Change Request cấp tài liệu.
 *
 * BA sửa CẢ FILE Markdown của tài liệu; hệ thống tự so với bản hiện hành để suy ra
 * thay đổi cấp mục (thêm / sửa / xoá / đổi vị trí) và hiện diff ngay trong form.
 * Nhờ vẫn quy về section ops, hai CR sửa hai mục khác nhau vẫn merge độc lập được.
 */
import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Btn, Field, Modal, VibInput, VibSelect, VibTextarea } from '../../../components/ui'
import { UserSelect } from '../../../components/UserSelect'
import { validateOps } from '../../../lib/ba-studio/diff'
import { opsFromMarkdown } from '../../../lib/ba-studio/markdown'
import { CHANGE_TYPE_LABELS, CHANGE_TYPE_ORDER, PRIORITY_LABELS } from '../../../lib/ba-studio/labels'
import type {
  ChangeType, DocCrCreatePayload, DocCrDetail, MasterDocDetail, Priority,
} from '../../../lib/ba-studio/types'
import { DiffView } from './DiffView'
import { MarkdownEditor } from './MarkdownEditor'
import { DeltaTags, Panel, Tag } from './primitives'

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

interface Props {
  open: boolean
  doc: MasterDocDetail
  cr?: DocCrDetail | null
  allCrCodes: string[]
  currentUser: string
  saving?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (payload: DocCrCreatePayload) => void
}

export function CrForm({
  open, doc, cr, allCrCodes, currentUser, saving, error, onClose, onSubmit,
}: Props) {
  const isEdit = !!cr
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [changeType, setChangeType] = useState<ChangeType>('scope')
  const [priority, setPriority] = useState<Priority>('medium')
  const [requestedBy, setRequestedBy] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [impact, setImpact] = useState('')
  const [acceptance, setAcceptance] = useState<string[]>([''])
  const [dependencies, setDependencies] = useState<string[]>([])
  const [contentMd, setContentMd] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)

  const baseMd = doc.content_md ?? ''

  useEffect(() => {
    if (!open) return
    setLocalError(null)
    setShowPreview(true)
    if (cr) {
      setTitle(cr.title)
      setDescription(cr.description ?? '')
      setChangeType(cr.change_type)
      setPriority(cr.priority)
      setRequestedBy(cr.requested_by)
      setReviewer(cr.reviewer ?? '')
      setImpact(cr.impact_scope ?? '')
      setAcceptance(cr.acceptance.length ? cr.acceptance : [''])
      setDependencies(cr.dependencies)
      // nội dung tài liệu SAU khi áp CR — BA sửa tiếp trên đó
      setContentMd(cr.after_content_md || baseMd)
    } else {
      setTitle('')
      setDescription('')
      setChangeType('scope')
      setPriority('medium')
      setRequestedBy(currentUser)
      setReviewer('')
      setImpact('')
      setAcceptance([''])
      setDependencies([])
      setContentMd(baseMd)
    }
  }, [open, cr, currentUser, baseMd])

  const { ops, sections: afterSections } = useMemo(
    () => opsFromMarkdown(doc.sections, contentMd),
    [doc.sections, contentMd],
  )
  const opErrors = useMemo(() => validateOps(ops, doc.sections), [ops, doc.sections])
  const delta = useMemo(() => ({
    add: ops.filter(o => o.op === 'add').length,
    modify: ops.filter(o => o.op === 'modify').length,
    remove: ops.filter(o => o.op === 'remove').length,
    move: ops.filter(o => o.op === 'move').length,
  }), [ops])

  function submit() {
    if (!title.trim()) { setLocalError('Nhập tiêu đề CR'); return }
    if (!requestedBy.trim()) { setLocalError('Chọn người đề nghị'); return }
    if (!contentMd.trim()) { setLocalError('Nội dung tài liệu không được để trống'); return }
    if (ops.length === 0) {
      setLocalError('Nội dung chưa khác bản hiện hành — hãy sửa nội dung tài liệu trước khi gửi CR')
      return
    }
    if (opErrors.length > 0) { setLocalError(opErrors.join('; ')); return }

    setLocalError(null)
    onSubmit({
      target_doc_id: doc.id,
      title: title.trim(),
      description: description.trim() || undefined,
      change_type: changeType,
      priority,
      requested_by: requestedBy.trim(),
      reviewer: reviewer.trim() || undefined,
      impact_scope: impact.trim() || undefined,
      acceptance: acceptance.map(a => a.trim()).filter(Boolean),
      dependencies,
      content_md: contentMd,
    })
  }

  if (!open) return null
  const shownError = localError ?? error
  const availableDeps = allCrCodes.filter(c => !dependencies.includes(c) && c !== cr?.request_code)
  const drifted = isEdit && (cr?.drift?.length ?? 0) > 0

  return (
    <Modal
      title={isEdit ? `Sửa Change Request — ${cr?.request_code}` : `Change Request mới — ${doc.doc_code}`}
      open={open}
      onClose={onClose}
      width="1100px"
    >
      <div style={{ display: 'grid', gap: 14 }}>
        {drifted && (
          <div style={{
            padding: '9px 12px', borderRadius: 6, fontSize: 13,
            background: 'var(--vib-warning-bg)', border: '1px solid #F0D9A8',
            color: 'var(--vib-neutral-800)',
          }}>
            Tài liệu đã đổi sau khi CR này được tạo ({cr?.drift.join('; ')}).
            Nội dung bên dưới đã được dựng lại trên bản <strong>{doc.current_version}</strong> —
            kiểm tra rồi lưu để CR khớp bản hiện hành.
          </div>
        )}

        <Field label="Tiêu đề" required>
          <VibInput
            value={title}
            placeholder="Mở rộng scope tích hợp Collection Support System"
            onChange={e => setTitle(e.target.value)}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <Field label="Loại thay đổi" required>
            <VibSelect value={changeType} onChange={e => setChangeType(e.target.value as ChangeType)}>
              {CHANGE_TYPE_ORDER.map(t => (
                <option key={t} value={t}>{CHANGE_TYPE_LABELS[t]}</option>
              ))}
            </VibSelect>
          </Field>
          <Field label="Ưu tiên" required>
            <VibSelect value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </VibSelect>
          </Field>
          <Field label="Người đề nghị" required>
            <UserSelect value={requestedBy} onChange={setRequestedBy} placeholder="Chọn người đề nghị..." />
          </Field>
          <Field label="Người review">
            <UserSelect value={reviewer} onChange={setReviewer} placeholder="Chọn người review..." />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Mô tả thay đổi">
            <VibTextarea
              rows={3}
              value={description}
              placeholder="Nội dung đề nghị thay đổi, lý do..."
              onChange={e => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Đánh giá ảnh hưởng">
            <VibTextarea
              rows={3}
              value={impact}
              placeholder="Ảnh hưởng module nào, ước tính công, rủi ro..."
              onChange={e => setImpact(e.target.value)}
            />
          </Field>
        </div>

        {/* Tiêu chí nghiệm thu */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--vib-neutral-700)', marginBottom: 6 }}>
            Tiêu chí nghiệm thu
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {acceptance.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <VibInput
                  value={a}
                  placeholder="Ví dụ: Đồng bộ trạng thái khoản thu hai chiều"
                  onChange={e => setAcceptance(prev => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                  style={{ flex: 1 }}
                />
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => setAcceptance(prev => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)))}
                ><Trash2 size={14} /></Btn>
              </div>
            ))}
          </div>
          <Btn variant="secondary" size="sm" style={{ marginTop: 6 }}
            onClick={() => setAcceptance(prev => [...prev, ''])}>
            <Plus size={13} /> Thêm tiêu chí
          </Btn>
        </div>

        {/* Phụ thuộc */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--vib-neutral-700)', marginBottom: 6 }}>
            Phụ thuộc CR khác
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {dependencies.map(code => (
              <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Tag tone="blue" mono>{code}</Tag>
                <button
                  onClick={() => setDependencies(prev => prev.filter(c => c !== code))}
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: 'var(--vib-neutral-500)', fontSize: 12,
                  }}
                >✕</button>
              </span>
            ))}
            {availableDeps.length > 0 && (
              <VibSelect
                value=""
                onChange={e => { if (e.target.value) setDependencies(prev => [...prev, e.target.value]) }}
                style={{ width: 220 }}
              >
                <option value="">+ Thêm phụ thuộc...</option>
                {availableDeps.map(c => <option key={c} value={c}>{c}</option>)}
              </VibSelect>
            )}
          </div>
        </div>

        {/* Nội dung đề nghị */}
        <MarkdownEditor
          value={contentMd}
          onChange={setContentMd}
          rows={22}
          fileName={`${doc.doc_code}-${doc.next_version_label}`}
          label={`Nội dung tài liệu đề nghị — sửa trực tiếp trên bản ${doc.current_version}`}
          hint={
            <>Sửa thẳng vào file Markdown. Hệ thống tự so với bản{' '}
              <strong>{doc.current_version}</strong> để suy ra thay đổi cấp mục bên dưới.</>
          }
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--vib-neutral-600)' }}>Thay đổi suy ra:</span>
          <DeltaTags delta={delta} />
          <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>
            {ops.length === 0 ? 'chưa có thay đổi nào so với bản hiện hành' : `${ops.length} thao tác mục`}
          </span>
          <span style={{ flex: 1 }} />
          <Btn variant="secondary" size="sm" onClick={() => setContentMd(baseMd)}>
            <RotateCcw size={13} /> Về bản {doc.current_version}
          </Btn>
        </div>

        {opErrors.length > 0 && (
          <div style={{
            padding: '9px 12px', borderRadius: 6, fontSize: 13,
            background: 'var(--vib-warning-bg)', color: 'var(--vib-warning)',
            border: '1px solid #F0D9A8',
          }}>{opErrors.join(' · ')}</div>
        )}

        {/* Xem trước diff */}
        {ops.length > 0 && (
          <Panel
            title="Xem trước tài liệu sau khi merge"
            pad={false}
            extra={
              <Btn variant="secondary" size="sm" onClick={() => setShowPreview(v => !v)}>
                {showPreview ? <><EyeOff size={13} /> Ẩn</> : <><Eye size={13} /> Hiện</>}
              </Btn>
            }
          >
            {showPreview && (
              <DiffView
                before={doc.sections}
                after={afterSections}
                mode="inline"
                showSame={false}
                beforeLabel={doc.current_version}
                afterLabel={doc.next_version_label}
              />
            )}
          </Panel>
        )}

        {shownError && (
          <div style={{
            padding: '9px 12px', borderRadius: 6, fontSize: 13,
            background: 'var(--vib-danger-bg)', color: 'var(--vib-danger)',
            border: '1px solid #F0C4C0',
          }}>{shownError}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="secondary" onClick={onClose}>Huỷ</Btn>
          <Btn onClick={submit} loading={saving} disabled={saving}>
            {isEdit ? 'Lưu Change Request' : 'Gửi Change Request'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}
