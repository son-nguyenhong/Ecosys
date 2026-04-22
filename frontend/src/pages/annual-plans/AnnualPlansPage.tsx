/**
 * Annual Plans Page — FR-019 to FR-022
 * Features:
 *  1. View default: năm hiện tại
 *  2. Danh sách kế hoạch (filter year / status)
 *  3. Tạo kế hoạch: Domain, Nội dung (objectives), DoD, Timeline, Related systems, Trạng thái
 *  4. Chỉnh sửa / Xóa kế hoạch
 */

import React, { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, ChevronRight, X, Edit2, Trash2 } from 'lucide-react'
import {
  Btn, Modal, Field, VibInput, VibSelect, VibTextarea,
  StatusBadge, EmptyState, Confirm,
} from '../../components/ui'
import { AnnualPlanCard } from '../../components/annual-plans/AnnualPlanCard'
import { AnnualPlanDashboard } from '../../components/annual-plans/AnnualPlanDashboard'
import { DodItemList } from '../../components/annual-plans/DodItemList'
import { ObjectiveList } from '../../components/annual-plans/ObjectiveList'
import { InitiativeTab } from '../../components/annual-plans/InitiativeTab'
import { BudgetTab } from '../../components/annual-plans/BudgetTab'
import { ResourceTab } from '../../components/annual-plans/ResourceTab'
import { KpiTab } from '../../components/annual-plans/KpiTab'
import { DependencyTab } from '../../components/annual-plans/DependencyTab'
import { RiskTab } from '../../components/annual-plans/RiskTab'
import { BizMappingTab } from '../../components/annual-plans/BizMappingTab'
import {
  getAnnualPlans,
  getAnnualPlan,
  createAnnualPlan,
  updateAnnualPlan,
  deleteAnnualPlan,
  transitionAnnualPlanStatus,
  updateDodItem,
  addDodItem,
  deleteDodItem,
} from '../../lib/api/annual-plans'
import { useStore } from '../../stores/auth'
import type {
  AnnualPlan,
  AnnualPlanDetail,
  AnnualPlanCreate,
  AnnualPlanUpdate,
  DodItemCreate,
  ObjectiveCreate,
} from '../../lib/types/annual-plan'

// ── Suggested domains for quick selection ──────────────────────────
const DOMAIN_OPTIONS = [
  'Chuyển đổi số', 'Hạ tầng & Cloud', 'An toàn thông tin', 'Data & Analytics',
  'Core Banking', 'Digital Banking', 'HR & Internal', 'Compliance & Risk', 'Khác',
]

// ── Shared form shape used by both Create and Edit ─────────────────
interface PlanFormState {
  name: string
  year: number
  description: string
  domain: string
  start_date: string
  end_date: string
  related_systems: string
  objectives: ObjectiveCreate[]
  dod_items: DodItemCreate[]
}

const EMPTY_FORM: PlanFormState = {
  name: '',
  year: new Date().getFullYear(),
  description: '',
  domain: '',
  start_date: '',
  end_date: '',
  related_systems: '',
  objectives: [{ title: '', sort_order: 1 }],
  dod_items: [{ criterion: '', weight: 100 }],
}

// ══════════════════════════════════════════════════════════════════
// PlanForm — shared between Create and Edit
// ══════════════════════════════════════════════════════════════════
function PlanForm({
  form,
  setForm,
  isEdit = false,
}: {
  form: PlanFormState
  setForm: React.Dispatch<React.SetStateAction<PlanFormState>>
  isEdit?: boolean
}) {
  const s =
    (k: keyof PlanFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const addObjective = () =>
    setForm((f) => ({
      ...f,
      objectives: [...f.objectives, { title: '', sort_order: f.objectives.length + 1 }],
    }))

  const removeObjective = (idx: number) =>
    setForm((f) => ({ ...f, objectives: f.objectives.filter((_, i) => i !== idx) }))

  const setObjTitle = (idx: number, title: string) =>
    setForm((f) => ({
      ...f,
      objectives: f.objectives.map((o, i) => (i === idx ? { ...o, title } : o)),
    }))

  const addDod = () =>
    setForm((f) => ({ ...f, dod_items: [...f.dod_items, { criterion: '', weight: 0 }] }))

  const removeDod = (idx: number) =>
    setForm((f) => ({ ...f, dod_items: f.dod_items.filter((_, i) => i !== idx) }))

  const setDodField = (idx: number, field: 'criterion' | 'weight', val: string) =>
    setForm((f) => ({
      ...f,
      dod_items: f.dod_items.map((d, i) =>
        i === idx ? { ...d, [field]: field === 'weight' ? parseInt(val) || 0 : val } : d,
      ),
    }))

  return (
    <>
      {/* ── Row 1: Tên & Năm ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
        <Field label="Tên kế hoạch" required>
          <VibInput value={form.name} onChange={s('name')} placeholder="Kế hoạch IT năm 2026" />
        </Field>
        <Field label="Năm" required>
          <VibInput
            type="number"
            value={form.year}
            onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) || f.year }))}
          />
        </Field>
      </div>

      {/* ── Row 2: Domain ── */}
      <Field label="Domain / Lĩnh vực">
        <div style={{ display: 'flex', gap: 8 }}>
          <VibInput
            value={form.domain}
            onChange={s('domain')}
            placeholder="Ví dụ: Chuyển đổi số"
            style={{ flex: 1 }}
          />
          <VibSelect
            value=""
            onChange={(e) => { if (e.target.value) setForm((f) => ({ ...f, domain: e.target.value })) }}
            style={{ width: 160 }}
          >
            <option value="">Chọn nhanh...</option>
            {DOMAIN_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </VibSelect>
        </div>
      </Field>

      {/* ── Row 3: Mô tả / Nội dung ── */}
      <Field label="Nội dung / Mô tả">
        <VibTextarea
          value={form.description}
          onChange={s('description')}
          rows={2}
          placeholder="Mô tả tổng quan kế hoạch, bối cảnh, phạm vi..."
        />
      </Field>

      {/* ── Row 4: Timeline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Ngày bắt đầu">
          <VibInput type="date" value={form.start_date} onChange={s('start_date')} />
        </Field>
        <Field label="Ngày kết thúc">
          <VibInput type="date" value={form.end_date} onChange={s('end_date')} />
        </Field>
      </div>

      {/* ── Row 5: Related systems ── */}
      <Field label="Ứng dụng / Hệ thống liên quan (cách nhau bởi dấu phẩy)">
        <VibInput
          value={form.related_systems}
          onChange={s('related_systems')}
          placeholder="CoreBanking, Mobile App, BankPlus..."
        />
        {form.related_systems.trim() && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            {form.related_systems.split(',').map((s, i) => s.trim() && (
              <span key={i} style={{ fontSize: 11, background: 'var(--vib-primary)15', color: 'var(--vib-primary)', padding: '2px 8px', borderRadius: 10 }}>
                {s.trim()}
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* ── Objectives ── */}
      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="txt_r_xxs" style={{ fontWeight: 700 }}>Mục tiêu (tối thiểu 1)</span>
          <Btn size="sm" variant="ghost" onClick={addObjective}><Plus size={13} /> Thêm</Btn>
        </div>
        {form.objectives.map((obj, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <span className="txt_r_xxxs text-muted" style={{ minWidth: 18 }}>{idx + 1}.</span>
            <VibInput
              style={{ flex: 1 }}
              value={obj.title}
              onChange={(e) => setObjTitle(idx, e.target.value)}
              placeholder={`Mục tiêu ${idx + 1}`}
            />
            {form.objectives.length > 1 && (
              <Btn variant="ghost" size="sm" onClick={() => removeObjective(idx)}><X size={12} /></Btn>
            )}
          </div>
        ))}
      </div>

      {/* ── Definition of Done ── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="txt_r_xxs" style={{ fontWeight: 700 }}>Definition of Done</span>
          <Btn size="sm" variant="ghost" onClick={addDod}><Plus size={13} /> Thêm tiêu chí</Btn>
        </div>
        {form.dod_items.length === 0 ? (
          <div className="txt_r_xxxs text-muted" style={{ fontStyle: 'italic' }}>
            Chưa có tiêu chí — có thể thêm sau
          </div>
        ) : form.dod_items.map((dod, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <VibInput
              style={{ flex: 1 }}
              value={dod.criterion}
              onChange={(e) => setDodField(idx, 'criterion', e.target.value)}
              placeholder={`Tiêu chí ${idx + 1}`}
            />
            <VibInput
              type="number"
              style={{ width: 80 }}
              value={dod.weight}
              onChange={(e) => setDodField(idx, 'weight', e.target.value)}
              placeholder="Weight"
            />
            <span className="txt_r_xxxs text-muted">%</span>
            <Btn variant="ghost" size="sm" onClick={() => removeDod(idx)}><X size={12} /></Btn>
          </div>
        ))}
        {form.dod_items.length > 0 && (
          <div className="txt_r_xxxs text-muted" style={{ marginTop: 2 }}>
            Tổng weight: <strong>{form.dod_items.reduce((s, d) => s + (d.weight || 0), 0)}</strong>
            {form.dod_items.reduce((s, d) => s + (d.weight || 0), 0) !== 100 && (
              <span style={{ color: 'var(--vib-warning)', marginLeft: 6 }}>⚠ Nên = 100%</span>
            )}
          </div>
        )}
      </div>

      {/* ── Status (edit only) ── */}
      {isEdit && (
        <div className="state-banner state-banner-info" style={{ fontSize: 12, marginTop: 8 }}>
          💡 Trạng thái thay đổi qua nút <strong>Kích hoạt / Đóng kế hoạch</strong> — không chỉnh sửa trực tiếp ở đây.
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════
// CREATE MODAL
// ══════════════════════════════════════════════════════════════════
function CreatePlanModal({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { addToast } = useStore()
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ ...EMPTY_FORM, year: new Date().getFullYear() })
  }, [open])

  const submit = async () => {
    if (!form.name.trim()) return addToast('Cần nhập tên kế hoạch', 'warn')
    const validObjectives = form.objectives.filter((o) => o.title.trim())
    if (validObjectives.length === 0) return addToast('Cần ít nhất 1 mục tiêu', 'warn')
    const validDod = form.dod_items.filter((d) => d.criterion.trim())
    const relatedSystems = form.related_systems
      .split(',').map((s) => s.trim()).filter(Boolean)

    setSaving(true)
    try {
      const payload: AnnualPlanCreate = {
        name: form.name.trim(),
        year: form.year,
        description: form.description.trim() || undefined,
        domain: form.domain.trim() || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        related_systems: relatedSystems.length ? relatedSystems : undefined,
        objectives: validObjectives,
        dod_items: validDod,
      }
      await createAnnualPlan(payload)
      addToast('Đã tạo kế hoạch năm', 'success')
      onSaved()
      onClose()
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Tạo Kế hoạch năm mới" open={open} onClose={onClose} width="760px">
      <PlanForm form={form} setForm={setForm} />
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Btn onClick={submit} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>
          Tạo kế hoạch
        </Btn>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
          Hủy
        </Btn>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════
// EDIT MODAL
// ══════════════════════════════════════════════════════════════════
function EditPlanModal({
  plan, open, onClose, onSaved,
}: { plan: AnnualPlanDetail | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { addToast } = useStore()
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (plan && open) {
      setForm({
        name: plan.name,
        year: plan.year,
        description: plan.description ?? '',
        domain: plan.domain ?? '',
        start_date: plan.start_date?.slice(0, 10) ?? '',
        end_date: plan.end_date?.slice(0, 10) ?? '',
        related_systems: (plan.related_systems ?? []).join(', '),
        objectives: plan.objectives.map((o) => ({ title: o.title, sort_order: o.sort_order })),
        dod_items: plan.dod_items.map((d) => ({ criterion: d.criterion, weight: d.weight })),
      })
    }
  }, [plan, open])

  const submit = async () => {
    if (!plan) return
    if (!form.name.trim()) return addToast('Cần nhập tên kế hoạch', 'warn')
    const relatedSystems = form.related_systems.split(',').map((s) => s.trim()).filter(Boolean)

    setSaving(true)
    try {
      const payload: AnnualPlanUpdate = {
        name: form.name.trim(),
        year: form.year,
        description: form.description.trim() || undefined,
        domain: form.domain.trim() || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        related_systems: relatedSystems.length ? relatedSystems : undefined,
      }
      await updateAnnualPlan(plan.id, payload)
      addToast('Đã cập nhật kế hoạch', 'success')
      onSaved()
      onClose()
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Chỉnh sửa: ${plan?.name ?? ''}`} open={open} onClose={onClose} width="760px">
      <PlanForm form={form} setForm={setForm} isEdit />
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Btn onClick={submit} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>
          Lưu thay đổi
        </Btn>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
          Hủy
        </Btn>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
type ViewMode = 'list' | 'detail'
type DetailTab = 'objectives' | 'dod' | 'projects' | 'initiatives' | 'biz-mapping' | 'budget' | 'resources' | 'kpis' | 'dependencies' | 'risks' | 'dashboard'

export default function AnnualPlansPage() {
  const { addToast } = useStore()
  const currentYear = new Date().getFullYear()

  const [allPlans, setAllPlans] = useState<AnnualPlan[]>([])  // unfiltered — for counts
  const [loading, setLoading] = useState(false)
  // Default = current year
  const [yearFilter, setYearFilter] = useState<number | ''>(currentYear)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingPlan, setEditingPlan] = useState<AnnualPlanDetail | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [cardMode, setCardMode] = useState<'grid' | 'list'>('list')
  const [selectedPlan, setSelectedPlan] = useState<AnnualPlanDetail | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('objectives')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

  // Always load all plans for the year (no status filter to API) — filter client-side for counts
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAnnualPlans({ year: yearFilter || undefined })
      setAllPlans(res.data)
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }, [yearFilter, addToast])

  // Client-side status filter
  const plans = statusFilter ? allPlans.filter((p) => p.status === statusFilter) : allPlans

  // Counts per status (from unfiltered set)
  const counts = {
    all:    allPlans.length,
    draft:  allPlans.filter((p) => p.status === 'draft').length,
    active: allPlans.filter((p) => p.status === 'active').length,
    closed: allPlans.filter((p) => p.status === 'closed').length,
  }

  useEffect(() => { load() }, [load])

  const openDetail = async (plan: AnnualPlan) => {
    setLoadingDetail(true)
    setViewMode('detail')
    setDetailTab('objectives')
    try {
      const res = await getAnnualPlan(plan.id)
      const d = res.data
      // Guard against legacy double-serialized related_systems (stored as string instead of array)
      if (typeof d.related_systems === 'string') {
        try { d.related_systems = JSON.parse(d.related_systems as unknown as string) } catch { d.related_systems = [] }
      }
      setSelectedPlan(d)
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
      setViewMode('list')
    } finally {
      setLoadingDetail(false)
    }
  }

  const refreshDetail = async (planId: string) => {
    const res = await getAnnualPlan(planId)
    setSelectedPlan(res.data)
  }

  const handleTransitionStatus = async (planId: string, action: 'activate' | 'close') => {
    try {
      await transitionAnnualPlanStatus(planId, { action })
      addToast(action === 'activate' ? 'Đã kích hoạt kế hoạch' : 'Đã đóng kế hoạch', 'success')
      load()
      if (selectedPlan?.id === planId) await refreshDetail(planId)
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    }
  }

  const handleDelete = async (planId: string) => {
    try {
      await deleteAnnualPlan(planId)
      addToast('Đã xóa kế hoạch', 'success')
      setConfirmDelete(null)
      if (viewMode === 'detail') setViewMode('list')
      load()
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
      setConfirmDelete(null)
    }
  }

  const openEdit = (plan: AnnualPlanDetail) => setEditingPlan(plan)

  const handleEditSaved = async () => {
    load()
    if (selectedPlan) await refreshDetail(selectedPlan.id)
  }

  // Status color helper
  const statusBg: Record<string, string> = {
    draft: 'var(--vib-neutral-100)',
    active: 'var(--vib-success)15',
    closed: 'var(--vib-neutral-200)',
  }

  return (
    <div>
      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Year selector */}
        <VibSelect
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : '')}
          style={{ width: 110 }}
        >
          <option value="">Tất cả năm</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </VibSelect>

        {/* Status filter buttons with counts */}
        {([
          { key: '',       label: 'Tất cả trạng thái', count: counts.all    },
          { key: 'draft',  label: 'Draft',              count: counts.draft  },
          { key: 'active', label: 'Active',             count: counts.active },
          { key: 'closed', label: 'Closed',             count: counts.closed },
        ] as { key: string; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', fontSize: 13, fontWeight: statusFilter === key ? 700 : 400,
              background: statusFilter === key ? 'var(--vib-primary)' : 'var(--vib-neutral-100)',
              color: statusFilter === key ? '#fff' : 'var(--vib-neutral-600)',
              transition: 'all 0.15s',
            }}
          >
            {label}
            <span style={{
              fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center',
              padding: '1px 5px', borderRadius: 10,
              background: statusFilter === key ? 'rgba(255,255,255,0.25)' : 'var(--vib-neutral-200)',
              color: statusFilter === key ? '#fff' : 'var(--vib-neutral-500)',
            }}>
              {count}
            </span>
          </button>
        ))}

        <Btn variant="ghost" size="sm" onClick={load} title="Refresh"><RefreshCw size={13} /></Btn>

        <div style={{ flex: 1 }} />

        {/* Back to list (detail mode) */}
        {viewMode === 'detail' && (
          <Btn variant="ghost" size="sm" onClick={() => setViewMode('list')}>
            ← Quay lại danh sách
          </Btn>
        )}

        {/* Create button + View toggle — grouped on the right */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Btn size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Tạo kế hoạch
            </Btn>
            <div style={{ display: 'flex', gap: 2, background: 'var(--vib-neutral-100)', padding: '3px 4px', borderRadius: 8 }}>
              {(['grid', 'list'] as const).map((mode) => (
                <button key={mode} onClick={() => setCardMode(mode)}
                  title={mode === 'grid' ? 'Dạng thẻ' : 'Dạng bảng'}
                  style={{
                    padding: '4px 10px', border: 'none', cursor: 'pointer', borderRadius: 6,
                    fontSize: 15, fontFamily: 'var(--font)',
                    background: cardMode === mode ? '#fff' : 'transparent',
                    color: cardMode === mode ? 'var(--vib-primary)' : 'var(--vib-neutral-500)',
                    boxShadow: cardMode === mode ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                  {mode === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ LIST VIEW ══════════════ */}
      {viewMode === 'list' ? (
        loading ? (
          <div className="empty-state">Đang tải...</div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon="📅"
            title={yearFilter ? `Chưa có kế hoạch năm ${yearFilter}` : 'Chưa có kế hoạch năm'}
            desc="Tạo kế hoạch đầu tiên để theo dõi danh mục dự án và mục tiêu"
            action={
              <Btn onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Tạo kế hoạch
              </Btn>
            }
          />
        ) : cardMode === 'grid' ? (
          /* ── Grid view ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--vib-neutral-200)',
                  background: statusBg[plan.status] ?? '#fff',
                  overflow: 'hidden',
                }}
              >
                <AnnualPlanCard plan={plan} onClick={() => openDetail(plan)} />

                {/* Action bar */}
                <div style={{
                  display: 'flex', gap: 4, padding: '6px 8px 8px',
                  borderTop: '1px solid var(--vib-neutral-100)',
                  background: 'rgba(255,255,255,0.7)',
                }}>
                  {plan.status === 'draft' && (
                    <Btn size="sm" onClick={() => handleTransitionStatus(plan.id, 'activate')} style={{ flex: 1, justifyContent: 'center' }}>
                      Kích hoạt
                    </Btn>
                  )}
                  {plan.status === 'active' && (
                    <Btn variant="ghost" size="sm" onClick={() => handleTransitionStatus(plan.id, 'close')} style={{ flex: 1, justifyContent: 'center' }}>
                      Đóng
                    </Btn>
                  )}
                  <Btn variant="ghost" size="sm" onClick={() => openDetail(plan)} style={{ flex: 1, justifyContent: 'center' }}>
                    Chi tiết <ChevronRight size={12} />
                  </Btn>
                  {plan.status !== 'closed' && (
                    <Btn variant="ghost" size="sm" title="Chỉnh sửa" onClick={async () => {
                      const res = await getAnnualPlan(plan.id)
                      openEdit(res.data)
                    }}>
                      <Edit2 size={13} />
                    </Btn>
                  )}
                  {plan.status === 'draft' && (
                    <Btn variant="ghost" size="sm" title="Xóa" onClick={() => setConfirmDelete(plan.id)}>
                      <Trash2 size={13} />
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── List view ── */
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--vib-neutral-50)', borderBottom: '2px solid var(--vib-neutral-200)' }}>
                  {['Năm', 'Tên kế hoạch', 'Domain', 'Trạng thái', 'DoD %', 'Dự án', 'Timeline', ''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--vib-neutral-500)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const statusColor: Record<string, string> = { draft: 'var(--vib-neutral-400)', active: 'var(--vib-success)', closed: 'var(--vib-neutral-300)' }
                  return (
                    <tr key={plan.id}
                      style={{ borderBottom: '1px solid var(--vib-neutral-100)', cursor: 'pointer', borderLeft: `3px solid ${statusColor[plan.status] ?? 'var(--vib-neutral-300)'}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--vib-neutral-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                      onClick={() => openDetail(plan)}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, fontSize: 14, color: 'var(--vib-primary)', whiteSpace: 'nowrap' }}>{plan.year}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{plan.name}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--vib-neutral-600)' }}>{plan.domain || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                          background: plan.status === 'active' ? '#dcfce7' : plan.status === 'draft' ? '#f1f5f9' : '#e5e7eb',
                          color: plan.status === 'active' ? '#16a34a' : plan.status === 'draft' ? '#475569' : '#6b7280',
                        }}>
                          {plan.status}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        {plan.dod_completion_pct != null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 60, height: 6, background: 'var(--vib-neutral-100)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${plan.dod_completion_pct}%`, height: '100%', background: plan.dod_completion_pct >= 80 ? 'var(--vib-success)' : plan.dod_completion_pct >= 40 ? 'var(--vib-warning)' : 'var(--vib-danger)', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--vib-neutral-600)' }}>{plan.dod_completion_pct}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{plan.projects_count ?? 0}</span>
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--vib-neutral-500)', whiteSpace: 'nowrap' }}>
                        {plan.start_date && plan.end_date ? `${plan.start_date.slice(0, 10)} → ${plan.end_date.slice(0, 10)}` : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        {plan.status === 'draft' && (
                          <Btn size="sm" onClick={() => handleTransitionStatus(plan.id, 'activate')}>Kích hoạt</Btn>
                        )}
                        {plan.status === 'active' && (
                          <Btn variant="ghost" size="sm" onClick={() => handleTransitionStatus(plan.id, 'close')}>Đóng</Btn>
                        )}
                        <Btn variant="ghost" size="sm" onClick={() => openDetail(plan)}><ChevronRight size={12} /></Btn>
                        {plan.status !== 'closed' && (
                          <Btn variant="ghost" size="sm" onClick={async () => { const res = await getAnnualPlan(plan.id); openEdit(res.data) }}><Edit2 size={12} /></Btn>
                        )}
                        {plan.status === 'draft' && (
                          <Btn variant="ghost" size="sm" onClick={() => setConfirmDelete(plan.id)}><Trash2 size={12} /></Btn>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* ══════════════ DETAIL VIEW ══════════════ */
        loadingDetail ? (
          <div className="empty-state">Đang tải chi tiết...</div>
        ) : selectedPlan ? (
          <div>
            {/* Detail header */}
            <div style={{
              background: '#fff',
              border: '1px solid var(--vib-neutral-200)',
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span className="txt_mono" style={{ fontSize: 13, color: 'var(--vib-primary)', fontWeight: 700 }}>
                      {selectedPlan.year}
                    </span>
                    <StatusBadge status={selectedPlan.status} />
                    {selectedPlan.domain && (
                      <span style={{ fontSize: 11, background: 'var(--vib-primary)15', color: 'var(--vib-primary)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                        {selectedPlan.domain}
                      </span>
                    )}
                  </div>
                  <h3 className="txt_s_xxs" style={{ marginBottom: 4 }}>{selectedPlan.name}</h3>
                  {selectedPlan.description && (
                    <p className="txt_r_xxxs text-muted">{selectedPlan.description}</p>
                  )}

                  {/* Timeline */}
                  {(selectedPlan.start_date || selectedPlan.end_date) && (
                    <div className="txt_r_xxxs text-muted" style={{ marginTop: 6 }}>
                      📅 {selectedPlan.start_date?.slice(0, 10) ?? '?'} → {selectedPlan.end_date?.slice(0, 10) ?? '?'}
                    </div>
                  )}

                  {/* Related systems */}
                  {selectedPlan.related_systems && selectedPlan.related_systems.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                      {selectedPlan.related_systems.map((sys, i) => (
                        <span key={i} style={{ fontSize: 11, background: 'var(--vib-neutral-100)', padding: '2px 8px', borderRadius: 10, color: 'var(--vib-neutral-700)' }}>
                          🔗 {sys}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {selectedPlan.status !== 'closed' && (
                    <Btn variant="ghost" size="sm" onClick={() => openEdit(selectedPlan)}>
                      <Edit2 size={13} /> Chỉnh sửa
                    </Btn>
                  )}
                  {selectedPlan.status === 'draft' && (
                    <>
                      <Btn size="sm" onClick={() => handleTransitionStatus(selectedPlan.id, 'activate')}>
                        Kích hoạt
                      </Btn>
                      <Btn variant="ghost" size="sm" onClick={() => setConfirmDelete(selectedPlan.id)}>
                        <Trash2 size={13} />
                      </Btn>
                    </>
                  )}
                  {selectedPlan.status === 'active' && (
                    <Btn variant="ghost" size="sm" onClick={() => handleTransitionStatus(selectedPlan.id, 'close')}>
                      Đóng kế hoạch
                    </Btn>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--vib-neutral-200)', marginBottom: 16, flexWrap: 'wrap' }}>
              {([
                { key: 'objectives',   label: `🎯 Mục tiêu (${selectedPlan.objectives.length})` },
                { key: 'dod',          label: '✅ Def. of Done' },
                { key: 'projects',     label: `📁 Dự án (${selectedPlan.projects.length})` },
                { key: 'initiatives',  label: '🗓️ Initiatives' },
                { key: 'biz-mapping',  label: '🏢 BIZ Mapping' },
                { key: 'budget',       label: '💰 Ngân sách' },
                { key: 'resources',    label: '👥 Nguồn lực' },
                { key: 'kpis',         label: '📊 KPI / OKR' },
                { key: 'dependencies', label: '🔗 Dependencies' },
                { key: 'risks',        label: '⚠️ Risk Register' },
                { key: 'dashboard',    label: '📈 Dashboard' },
              ] as { key: DetailTab; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setDetailTab(t.key)}
                  style={{
                    padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                    borderBottom: detailTab === t.key ? '2px solid var(--vib-primary)' : '2px solid transparent',
                    color: detailTab === t.key ? 'var(--vib-primary)' : 'var(--vib-neutral-600)',
                    fontWeight: detailTab === t.key ? 700 : 400, fontSize: 13, fontFamily: 'var(--font)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {detailTab === 'objectives' && (
              <ObjectiveList objectives={selectedPlan.objectives} readOnly />
            )}

            {detailTab === 'dod' && (
              <DodItemList
                items={selectedPlan.dod_items}
                readOnly={selectedPlan.status === 'closed'}
                onAdd={async (data) => {
                  await addDodItem(selectedPlan.id, data)
                  addToast('Đã thêm tiêu chí DoD', 'success')
                  await refreshDetail(selectedPlan.id)
                }}
                onUpdate={async (itemId, data) => {
                  await updateDodItem(selectedPlan.id, itemId, data)
                  await refreshDetail(selectedPlan.id)
                }}
                onDelete={async (itemId) => {
                  await deleteDodItem(selectedPlan.id, itemId)
                  addToast('Đã xóa tiêu chí', 'success')
                  await refreshDetail(selectedPlan.id)
                }}
              />
            )}

            {detailTab === 'projects' && (
              <div>
                <div className="txt_s_xxs" style={{ marginBottom: 10 }}>
                  Dự án liên kết ({selectedPlan.projects.length})
                </div>
                {selectedPlan.projects.length === 0 ? (
                  <EmptyState
                    icon="📁"
                    title="Chưa có dự án liên kết"
                    desc={
                      selectedPlan.status === 'active'
                        ? 'Gắn dự án vào kế hoạch này từ trang PPG System'
                        : 'Kế hoạch phải ở trạng thái active để gắn dự án (BR-009)'
                    }
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedPlan.projects.map((p) => (
                      <div
                        key={p.project_id}
                        className="card card-pad-sm"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div>
                          <span className="txt_r_xxs" style={{ fontWeight: 600 }}>{p.name}</span>
                          <div className="txt_r_xxxs text-muted" style={{ marginTop: 2 }}>
                            Gắn kết: {new Date(p.linked_at).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {detailTab === 'initiatives' && (
              <InitiativeTab planId={selectedPlan.id} readOnly={selectedPlan.status === 'closed'} />
            )}

            {detailTab === 'biz-mapping' && (
              <BizMappingTab planId={selectedPlan.id} readOnly={selectedPlan.status === 'closed'} />
            )}

            {detailTab === 'budget' && (
              <BudgetTab planId={selectedPlan.id} readOnly={selectedPlan.status === 'closed'} />
            )}

            {detailTab === 'resources' && (
              <ResourceTab planId={selectedPlan.id} readOnly={selectedPlan.status === 'closed'} />
            )}

            {detailTab === 'kpis' && (
              <KpiTab planId={selectedPlan.id} readOnly={selectedPlan.status === 'closed'} />
            )}

            {detailTab === 'dependencies' && (
              <DependencyTab planId={selectedPlan.id} readOnly={selectedPlan.status === 'closed'} />
            )}

            {detailTab === 'risks' && (
              <RiskTab planId={selectedPlan.id} readOnly={selectedPlan.status === 'closed'} />
            )}

            {detailTab === 'dashboard' && (
              <AnnualPlanDashboard
                planId={selectedPlan.id}
                onError={(msg) => addToast(msg, 'error')}
              />
            )}
          </div>
        ) : null
      )}

      {/* ── Modals ── */}
      <CreatePlanModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={load}
      />

      <EditPlanModal
        plan={editingPlan}
        open={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        onSaved={handleEditSaved}
      />

      <Confirm
        open={!!confirmDelete}
        message="Xóa kế hoạch năm này? Chỉ kế hoạch ở trạng thái draft mới được xóa."
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
