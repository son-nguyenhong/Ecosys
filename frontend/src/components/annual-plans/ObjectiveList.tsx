/**
 * ObjectiveList — CRUD objectives inline for an annual plan (FR-019)
 */

import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Btn, Field, VibInput, VibTextarea } from '../ui'
import type { Objective, ObjectiveCreate } from '../../lib/types/annual-plan'

interface ObjectiveListProps {
  objectives: Objective[]
  planId?: string
  readOnly?: boolean
  /** Called when a new objective should be saved */
  onAdd?: (data: ObjectiveCreate) => Promise<void>
  onDelete?: (objectiveId: string) => Promise<void>
}

export function ObjectiveList({
  objectives,
  readOnly = false,
  onAdd,
  onDelete,
}: ObjectiveListProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ObjectiveCreate>({
    title: '',
    description: '',
    sort_order: objectives.length + 1,
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onAdd?.(form)
      setForm({ title: '', description: '', sort_order: objectives.length + 2 })
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDelete?.(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span className="txt_r_xxs" style={{ fontWeight: 700 }}>
          Mục tiêu ({objectives.length})
        </span>
        {!readOnly && !showForm && (
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => setShowForm(true)}
          >
            <Plus size={13} /> Thêm
          </Btn>
        )}
      </div>

      {objectives.length === 0 && !showForm && (
        <div
          className="txt_r_xxxs text-muted"
          style={{ fontStyle: 'italic', marginBottom: 8 }}
        >
          Chưa có mục tiêu nào
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {objectives.map((obj, idx) => (
          <div
            key={obj.id}
            className="card card-pad-sm"
            style={{ borderLeft: '3px solid var(--vib-primary)' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1 }}>
                <span
                  className="txt_r_xxxs text-muted"
                  style={{ marginRight: 6 }}
                >
                  {String(idx + 1).padStart(2, '0')}.
                </span>
                <span className="txt_r_xxs" style={{ fontWeight: 600 }}>
                  {obj.title}
                </span>
                {obj.description && (
                  <div
                    className="txt_r_xxxs text-muted"
                    style={{ marginTop: 3 }}
                  >
                    {obj.description}
                  </div>
                )}
              </div>
              {!readOnly && onDelete && (
                <Btn
                  variant="ghost"
                  size="sm"
                  loading={deletingId === obj.id}
                  onClick={() => handleDelete(obj.id)}
                >
                  <Trash2 size={12} />
                </Btn>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && !readOnly && (
        <div
          className="card card-pad-sm"
          style={{ marginTop: 8, borderLeft: '3px dashed var(--vib-primary)' }}
        >
          <Field label="Tiêu đề mục tiêu" required>
            <VibInput
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Ví dụ: Triển khai 5 ứng dụng mới"
              autoFocus
            />
          </Field>
          <Field label="Mô tả">
            <VibTextarea
              value={form.description ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              placeholder="Chi tiết thêm về mục tiêu"
            />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Btn onClick={handleAdd} loading={saving} size="sm">
              Lưu
            </Btn>
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Hủy
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}
