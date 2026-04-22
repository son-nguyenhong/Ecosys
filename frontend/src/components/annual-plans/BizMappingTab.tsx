/**
 * BizMappingTab — Business Objective ↔ IT Initiative Mapping
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Link2, X } from 'lucide-react'
import { Btn, Field, VibInput, VibTextarea, Modal, Confirm } from '../ui'
import {
  getBizObjectives, createBizObjective, updateBizObjective, deleteBizObjective,
  mapInitiative, unmapInitiative, getInitiatives,
} from '../../lib/api/annual-plans'
import type { BizObjective, BizObjectiveCreate, Initiative } from '../../lib/types/annual-plan'
import { useStore } from '../../stores/auth'

const BIZ_CATEGORIES = [
  'Growth', 'Efficiency', 'Risk & Compliance', 'Customer Experience',
  'Digital Transformation', 'Infrastructure', 'Innovation', 'Khác',
]

const EMPTY: BizObjectiveCreate = { title: '', description: '', biz_owner: '', category: '' }

export function BizMappingTab({ planId, readOnly }: { planId: string; readOnly?: boolean }) {
  const { addToast } = useStore()
  const [objectives, setObjectives] = useState<BizObjective[]>([])
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BizObjective | null>(null)
  const [form, setForm] = useState<BizObjectiveCreate>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  // Track which objective's map panel is open
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [mapping, setMapping] = useState(false)

  const load = useCallback(async () => {
    try {
      const [objs, inits] = await Promise.all([
        getBizObjectives(planId),
        getInitiatives(planId),
      ])
      setObjectives(objs)
      setInitiatives(inits)
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    }
  }, [planId, addToast])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (obj: BizObjective) => {
    setEditing(obj)
    setForm({ title: obj.title, description: obj.description, biz_owner: obj.biz_owner, category: obj.category })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title?.trim()) return addToast('Cần nhập tên mục tiêu', 'warn')
    setSaving(true)
    try {
      if (editing) {
        await updateBizObjective(planId, editing.id, form)
        addToast('Đã cập nhật mục tiêu', 'success')
      } else {
        await createBizObjective(planId, form)
        addToast('Đã thêm mục tiêu', 'success')
      }
      setShowModal(false)
      load()
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async (id: string) => {
    try {
      await deleteBizObjective(planId, id)
      addToast('Đã xóa mục tiêu', 'success')
      load()
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    }
    setConfirmDel(null)
  }

  const handleMap = async (objId: string, initId: string, isLinked: boolean) => {
    setMapping(true)
    try {
      if (isLinked) {
        await unmapInitiative(planId, objId, initId)
        addToast('Đã bỏ liên kết', 'success')
      } else {
        await mapInitiative(planId, objId, initId)
        addToast('Đã liên kết initiative', 'success')
      }
      load()
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    } finally {
      setMapping(false)
    }
  }

  const totalMapped = objectives.reduce((s, o) => s + o.initiative_ids.length, 0)
  const unmappedInits = initiatives.filter(
    i => !objectives.some(o => o.initiative_ids.includes(i.id))
  )

  return (
    <div>
      {/* Summary bar */}
      <div className="kpi-row" style={{ marginBottom: 16 }}>
        <div className="card card-pad-sm" style={{ flex: 1 }}>
          <div className="txt_r_xxxs text-muted">Mục tiêu BIZ</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{objectives.length}</div>
        </div>
        <div className="card card-pad-sm" style={{ flex: 1 }}>
          <div className="txt_r_xxxs text-muted">Initiatives đã map</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--vib-success)' }}>{totalMapped}</div>
        </div>
        <div className="card card-pad-sm" style={{ flex: 1 }}>
          <div className="txt_r_xxxs text-muted">Chưa map</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: unmappedInits.length > 0 ? 'var(--vib-warning)' : 'var(--vib-neutral-400)' }}>
            {unmappedInits.length}
          </div>
        </div>
      </div>

      {/* Unmapped warning */}
      {unmappedInits.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#ea580c' }}>
          ⚠ <strong>{unmappedInits.length} initiative</strong> chưa được gắn với mục tiêu business nào:&nbsp;
          {unmappedInits.slice(0, 3).map(i => <strong key={i.id}>{i.title}</strong>).reduce<React.ReactNode[]>((acc, el, idx) => idx === 0 ? [el] : [...acc, ', ', el], [])}
          {unmappedInits.length > 3 && <span> và {unmappedInits.length - 3} khác...</span>}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="txt_r_xxxs text-muted">
          {objectives.length} business objectives · {initiatives.length} IT initiatives
        </span>
        {!readOnly && (
          <Btn size="sm" onClick={openAdd}><Plus size={13} /> Thêm Mục tiêu BIZ</Btn>
        )}
      </div>

      {objectives.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--vib-neutral-400)', fontSize: 13 }}>
          Chưa có mục tiêu business nào. Thêm mục tiêu để bắt đầu mapping với IT Initiatives.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {objectives.map(obj => {
            const mappedInits = initiatives.filter(i => obj.initiative_ids.includes(i.id))
            const isExpanded = expandedId === obj.id
            return (
              <div key={obj.id} className="card" style={{ overflow: 'hidden' }}>
                {/* Objective header */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {/* Coverage indicator */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 8, flexShrink: 0,
                    background: mappedInits.length > 0 ? 'var(--vib-success)15' : 'var(--vib-neutral-100)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: mappedInits.length > 0 ? 'var(--vib-success)' : 'var(--vib-neutral-400)' }}>
                      {mappedInits.length}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--vib-neutral-400)' }}>linked</div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{obj.title}</span>
                      {obj.category && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: 'var(--vib-primary)15', color: 'var(--vib-primary)', fontWeight: 600 }}>
                          {obj.category}
                        </span>
                      )}
                      {obj.biz_owner && (
                        <span style={{ fontSize: 10, color: 'var(--vib-neutral-500)', marginLeft: 'auto' }}>
                          👤 {obj.biz_owner}
                        </span>
                      )}
                    </div>
                    {obj.description && (
                      <p className="txt_r_xxxs text-muted" style={{ margin: '2px 0 4px' }}>{obj.description}</p>
                    )}

                    {/* Mapped initiative chips */}
                    {mappedInits.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {mappedInits.map(i => (
                          <span key={i.id} style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 10,
                            background: 'var(--vib-neutral-100)', color: 'var(--vib-neutral-700)',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            🗓️ {i.title}
                            {!readOnly && (
                              <button
                                disabled={mapping}
                                onClick={() => handleMap(obj.id, i.id, true)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', lineHeight: 1, color: 'var(--vib-neutral-400)' }}
                                title="Bỏ liên kết"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {!readOnly && (
                      <Btn
                        variant="ghost" size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : obj.id)}
                        title="Map initiatives"
                        style={{ color: isExpanded ? 'var(--vib-primary)' : undefined }}
                      >
                        <Link2 size={12} />
                      </Btn>
                    )}
                    {!readOnly && (
                      <>
                        <Btn variant="ghost" size="sm" onClick={() => openEdit(obj)}><Edit2 size={11} /></Btn>
                        <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(obj.id)}><Trash2 size={11} /></Btn>
                      </>
                    )}
                  </div>
                </div>

                {/* Expandable map panel */}
                {isExpanded && !readOnly && (
                  <div style={{ borderTop: '1px solid var(--vib-neutral-100)', padding: '10px 14px', background: 'var(--vib-neutral-50)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vib-neutral-600)', marginBottom: 8 }}>
                      Chọn IT Initiatives để liên kết:
                    </div>
                    {initiatives.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--vib-neutral-400)' }}>
                        Chưa có initiative nào. Tạo ở tab Initiatives trước.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {initiatives.map(i => {
                          const linked = obj.initiative_ids.includes(i.id)
                          return (
                            <button
                              key={i.id}
                              disabled={mapping}
                              onClick={() => handleMap(obj.id, i.id, linked)}
                              style={{
                                padding: '4px 10px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                                border: `1px solid ${linked ? 'var(--vib-success)' : 'var(--vib-neutral-200)'}`,
                                background: linked ? 'var(--vib-success)15' : '#fff',
                                color: linked ? 'var(--vib-success)' : 'var(--vib-neutral-700)',
                                fontWeight: linked ? 700 : 400,
                                transition: 'all 0.15s',
                              }}
                            >
                              {linked ? '✓ ' : '+ '}{i.title}
                              {i.quarter && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>[{i.quarter}]</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editing ? 'Chỉnh sửa Mục tiêu Business' : 'Thêm Mục tiêu Business'}
        open={showModal}
        onClose={() => setShowModal(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Tên mục tiêu" required>
            <VibInput
              value={form.title ?? ''}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="VD: Tăng trưởng doanh thu digital 30%"
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Chủ sở hữu (Biz Owner)">
              <VibInput
                value={form.biz_owner ?? ''}
                onChange={e => setForm(f => ({ ...f, biz_owner: e.target.value }))}
                placeholder="Tên / Phòng ban"
              />
            </Field>
            <Field label="Danh mục">
              <select
                value={form.category ?? ''}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--vib-neutral-200)', fontSize: 13, fontFamily: 'var(--font)', background: '#fff' }}
              >
                <option value="">—</option>
                {BIZ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Mô tả">
            <VibTextarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Mô tả chi tiết mục tiêu, KPI kỳ vọng, bối cảnh..."
            />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>
              {editing ? 'Lưu' : 'Thêm'}
            </Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>
              Hủy
            </Btn>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!confirmDel}
        message="Xóa mục tiêu business này? Các liên kết với IT initiatives cũng sẽ bị xóa."
        onConfirm={() => confirmDel && doDelete(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}
