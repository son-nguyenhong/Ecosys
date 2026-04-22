import React, { useEffect, useState, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import {
  pcrApi, srApi,
  ProjectChangeRequest, ServiceRequest,
  PCRCreate, SRCreate,
  PCRChangeType, PCRStatus, SRRequestType, SRStatus, Priority,
  RequestHistoryEntry,
} from '../../api/requests'
import { getProjects, Project } from '../../api/ppg'
import { getProducts, CatalogProduct } from '../../api/catalog'
import { FilterBar, applyTextFilter, applyDateFilter } from '../../components/FilterBar'
import { CommentModal } from '../../components/CommentModal'
import { RequestHistoryTimeline } from '../../components/RequestHistoryTimeline'
import { RequestAttachments } from '../../components/RequestAttachments'
import { FileQueueSection } from '../../components/FileQueueSection'
import { createTodo, TodoType } from '../../api/todos'
import { UserSelect } from '../../components/UserSelect'

// ── ComboSelect — searchable LOV dropdown ────────────────────────────────────

interface ComboOption { value: string; label: string; meta?: string }

function ComboSelect({
  options, value, onChange, placeholder = 'Tìm kiếm...', loading = false, disabled = false,
}: {
  options: ComboOption[]
  value: string
  onChange: (val: string, label: string) => void
  placeholder?: string
  loading?: boolean
  disabled?: boolean
}) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const ref                 = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find(o => o.value === value)?.label ?? ''

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.meta ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="input"
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? 'var(--vib-neutral-100)' : undefined,
          minHeight: 36, padding: '4px 10px',
        }}
        onClick={() => { if (!disabled) setOpen(o => !o) }}
      >
        {value ? (
          <span style={{ flex: 1, fontSize: 13 }}>{selectedLabel}</span>
        ) : (
          <span style={{ flex: 1, fontSize: 13, color: 'var(--vib-neutral-400)' }}>
            {loading ? 'Đang tải...' : placeholder}
          </span>
        )}
        <span style={{ color: 'var(--vib-neutral-400)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          background: '#fff', border: '1px solid var(--vib-neutral-300)',
          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxHeight: 260, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--vib-neutral-200)' }}>
            <input
              autoFocus
              className="input input-sm"
              style={{ width: '100%' }}
              placeholder="Tìm..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', color: 'var(--vib-neutral-400)', fontSize: 13 }}>
                Không tìm thấy kết quả
              </div>
            )}
            {filtered.map(opt => (
              <div
                key={opt.value}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  background: opt.value === value ? 'var(--vib-primary-50, #e6f0fa)' : undefined,
                  borderBottom: '1px solid var(--vib-neutral-100)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--vib-neutral-50, #f5f5f5)' }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    opt.value === value ? 'var(--vib-primary-50, #e6f0fa)' : ''
                }}
                onClick={() => { onChange(opt.value, opt.label); setOpen(false); setQuery('') }}
              >
                <div style={{ fontWeight: opt.value === value ? 600 : 400 }}>{opt.label}</div>
                {opt.meta && (
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginTop: 1 }}>{opt.meta}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PCR_CHANGE_TYPE_LABELS: Record<PCRChangeType, string> = {
  scope: 'Phạm vi', timeline: 'Timeline', resource: 'Nhân lực',
  budget: 'Ngân sách', technical: 'Kỹ thuật', process: 'Quy trình', other: 'Khác',
}

const PCR_STATUS_LABELS: Record<PCRStatus, string> = {
  submitted:    'Khởi tạo',
  reviewing:    'Đang review',
  approved:     'Pending',
  rejected:     'Từ chối',
  implementing: 'Đang triển khai',
  implemented:  'Đã triển khai',
  cancelled:    'Hủy',
}

const PCR_STATUS_VARIANTS: Record<PCRStatus, string> = {
  submitted:    'neutral',
  reviewing:    'warning',
  approved:     'info',
  rejected:     'danger',
  implementing: 'warning',
  implemented:  'success',
  cancelled:    'neutral',
}

interface PcrStatusTab { label: string; values: PCRStatus[] | null }
const PCR_STATUS_TABS: PcrStatusTab[] = [
  { label: 'Tất cả',           values: null },
  { label: 'Khởi tạo',         values: ['submitted'] },
  { label: 'Đang review',      values: ['reviewing'] },
  { label: 'Đang triển khai',  values: ['implementing'] },
  { label: 'Đã triển khai',    values: ['implemented'] },
  { label: 'Pending',          values: ['approved'] },
  { label: 'Từ chối',          values: ['rejected'] },
  { label: 'Hủy',              values: ['cancelled'] },
]

const SR_TYPE_LABELS: Record<SRRequestType, string> = {
  bug_fix: 'Bug Fix', enhancement: 'Cải tiến', support: 'Hỗ trợ',
  incident: 'Sự cố', access_request: 'Cấp quyền', data_request: 'Dữ liệu', other: 'Khác',
}

const SR_STATUS_LABELS: Record<SRStatus, string> = {
  submitted:   'Khởi tạo',
  reviewing:   'Đang review',
  approved:    'Pending',
  in_progress: 'Đang triển khai',
  resolved:    'Đã triển khai',
  rejected:    'Từ chối',
  cancelled:   'Hủy',
}

const SR_STATUS_VARIANTS: Record<SRStatus, string> = {
  submitted:   'neutral',
  reviewing:   'warning',
  approved:    'info',
  in_progress: 'warning',
  resolved:    'success',
  rejected:    'danger',
  cancelled:   'neutral',
}

interface SrStatusTab { label: string; values: SRStatus[] | null }
const SR_STATUS_TABS: SrStatusTab[] = [
  { label: 'Tất cả',          values: null },
  { label: 'Khởi tạo',        values: ['submitted'] },
  { label: 'Đang review',     values: ['reviewing'] },
  { label: 'Đang triển khai', values: ['in_progress'] },
  { label: 'Đã triển khai',   values: ['resolved'] },
  { label: 'Pending',         values: ['approved'] },
  { label: 'Từ chối',         values: ['rejected'] },
  { label: 'Hủy',             values: ['cancelled'] },
]

const PRIORITY_VARIANTS: Record<Priority, string> = {
  critical: 'danger', high: 'warning', medium: 'info', low: 'neutral',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Khẩn cấp', high: 'Cao', medium: 'Trung bình', low: 'Thấp',
}

// ── PCR Flow indicator ────────────────────────────────────────────────────────

const PCR_FLOW: PCRStatus[] = ['submitted', 'reviewing', 'approved', 'implementing', 'implemented']

function PCRFlowBar({ current }: { current: PCRStatus }) {
  const idx = PCR_FLOW.indexOf(current)
  const isTerminal = current === 'rejected' || current === 'cancelled'
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', margin: '8px 0', flexWrap: 'wrap' }}>
      {PCR_FLOW.map((s, i) => (
        <React.Fragment key={s}>
          <span style={{
            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
            background: !isTerminal && i <= idx ? 'var(--vib-primary)' : 'var(--vib-neutral-200)',
            color: !isTerminal && i <= idx ? '#fff' : 'var(--vib-neutral-500)',
          }}>{PCR_STATUS_LABELS[s]}</span>
          {i < PCR_FLOW.length - 1 && <span style={{ color: 'var(--vib-neutral-400)', fontSize: 10 }}>›</span>}
        </React.Fragment>
      ))}
      {isTerminal && (
        <span style={{
          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
          background: '#fee2e2', color: '#b91c1c',
        }}>{PCR_STATUS_LABELS[current]}</span>
      )}
    </div>
  )
}

const SR_FLOW: SRStatus[] = ['submitted', 'reviewing', 'approved', 'in_progress', 'resolved']

function SRFlowBar({ current }: { current: SRStatus }) {
  const idx = SR_FLOW.indexOf(current)
  const isTerminal = current === 'rejected' || current === 'cancelled'
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', margin: '8px 0', flexWrap: 'wrap' }}>
      {SR_FLOW.map((s, i) => (
        <React.Fragment key={s}>
          <span style={{
            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
            background: !isTerminal && i <= idx ? 'var(--vib-primary)' : 'var(--vib-neutral-200)',
            color: !isTerminal && i <= idx ? '#fff' : 'var(--vib-neutral-500)',
          }}>{SR_STATUS_LABELS[s]}</span>
          {i < SR_FLOW.length - 1 && <span style={{ color: 'var(--vib-neutral-400)', fontSize: 10 }}>›</span>}
        </React.Fragment>
      ))}
      {isTerminal && (
        <span style={{
          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
          background: '#fee2e2', color: '#b91c1c',
        }}>{SR_STATUS_LABELS[current]}</span>
      )}
    </div>
  )
}

// ── CreateTaskFromRequestModal ────────────────────────────────────────────────

const TODO_TYPE_LABELS: Record<TodoType, string> = {
  feature: 'Tính năng', bug: 'Bug', review: 'Review',
  meeting: 'Họp', documentation: 'Tài liệu', deployment: 'Triển khai', other: 'Khác',
}

interface CreateTaskProps {
  refType:             'PCR' | 'SR'
  refCode:             string
  refId:               string
  refTitle:            string
  defaultProjectId?:   string
  defaultProjectName?: string
  defaultPriority:     Priority
  defaultAssignee?:    string
  defaultDueDate?:     string
  onClose:             () => void
  onCreated:           () => void
}

function CreateTaskFromRequestModal({
  refType, refCode, refId, refTitle,
  defaultProjectId, defaultProjectName,
  defaultPriority, defaultAssignee, defaultDueDate,
  onClose, onCreated,
}: CreateTaskProps) {
  const [title,     setTitle]     = useState(`[${refCode}] ${refTitle}`)
  const [desc,      setDesc]      = useState('')
  const [taskType,  setTaskType]  = useState<TodoType>('other')
  const [priority,  setPriority]  = useState<Priority>(defaultPriority)
  const [assignee,  setAssignee]  = useState(defaultAssignee ?? '')
  const [dueDate,   setDueDate]   = useState(defaultDueDate ?? '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề'); return }
    setSaving(true); setError(null)
    try {
      await createTodo({
        title:       title.trim(),
        description: desc || undefined,
        project_id:  defaultProjectId || undefined,
        task_type:   taskType,
        priority,
        assignee_id: assignee.trim() || undefined,
        due_date:    dueDate || undefined,
        ref_type:    refType,
        ref_id:      refId,
      })
      onCreated()
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
        zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '75vw', maxWidth: '75vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--vib-neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Tạo Task từ {refType}</div>
            <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)', marginTop: 2 }}>
              Ref: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{refCode}</span>
              {defaultProjectName && (
                <span> · {defaultProjectName}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Ref badge */}
          <div style={{
            padding: '6px 10px', borderRadius: 6, background: '#eff6ff',
            border: '1px solid #bfdbfe', fontSize: 12, color: '#1d4ed8',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{refCode}</span>
            <span style={{ color: '#60a5fa' }}>·</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {refTitle}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
              background: '#bfdbfe', color: '#1e40af',
            }}>{refType}</span>
          </div>

          {/* Title */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>
              Tiêu đề <span style={{ color: 'var(--vib-danger)' }}>*</span>
            </label>
            <input
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tiêu đề task"
            />
          </div>

          {/* Description */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>Mô tả</label>
            <textarea
              rows={3}
              className="input"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none' }}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Chi tiết công việc cần thực hiện..."
            />
          </div>

          {/* Row: type + priority + assignee + due_date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>Loại task</label>
              <select className="input" value={taskType} onChange={e => setTaskType(e.target.value as TodoType)}>
                {(Object.entries(TODO_TYPE_LABELS) as [TodoType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>Ưu tiên</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                <option value="critical">Khẩn cấp</option>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>Người thực hiện</label>
              <UserSelect
                value={assignee}
                onChange={setAssignee}
                placeholder="Chọn nhân sự..."
              />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>Due date</label>
              <input
                type="date"
                className="input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '7px 10px', background: '#fee2e2', borderRadius: 6, fontSize: 13, color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !title.trim()}>
              {saving ? 'Đang tạo...' : 'Tạo Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── PCR Tab ───────────────────────────────────────────────────────────────────

function PCRTab() {
  const [items, setItems]           = useState<ProjectChangeRequest[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [activeTabIdx, setActiveTabIdx] = useState(0)
  const [filterProject, setFProj]   = useState('')
  const [filterText, setFText]      = useState('')
  const [filterFrom, setFFrom]      = useState('')
  const [filterTo, setFTo]          = useState('')
  const [projects, setPCRProjects]  = useState<Project[]>([])
  const [selected, setSelected]     = useState<ProjectChangeRequest | null>(null)
  const [hoveredId, setPCRHovered]  = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving]         = useState(false)
  const [pcrHistory, setPcrHistory] = useState<RequestHistoryEntry[]>([])
  const [pcrHistoryLoading, setPcrHistoryLoading] = useState(false)
  const [pcrCommentFor, setPcrCommentFor] = useState<PCRStatus | null>(null)
  const [showPcrCreateTask, setShowPcrCreateTask] = useState(false)
  const pcrDialogRef                = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    getProjects({ all_years: true }).then(setPCRProjects).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await pcrApi.list({ project_id: filterProject || undefined })
      setItems(data)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }, [filterProject])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selected) { setPcrHistory([]); return }
    setPcrHistoryLoading(true)
    pcrApi.history(selected.id)
      .then(h => setPcrHistory(h))
      .catch(() => setPcrHistory([]))
      .finally(() => setPcrHistoryLoading(false))
  }, [selected?.id])

  const tabFilter = PCR_STATUS_TABS[activeTabIdx]
  const byTab = tabFilter.values
    ? items.filter(p => tabFilter.values!.includes(p.status))
    : items

  const displayed = (() => {
    let rows = byTab
    if (filterText) rows = applyTextFilter(rows, filterText, ['request_code', 'title', 'requested_by', 'project_name', 'assigned_to'])
    rows = applyDateFilter(rows, 'created_at', filterFrom, filterTo)
    return rows
  })()

  const PCR_REQUIRES_COMMENT: PCRStatus[] = ['rejected', 'cancelled']

  function handleStatusUpdateClick() {
    if (!selected || !editStatus || editStatus === selected.status) return
    const newStatus = editStatus as PCRStatus
    if (PCR_REQUIRES_COMMENT.includes(newStatus)) {
      setPcrCommentFor(newStatus)
    } else {
      doPcrStatusSave(newStatus, undefined)
    }
  }

  async function doPcrStatusSave(status: PCRStatus, comment: string | undefined) {
    if (!selected) return
    const id = selected.id
    setSaving(true); setPcrCommentFor(null)
    try {
      await pcrApi.update(id, { status, ...(comment ? { comment } : {}) })
      const [, fresh, hist] = await Promise.all([
        load(),
        pcrApi.get(id),
        pcrApi.history(id),
      ])
      setSelected(fresh)
      setEditStatus(fresh.status)
      setPcrHistory(hist)
    } catch (e) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá PCR này?')) return
    await pcrApi.delete(id)
    await load()
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* List panel */}
      <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Status tabs */}
        <div style={{
          display: 'flex', gap: 0, overflowX: 'auto',
          borderBottom: '2px solid var(--vib-neutral-200)',
          marginBottom: 10, flexShrink: 0,
        }}>
          {PCR_STATUS_TABS.map((tab, idx) => {
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

        <FilterBar
          text={{ value: filterText, onChange: setFText, placeholder: 'Tìm code / tiêu đề / người yêu cầu...' }}
          selects={[
            {
              key: 'project', value: filterProject, onChange: setFProj,
              placeholder: 'Tất cả dự án',
              options: projects.map(p => ({ value: p.id, label: p.name })),
            },
          ]}
          dateFrom={{ value: filterFrom, onChange: setFFrom, label: 'Tạo từ' }}
          dateTo={{ value: filterTo, onChange: setFTo }}
          onClear={() => { setFProj(''); setFText(''); setFFrom(''); setFTo('') }}
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-sm"
                style={{ border: '1px solid var(--vib-neutral-300)', background: '#fff', color: 'var(--vib-neutral-700)' }}
                onClick={() => pcrApi.export({ project_id: filterProject || undefined }).catch(e => alert(e.message))}
              >
                ↓ Excel
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => pcrDialogRef.current?.showModal()}>
                + Tạo PCR
              </button>
            </div>
          }
        />

        {error && <div className="alert alert-danger" style={{ margin: '8px 0' }}>{error}</div>}
        {loading && <div className="txt-secondary" style={{ padding: 16 }}>Đang tải...</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {displayed.map(pcr => {
            const isSelected = selected?.id === pcr.id
            const isHovered  = hoveredId === pcr.id
            return (
              <div
                key={pcr.id}
                onMouseEnter={() => setPCRHovered(pcr.id)}
                onMouseLeave={() => setPCRHovered(null)}
                onClick={() => { setSelected(pcr); setEditStatus(pcr.status) }}
                style={{
                  cursor: 'pointer',
                  background: isSelected
                    ? 'var(--vib-primary-50, #eff6ff)'
                    : isHovered ? 'var(--vib-neutral-50, #f9fafb)' : '#fff',
                  borderRadius: 8,
                  border: isSelected
                    ? '1.5px solid var(--vib-primary)'
                    : '1px solid var(--vib-neutral-200)',
                  borderLeft: `4px solid var(--vib-${PRIORITY_VARIANTS[pcr.priority]})`,
                  padding: '10px 14px',
                  boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.1)' : isHovered ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                  transition: 'background 0.1s, box-shadow 0.1s, border-color 0.1s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span className="txt_mono" style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>
                        {pcr.request_code}
                      </span>
                      <span className={`badge badge-${PCR_STATUS_VARIANTS[pcr.status]}`}>
                        {PCR_STATUS_LABELS[pcr.status]}
                      </span>
                      <span className={`badge badge-${PRIORITY_VARIANTS[pcr.priority]}`}>
                        {PRIORITY_LABELS[pcr.priority]}
                      </span>
                      <span className="badge badge-neutral">{PCR_CHANGE_TYPE_LABELS[pcr.change_type]}</span>
                      {isSelected && (
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--vib-primary)', fontWeight: 600 }}>
                          ● Đang xem
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{pcr.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>
                      {pcr.project_name || pcr.project_id} · {pcr.requested_by}
                      {pcr.target_date && (
                        <span style={{ marginLeft: 8, color: 'var(--vib-neutral-400)' }}>
                          · Mục tiêu: {pcr.target_date}
                        </span>
                      )}
                    </div>
                    {/* Hover preview — description excerpt */}
                    {isHovered && !isSelected && pcr.description && (
                      <div style={{
                        marginTop: 6, paddingTop: 6,
                        borderTop: '1px dashed var(--vib-neutral-200)',
                        fontSize: 12, color: 'var(--vib-neutral-500)', lineHeight: 1.5,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {pcr.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {!loading && displayed.length === 0 && (
            <div className="empty-state">
              {items.length === 0 ? 'Chưa có Project Change Request nào' : 'Không có kết quả khớp với bộ lọc'}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ flex: 3, minWidth: 0 }}>
          <div className="card card-pad" style={{ position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span className="txt_mono" style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>
                  {selected.request_code}
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: 16 }}>{selected.title}</h3>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PCRFlowBar current={selected.status} />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: 'auto', flexShrink: 0 }}
                onClick={() => setShowPcrCreateTask(true)}
              >
                + Tạo Task
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '12px 0' }}>
              <div>
                <div className="form-label">Loại thay đổi</div>
                <div>{PCR_CHANGE_TYPE_LABELS[selected.change_type]}</div>
              </div>
              <div>
                <div className="form-label">Ưu tiên</div>
                <span className={`badge badge-${PRIORITY_VARIANTS[selected.priority]}`}>
                  {PRIORITY_LABELS[selected.priority]}
                </span>
              </div>
              <div>
                <div className="form-label">Project</div>
                <div style={{ fontSize: 13 }}>{selected.project_name || selected.project_id}</div>
              </div>
              <div>
                <div className="form-label">Người yêu cầu</div>
                <div style={{ fontSize: 13 }}>{selected.requested_by}</div>
              </div>
              {selected.assigned_to && (
                <div>
                  <div className="form-label">Assigned To</div>
                  <div style={{ fontSize: 13 }}>{selected.assigned_to}</div>
                </div>
              )}
              {selected.target_date && (
                <div>
                  <div className="form-label">Target Date</div>
                  <div style={{ fontSize: 13 }}>{selected.target_date}</div>
                </div>
              )}
            </div>

            {selected.description && (
              <div style={{ marginBottom: 12 }}>
                <div className="form-label">Mô tả</div>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{selected.description}</div>
              </div>
            )}

            {selected.impact_scope && (
              <div style={{ marginBottom: 8 }}>
                <div className="form-label">Phạm vi ảnh hưởng</div>
                <div style={{ fontSize: 13 }}>{selected.impact_scope}</div>
              </div>
            )}
            {selected.impact_effort && (
              <div style={{ marginBottom: 12 }}>
                <div className="form-label">Ước tính effort</div>
                <div style={{ fontSize: 13 }}>{selected.impact_effort}</div>
              </div>
            )}

            {/* Status update */}
            <div style={{ borderTop: '1px solid var(--vib-neutral-200)', paddingTop: 12, marginTop: 4 }}>
              <div className="form-label">Cập nhật trạng thái</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="input input-sm" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  {(Object.keys(PCR_STATUS_LABELS) as PCRStatus[]).map(s => (
                    <option key={s} value={s}>{PCR_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleStatusUpdateClick}
                  disabled={saving || editStatus === selected.status}
                >
                  {saving ? '...' : 'Lưu'}
                </button>
              </div>
            </div>

            <RequestAttachments
              refId={selected.id}
              listFn={pcrApi.listAttachments}
              uploadFn={pcrApi.uploadAttachment}
            />

            <RequestHistoryTimeline
              entries={pcrHistory}
              statusLabels={PCR_STATUS_LABELS}
              loading={pcrHistoryLoading}
            />
          </div>
        </div>
      )}

      {pcrCommentFor && selected && (
        <CommentModal
          title={pcrCommentFor === 'rejected' ? 'Từ chối PCR' : 'Hủy PCR'}
          subtitle={`Vui lòng nhập lý do ${pcrCommentFor === 'rejected' ? 'từ chối' : 'hủy'} PCR "${selected.title}".`}
          confirmLabel={pcrCommentFor === 'rejected' ? 'Từ chối' : 'Hủy PCR'}
          onClose={() => setPcrCommentFor(null)}
          onConfirm={comment => doPcrStatusSave(pcrCommentFor, comment)}
        />
      )}

      {showPcrCreateTask && selected && (
        <CreateTaskFromRequestModal
          refType="PCR"
          refCode={selected.request_code}
          refId={selected.id}
          refTitle={selected.title}
          defaultProjectId={selected.project_id}
          defaultProjectName={selected.project_name}
          defaultPriority={selected.priority}
          defaultAssignee={selected.assigned_to ?? undefined}
          defaultDueDate={selected.target_date ?? undefined}
          onClose={() => setShowPcrCreateTask(false)}
          onCreated={() => setShowPcrCreateTask(false)}
        />
      )}

      <PCRCreateModal
        dialogRef={pcrDialogRef}
        onCreated={() => { pcrDialogRef.current?.close(); load() }}
      />
    </div>
  )
}

// ── PCR Create Modal ──────────────────────────────────────────────────────────

function PCRCreateModal({
  dialogRef, onCreated,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>
  onCreated: () => void
}) {
  const BLANK: PCRCreate = { project_id: '', title: '', change_type: 'other', priority: 'medium', requested_by: '' }
  const [form, setForm]           = useState<PCRCreate>(BLANK)
  const [projects, setProjects]   = useState<Project[]>([])
  const [lovLoading, setLovLoading] = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [queuedFiles, setQueuedFiles] = useState<File[]>([])

  useEffect(() => {
    getProjects({ all_years: true })
      .then(data => setProjects(data.filter(p => p.status !== 'archived')))
      .catch(() => setProjects([]))
      .finally(() => setLovLoading(false))
  }, [])

  const projectOptions: ComboOption[] = projects
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(p => ({
      value: p.id,
      label: p.name,
      meta:  `${p.code}${p.domain_code ? ' · ' + p.domain_code : ''} · ${p.status}`,
    }))

  function set(k: keyof PCRCreate, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function closeDialog() {
    setForm(BLANK); setQueuedFiles([]); setError(null)
    dialogRef.current?.close()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.project_id || !form.title || !form.requested_by) {
      setError('Vui lòng chọn Project, điền Tiêu đề và Người yêu cầu'); return
    }
    setSaving(true); setError(null)
    try {
      const result = await pcrApi.create(form)
      for (const file of queuedFiles) {
        try { await pcrApi.uploadAttachment(result.id, file) } catch (_) {}
      }
      setForm(BLANK); setQueuedFiles([])
      onCreated()
    } catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }

  const selectedProject = projects.find(p => p.id === form.project_id)

  return (
    <dialog ref={dialogRef} onClick={e => { if (e.target === e.currentTarget) closeDialog() }}>
      <div className="modal-panel" style={{ height: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <span style={{ fontWeight: 700, fontSize: 16 }}>Tạo Project Change Request</span>
          <button className="btn-icon" type="button" onClick={closeDialog}><X size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {error && (
            <div className="alert alert-danger" style={{ margin: '0 20px', marginTop: 12, flexShrink: 0 }}>{error}</div>
          )}

          {/* Two-panel body */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 380px', flex: 1, overflow: 'hidden' }}>

            {/* LEFT — Context chính */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
                  Project <span style={{ color: 'var(--vib-danger)' }}>*</span>
                </label>
                <ComboSelect
                  options={projectOptions}
                  value={form.project_id}
                  onChange={val => set('project_id', val)}
                  placeholder={lovLoading ? 'Đang tải...' : `Chọn project (${projectOptions.length} dự án)`}
                  loading={lovLoading}
                />
                {selectedProject && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-neutral">{selectedProject.code}</span>
                    {selectedProject.domain_code && <span className="badge badge-info">{selectedProject.domain_code}</span>}
                    <span className={`badge badge-${selectedProject.status === 'active' ? 'success' : 'neutral'}`}>
                      {selectedProject.status}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
                  Tiêu đề <span style={{ color: 'var(--vib-danger)' }}>*</span>
                </label>
                <input className="input" value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Mô tả ngắn về thay đổi cần thực hiện" />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Mô tả</label>
                <textarea className="input" rows={6}
                  style={{ flex: 1, resize: 'none', minHeight: 120 }}
                  value={form.description || ''}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Chi tiết về thay đổi cần thực hiện, lý do, tác động dự kiến..." />
              </div>

              <FileQueueSection
                files={queuedFiles}
                onAdd={fl => fl && setQueuedFiles(prev => [...prev, ...Array.from(fl)])}
                onRemove={i => setQueuedFiles(prev => prev.filter((_, idx) => idx !== i))}
              />
            </div>

            {/* Divider */}
            <div style={{ background: 'var(--vib-neutral-200)', margin: '12px 0' }} />

            {/* RIGHT — Metadata */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Loại thay đổi</label>
                  <select className="input" value={form.change_type} onChange={e => set('change_type', e.target.value)}>
                    {(Object.keys(PCR_CHANGE_TYPE_LABELS) as PCRChangeType[]).map(t => (
                      <option key={t} value={t}>{PCR_CHANGE_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Ưu tiên</label>
                  <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                    <option value="critical">Khẩn cấp</option>
                    <option value="high">Cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Người yêu cầu <span style={{ color: 'var(--vib-danger)' }}>*</span></label>
                <UserSelect
                  value={form.requested_by}
                  onChange={val => set('requested_by', val)}
                  placeholder="Chọn nhân sự..."
                />
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Target Date</label>
                <input className="input" type="date" value={form.target_date || ''} onChange={e => set('target_date', e.target.value)} />
              </div>

              <div style={{ borderTop: '1px solid var(--vib-neutral-200)', paddingTop: 14 }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Phạm vi ảnh hưởng</label>
                <input className="input" value={form.impact_scope || ''}
                  onChange={e => set('impact_scope', e.target.value)}
                  placeholder="Module / tính năng bị ảnh hưởng" />
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Ước tính effort</label>
                <input className="input" value={form.impact_effort || ''}
                  onChange={e => set('impact_effort', e.target.value)}
                  placeholder="VD: 3 ngày, 1 sprint" />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeDialog}>Huỷ</button>
            <button type="submit" className="btn btn-primary" disabled={saving || lovLoading}>
              {saving ? 'Đang tạo...' : 'Tạo PCR'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

// ── SR Tab ────────────────────────────────────────────────────────────────────

function SRTab() {
  const [items, setItems]       = useState<ServiceRequest[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [srActiveTabIdx, setSrActiveTabIdx] = useState(0)
  const [filterProduct, setFProd] = useState('')
  const [filterText, setFText]    = useState('')
  const [filterFrom, setFFrom]    = useState('')
  const [filterTo, setFTo]        = useState('')
  const [selected, setSelected] = useState<ServiceRequest | null>(null)
  const [hoveredId, setSRHovered] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving]     = useState(false)
  const [srHistory, setSrHistory] = useState<RequestHistoryEntry[]>([])
  const [srHistoryLoading, setSrHistoryLoading] = useState(false)
  const [srCommentFor, setSrCommentFor] = useState<SRStatus | null>(null)
  const [showSrCreateTask, setShowSrCreateTask] = useState(false)
  const srDialogRef             = useRef<HTMLDialogElement>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await srApi.list({})
      setItems(data)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selected) { setSrHistory([]); return }
    setSrHistoryLoading(true)
    srApi.history(selected.id)
      .then(h => setSrHistory(h))
      .catch(() => setSrHistory([]))
      .finally(() => setSrHistoryLoading(false))
  }, [selected?.id])

  const srTabFilter = SR_STATUS_TABS[srActiveTabIdx]
  const byTab = srTabFilter.values
    ? items.filter(s => srTabFilter.values!.includes(s.status))
    : items

  const productOptions = Array.from(
    new Map(items.filter(s => s.product_id).map(s => [s.product_id!, s.product_name ?? s.product_id!])).entries()
  ).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))

  const displayed = (() => {
    let rows = byTab
    if (filterProduct) rows = rows.filter(s => s.product_id === filterProduct)
    if (filterText) rows = applyTextFilter(rows, filterText, ['request_code', 'title', 'requested_by', 'product_name', 'assigned_to'])
    rows = applyDateFilter(rows, 'created_at', filterFrom, filterTo)
    return rows
  })()

  const SR_REQUIRES_COMMENT: SRStatus[] = ['rejected', 'cancelled']

  function handleStatusUpdateClick() {
    if (!selected || !editStatus || editStatus === selected.status) return
    const newStatus = editStatus as SRStatus
    if (SR_REQUIRES_COMMENT.includes(newStatus)) {
      setSrCommentFor(newStatus)
    } else {
      doSrStatusSave(newStatus, undefined)
    }
  }

  async function doSrStatusSave(status: SRStatus, comment: string | undefined) {
    if (!selected) return
    const id = selected.id
    setSaving(true); setSrCommentFor(null)
    try {
      await srApi.update(id, { status, ...(comment ? { comment } : {}) })
      const [, fresh, hist] = await Promise.all([
        load(),
        srApi.get(id),
        srApi.history(id),
      ])
      setSelected(fresh)
      setEditStatus(fresh.status)
      setSrHistory(hist)
    } catch (e) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá Service Request này?')) return
    await srApi.delete(id)
    await load()
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* List panel */}
      <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Status tabs */}
        <div style={{
          display: 'flex', gap: 0, overflowX: 'auto',
          borderBottom: '2px solid var(--vib-neutral-200)',
          marginBottom: 10, flexShrink: 0,
        }}>
          {SR_STATUS_TABS.map((tab, idx) => {
            const count = tab.values
              ? items.filter(s => tab.values!.includes(s.status)).length
              : items.length
            const active = srActiveTabIdx === idx
            return (
              <button
                key={idx}
                onClick={() => { setSrActiveTabIdx(idx); setSelected(null) }}
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

        <FilterBar
          text={{ value: filterText, onChange: setFText, placeholder: 'Tìm code / tiêu đề / người yêu cầu...' }}
          selects={[
            {
              key: 'product', value: filterProduct, onChange: setFProd,
              placeholder: 'Tất cả ứng dụng',
              options: productOptions,
            },
          ]}
          dateFrom={{ value: filterFrom, onChange: setFFrom, label: 'Tạo từ' }}
          dateTo={{ value: filterTo, onChange: setFTo }}
          onClear={() => { setFProd(''); setFText(''); setFFrom(''); setFTo('') }}
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-sm"
                style={{ border: '1px solid var(--vib-neutral-300)', background: '#fff', color: 'var(--vib-neutral-700)' }}
                onClick={() => srApi.export({}).catch(e => alert(e.message))}
              >
                ↓ Excel
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => srDialogRef.current?.showModal()}>
                + Tạo SR
              </button>
            </div>
          }
        />

        {error && <div className="alert alert-danger" style={{ margin: '8px 0' }}>{error}</div>}
        {loading && <div className="txt-secondary" style={{ padding: 16 }}>Đang tải...</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {displayed.map(sr => {
            const isSelected = selected?.id === sr.id
            const isHovered  = hoveredId === sr.id
            return (
              <div
                key={sr.id}
                onMouseEnter={() => setSRHovered(sr.id)}
                onMouseLeave={() => setSRHovered(null)}
                onClick={() => { setSelected(sr); setEditStatus(sr.status) }}
                style={{
                  cursor: 'pointer',
                  background: isSelected
                    ? 'var(--vib-primary-50, #eff6ff)'
                    : isHovered ? 'var(--vib-neutral-50, #f9fafb)' : '#fff',
                  borderRadius: 8,
                  border: isSelected
                    ? '1.5px solid var(--vib-primary)'
                    : '1px solid var(--vib-neutral-200)',
                  borderLeft: `4px solid var(--vib-${PRIORITY_VARIANTS[sr.priority]})`,
                  padding: '10px 14px',
                  boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.1)' : isHovered ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                  transition: 'background 0.1s, box-shadow 0.1s, border-color 0.1s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span className="txt_mono" style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>
                        {sr.request_code}
                      </span>
                      <span className={`badge badge-${SR_STATUS_VARIANTS[sr.status]}`}>
                        {SR_STATUS_LABELS[sr.status]}
                      </span>
                      <span className={`badge badge-${PRIORITY_VARIANTS[sr.priority]}`}>
                        {PRIORITY_LABELS[sr.priority]}
                      </span>
                      <span className="badge badge-neutral">{SR_TYPE_LABELS[sr.request_type]}</span>
                      {sr.severity && (
                        <span className={`badge badge-${PRIORITY_VARIANTS[sr.severity as Priority]}`}>
                          Sev: {sr.severity}
                        </span>
                      )}
                      {sr.environment && (
                        <span className="badge badge-neutral">{sr.environment}</span>
                      )}
                      {isSelected && (
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--vib-primary)', fontWeight: 600 }}>
                          ● Đang xem
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{sr.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>
                      {sr.product_name || 'Không có product'} · {sr.requested_by}
                      {sr.sla_deadline && (
                        <span style={{ marginLeft: 8, color: 'var(--vib-danger)' }}>
                          SLA: {new Date(sr.sla_deadline).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                    {/* Hover preview — description excerpt */}
                    {isHovered && !isSelected && sr.description && (
                      <div style={{
                        marginTop: 6, paddingTop: 6,
                        borderTop: '1px dashed var(--vib-neutral-200)',
                        fontSize: 12, color: 'var(--vib-neutral-500)', lineHeight: 1.5,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {sr.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {!loading && displayed.length === 0 && (
            <div className="empty-state">
              {items.length === 0 ? 'Chưa có Service Request nào' : 'Không có kết quả khớp với bộ lọc'}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ flex: 3, minWidth: 0 }}>
          <div className="card card-pad" style={{ position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span className="txt_mono" style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>
                  {selected.request_code}
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: 16 }}>{selected.title}</h3>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SRFlowBar current={selected.status} />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: 'auto', flexShrink: 0 }}
                onClick={() => setShowSrCreateTask(true)}
              >
                + Tạo Task
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '12px 0' }}>
              <div>
                <div className="form-label">Loại request</div>
                <div>{SR_TYPE_LABELS[selected.request_type]}</div>
              </div>
              <div>
                <div className="form-label">Ưu tiên</div>
                <span className={`badge badge-${PRIORITY_VARIANTS[selected.priority]}`}>
                  {PRIORITY_LABELS[selected.priority]}
                </span>
              </div>
              {selected.product_name && (
                <div>
                  <div className="form-label">Sản phẩm</div>
                  <div style={{ fontSize: 13 }}>{selected.product_name}</div>
                </div>
              )}
              <div>
                <div className="form-label">Người yêu cầu</div>
                <div style={{ fontSize: 13 }}>{selected.requested_by}</div>
              </div>
              {selected.severity && (
                <div>
                  <div className="form-label">Severity</div>
                  <span className={`badge badge-${PRIORITY_VARIANTS[selected.severity as Priority]}`}>
                    {selected.severity}
                  </span>
                </div>
              )}
              {selected.environment && (
                <div>
                  <div className="form-label">Môi trường</div>
                  <span className="badge badge-neutral">{selected.environment}</span>
                </div>
              )}
              {selected.sla_deadline && (
                <div>
                  <div className="form-label">SLA Deadline</div>
                  <div style={{ fontSize: 13, color: 'var(--vib-danger)' }}>
                    {new Date(selected.sla_deadline).toLocaleString('vi-VN')}
                  </div>
                </div>
              )}
              {selected.assigned_to && (
                <div>
                  <div className="form-label">Assigned To</div>
                  <div style={{ fontSize: 13 }}>{selected.assigned_to}</div>
                </div>
              )}
            </div>

            {selected.description && (
              <div style={{ marginBottom: 12 }}>
                <div className="form-label">Mô tả</div>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{selected.description}</div>
              </div>
            )}

            {selected.resolution_notes && (
              <div style={{ marginBottom: 12 }}>
                <div className="form-label">Ghi chú xử lý</div>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{selected.resolution_notes}</div>
              </div>
            )}

            {/* Status update */}
            <div style={{ borderTop: '1px solid var(--vib-neutral-200)', paddingTop: 12, marginTop: 4 }}>
              <div className="form-label">Cập nhật trạng thái</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="input input-sm" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  {(Object.keys(SR_STATUS_LABELS) as SRStatus[]).map(s => (
                    <option key={s} value={s}>{SR_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleStatusUpdateClick}
                  disabled={saving || editStatus === selected.status}
                >
                  {saving ? '...' : 'Lưu'}
                </button>
              </div>
            </div>

            <RequestAttachments
              refId={selected.id}
              listFn={srApi.listAttachments}
              uploadFn={srApi.uploadAttachment}
            />

            <RequestHistoryTimeline
              entries={srHistory}
              statusLabels={SR_STATUS_LABELS}
              loading={srHistoryLoading}
            />
          </div>
        </div>
      )}

      {srCommentFor && selected && (
        <CommentModal
          title={srCommentFor === 'rejected' ? 'Từ chối Service Request' : 'Hủy Service Request'}
          subtitle={`Vui lòng nhập lý do ${srCommentFor === 'rejected' ? 'từ chối' : 'hủy'} SR "${selected.title}".`}
          confirmLabel={srCommentFor === 'rejected' ? 'Từ chối' : 'Hủy SR'}
          onClose={() => setSrCommentFor(null)}
          onConfirm={comment => doSrStatusSave(srCommentFor, comment)}
        />
      )}

      {showSrCreateTask && selected && (
        <CreateTaskFromRequestModal
          refType="SR"
          refCode={selected.request_code}
          refId={selected.id}
          refTitle={selected.title}
          defaultPriority={selected.priority}
          defaultAssignee={selected.assigned_to ?? undefined}
          defaultDueDate={selected.sla_deadline ? selected.sla_deadline.slice(0, 10) : undefined}
          onClose={() => setShowSrCreateTask(false)}
          onCreated={() => setShowSrCreateTask(false)}
        />
      )}

      {/* Create modal */}
      <SRCreateModal
        dialogRef={srDialogRef}
        onCreated={() => { srDialogRef.current?.close(); load() }}
      />
    </div>
  )
}

// ── SR Create Modal ───────────────────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  web_app: 'Web App', mobile: 'Mobile', job: 'Job/ETL', etl: 'ETL', api: 'API',
}

function SRCreateModal({
  dialogRef, onCreated,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>
  onCreated: () => void
}) {
  const BLANK: SRCreate = { title: '', request_type: 'support', priority: 'medium', requested_by: '' }
  const [form, setForm]           = useState<SRCreate>(BLANK)
  const [products, setProducts]   = useState<CatalogProduct[]>([])
  const [lovLoading, setLovLoading] = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [queuedFiles, setQueuedFiles] = useState<File[]>([])

  useEffect(() => {
    getProducts({ status: 'active' })
      .then(data => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLovLoading(false))
  }, [])

  const productOptions: ComboOption[] = products
    .sort((a, b) => a.product_name.localeCompare(b.product_name))
    .map(p => ({
      value: p.id,
      label: p.product_name,
      meta:  `${p.product_code} · ${PRODUCT_TYPE_LABELS[p.product_type] ?? p.product_type}${p.domain_code ? ' · ' + p.domain_code : ''}`,
    }))

  function set(k: keyof SRCreate, v: string) { setForm(f => ({ ...f, [k]: v || undefined })) }

  function closeDialog() {
    setForm(BLANK); setQueuedFiles([]); setError(null)
    dialogRef.current?.close()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.requested_by) {
      setError('Vui lòng điền Tiêu đề và Người yêu cầu'); return
    }
    setSaving(true); setError(null)
    try {
      const result = await srApi.create(form)
      for (const file of queuedFiles) {
        try { await srApi.uploadAttachment(result.id, file) } catch (_) {}
      }
      setForm(BLANK); setQueuedFiles([])
      onCreated()
    } catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }

  const selectedProduct = products.find(p => p.id === form.product_id)

  return (
    <dialog ref={dialogRef} onClick={e => { if (e.target === e.currentTarget) closeDialog() }}>
      <div className="modal-panel" style={{ height: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <span style={{ fontWeight: 700, fontSize: 16 }}>Tạo Service Request</span>
          <button className="btn-icon" type="button" onClick={closeDialog}><X size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {error && (
            <div className="alert alert-danger" style={{ margin: '0 20px', marginTop: 12, flexShrink: 0 }}>{error}</div>
          )}

          {/* Two-panel body */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 380px', flex: 1, overflow: 'hidden' }}>

            {/* LEFT — Context chính */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
                  Ứng dụng
                  <span style={{ fontWeight: 400, color: 'var(--vib-neutral-400)', marginLeft: 6, fontSize: 12 }}>
                    (không bắt buộc)
                  </span>
                </label>
                <ComboSelect
                  options={productOptions}
                  value={form.product_id ?? ''}
                  onChange={val => setForm(f => ({ ...f, product_id: val || undefined }))}
                  placeholder={lovLoading ? 'Đang tải...' : `Tìm ứng dụng (${productOptions.length} apps)`}
                  loading={lovLoading}
                />
                {selectedProduct && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge badge-neutral">{selectedProduct.product_code}</span>
                    <span className="badge badge-info">{PRODUCT_TYPE_LABELS[selectedProduct.product_type] ?? selectedProduct.product_type}</span>
                    {selectedProduct.domain_code && <span className="badge badge-neutral">{selectedProduct.domain_code}</span>}
                    {selectedProduct.technical_owner && (
                      <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>· {selectedProduct.technical_owner}</span>
                    )}
                    <button type="button" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--vib-neutral-400)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setForm(f => ({ ...f, product_id: undefined }))}>✕ Bỏ chọn</button>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
                  Tiêu đề <span style={{ color: 'var(--vib-danger)' }}>*</span>
                </label>
                <input className="input" value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Mô tả ngắn về yêu cầu" />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Mô tả</label>
                <textarea className="input" rows={6}
                  style={{ flex: 1, resize: 'none', minHeight: 120 }}
                  value={form.description || ''}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Chi tiết yêu cầu, bước tái hiện lỗi (nếu là bug), dữ liệu liên quan..." />
              </div>

              <FileQueueSection
                files={queuedFiles}
                onAdd={fl => fl && setQueuedFiles(prev => [...prev, ...Array.from(fl)])}
                onRemove={i => setQueuedFiles(prev => prev.filter((_, idx) => idx !== i))}
              />
            </div>

            {/* Divider */}
            <div style={{ background: 'var(--vib-neutral-200)', margin: '12px 0' }} />

            {/* RIGHT — Metadata */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Loại request</label>
                  <select className="input" value={form.request_type} onChange={e => set('request_type', e.target.value)}>
                    {(Object.keys(SR_TYPE_LABELS) as SRRequestType[]).map(t => (
                      <option key={t} value={t}>{SR_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Ưu tiên</label>
                  <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                    <option value="critical">Khẩn cấp</option>
                    <option value="high">Cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Severity</label>
                  <select className="input" value={form.severity || ''} onChange={e => set('severity', e.target.value)}>
                    <option value="">— N/A —</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Môi trường</label>
                  <select className="input" value={form.environment || ''} onChange={e => set('environment', e.target.value)}>
                    <option value="">— Chưa rõ —</option>
                    {['DEV','SIT','UAT','PROD','DR','STAGING'].map(env => (
                      <option key={env} value={env}>{env}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--vib-neutral-200)', paddingTop: 14 }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
                  Người yêu cầu <span style={{ color: 'var(--vib-danger)' }}>*</span>
                </label>
                <UserSelect
                  value={form.requested_by}
                  onChange={val => set('requested_by', val)}
                  placeholder="Chọn nhân sự..."
                />
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>SLA Deadline</label>
                <input className="input" type="datetime-local" value={form.sla_deadline || ''} onChange={e => set('sla_deadline', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeDialog}>Huỷ</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang tạo...' : 'Tạo SR'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'pcr' | 'sr'

export default function RequestsPage() {
  const [tab, setTab] = useState<Tab>('pcr')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--vib-neutral-200)', marginBottom: 16 }}>
        {([
          { key: 'pcr' as Tab, label: '🔄 Project Change Request', desc: 'Thay đổi trong dự án đang chạy' },
          { key: 'sr'  as Tab, label: '🎫 Service Request',        desc: 'Yêu cầu với ứng dụng vận hành' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: 600, fontSize: 14, fontFamily: 'var(--font)',
              borderBottom: tab === t.key ? '2px solid var(--vib-primary)' : '2px solid transparent',
              color: tab === t.key ? 'var(--vib-primary)' : 'var(--vib-neutral-500)',
              marginBottom: -2,
            }}
          >
            {t.label}
            <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--vib-neutral-400)' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'pcr' ? <PCRTab /> : <SRTab />}
      </div>
    </div>
  )
}
