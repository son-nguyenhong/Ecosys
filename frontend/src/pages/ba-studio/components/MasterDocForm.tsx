/**
 * Form tạo / sửa Master Doc — nội dung là MỘT file Markdown (V051).
 * Chỉ được sửa nội dung trực tiếp khi tài liệu chưa phát hành bản nào ngoài bản gốc
 * và chưa có CR (backend chặn 409) — sau đó mọi thay đổi phải đi qua Change Request.
 */
import { useEffect, useState } from 'react'
import { Btn, Field, Modal, VibInput, VibSelect, VibTextarea } from '../../../components/ui'
import { UserSelect } from '../../../components/UserSelect'
import { templateFor } from '../../../data/ba-doc-templates'
import { DOC_TYPE_HINT } from '../../../lib/ba-studio/labels'
import type { DocType, MasterDocCreatePayload, MasterDocDetail } from '../../../lib/ba-studio/types'
import type { Project } from '../../../api/ppg'
import { MarkdownEditor } from './MarkdownEditor'

const DOC_TYPES: DocType[] = ['BRS', 'FSD', 'BRD', 'FRS', 'SRS']

export interface MasterDocFormValue extends MasterDocCreatePayload {
  content_md: string
}

interface Props {
  open: boolean
  projects: Project[]
  /** có giá trị = chế độ sửa */
  doc?: MasterDocDetail | null
  /** sửa nội dung có được phép không (doc.editable_sections) */
  sectionsEditable?: boolean
  saving?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (value: MasterDocFormValue) => void
}

export function MasterDocForm({
  open, projects, doc, sectionsEditable = true, saving, error, onClose, onSubmit,
}: Props) {
  const isEdit = !!doc
  const [projectId, setProjectId] = useState('')
  const [docType, setDocType] = useState<DocType>('BRS')
  const [title, setTitle] = useState('')
  const [docCode, setDocCode] = useState('')
  const [abbr, setAbbr] = useState(DOC_TYPE_HINT.BRS)
  const [owner, setOwner] = useState('')
  const [baseDate, setBaseDate] = useState('')
  const [baseNote, setBaseNote] = useState('')
  const [contentMd, setContentMd] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLocalError(null)
    if (doc) {
      setProjectId(doc.project_id)
      setDocType(doc.doc_type)
      setTitle(doc.title)
      setDocCode(doc.doc_code)
      setAbbr(doc.abbr ?? '')
      setOwner(doc.owner ?? '')
      setBaseDate((doc.base_date ?? '').slice(0, 10))
      setBaseNote(doc.base_note ?? '')
      setContentMd(doc.content_md ?? '')
    } else {
      setProjectId(projects[0]?.id ?? '')
      setDocType('BRS')
      setTitle('')
      setDocCode('')
      setAbbr(DOC_TYPE_HINT.BRS)
      setOwner('')
      setBaseDate(new Date().toISOString().slice(0, 10))
      setBaseNote('')
      setContentMd('')
    }
  }, [open, doc, projects])

  function submit() {
    if (!projectId) { setLocalError('Chọn dự án'); return }
    if (!title.trim()) { setLocalError('Nhập tiêu đề tài liệu'); return }
    if (!contentMd.trim()) { setLocalError('Nhập nội dung tài liệu, hoặc tải file .md lên'); return }

    setLocalError(null)
    onSubmit({
      project_id: projectId,
      doc_type: docType,
      title: title.trim(),
      doc_code: docCode.trim() || undefined,
      abbr: abbr.trim() || undefined,
      owner: owner.trim() || undefined,
      base_date: baseDate || undefined,
      base_note: baseNote.trim() || undefined,
      content_md: contentMd,
    })
  }

  if (!open) return null
  const shownError = localError ?? error

  return (
    <Modal
      title={isEdit ? `Sửa tài liệu — ${doc?.doc_code}` : 'Tạo Master Doc'}
      open={open}
      onClose={onClose}
      width="980px"
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
          <Field label="Dự án" required>
            <VibSelect value={projectId} disabled={isEdit} onChange={e => setProjectId(e.target.value)}>
              <option value="">— Chọn dự án —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
              ))}
            </VibSelect>
          </Field>
          <Field label="Loại tài liệu" required>
            <VibSelect
              value={docType}
              onChange={e => {
                const next = e.target.value as DocType
                setDocType(next)
                if (!isEdit) setAbbr(DOC_TYPE_HINT[next])
              }}
            >
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </VibSelect>
          </Field>
        </div>

        <Field label="Tiêu đề" required>
          <VibInput
            value={title}
            placeholder="BRS — Nâng cấp Hệ thống Quản lý Chi tiêu (EMS 2.0)"
            onChange={e => setTitle(e.target.value)}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Mã tài liệu">
            <VibInput
              value={docCode}
              disabled={isEdit}
              placeholder="để trống → tự sinh theo mã dự án"
              onChange={e => setDocCode(e.target.value)}
            />
          </Field>
          <Field label="Viết tắt">
            <VibInput value={abbr} onChange={e => setAbbr(e.target.value)} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
          <Field label="Chủ tài liệu">
            <UserSelect value={owner} onChange={setOwner} placeholder="Chọn BA phụ trách..." />
          </Field>
          <Field label="Ngày bản gốc">
            <VibInput type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Ghi chú bản gốc">
          <VibTextarea
            rows={2}
            value={baseNote}
            placeholder="Khởi tạo tài liệu BRS ban đầu cho phạm vi..."
            onChange={e => setBaseNote(e.target.value)}
          />
        </Field>

        {!sectionsEditable && (
          <div style={{
            padding: '9px 12px', borderRadius: 6, fontSize: 13,
            background: 'var(--vib-warning-bg)', border: '1px solid #F0D9A8',
            color: 'var(--vib-neutral-800)',
          }}>
            Tài liệu đã phát hành phiên bản hoặc đã có Change Request — nội dung chỉ đổi được
            qua Change Request để giữ vết review.
          </div>
        )}

        <MarkdownEditor
          value={contentMd}
          onChange={setContentMd}
          disabled={!sectionsEditable}
          rows={20}
          fileName={docCode || 'master-doc'}
          template={sectionsEditable && !isEdit ? templateFor(docType) : undefined}
        />

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
            {isEdit ? 'Lưu thay đổi' : 'Tạo tài liệu'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}
