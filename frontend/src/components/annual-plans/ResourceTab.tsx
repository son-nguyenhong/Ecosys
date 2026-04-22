/**
 * ResourceTab — Resource Allocation by team/member (%)
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Btn, Field, VibInput, VibSelect, Modal, Confirm } from '../ui'
import { getResources, createResource, updateResource, deleteResource } from '../../lib/api/annual-plans'
import type { ResourceAlloc, ResourceCreate, Quarter } from '../../lib/types/annual-plan'
import { useStore } from '../../stores/auth'

const EMPTY: ResourceCreate = { member_name: '', role: '', team: '', allocation_pct: 100, quarter: undefined }

const PCT_COLOR = (pct: number) => pct > 100 ? 'var(--vib-danger)' : pct >= 80 ? 'var(--vib-warning)' : 'var(--vib-success)'

export function ResourceTab({ planId, readOnly }: { planId: string; readOnly?: boolean }) {
  const { addToast } = useStore()
  const [items, setItems] = useState<ResourceAlloc[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ResourceAlloc | null>(null)
  const [form, setForm] = useState<ResourceCreate>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [teamFilter, setTeamFilter] = useState('')

  const load = useCallback(async () => {
    try { setItems(await getResources(planId)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [planId, addToast])

  useEffect(() => { load() }, [load])

  const teams = [...new Set(items.map(i => i.team).filter(Boolean))] as string[]
  const filtered = teamFilter ? items.filter(i => i.team === teamFilter) : items

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (item: ResourceAlloc) => {
    setEditing(item)
    setForm({ member_name: item.member_name, role: item.role ?? '', team: item.team ?? '', allocation_pct: item.allocation_pct, quarter: item.quarter as Quarter, notes: item.notes })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.member_name.trim()) return addToast('Cần nhập tên thành viên', 'warn')
    setSaving(true)
    try {
      if (editing) { await updateResource(planId, editing.id, form); addToast('Đã cập nhật', 'success') }
      else { await createResource(planId, form); addToast('Đã thêm resource', 'success') }
      setShowModal(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const doDelete = async (id: string) => {
    try { await deleteResource(planId, id); addToast('Đã xóa', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    setConfirmDel(null)
  }

  const s = (k: keyof ResourceCreate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Group by team for display
  const byTeam: Record<string, ResourceAlloc[]> = {}
  filtered.forEach(r => {
    const t = r.team || 'Chưa phân team'
    byTeam[t] = [...(byTeam[t] || []), r]
  })

  return (
    <div>
      {/* Summary */}
      <div className="kpi-row" style={{ marginBottom: 16 }}>
        <div className="card card-pad-sm" style={{ flex: 1 }}>
          <div className="txt_r_xxxs text-muted">Tổng thành viên</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{new Set(items.map(i => i.member_name)).size}</div>
        </div>
        <div className="card card-pad-sm" style={{ flex: 1 }}>
          <div className="txt_r_xxxs text-muted">Số team</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{teams.length}</div>
        </div>
        <div className="card card-pad-sm" style={{ flex: 1 }}>
          <div className="txt_r_xxxs text-muted">Allocation entries</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{items.length}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn size="sm" variant={teamFilter === '' ? 'primary' : 'ghost'} onClick={() => setTeamFilter('')}>Tất cả team</Btn>
        {teams.map(t => (
          <Btn key={t} size="sm" variant={teamFilter === t ? 'primary' : 'ghost'} onClick={() => setTeamFilter(t)}>{t}</Btn>
        ))}
        {!readOnly && <Btn size="sm" onClick={openAdd} style={{ marginLeft: 'auto' }}><Plus size={13} /> Thêm Resource</Btn>}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--vib-neutral-400)', fontSize: 13 }}>Chưa có resource allocation nào.</div>
      ) : (
        Object.entries(byTeam).map(([team, members]) => (
          <div key={team} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--vib-neutral-600)', marginBottom: 6, padding: '4px 8px', background: 'var(--vib-neutral-100)', borderRadius: 4 }}>
              👥 {team} ({members.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.map(item => (
                <div key={item.id} className="card card-pad-sm" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--vib-primary)20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--vib-primary)', flexShrink: 0 }}>
                    {item.member_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.member_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>{item.role || '—'} {item.quarter && `· ${item.quarter}`}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: PCT_COLOR(item.allocation_pct) }}>{item.allocation_pct}%</div>
                    <div style={{ height: 3, background: 'var(--vib-neutral-100)', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, item.allocation_pct)}%`, background: PCT_COLOR(item.allocation_pct), borderRadius: 2 }} />
                    </div>
                  </div>
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: 3 }}>
                      <Btn variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit2 size={11} /></Btn>
                      <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(item.id)}><Trash2 size={11} /></Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal title={editing ? 'Chỉnh sửa Resource' : 'Thêm Resource'} open={showModal} onClose={() => setShowModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Tên thành viên" required>
              <VibInput value={form.member_name} onChange={s('member_name')} placeholder="Nguyễn Văn A" />
            </Field>
            <Field label="Team">
              <VibInput value={form.team ?? ''} onChange={s('team')} placeholder="Dev Team / QA Team..." />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Vai trò">
              <VibInput value={form.role ?? ''} onChange={s('role')} placeholder="Dev / BA / QA..." />
            </Field>
            <Field label="Allocation (%)">
              <VibInput type="number" value={form.allocation_pct} onChange={e => setForm(f => ({ ...f, allocation_pct: Number(e.target.value) }))} min={0} max={100} />
            </Field>
            <Field label="Quý">
              <VibSelect value={form.quarter || ''} onChange={e => setForm(f => ({ ...f, quarter: e.target.value as Quarter || undefined }))}>
                <option value="">Cả năm</option>
                {(['Q1','Q2','Q3','Q4'] as Quarter[]).map(q => <option key={q} value={q}>{q}</option>)}
              </VibSelect>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>{editing ? 'Lưu' : 'Thêm'}</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmDel} message="Xóa allocation này?" onConfirm={() => confirmDel && doDelete(confirmDel)} onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
