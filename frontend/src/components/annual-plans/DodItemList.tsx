/**
 * DodItemList — CRUD Definition of Done items inline (FR-020)
 */

import React, { useState } from 'react'
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react'
import { Btn, Field, VibInput, ProgressBar } from '../ui'
import type { DodItem, DodItemCreate, DodItemUpdate } from '../../lib/types/annual-plan'

interface DodItemListProps {
  items: DodItem[]
  readOnly?: boolean
  onAdd?: (data: DodItemCreate) => Promise<void>
  onUpdate?: (itemId: string, data: DodItemUpdate) => Promise<void>
  onDelete?: (itemId: string) => Promise<void>
}

/**
 * Cột NUMERIC của Postgres từng về tới đây dưới dạng chuỗi ("40.00") — khi đó
 * acc + i.weight là NỐI CHUỖI, không phải phép cộng, và kết quả ra "NaN%".
 * Backend đã đổi Decimal → float ở biên API; num() là lớp chặn thứ hai để
 * một nguồn dữ liệu lệch kiểu không thể làm hỏng con số hiển thị.
 */
export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function computeCompletion(items: DodItem[]): number {
  if (items.length === 0) return 0
  const totalWeight = items.reduce((acc, i) => acc + num(i.weight), 0)
  if (totalWeight === 0) return 0
  const achieved = items
    .filter((i) => i.is_achieved)
    .reduce((acc, i) => acc + num(i.weight), 0)
  return (achieved / totalWeight) * 100
}

export function DodItemList({
  items,
  readOnly = false,
  onAdd,
  onUpdate,
  onDelete,
}: DodItemListProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<DodItemCreate>({ criterion: '', weight: 10 })
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const completion = computeCompletion(items)

  const handleAdd = async () => {
    if (!form.criterion.trim()) return
    setSaving(true)
    try {
      await onAdd?.(form)
      setForm({ criterion: '', weight: 10 })
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: DodItem) => {
    setTogglingId(item.id)
    try {
      await onUpdate?.(item.id, { is_achieved: !item.is_achieved })
    } finally {
      setTogglingId(null)
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
          marginBottom: 6,
        }}
      >
        <span className="txt_r_xxs" style={{ fontWeight: 700 }}>
          Definition of Done ({items.length})
        </span>
        {!readOnly && !showForm && (
          <Btn size="sm" variant="ghost" onClick={() => setShowForm(true)}>
            <Plus size={13} /> Thêm tiêu chí
          </Btn>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
            className="txt_r_xxxs text-muted"
          >
            <span>Hoàn thành (theo trọng số)</span>
            <span style={{ fontWeight: 700 }}>{completion.toFixed(0)}%</span>
          </div>
          <ProgressBar
            value={completion}
            color={
              completion >= 80
                ? 'var(--vib-success)'
                : completion >= 50
                  ? 'var(--vib-warning)'
                  : 'var(--vib-danger)'
            }
          />
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div
          className="txt_r_xxxs text-muted"
          style={{ fontStyle: 'italic', marginBottom: 8 }}
        >
          Chưa có tiêu chí DoD nào
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item) => (
          <div
            key={item.id}
            className="card card-pad-sm"
            style={{
              borderLeft: `3px solid ${item.is_achieved ? 'var(--vib-success)' : 'var(--vib-neutral-300)'}`,
              opacity: item.is_achieved ? 0.85 : 1,
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
            >
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: readOnly ? 'default' : 'pointer',
                  padding: 0,
                  color: item.is_achieved
                    ? 'var(--vib-success)'
                    : 'var(--vib-neutral-400)',
                  marginTop: 2,
                  flexShrink: 0,
                }}
                disabled={readOnly || togglingId === item.id}
                onClick={() => !readOnly && handleToggle(item)}
                aria-label={
                  item.is_achieved ? 'Đánh dấu chưa đạt' : 'Đánh dấu đạt'
                }
              >
                {item.is_achieved ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
              </button>
              <div style={{ flex: 1 }}>
                <span
                  className="txt_r_xxs"
                  style={{
                    textDecoration: item.is_achieved ? 'line-through' : 'none',
                    fontWeight: 500,
                  }}
                >
                  {item.criterion}
                </span>
                <div
                  style={{ display: 'flex', gap: 8, marginTop: 3 }}
                  className="txt_r_xxxs text-muted"
                >
                  <span>Trọng số: {item.weight}%</span>
                  {item.notes && <span>· {item.notes}</span>}
                </div>
              </div>
              {!readOnly && onDelete && (
                <Btn
                  variant="ghost"
                  size="sm"
                  loading={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
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
          <Field label="Tiêu chí" required>
            <VibInput
              value={form.criterion}
              onChange={(e) =>
                setForm((f) => ({ ...f, criterion: e.target.value }))
              }
              placeholder="Ví dụ: Đạt test coverage >= 80%"
              autoFocus
            />
          </Field>
          <Field label="Trọng số (%)">
            <VibInput
              type="number"
              min={0}
              max={100}
              value={form.weight}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  weight: parseFloat(e.target.value) || 0,
                }))
              }
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
