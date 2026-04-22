/**
 * TestDocumentForm — Create/edit test document (FR-032)
 * Supports TEST_PLAN, BUG_REPORT, UAT_SIGNOFF with per-type metadata
 */

import React, { useState, useEffect } from 'react'
import { Btn, Field, VibInput, VibTextarea, VibSelect, Modal } from '../ui'
import type {
  TestDocument,
  TestDocumentCreate,
  TestDocType,
  BugSeverity,
} from '../../lib/types/workflow-doc'

const DOC_TYPE_DESCRIPTIONS: Record<TestDocType, string> = {
  TEST_PLAN: 'Test Plan — kế hoạch kiểm thử',
  BUG_REPORT: 'Bug Report — báo cáo lỗi (severity + component)',
  UAT_SIGNOFF: 'UAT Sign-off — biên bản nghiệm thu',
}

const BUG_SEVERITIES: BugSeverity[] = ['critical', 'high', 'medium', 'low']

interface TestDocumentFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: TestDocumentCreate) => Promise<void>
  editing?: TestDocument
  projectId: string
  objectId?: string
}

export function TestDocumentForm({
  open,
  onClose,
  onSave,
  editing,
  projectId,
  objectId,
}: TestDocumentFormProps) {
  const [form, setForm] = useState<TestDocumentCreate>({
    project_id: projectId,
    doc_type: 'TEST_PLAN',
    title: '',
    content: '',
    object_id: objectId,
    milestone_id: '',
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
        object_id: editing.object_id ?? objectId,
        milestone_id: editing.milestone_id ?? '',
        metadata: editing.metadata ?? {},
      })
    } else {
      setForm({
        project_id: projectId,
        doc_type: 'TEST_PLAN',
        title: '',
        content: '',
        object_id: objectId,
        milestone_id: '',
        metadata: {},
      })
    }
  }, [editing, open, projectId, objectId])

  const s =
    (k: keyof TestDocumentCreate) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const setMeta = (k: string, v: string) =>
    setForm((f) => ({ ...f, metadata: { ...f.metadata, [k]: v } }))

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        milestone_id: form.milestone_id || undefined,
        object_id: form.object_id || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const renderMetadataFields = () => {
    switch (form.doc_type) {
      case 'BUG_REPORT':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Severity" required>
              <VibSelect
                value={form.metadata?.severity ?? ''}
                onChange={(e) => setMeta('severity', e.target.value)}
              >
                <option value="">— Chọn severity —</option>
                {BUG_SEVERITIES.map((s) => (
                  <option key={s} value={s} style={{ textTransform: 'capitalize' }}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </VibSelect>
            </Field>
            <Field label="Component">
              <VibInput
                value={form.metadata?.component ?? ''}
                onChange={(e) => setMeta('component', e.target.value)}
                placeholder="Tên component/module bị lỗi"
              />
            </Field>
          </div>
        )
      case 'UAT_SIGNOFF':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Approver">
              <VibInput
                value={form.metadata?.approver ?? ''}
                onChange={(e) => setMeta('approver', e.target.value)}
                placeholder="Tên người ký nghiệm thu"
              />
            </Field>
            <Field label="Sign Date">
              <VibInput
                type="date"
                value={form.metadata?.sign_date ?? ''}
                onChange={(e) => setMeta('sign_date', e.target.value)}
              />
            </Field>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Modal
      title={editing ? 'Chỉnh sửa tài liệu Test' : 'Tạo tài liệu Test'}
      open={open}
      onClose={onClose}
      width="680px"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Loại tài liệu" required>
          <VibSelect
            value={form.doc_type}
            onChange={s('doc_type')}
            disabled={!!editing}
          >
            {(Object.keys(DOC_TYPE_DESCRIPTIONS) as TestDocType[]).map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_DESCRIPTIONS[t]}
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
          placeholder={`${form.doc_type} — Mô tả ngắn`}
        />
      </Field>

      {renderMetadataFields()}

      <Field label="Nội dung">
        <VibTextarea
          value={form.content ?? ''}
          onChange={s('content')}
          rows={6}
          placeholder={
            form.doc_type === 'BUG_REPORT'
              ? 'Mô tả lỗi: steps to reproduce, expected vs actual behavior...'
              : form.doc_type === 'UAT_SIGNOFF'
                ? 'Phạm vi nghiệm thu, kết quả UAT...'
                : 'Nội dung test plan...'
          }
        />
      </Field>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Btn
          onClick={handleSave}
          loading={saving}
          disabled={!form.title.trim()}
          style={{ flex: 1, justifyContent: 'center' }}
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
