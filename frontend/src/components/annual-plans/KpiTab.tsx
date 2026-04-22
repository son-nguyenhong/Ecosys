/**
 * KpiTab — KPI / OKR Tracking (Target vs Actual)
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Btn, Field, VibInput, VibSelect, VibTextarea, Modal, Confirm } from '../ui'
import { getKpis, createKpi, updateKpi, deleteKpi } from '../../lib/api/annual-plans'
import type { PlanKpi, KpiCreate, KpiStatus, Quarter } from '../../lib/types/annual-plan'
import { useStore } from '../../stores/auth'

const STATUS_STYLE: Record<KpiStatus, { bg: string; color: string; label: string }> = {
  on_track:  { bg: '#10b98115', color: '#10b981', label: '✅ On Track' },
  at_risk:   { bg: '#f59e0b15', color: '#f59e0b', label: '⚠️ At Risk' },
  off_track: { bg: '#ef444415', color: '#ef4444', label: '❌ Off Track' },
  achieved:  { bg: '#6366f115', color: '#6366f1', label: '🏆 Achieved' },
}

const PCT_PROGRESS = (actual?: number, target?: number) => {
  if (!target || target === 0) return 0
  return Math.min(100, Math.round(((actual || 0) / target) * 100))
}

const EMPTY: KpiCreate = { metric_name: '', unit: '', target_value: undefined, actual_value: undefined, status: 'on_track' }

export function KpiTab({ planId, readOnly }: { planId: string; readOnly?: boolean }) {
  const { addToast } = useStore()
  const [items, setItems] = useState<PlanKpi[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<PlanKpi | null>(null)
  const [form, setForm] = useState<KpiCreate>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'' | KpiStatus>('')

  const load = useCallback(async () => {
    try { setItems(await getKpis(planId)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [planId, addToast])

  useEffect(() => { load() }, [load])

  const filtered = statusFilter ? items.filter(i => i.status === statusFilter) : items

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (item: PlanKpi) => {
    setEditing(item)
    setForm({ metric_name: item.metric_name, unit: item.unit ?? '', target_value: item.target_value, actual_value: item.actual_value, quarter: item.quarter as Quarter, status: item.status, notes: item.notes })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.metric_name.trim()) return addToast('Cần nhập tên metric', 'warn')
    setSaving(true)
    try {
      if (editing) { await updateKpi(planId, editing.id, form); addToast('Đã cập nhật', 'success') }
      else { await createKpi(planId, form); addToast('Đã thêm KPI', 'success') }
      setShowModal(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const doDelete = async (id: string) => {
    try { await deleteKpi(planId, id); addToast('Đã xóa', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    setConfirmDel(null)
  }

  // Summary counts by status
  const counts = Object.keys(STATUS_STYLE).reduce((acc, k) => {
    acc[k as KpiStatus] = items.filter(i => i.status === k).length
    return acc
  }, {} as Record<KpiStatus, number>)

  return (
    <div>
      {/* Status summary */}
      <div className="kpi-row" style={{ marginBottom: 16 }}>
        {(Object.entries(STATUS_STYLE) as [KpiStatus, typeof STATUS_STYLE[KpiStatus]][]).map(([status, style]) => (
          <div key={status} className="card card-pad-sm" style={{ flex: 1, cursor: 'pointer' }} onClick={() => setStatusFilter(s => s === status ? '' : status)}>
            <div style={{ fontSize: 11, color: style.color, fontWeight: 700 }}>{style.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{counts[status]}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <Btn size="sm" variant={statusFilter === '' ? 'primary' : 'ghost'} onClick={() => setStatusFilter('')}>Tất cả ({items.length})</Btn>
        {!readOnly && <Btn size="sm" onClick={openAdd} style={{ marginLeft: 'auto' }}><Plus size={13} /> Thêm KPI</Btn>}
      </div>

      {/* KPI cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--vib-neutral-400)', fontSize: 13 }}>Chưa có KPI nào.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => {
            const pct = PCT_PROGRESS(item.actual_value, item.target_value)
            const style = STATUS_STYLE[item.status] || STATUS_STYLE.on_track
            return (
              <div key={item.id} className="card card-pad-sm" style={{ borderLeft: `3px solid ${style.color}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{item.metric_name}</span>
                      {item.unit && <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>[{item.unit}]</span>}
                      {item.quarter && <span style={{ fontSize: 11, color: 'var(--vib-primary)' }}>{item.quarter}</span>}
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: style.bg, color: style.color, fontWeight: 600, marginLeft: 'auto' }}>{style.label}</span>
                    </div>

                    {/* Progress bar */}
                    {item.target_value !== undefined && item.target_value !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 6, background: 'var(--vib-neutral-100)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: style.color, borderRadius: 3, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, minWidth: 120, color: 'var(--vib-neutral-600)' }}>
                          {item.actual_value ?? '?'} / {item.target_value} {item.unit} ({pct}%)
                        </span>
                      </div>
                    )}

                    {item.notes && <p className="txt_r_xxxs text-muted" style={{ marginTop: 4 }}>{item.notes}</p>}
                  </div>
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: 3 }}>
                      <Btn variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit2 size={11} /></Btn>
                      <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(item.id)}><Trash2 size={11} /></Btn>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal title={editing ? 'Chỉnh sửa KPI' : 'Thêm KPI / OKR'} open={showModal} onClose={() => setShowModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Tên metric / KPI" required>
            <VibInput value={form.metric_name} onChange={e => setForm(f => ({ ...f, metric_name: e.target.value }))} placeholder="VD: Tỷ lệ hoàn thành dự án đúng hạn" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <Field label="Đơn vị">
              <VibInput value={form.unit ?? ''} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="%, VND, count..." />
            </Field>
            <Field label="Mục tiêu">
              <VibInput type="number" value={form.target_value ?? ''} onChange={e => setForm(f => ({ ...f, target_value: e.target.value ? Number(e.target.value) : undefined }))} />
            </Field>
            <Field label="Thực tế">
              <VibInput type="number" value={form.actual_value ?? ''} onChange={e => setForm(f => ({ ...f, actual_value: e.target.value ? Number(e.target.value) : undefined }))} />
            </Field>
            <Field label="Quý">
              <VibSelect value={form.quarter || ''} onChange={e => setForm(f => ({ ...f, quarter: e.target.value as Quarter || undefined }))}>
                <option value="">Cả năm</option>
                {(['Q1','Q2','Q3','Q4'] as Quarter[]).map(q => <option key={q} value={q}>{q}</option>)}
              </VibSelect>
            </Field>
          </div>
          <Field label="Trạng thái">
            <VibSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as KpiStatus }))}>
              {(Object.entries(STATUS_STYLE) as [KpiStatus, typeof STATUS_STYLE[KpiStatus]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </VibSelect>
          </Field>
          <Field label="Ghi chú">
            <VibTextarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>{editing ? 'Lưu' : 'Thêm'}</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmDel} message="Xóa KPI này?" onConfirm={() => confirmDel && doDelete(confirmDel)} onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
