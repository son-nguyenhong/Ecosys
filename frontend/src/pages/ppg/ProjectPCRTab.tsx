/**
 * ProjectPCRTab — PCR management scoped to one project.
 * PCRs created in the global Requests module (same project_id) appear here automatically.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  pcrApi,
  type ProjectChangeRequest,
  type PCRCreate,
  type PCRChangeType,
  type PCRStatus,
  type Priority,
  type RequestHistoryEntry,
} from '../../api/requests'
import { useStore } from '../../stores/auth'
import { FilterBar, applyTextFilter, applyDateFilter } from '../../components/FilterBar'
import { CommentModal } from '../../components/CommentModal'
import { RequestHistoryTimeline } from '../../components/RequestHistoryTimeline'
import { RequestAttachments } from '../../components/RequestAttachments'
import { FileQueueSection } from '../../components/FileQueueSection'
import { createTodo, type TodoType } from '../../api/todos'
import { UserSelect } from '../../components/UserSelect'

function addWorkingDays(days: number, from = new Date()): string {
  const d = new Date(from)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

// ── Label maps ────────────────────────────────────────────────────
const CHANGE_TYPE_LABELS: Record<PCRChangeType, string> = {
  scope: 'Phạm vi', timeline: 'Timeline', resource: 'Nhân lực',
  budget: 'Ngân sách', technical: 'Kỹ thuật', process: 'Quy trình', other: 'Khác',
}
const STATUS_LABELS: Record<PCRStatus, string> = {
  submitted:    'Khởi tạo',
  reviewing:    'Đang review',
  approved:     'Pending',
  rejected:     'Từ chối',
  implementing: 'Đang triển khai',
  implemented:  'Đã triển khai',
  cancelled:    'Hủy',
}
const STATUS_CSS: Record<PCRStatus, string> = {
  submitted:    'bg-gray-100 text-gray-600',
  reviewing:    'bg-yellow-50 text-yellow-700',
  approved:     'bg-blue-50 text-blue-700',
  rejected:     'bg-red-50 text-red-600',
  implementing: 'bg-orange-50 text-orange-700',
  implemented:  'bg-green-50 text-green-700',
  cancelled:    'bg-gray-100 text-gray-400',
}
const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Khẩn cấp', high: 'Cao', medium: 'Trung bình', low: 'Thấp',
}
const PRIORITY_CSS: Record<Priority, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-gray-100 text-gray-500',
}
const PRIORITY_BORDER: Record<Priority, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#9ca3af',
}

// Flow for progress bar (main path, excluding terminal states)
const FLOW: PCRStatus[] = ['submitted', 'reviewing', 'approved', 'implementing', 'implemented']

// Status tabs — each tab may match multiple DB values
interface StatusTab { label: string; values: PCRStatus[] | null }
const STATUS_TABS: StatusTab[] = [
  { label: 'Tất cả',           values: null },
  { label: 'Khởi tạo',         values: ['submitted'] },
  { label: 'Đang review',      values: ['reviewing'] },
  { label: 'Đang triển khai',  values: ['implementing'] },
  { label: 'Đã triển khai',    values: ['implemented'] },
  { label: 'Pending',          values: ['approved'] },
  { label: 'Từ chối',          values: ['rejected'] },
  { label: 'Hủy',              values: ['cancelled'] },
]

// ── Error banner ──────────────────────────────────────────────────
function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 8,
      background: '#fee2e2', border: '1px solid #fca5a5',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#b91c1c',
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 16 }}>✕</button>
    </div>
  )
}

// ── PCR flow progress bar ─────────────────────────────────────────
function FlowBar({ status }: { status: PCRStatus }) {
  // For submitted, treat same position as draft in progress bar
  const idx = FLOW.indexOf(status)
  const isTerminal = status === 'rejected' || status === 'cancelled'
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 14px' }}>
      {FLOW.map((s, i) => (
        <React.Fragment key={s}>
          <span style={{
            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
            background: !isTerminal && i <= idx ? 'var(--vib-primary)' : 'var(--vib-neutral-200)',
            color:      !isTerminal && i <= idx ? '#fff' : 'var(--vib-neutral-500)',
          }}>
            {STATUS_LABELS[s]}
          </span>
          {i < FLOW.length - 1 && (
            <span style={{ color: 'var(--vib-neutral-400)', fontSize: 11 }}>›</span>
          )}
        </React.Fragment>
      ))}
      {isTerminal && (
        <span style={{
          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
          background: '#fee2e2', color: '#b91c1c',
        }}>
          {STATUS_LABELS[status]}
        </span>
      )}
    </div>
  )
}

// ── PCR Form (create / edit) ──────────────────────────────────────
function blankForm(projectId: string, username: string | null): PCRCreate {
  return {
    project_id:   projectId,
    title:        '',
    change_type:  'process',
    priority:     'medium',
    requested_by: username ?? '',
    target_date:  addWorkingDays(14),
  }
}

function PCRFormModal({
  projectId, projectLabel,
  initial, mode,
  onClose, onSaved,
}: {
  projectId: string
  projectLabel: string
  initial?: ProjectChangeRequest | null
  mode: 'create' | 'edit'
  onClose: () => void
  onSaved: (pcr: ProjectChangeRequest) => void
}) {
  const { username } = useStore()
  const [form, setForm] = useState<PCRCreate>(() =>
    initial
      ? {
          project_id:    projectId,
          title:         initial.title,
          description:   initial.description,
          change_type:   initial.change_type,
          priority:      initial.priority,
          impact_scope:  initial.impact_scope,
          impact_effort: initial.impact_effort,
          requested_by:  initial.requested_by,
          assigned_to:   initial.assigned_to,
          target_date:   initial.target_date,
          notes:         initial.notes,
        }
      : blankForm(projectId, username),
  )
  const [saving, setSaving]           = useState(false)
  const [error,  setError]            = useState<string | null>(null)
  const [queuedFiles, setQueuedFiles] = useState<File[]>([])

  const set = <K extends keyof PCRCreate>(k: K, v: PCRCreate[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.requested_by.trim()) {
      setError('Vui lòng điền Tiêu đề và Người yêu cầu'); return
    }
    setSaving(true); setError(null)
    try {
      let result: ProjectChangeRequest
      if (mode === 'edit' && initial) {
        await pcrApi.update(initial.id, form)
        result = await pcrApi.get(initial.id)
      } else {
        result = await pcrApi.create(form)
        for (const file of queuedFiles) {
          try { await pcrApi.uploadAttachment(result.id, file) } catch (_) {}
        }
      }
      onSaved(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14,
          width: 640, maxWidth: '96vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--vib-neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            {mode === 'edit' ? 'Chỉnh sửa PCR' : 'Tạo Project Change Request'}
          </span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Project — read-only */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dự án</label>
            <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-600">
              {projectLabel}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Tiêu đề <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Mô tả ngắn thay đổi cần thực hiện"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mô tả chi tiết</label>
            <textarea
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm resize-none"
              placeholder="Bối cảnh, lý do, phạm vi thay đổi..."
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Row: change_type + priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Loại thay đổi</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.change_type}
                onChange={e => set('change_type', e.target.value as PCRChangeType)}
              >
                {(Object.entries(CHANGE_TYPE_LABELS) as [PCRChangeType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mức ưu tiên</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.priority}
                onChange={e => set('priority', e.target.value as Priority)}
              >
                {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: requested_by + assigned_to */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Người yêu cầu <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <UserSelect
                value={form.requested_by}
                onChange={val => set('requested_by', val)}
                placeholder="Chọn nhân sự..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Người phụ trách</label>
              <UserSelect
                value={form.assigned_to ?? ''}
                onChange={val => set('assigned_to', val)}
                placeholder="Chọn nhân sự..."
              />
            </div>
          </div>

          {/* Row: target_date + impact_scope */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ngày mục tiêu</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.target_date ?? ''}
                onChange={e => set('target_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phạm vi ảnh hưởng</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Ví dụ: Frontend + API"
                value={form.impact_scope ?? ''}
                onChange={e => set('impact_scope', e.target.value)}
              />
            </div>
          </div>

          {/* impact_effort */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ước tính effort</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Ví dụ: 3 ngày / 1 sprint"
              value={form.impact_effort ?? ''}
              onChange={e => set('impact_effort', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ghi chú</label>
            <textarea
              rows={2}
              className="w-full border rounded px-3 py-2 text-sm resize-none"
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {/* File attachments — only shown in create mode */}
          {mode === 'create' && (
            <FileQueueSection
              files={queuedFiles}
              onAdd={fl => fl && setQueuedFiles(prev => [...prev, ...Array.from(fl)])}
              onRemove={i => setQueuedFiles(prev => prev.filter((_, idx) => idx !== i))}
            />
          )}

          {error && (
            <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>
              {error}
            </div>
          )}

          {/* Footer inside form */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || !form.title.trim() || !form.requested_by.trim()}
              className="px-4 py-2 text-sm bg-vib-blue text-white rounded hover:bg-blue-900 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Tạo PCR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── CreateTaskModal (inline, reuses project context) ─────────────
const TODO_TYPE_LABELS: Record<TodoType, string> = {
  feature: 'Tính năng', bug: 'Bug', review: 'Review',
  meeting: 'Họp', documentation: 'Tài liệu', deployment: 'Triển khai', other: 'Khác',
}

function CreateTaskModal({
  pcr, projectId, projectLabel, onClose,
}: {
  pcr: ProjectChangeRequest
  projectId: string
  projectLabel: string
  onClose: () => void
}) {
  const [title,    setTitle]    = useState(`[${pcr.request_code}] ${pcr.title}`)
  const [desc,     setDesc]     = useState('')
  const [taskType, setTaskType] = useState<TodoType>('other')
  const [priority, setPriority] = useState<Priority>(pcr.priority)
  const [assignee, setAssignee] = useState(pcr.assigned_to ?? '')
  const [dueDate,  setDueDate]  = useState(pcr.target_date ?? '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề'); return }
    setSaving(true); setError(null)
    try {
      await createTodo({
        title:       title.trim(),
        description: desc || undefined,
        project_id:  projectId,
        task_type:   taskType,
        priority,
        assignee_id: assignee.trim() || undefined,
        due_date:    dueDate || undefined,
        ref_type:    'PCR',
        ref_id:      pcr.id,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 500, maxWidth: '96vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--vib-neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Tạo Task từ PCR</div>
            <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)', marginTop: 2 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{pcr.request_code}</span>
              {' · '}{projectLabel}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        {/* Ref badge */}
        <div style={{ margin: '12px 20px 0', padding: '6px 10px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1d4ed8', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{pcr.request_code}</span>
          <span style={{ color: '#60a5fa' }}>·</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pcr.title}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: '#bfdbfe', color: '#1e40af' }}>PCR</span>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tiêu đề <span style={{ color: '#ef4444' }}>*</span></label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mô tả</label>
            <textarea rows={2} className="w-full border rounded px-3 py-2 text-sm resize-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Chi tiết công việc..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Loại task</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={taskType} onChange={e => setTaskType(e.target.value as TodoType)}>
                {(Object.entries(TODO_TYPE_LABELS) as [TodoType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ưu tiên</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                <option value="critical">Khẩn cấp</option>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Người thực hiện</label>
              <UserSelect value={assignee} onChange={setAssignee} placeholder="Chọn nhân sự..." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Due date</label>
              <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {error && <div style={{ padding: '7px 10px', background: '#fee2e2', borderRadius: 6, fontSize: 13, color: '#b91c1c' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={saving || !title.trim()} className="px-4 py-1.5 text-sm bg-vib-blue text-white rounded hover:bg-blue-900 disabled:opacity-50">
              {saving ? 'Đang tạo...' : 'Tạo Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ProjectPCRTab — main export
// ══════════════════════════════════════════════════════════════════
export default function ProjectPCRTab({
  projectId,
  projectLabel,
}: {
  projectId: string
  projectLabel: string
}) {
  const [items, setItems]           = useState<ProjectChangeRequest[]>([])
  const [loading, setLoading]       = useState(true)
  const [pageError, setPageError]   = useState<string | null>(null)
  const [activeTabIdx, setActiveTabIdx] = useState(0)
  const [filterPriority, setFP]     = useState('')
  const [filterType, setFT]         = useState('')
  const [filterText, setFText]      = useState('')
  const [filterFrom, setFFrom]      = useState('')
  const [filterTo,   setFTo]        = useState('')
  const [selected, setSelected]     = useState<ProjectChangeRequest | null>(null)
  const [editStatus, setEditStatus] = useState<PCRStatus>('submitted')
  const [statusSaving, setStatusSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [history, setHistory]       = useState<RequestHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [commentFor, setCommentFor] = useState<PCRStatus | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setPageError(null)
    try {
      const data = await pcrApi.list({
        project_id:  projectId,
        priority:    filterPriority || undefined,
        change_type: filterType     || undefined,
      })
      setItems(data)
    } catch (err) {
      setPageError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [projectId, filterPriority, filterType])

  useEffect(() => { load() }, [load])

  // Keep selected in sync after reload
  useEffect(() => {
    if (selected) {
      const fresh = items.find(i => i.id === selected.id)
      if (fresh) setSelected(fresh)
    }
  }, [items, selected?.id])

  // Load history when a PCR is selected
  useEffect(() => {
    if (!selected) { setHistory([]); return }
    setHistoryLoading(true)
    pcrApi.history(selected.id)
      .then(h => setHistory(h))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [selected?.id])

  const tabFilter = STATUS_TABS[activeTabIdx]
  const byTab = tabFilter.values
    ? items.filter(p => tabFilter.values!.includes(p.status))
    : items

  const visible = applyDateFilter(
    applyTextFilter(byTab, filterText, ['title', 'request_code', 'requested_by'] as (keyof ProjectChangeRequest)[]),
    'created_at', filterFrom, filterTo,
  )

  function clearFilters() {
    setFText(''); setFFrom(''); setFTo('')
    setFP(''); setFT('')
  }

  const REQUIRES_COMMENT: PCRStatus[] = ['rejected', 'cancelled']

  function handleStatusSaveClick() {
    if (!selected || editStatus === selected.status) return
    if (REQUIRES_COMMENT.includes(editStatus)) {
      setCommentFor(editStatus)
    } else {
      doStatusSave(editStatus, undefined)
    }
  }

  async function doStatusSave(status: PCRStatus, comment: string | undefined) {
    if (!selected) return
    const id = selected.id
    setStatusSaving(true)
    setCommentFor(null)
    try {
      await pcrApi.update(id, { status, ...(comment ? { comment } : {}) })
      const [, fresh, hist] = await Promise.all([
        load(),
        pcrApi.get(id),
        pcrApi.history(id),
      ])
      setSelected(fresh)
      setEditStatus(fresh.status)
      setHistory(hist)
    } catch (err) {
      setPageError((err as Error).message)
    } finally {
      setStatusSaving(false)
    }
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>

      {/* Info banner — "input từ Module Request" */}
      <div style={{
        padding: '8px 14px', borderRadius: 8,
        background: '#eff6ff', border: '1px solid #bfdbfe',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#1d4ed8',
      }}>
        <span style={{ fontSize: 15 }}>ℹ️</span>
        <span style={{ flex: 1 }}>
          PCR tạo từ <strong>Module Requests</strong> với cùng dự án này sẽ tự động hiển thị ở đây.
          Bạn cũng có thể tạo PCR trực tiếp tại tab này.
        </span>
        <a
          href="/requests"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1d4ed8', fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none' }}
        >
          Module Requests →
        </a>
      </div>

      {/* Error banner */}
      {pageError && <ErrorBanner message={pageError} onClose={() => setPageError(null)} />}

      {/* Status tabs */}
      <div style={{
        display: 'flex', gap: 0, overflowX: 'auto',
        borderBottom: '2px solid var(--vib-neutral-200)',
        flexShrink: 0,
      }}>
        {STATUS_TABS.map((tab, idx) => {
          const count = tab.values
            ? items.filter(p => tab.values!.includes(p.status)).length
            : items.length
          const active = activeTabIdx === idx
          return (
            <button
              key={idx}
              onClick={() => { setActiveTabIdx(idx); setSelected(null) }}
              style={{
                padding: '7px 14px', border: 'none', background: 'transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font)',
                fontSize: 13, fontWeight: active ? 700 : 400,
                color: active ? 'var(--vib-primary)' : 'var(--vib-neutral-600)',
                borderBottom: active ? '2px solid var(--vib-primary)' : '2px solid transparent',
                marginBottom: -2, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                  background: active ? 'var(--vib-primary)' : 'var(--vib-neutral-200)',
                  color: active ? '#fff' : 'var(--vib-neutral-600)',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filter bar (no status select — handled by tabs above) */}
      <FilterBar
        text={{ value: filterText, onChange: setFText, placeholder: 'Tìm code / tiêu đề / người yêu cầu...' }}
        selects={[
          { key: 'priority', value: filterPriority, onChange: setFP, placeholder: 'Tất cả ưu tiên',
            options: (Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, l]) => ({ value: v, label: l })) },
          { key: 'type', value: filterType, onChange: setFT, placeholder: 'Tất cả loại',
            options: (Object.entries(CHANGE_TYPE_LABELS) as [PCRChangeType, string][]).map(([v, l]) => ({ value: v, label: l })) },
        ]}
        dateFrom={{ value: filterFrom, onChange: setFFrom, label: 'Từ ngày' }}
        dateTo={{ value: filterTo, onChange: setFTo }}
        onClear={clearFilters}
        right={
          <button
            type="button"
            className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium"
            onClick={() => setShowCreate(true)}
          >
            + Tạo PCR
          </button>
        }
      />

      {/* Two-panel body */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>

        {/* List */}
        <div style={{ flex: 2, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading && (
            <div style={{ padding: 20, color: 'var(--vib-neutral-400)', fontSize: 13 }}>Đang tải...</div>
          )}
          {!loading && visible.length === 0 && (
            <div style={{
              padding: 32, textAlign: 'center',
              color: 'var(--vib-neutral-400)', fontSize: 13,
              background: '#fff', borderRadius: 12, border: '1px solid var(--vib-neutral-200)',
            }}>
              {items.length === 0 ? 'Chưa có Change Request nào cho dự án này' : 'Không tìm thấy kết quả'}
            </div>
          )}
          {visible.map(pcr => (
            <div
              key={pcr.id}
              onClick={() => { setSelected(pcr); setEditStatus(pcr.status) }}
              style={{
                background: '#fff', borderRadius: 10,
                border: `1px solid ${selected?.id === pcr.id ? 'var(--vib-primary)' : 'var(--vib-neutral-200)'}`,
                borderLeft: `4px solid ${PRIORITY_BORDER[pcr.priority]}`,
                padding: '10px 14px', cursor: 'pointer',
                boxShadow: selected?.id === pcr.id ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none',
                transition: 'all 0.1s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--vib-neutral-500)' }}>
                  {pcr.request_code}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CSS[pcr.status]}`}>
                  {STATUS_LABELS[pcr.status]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CSS[pcr.priority]}`}>
                  {PRIORITY_LABELS[pcr.priority]}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                  {CHANGE_TYPE_LABELS[pcr.change_type]}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--vib-neutral-800)', marginBottom: 2 }}>
                {pcr.title}
              </div>
              {pcr.description && (
                <div style={{
                  fontSize: 12, color: 'var(--vib-neutral-500)',
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {pcr.description}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--vib-neutral-400)' }}>
                <span>Yêu cầu: <span style={{ color: 'var(--vib-neutral-600)' }}>{pcr.requested_by}</span></span>
                {pcr.assigned_to && (
                  <span>Phụ trách: <span style={{ color: 'var(--vib-neutral-600)' }}>{pcr.assigned_to}</span></span>
                )}
                {pcr.target_date && (
                  <span>Mục tiêu: <span style={{ color: 'var(--vib-neutral-600)' }}>{pcr.target_date}</span></span>
                )}
                <span style={{ marginLeft: 'auto' }}>
                  {new Date(pcr.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: 3, minWidth: 0, overflowY: 'auto' }}>
            <div style={{
              background: '#fff', borderRadius: 12,
              border: '1px solid var(--vib-neutral-200)',
              padding: 18, position: 'sticky', top: 0,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--vib-neutral-500)' }}>
                    {selected.request_code}
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
                    {selected.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vib-neutral-400)', fontSize: 18, padding: 2 }}
                >
                  ✕
                </button>
              </div>

              {/* Flow bar + Tạo Task */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FlowBar status={selected.status} />
                <button
                  type="button"
                  className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium"
                  style={{ marginLeft: 'auto', flexShrink: 0 }}
                  onClick={() => setShowCreateTask(true)}
                >
                  + Tạo Task
                </button>
              </div>

              {/* Meta grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 2 }}>Loại thay đổi</div>
                  <div style={{ fontSize: 13 }}>{CHANGE_TYPE_LABELS[selected.change_type]}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 2 }}>Ưu tiên</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CSS[selected.priority]}`}>
                    {PRIORITY_LABELS[selected.priority]}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 2 }}>Người yêu cầu</div>
                  <div style={{ fontSize: 13 }}>{selected.requested_by}</div>
                </div>
                {selected.assigned_to && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 2 }}>Phụ trách</div>
                    <div style={{ fontSize: 13 }}>{selected.assigned_to}</div>
                  </div>
                )}
                {selected.target_date && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 2 }}>Ngày mục tiêu</div>
                    <div style={{ fontSize: 13 }}>{selected.target_date}</div>
                  </div>
                )}
                {selected.approved_by && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 2 }}>Người duyệt</div>
                    <div style={{ fontSize: 13 }}>{selected.approved_by}</div>
                  </div>
                )}
              </div>

              {selected.description && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 4 }}>Mô tả</div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--vib-neutral-700)', lineHeight: 1.5 }}>
                    {selected.description}
                  </div>
                </div>
              )}

              {selected.impact_scope && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 2 }}>Phạm vi ảnh hưởng</div>
                  <div style={{ fontSize: 13 }}>{selected.impact_scope}</div>
                </div>
              )}
              {selected.impact_effort && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 2 }}>Ước tính effort</div>
                  <div style={{ fontSize: 13 }}>{selected.impact_effort}</div>
                </div>
              )}
              {selected.notes && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 2 }}>Ghi chú</div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
                </div>
              )}

              {/* Status update */}
              <div style={{
                borderTop: '1px solid var(--vib-neutral-200)',
                paddingTop: 12, marginTop: 4,
              }}>
                <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 6 }}>Cập nhật trạng thái</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="input input-sm"
                    style={{ flex: 1 }}
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as PCRStatus)}
                  >
                    {(Object.entries(STATUS_LABELS) as [PCRStatus, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="bg-vib-blue text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                    onClick={handleStatusSaveClick}
                    disabled={statusSaving || editStatus === selected.status}
                  >
                    {statusSaving ? '...' : 'Lưu'}
                  </button>
                </div>
              </div>

              {/* Attachments */}
              <RequestAttachments
                refId={selected.id}
                listFn={pcrApi.listAttachments}
                uploadFn={pcrApi.uploadAttachment}
              />

              {/* History timeline */}
              <RequestHistoryTimeline
                entries={history}
                statusLabels={STATUS_LABELS}
                loading={historyLoading}
              />
            </div>
          </div>
        )}

        {/* Comment modal for terminal status actions */}
        {commentFor && selected && (
          <CommentModal
            title={commentFor === 'rejected' ? 'Từ chối PCR' : 'Hủy PCR'}
            subtitle={`Vui lòng nhập lý do ${commentFor === 'rejected' ? 'từ chối' : 'hủy'} PCR "${selected.title}".`}
            confirmLabel={commentFor === 'rejected' ? 'Từ chối' : 'Hủy PCR'}
            onClose={() => setCommentFor(null)}
            onConfirm={comment => doStatusSave(commentFor, comment)}
          />
        )}

        {/* Create task modal */}
        {showCreateTask && selected && (
          <CreateTaskModal
            pcr={selected}
            projectId={projectId}
            projectLabel={projectLabel}
            onClose={() => setShowCreateTask(false)}
          />
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <PCRFormModal
          projectId={projectId}
          projectLabel={projectLabel}
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load() }}
        />
      )}

    </div>
  )
}
