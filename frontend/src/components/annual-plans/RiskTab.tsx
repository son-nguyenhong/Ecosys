/**
 * RiskTab — Risk Register at plan level
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Btn, Field, VibInput, VibSelect, VibTextarea, Modal, Confirm } from '../ui'
import { getRisks, createRisk, updateRisk, deleteRisk } from '../../lib/api/annual-plans'
import type { PlanRisk, RiskCreate, RiskStatus, Quarter } from '../../lib/types/annual-plan'
import { useStore } from '../../stores/auth'

const CATEGORIES = ['Technical', 'Resource', 'External', 'Compliance', 'Budget', 'Schedule', 'Khác']
const LEVELS = [
  { v: 1, label: '1 — Rất thấp' }, { v: 2, label: '2 — Thấp' }, { v: 3, label: '3 — Trung bình' },
  { v: 4, label: '4 — Cao' }, { v: 5, label: '5 — Rất cao / Nghiêm trọng' },
]
const RISK_COLOR = (score: number) =>
  score >= 20 ? 'var(--vib-danger)' : score >= 12 ? '#f59e0b' : score >= 6 ? 'var(--vib-warning)' : 'var(--vib-success)'
const RISK_LABEL = (score: number) =>
  score >= 20 ? 'Critical' : score >= 12 ? 'High' : score >= 6 ? 'Medium' : 'Low'

const STATUS_STYLE: Record<RiskStatus, { bg: string; color: string; label: string }> = {
  open:      { bg: '#ef444415', color: '#ef4444', label: '🔴 Open' },
  mitigated: { bg: '#f59e0b15', color: '#f59e0b', label: '🟡 Mitigated' },
  closed:    { bg: '#10b98115', color: '#10b981', label: '🟢 Closed' },
  occurred:  { bg: '#6366f115', color: '#6366f1', label: '⚡ Occurred' },
}

const EMPTY: RiskCreate = { title: '', probability: 3, impact: 3, status: 'open' }

export function RiskTab({ planId, readOnly }: { planId: string; readOnly?: boolean }) {
  const { addToast } = useStore()
  const [items, setItems] = useState<PlanRisk[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<PlanRisk | null>(null)
  const [form, setForm] = useState<RiskCreate>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'' | RiskStatus>('')

  const load = useCallback(async () => {
    try { setItems(await getRisks(planId)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [planId, addToast])

  useEffect(() => { load() }, [load])

  const filtered = statusFilter ? items.filter(i => i.status === statusFilter) : items
  const openRisks = items.filter(i => i.status === 'open')
  const highRisks = items.filter(i => (i.risk_score || 0) >= 12)

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (item: PlanRisk) => {
    setEditing(item)
    setForm({ title: item.title, description: item.description, category: item.category, probability: item.probability, impact: item.impact, mitigation: item.mitigation, contingency: item.contingency, owner: item.owner, quarter: item.quarter as Quarter, status: item.status })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) return addToast('Cần nhập tiêu đề risk', 'warn')
    setSaving(true)
    try {
      if (editing) { await updateRisk(planId, editing.id, form); addToast('Đã cập nhật', 'success') }
      else { await createRisk(planId, form); addToast('Đã thêm risk', 'success') }
      setShowModal(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const doDelete = async (id: string) => {
    try { await deleteRisk(planId, id); addToast('Đã xóa', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    setConfirmDel(null)
  }

  return (
    <div>
      {/* Summary */}
      {(openRisks.length > 0 || highRisks.length > 0) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {openRisks.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--vib-danger)', flex: 1 }}>
              🔴 <strong>{openRisks.length} risks</strong> đang mở cần xử lý
            </div>
          )}
          {highRisks.length > 0 && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#ea580c', flex: 1 }}>
              ⚠ <strong>{highRisks.length} risks</strong> mức độ High/Critical
            </div>
          )}
        </div>
      )}

      <div className="kpi-row" style={{ marginBottom: 16 }}>
        {(Object.entries(STATUS_STYLE) as [RiskStatus, typeof STATUS_STYLE[RiskStatus]][]).map(([s, st]) => (
          <div key={s} className="card card-pad-sm" style={{ flex: 1, cursor: 'pointer' }} onClick={() => setStatusFilter(f => f === s ? '' : s)}>
            <div style={{ fontSize: 11, color: st.color, fontWeight: 700 }}>{st.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{items.filter(i => i.status === s).length}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Btn size="sm" variant={statusFilter === '' ? 'primary' : 'ghost'} onClick={() => setStatusFilter('')}>Tất cả ({items.length})</Btn>
        {!readOnly && <Btn size="sm" onClick={openAdd}><Plus size={13} /> Thêm Risk</Btn>}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--vib-neutral-400)', fontSize: 13 }}>Chưa có risk nào.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => {
            const score = item.risk_score || (item.probability * item.impact)
            const rColor = RISK_COLOR(score)
            const sts = STATUS_STYLE[item.status] || STATUS_STYLE.open
            return (
              <div key={item.id} className="card card-pad-sm" style={{ borderLeft: `4px solid ${rColor}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {/* Risk score heat */}
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: `${rColor}20`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: rColor }}>{score}</div>
                    <div style={{ fontSize: 9, color: rColor, fontWeight: 700 }}>{RISK_LABEL(score)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</span>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: sts.bg, color: sts.color, fontWeight: 600 }}>{sts.label}</span>
                      {item.category && <span style={{ fontSize: 10, color: 'var(--vib-neutral-400)' }}>{item.category}</span>}
                      {item.owner && <span style={{ fontSize: 10, color: 'var(--vib-neutral-500)', marginLeft: 'auto' }}>👤 {item.owner}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 3 }}>
                      <span>P: {item.probability}/5</span>
                      <span>I: {item.impact}/5</span>
                      {item.quarter && <span>{item.quarter}</span>}
                    </div>
                    {item.description && <p className="txt_r_xxxs text-muted" style={{ margin: '2px 0' }}>{item.description}</p>}
                    {item.mitigation && (
                      <div style={{ fontSize: 11, color: 'var(--vib-success)', marginTop: 2 }}>🛡 {item.mitigation}</div>
                    )}
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

      <Modal title={editing ? 'Chỉnh sửa Risk' : 'Thêm Risk'} open={showModal} onClose={() => setShowModal(false)} width="640px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Tiêu đề risk" required>
            <VibInput value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="VD: Thiếu resource backend trong Q2" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <Field label="Probability (1-5)">
              <VibSelect value={form.probability} onChange={e => setForm(f => ({ ...f, probability: Number(e.target.value) }))}>
                {LEVELS.map(l => <option key={l.v} value={l.v}>{l.label}</option>)}
              </VibSelect>
            </Field>
            <Field label="Impact (1-5)">
              <VibSelect value={form.impact} onChange={e => setForm(f => ({ ...f, impact: Number(e.target.value) }))}>
                {LEVELS.map(l => <option key={l.v} value={l.v}>{l.label}</option>)}
              </VibSelect>
            </Field>
            <Field label="Category">
              <VibSelect value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value || undefined }))}>
                <option value="">—</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </VibSelect>
            </Field>
            <Field label="Trạng thái">
              <VibSelect value={form.status ?? 'open'} onChange={e => setForm(f => ({ ...f, status: e.target.value as RiskStatus }))}>
                {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </VibSelect>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Owner">
              <VibInput value={form.owner ?? ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Người chịu trách nhiệm" />
            </Field>
            <Field label="Quý">
              <VibSelect value={form.quarter || ''} onChange={e => setForm(f => ({ ...f, quarter: e.target.value as Quarter || undefined }))}>
                <option value="">Cả năm</option>
                {(['Q1','Q2','Q3','Q4'] as Quarter[]).map(q => <option key={q} value={q}>{q}</option>)}
              </VibSelect>
            </Field>
          </div>
          <Field label="Mô tả">
            <VibTextarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </Field>
          <Field label="Biện pháp giảm thiểu (Mitigation)">
            <VibTextarea value={form.mitigation ?? ''} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} rows={2} placeholder="Các bước hành động để giảm thiểu risk..." />
          </Field>
          <Field label="Kế hoạch dự phòng (Contingency)">
            <VibTextarea value={form.contingency ?? ''} onChange={e => setForm(f => ({ ...f, contingency: e.target.value }))} rows={2} placeholder="Nếu risk xảy ra, sẽ làm gì..." />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>{editing ? 'Lưu' : 'Thêm'}</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmDel} message="Xóa risk này?" onConfirm={() => confirmDel && doDelete(confirmDel)} onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
