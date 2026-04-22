/**
 * DependencyTab — Project Dependency Management
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, ArrowRight } from 'lucide-react'
import { Btn, Field, VibInput, VibSelect, VibTextarea, Modal, Confirm } from '../ui'
import { getDependencies, createDependency, updateDependency, deleteDependency } from '../../lib/api/annual-plans'
import type { Dependency, DependencyCreate } from '../../lib/types/annual-plan'
import { useStore } from '../../stores/auth'

const DEP_TYPES = [
  { value: 'finish_to_start', label: 'Finish-to-Start (A xong → B mới bắt đầu)' },
  { value: 'start_to_start',  label: 'Start-to-Start (A bắt đầu → B mới bắt đầu)' },
  { value: 'finish_to_finish', label: 'Finish-to-Finish (cùng kết thúc)' },
  { value: 'blocks',          label: 'Blocks (A block B)' },
  { value: 'related',         label: 'Related (liên quan)' },
]
const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  active:   { color: 'var(--vib-primary)',  label: 'Active' },
  resolved: { color: 'var(--vib-success)',  label: 'Resolved' },
  blocked:  { color: 'var(--vib-danger)',   label: '⚠ Blocked' },
}

const EMPTY: DependencyCreate = { from_label: '', to_label: '', dep_type: 'finish_to_start', status: 'active' }

export function DependencyTab({ planId, readOnly }: { planId: string; readOnly?: boolean }) {
  const { addToast } = useStore()
  const [items, setItems] = useState<Dependency[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Dependency | null>(null)
  const [form, setForm] = useState<DependencyCreate>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setItems(await getDependencies(planId)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [planId, addToast])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (item: Dependency) => {
    setEditing(item)
    setForm({ from_label: item.from_label, to_label: item.to_label, dep_type: item.dep_type, description: item.description, status: item.status })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.from_label.trim() || !form.to_label.trim()) return addToast('Cần nhập tên cả 2 project', 'warn')
    setSaving(true)
    try {
      if (editing) { await updateDependency(planId, editing.id, form); addToast('Đã cập nhật', 'success') }
      else { await createDependency(planId, form); addToast('Đã thêm dependency', 'success') }
      setShowModal(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const doDelete = async (id: string) => {
    try { await deleteDependency(planId, id); addToast('Đã xóa', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    setConfirmDel(null)
  }

  const blocked = items.filter(i => i.status === 'blocked')

  return (
    <div>
      {blocked.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--vib-danger)' }}>
          ⚠ <strong>{blocked.length} dependency</strong> đang ở trạng thái BLOCKED — cần xử lý.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="txt_r_xxxs text-muted">{items.length} dependencies</span>
        {!readOnly && <Btn size="sm" onClick={openAdd}><Plus size={13} /> Thêm Dependency</Btn>}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--vib-neutral-400)', fontSize: 13 }}>Chưa có dependency nào được định nghĩa.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => {
            const sts = STATUS_STYLE[item.status] || STATUS_STYLE.active
            const depLabel = DEP_TYPES.find(d => d.value === item.dep_type)?.label?.split(' ')[0] || item.dep_type
            return (
              <div key={item.id} className="card card-pad-sm" style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${sts.color}` }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, background: 'var(--vib-neutral-100)', padding: '3px 10px', borderRadius: 6 }}>{item.from_label}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <ArrowRight size={14} color="var(--vib-neutral-400)" />
                    <span style={{ fontSize: 9, color: 'var(--vib-neutral-400)', whiteSpace: 'nowrap' }}>{depLabel}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, background: 'var(--vib-neutral-100)', padding: '3px 10px', borderRadius: 6 }}>{item.to_label}</span>
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: `${sts.color}15`, color: sts.color, fontWeight: 600 }}>{sts.label}</span>
                </div>
                {item.description && <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>}
                {!readOnly && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    <Btn variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit2 size={11} /></Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(item.id)}><Trash2 size={11} /></Btn>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal title={editing ? 'Chỉnh sửa Dependency' : 'Thêm Project Dependency'} open={showModal} onClose={() => setShowModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end' }}>
            <Field label="Project nguồn (blocks)" required>
              <VibInput value={form.from_label} onChange={e => setForm(f => ({ ...f, from_label: e.target.value }))} placeholder="Tên project A" />
            </Field>
            <div style={{ paddingBottom: 8 }}><ArrowRight size={16} color="var(--vib-neutral-400)" /></div>
            <Field label="Project phụ thuộc" required>
              <VibInput value={form.to_label} onChange={e => setForm(f => ({ ...f, to_label: e.target.value }))} placeholder="Tên project B" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Loại phụ thuộc">
              <VibSelect value={form.dep_type} onChange={e => setForm(f => ({ ...f, dep_type: e.target.value }))}>
                {DEP_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </VibSelect>
            </Field>
            <Field label="Trạng thái">
              <VibSelect value={form.status ?? 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="blocked">Blocked</option>
              </VibSelect>
            </Field>
          </div>
          <Field label="Ghi chú">
            <VibTextarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Mô tả chi tiết về dependency..." />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>{editing ? 'Lưu' : 'Thêm'}</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmDel} message="Xóa dependency này?" onConfirm={() => confirmDel && doDelete(confirmDel)} onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
