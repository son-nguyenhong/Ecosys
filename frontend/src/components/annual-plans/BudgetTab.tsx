/**
 * BudgetTab — Budget Planning & Tracking (Capex / Opex)
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Btn, Field, VibInput, VibSelect, Modal, Confirm } from '../ui'
import { getBudget, createBudget, updateBudget, deleteBudget } from '../../lib/api/annual-plans'
import type { BudgetEntry, BudgetCreate, BudgetType, Quarter } from '../../lib/types/annual-plan'
import { useStore } from '../../stores/auth'

// num(): chặn trường hợp cột NUMERIC về dạng chuỗi ("1000.00") làm reduce() nối chuỗi
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}
const FMT = (n: number) => new Intl.NumberFormat('vi-VN').format(num(n))
const PCT = (actual: number, planned: number) =>
  num(planned) > 0 ? Math.round(num(actual) / num(planned) * 100) : 0

const EMPTY: BudgetCreate = { label: '', budget_type: 'opex', quarter: undefined, amount_planned: 0, amount_actual: 0, currency: 'VND' }

export function BudgetTab({ planId, readOnly }: { planId: string; readOnly?: boolean }) {
  const { addToast } = useStore()
  const [items, setItems] = useState<BudgetEntry[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BudgetEntry | null>(null)
  const [form, setForm] = useState<BudgetCreate>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'' | BudgetType>('')

  const load = useCallback(async () => {
    try { setItems(await getBudget(planId)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [planId, addToast])

  useEffect(() => { load() }, [load])

  const filtered = typeFilter ? items.filter(i => i.budget_type === typeFilter) : items

  const totalPlanned = (type?: BudgetType) => items.filter(i => !type || i.budget_type === type).reduce((s, i) => s + num(i.amount_planned), 0)
  const totalActual  = (type?: BudgetType) => items.filter(i => !type || i.budget_type === type).reduce((s, i) => s + num(i.amount_actual),  0)

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (item: BudgetEntry) => {
    setEditing(item)
    setForm({ label: item.label, budget_type: item.budget_type, quarter: item.quarter as Quarter, amount_planned: item.amount_planned, amount_actual: item.amount_actual, currency: item.currency, notes: item.notes })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.label.trim()) return addToast('Cần nhập tên mục ngân sách', 'warn')
    setSaving(true)
    try {
      if (editing) { await updateBudget(planId, editing.id, form); addToast('Đã cập nhật', 'success') }
      else { await createBudget(planId, form); addToast('Đã thêm mục ngân sách', 'success') }
      setShowModal(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const doDelete = async (id: string) => {
    try { await deleteBudget(planId, id); addToast('Đã xóa', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    setConfirmDel(null)
  }

  const s = (k: keyof BudgetCreate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      {/* Summary row */}
      <div className="kpi-row" style={{ marginBottom: 16 }}>
        {(['capex', 'opex'] as BudgetType[]).map(t => {
          const p = totalPlanned(t); const a = totalActual(t); const pct = PCT(a, p)
          return (
            <div key={t} className="card card-pad-sm" style={{ flex: 1 }}>
              <div className="txt_r_xxxs text-muted" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{t}</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{FMT(p)}</div>
              <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>Thực tế: {FMT(a)}</div>
              <div style={{ marginTop: 6, height: 4, background: 'var(--vib-neutral-100)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: pct > 100 ? 'var(--vib-danger)' : 'var(--vib-primary)', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, marginTop: 2, color: pct > 100 ? 'var(--vib-danger)' : 'var(--vib-neutral-400)' }}>{pct}% sử dụng</div>
            </div>
          )
        })}
        <div className="card card-pad-sm" style={{ flex: 1 }}>
          <div className="txt_r_xxxs text-muted">Tổng cộng</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{FMT(totalPlanned())}</div>
          <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>Thực tế: {FMT(totalActual())}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {(['', 'capex', 'opex'] as const).map(t => (
          <Btn key={t} size="sm" variant={typeFilter === t ? 'primary' : 'ghost'} onClick={() => setTypeFilter(t)}>
            {t || 'Tất cả'}
          </Btn>
        ))}
        {!readOnly && <Btn size="sm" onClick={openAdd} style={{ marginLeft: 'auto' }}><Plus size={13} /> Thêm mục</Btn>}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--vib-neutral-400)', fontSize: 13 }}>
          Chưa có mục ngân sách nào.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--vib-neutral-200)' }}>
                {['Mục', 'Loại', 'Quý', 'Kế hoạch (VND)', 'Thực tế (VND)', '%', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--vib-neutral-500)', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const pct = PCT(item.amount_actual, item.amount_planned)
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--vib-neutral-100)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 600 }}>{item.label}</td>
                    <td style={{ padding: '7px 8px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: item.budget_type === 'capex' ? '#6366f115' : '#0ea5e915', color: item.budget_type === 'capex' ? '#6366f1' : '#0ea5e9' }}>
                        {item.budget_type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '7px 8px', color: 'var(--vib-neutral-500)' }}>{item.quarter || '—'}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>{FMT(item.amount_planned)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>{FMT(item.amount_actual)}</td>
                    <td style={{ padding: '7px 8px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: pct > 100 ? 'var(--vib-danger)' : pct >= 80 ? 'var(--vib-warning)' : 'var(--vib-success)' }}>{pct}%</span>
                    </td>
                    <td style={{ padding: '7px 4px' }}>
                      {!readOnly && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          <Btn variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit2 size={11} /></Btn>
                          <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(item.id)}><Trash2 size={11} /></Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal title={editing ? 'Chỉnh sửa mục ngân sách' : 'Thêm mục ngân sách'} open={showModal} onClose={() => setShowModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Mô tả mục ngân sách" required>
            <VibInput value={form.label} onChange={s('label')} placeholder="VD: Phí cloud infrastructure Q1" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Loại">
              <VibSelect value={form.budget_type} onChange={s('budget_type')}>
                <option value="capex">CAPEX (đầu tư)</option>
                <option value="opex">OPEX (vận hành)</option>
              </VibSelect>
            </Field>
            <Field label="Quý">
              <VibSelect value={form.quarter || ''} onChange={e => setForm(f => ({ ...f, quarter: e.target.value as Quarter || undefined }))}>
                <option value="">Cả năm</option>
                {(['Q1','Q2','Q3','Q4'] as Quarter[]).map(q => <option key={q} value={q}>{q}</option>)}
              </VibSelect>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Kế hoạch (VND)">
              <VibInput type="number" value={form.amount_planned} onChange={e => setForm(f => ({ ...f, amount_planned: Number(e.target.value) }))} />
            </Field>
            <Field label="Thực tế (VND)">
              <VibInput type="number" value={form.amount_actual} onChange={e => setForm(f => ({ ...f, amount_actual: Number(e.target.value) }))} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>{editing ? 'Lưu' : 'Thêm'}</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmDel} message="Xóa mục ngân sách này?" onConfirm={() => confirmDel && doDelete(confirmDel)} onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
