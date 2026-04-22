/**
 * BADocumentForm — Create/edit BA document with type selector (FR-027, FR-029)
 */

import React, { useState, useEffect } from 'react'
import { Btn, Field, VibInput, VibTextarea, VibSelect, Modal } from '../ui'
import type { BADocument, BADocumentCreate, BADocType } from '../../lib/types/workflow-doc'

const DOC_TYPES: BADocType[] = [
  'BRD',
  'BRS',
  'FSD',
  'API_SPEC',
  'ERD',
  'DATA_DICT',
  'WIREFRAME',
  'PROCESS_FLOW',
]

const DOC_TYPE_DESCRIPTIONS: Record<BADocType, string> = {
  BRD: 'Business Requirements Document',
  BRS: 'Business Requirements Specification',
  FSD: 'Functional Specification Document',
  API_SPEC: 'API Specification',
  ERD: 'Entity Relationship Diagram',
  DATA_DICT: 'Data Dictionary',
  WIREFRAME: 'UI Wireframe',
  PROCESS_FLOW: 'Process Flow Diagram',
}

interface BADocumentFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: BADocumentCreate) => Promise<void>
  editing?: BADocument
  projectId: string
  /** Available project object IDs for linking */
  availableObjectIds?: Array<{ id: string; name: string; object_type: string }>
}

export function BADocumentForm({
  open,
  onClose,
  onSave,
  editing,
  projectId,
  availableObjectIds = [],
}: BADocumentFormProps) {
  const [form, setForm] = useState<BADocumentCreate>({
    project_id: projectId,
    doc_type: 'BRD',
    title: '',
    content: '',
    milestone_id: '',
    object_ids: [],
    metadata: {},
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        project_id: editing.project_id,
        doc_type: editing.doc_type,
        title: editing.title,
        content: editing.content ?? '',
        milestone_id: editing.milestone_id ?? '',
        object_ids: editing.object_ids ?? [],
        metadata: editing.metadata ?? {},
      })
    } else {
      setForm({
        project_id: projectId,
        doc_type: 'BRD',
        title: '',
        content: '',
        milestone_id: '',
        object_ids: [],
        metadata: {},
      })
    }
  }, [editing, open, projectId])

  const s =
    (k: keyof BADocumentCreate) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const toggleObjectId = (id: string) => {
    setForm((f) => ({
      ...f,
      object_ids: f.object_ids?.includes(id)
        ? f.object_ids.filter((oid) => oid !== id)
        : [...(f.object_ids ?? []), id],
    }))
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        milestone_id: form.milestone_id || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={editing ? 'Chỉnh sửa tài liệu BA' : 'Tạo tài liệu BA'}
      open={open}
      onClose={onClose}
      width="700px"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Loại tài liệu" required>
          <VibSelect
            value={form.doc_type}
            onChange={s('doc_type')}
            disabled={!!editing}
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t} — {DOC_TYPE_DESCRIPTIONS[t]}
              </option>
            ))}
          </VibSelect>
        </Field>
        <Field label="Milestone">
          <VibInput
            value={form.milestone_id ?? ''}
            onChange={s('milestone_id')}
            placeholder="UUID milestone (tùy chọn)"
          />
        </Field>
      </div>

      <Field label="Tiêu đề" required>
        <VibInput
          value={form.title}
          onChange={s('title')}
          placeholder={`${form.doc_type} — Tên module/đối tượng`}
        />
      </Field>

      <Field label="Nội dung">
        <VibTextarea
          value={form.content ?? ''}
          onChange={s('content')}
          rows={8}
          placeholder="Nội dung tài liệu (markdown hoặc text)..."
        />
      </Field>

      {availableObjectIds.length > 0 && (
        <Field label="Gắn với đối tượng (FR-027)">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              padding: 8,
              border: '1px solid var(--vib-neutral-200)',
              borderRadius: 6,
              minHeight: 40,
            }}
          >
            {availableObjectIds.map((obj) => {
              const selected = form.object_ids?.includes(obj.id)
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => toggleObjectId(obj.id)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${selected ? 'var(--vib-primary)' : 'var(--vib-neutral-300)'}`,
                    background: selected
                      ? 'var(--vib-primary)'
                      : 'transparent',
                    color: selected ? '#fff' : 'var(--vib-neutral-600)',
                    transition: 'all 0.1s',
                  }}
                >
                  {obj.name} ({obj.object_type})
                </button>
              )
            })}
          </div>
          <div className="txt_r_xxxs text-muted" style={{ marginTop: 4 }}>
            {form.object_ids?.length ?? 0} đối tượng được chọn
          </div>
        </Field>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Btn
          onClick={handleSave}
          loading={saving}
          style={{ flex: 1, justifyContent: 'center' }}
          disabled={!form.title.trim()}
        >
          {editing ? 'Cập nhật' : 'Tạo tài liệu'}
        </Btn>
        <Btn
          variant="ghost"
          onClick={onClose}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Hủy
        </Btn>
      </div>
    </Modal>
  )
}
