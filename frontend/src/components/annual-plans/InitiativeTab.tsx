/**
 * InitiativeTab — Planning Hierarchy
 * Year → Quarter → Initiative → Project
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Btn, Field, VibInput, VibSelect, VibTextarea, Modal, Confirm } from '../ui'
import {
  getInitiatives, createInitiative, updateInitiative, deleteInitiative,
} from '../../lib/api/annual-plans'
import type { Initiative, InitiativeCreate, Quarter } from '../../lib/types/annual-plan'
import { useStore } from '../../stores/auth'

const QUARTERS: (Quarter | '')[] = ['', 'Q1', 'Q2', 'Q3', 'Q4']
const PRIORITY_LABEL = ['', 'Thấp', 'Trung bình thấp', 'Trung bình', 'Cao', 'Quan trọng']
const STATUS_COLOR: Record<string, string> = {
  planned: 'var(--vib-neutral-400)', in_progress: 'var(--vib-primary)',
  completed: 'var(--vib-success)', cancelled: 'var(--vib-danger)',
}
const QUARTER_COLOR: Record<string, string> = {
  Q1: '#6366f1', Q2: '#0ea5e9', Q3: '#f59e0b', Q4: '#10b981',
}

const EMPTY: InitiativeCreate = { title: '', description: '', quarter: undefined, priority: 3, status: 'planned', sort_order: 0 }

export function InitiativeTab({ planId, readOnly }: { planId: string; readOnly?: boolean }) {
  const { addToast } = useStore()
  const [items, setItems] = useState<Initiative[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Initiative | null>(null)
  const [form, setForm] = useState<InitiativeCreate>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    try { setItems(await getInitiatives(planId)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [planId, addToast])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY, sort_order: items.length + 1 }); setShowModal(true) }
  const openEdit = (item: Initiative) => {
    setEditing(item)
    setForm({ title: item.title, description: item.description ?? '', quarter: item.quarter as Quarter, priority: item.priority, status: item.status, sort_order: item.sort_order })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) return addToast('Cần nhập tên initiative', 'warn')
    setSaving(true)
    try {
      if (editing) {
        await updateInitiative(planId, editing.id, form)
        addToast('Đã cập nhật', 'success')
      } else {
        await createInitiative(planId, form)
        addToast('Đã thêm initiative', 'success')
      }
      setShowModal(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const doDelete = async (id: string) => {
    try { await deleteInitiative(planId, id); addToast('Đã xóa', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    setConfirmDel(null)
  }

  // Group by quarter
  const byQuarter: Record<string, Initiative[]> = { Q1: [], Q2: [], Q3: [], Q4: [], 'Cả năm': [] }
  items.forEach(i => {
    const k = i.quarter || 'Cả năm'
    byQuarter[k] = [...(byQuarter[k] || []), i]
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 className="txt_s_xxs" style={{ margin: 0 }}>Planning Hierarchy</h3>
          <p className="txt_r_xxxs text-muted">Phân cấp kế hoạch: Năm → Quý → Initiative → Project</p>
        </div>
        {!readOnly && <Btn size="sm" onClick={openAdd}><Plus size={13} /> Thêm Initiative</Btn>}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--vib-neutral-400)', fontSize: 13 }}>
          Chưa có initiative. {!readOnly && <button style={{ color: 'var(--vib-primary)', border: 'none', background: 'none', cursor: 'pointer' }} onClick={openAdd}>Thêm ngay →</button>}
        </div>
      ) : (
        Object.entries(byQuarter).map(([q, qItems]) => qItems.length === 0 ? null : (
          <div key={q} style={{ marginBottom: 16 }}>
            {/* Quarter header */}
            <div
              onClick={() => setCollapsed(c => ({ ...c, [q]: !c[q] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px', background: `${QUARTER_COLOR[q] || 'var(--vib-neutral-500)'}15`, borderRadius: 6, marginBottom: 6 }}>
              {collapsed[q] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span style={{ fontWeight: 700, fontSize: 13, color: QUARTER_COLOR[q] || 'var(--vib-neutral-700)' }}>{q}</span>
              <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>{qItems.length} initiatives</span>
            </div>

            {!collapsed[q] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                {qItems.map(item => (
                  <div key={item.id} className="card card-pad-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, borderLeft: `3px solid ${STATUS_COLOR[item.status] || 'var(--vib-neutral-300)'}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: `${STATUS_COLOR[item.status]}20`, color: STATUS_COLOR[item.status], fontWeight: 600 }}>{item.status}</span>
                        <span style={{ fontSize: 10, color: 'var(--vib-neutral-400)' }}>P{item.priority} · {PRIORITY_LABEL[item.priority]}</span>
                      </div>
                      {item.description && <p className="txt_r_xxxs text-muted" style={{ margin: 0 }}>{item.description}</p>}
                    </div>
                    {!readOnly && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Btn variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit2 size={11} /></Btn>
                        <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(item.id)}><Trash2 size={11} /></Btn>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      <Modal title={editing ? 'Chỉnh sửa Initiative' : 'Thêm Initiative'} open={showModal} onClose={() => setShowModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Tên initiative" required>
            <VibInput value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Tên initiative" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Quý">
              <VibSelect value={form.quarter || ''} onChange={e => setForm(f => ({ ...f, quarter: e.target.value as Quarter || undefined }))}>
                {QUARTERS.map(q => <option key={q} value={q}>{q || 'Cả năm'}</option>)}
              </VibSelect>
            </Field>
            <Field label="Ưu tiên (1-5)">
              <VibSelect value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}>
                {[1,2,3,4,5].map(p => <option key={p} value={p}>{p} — {PRIORITY_LABEL[p]}</option>)}
              </VibSelect>
            </Field>
            <Field label="Trạng thái">
              <VibSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Initiative['status'] }))}>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </VibSelect>
            </Field>
          </div>
          <Field label="Mô tả">
            <VibTextarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </Field>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Btn onClick={save} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>{editing ? 'Lưu' : 'Thêm'}</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmDel} message="Xóa initiative này?" onConfirm={() => confirmDel && doDelete(confirmDel)} onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
