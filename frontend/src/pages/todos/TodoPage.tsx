/**
 * TodoPage — To-do List Module (FR-T01 – FR-T10)
 * Views: List | Board (Kanban) | Stats
 * Features: filters, create/edit drawer, detail panel, comments, subtasks
 */
import React, { useCallback, useEffect, useState } from 'react'
import {
  Plus, RefreshCw, LayoutList, Columns, BarChart2,
  ChevronDown, ChevronRight, MessageSquare, Clock,
  AlertTriangle, CheckCircle2, Circle, Loader2, Ban, Minus,
  Flag, Calendar, User, Tag, Trash2, Edit2, X, Send,
} from 'lucide-react'
import { Btn, Modal, VibSelect, Field, VibInput, VibTextarea, EmptyState, ProgressBar } from '../../components/ui'
import { getProjects, type Project } from '../../api/ppg'
import { getProducts, type CatalogProduct } from '../../api/catalog'
import { UserSelect } from '../../components/UserSelect'

// ── Shared product-search combo (mirrors SR pattern) ─────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  web_app: 'Web App', mobile: 'Mobile', job: 'Job/ETL', etl: 'ETL', api: 'API',
}

interface ComboOption { value: string; label: string; meta?: string }

function ComboSelect({
  options, value, onChange, placeholder = 'Tìm ứng dụng...', loading = false, style,
}: {
  options: ComboOption[]; value: string
  onChange: (val: string, label: string) => void
  placeholder?: string; loading?: boolean
  style?: React.CSSProperties
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const selectedLabel = options.find(o => o.value === value)?.label ?? ''
  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || (o.meta ?? '').toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minHeight: 28, padding: '2px 8px', fontSize: 12 }}
        onClick={() => setOpen(o => !o)}>
        {value
          ? <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel}</span>
          : <span style={{ flex: 1, fontSize: 12, color: 'var(--vib-neutral-400)' }}>{loading ? 'Đang tải...' : placeholder}</span>}
        {value && (
          <span onClick={e => { e.stopPropagation(); onChange('', '') }} style={{ color: 'var(--vib-neutral-400)', fontSize: 11, lineHeight: 1, cursor: 'pointer' }}>✕</span>
        )}
        <span style={{ color: 'var(--vib-neutral-400)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: '#fff', border: '1px solid var(--vib-neutral-300)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 260, display: 'flex', flexDirection: 'column', minWidth: 220 }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--vib-neutral-200)' }}>
            <input autoFocus className="input input-sm" style={{ width: '100%', fontSize: 12 }}
              placeholder="Tìm..." value={query} onChange={e => setQuery(e.target.value)} onClick={e => e.stopPropagation()} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--vib-neutral-500)', borderBottom: '1px solid var(--vib-neutral-100)' }}
              onClick={() => { onChange('', ''); setOpen(false); setQuery('') }}>
              — Tất cả sản phẩm —
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', color: 'var(--vib-neutral-400)', fontSize: 12 }}>Không tìm thấy</div>
            )}
            {filtered.map(opt => (
              <div key={opt.value}
                style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, background: opt.value === value ? 'var(--vib-primary-50,#e6f0fa)' : undefined, borderBottom: '1px solid var(--vib-neutral-100)' }}
                onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLDivElement).style.background = 'var(--vib-neutral-50,#f5f5f5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = opt.value === value ? 'var(--vib-primary-50,#e6f0fa)' : '' }}
                onClick={() => { onChange(opt.value, opt.label); setOpen(false); setQuery('') }}>
                <div style={{ fontWeight: opt.value === value ? 600 : 400 }}>{opt.label}</div>
                {opt.meta && <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginTop: 1 }}>{opt.meta}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
import { useStore } from '../../stores/auth'
import {
  listTodos, getTodo, createTodo, updateTodo, deleteTodo,
  setTodoStatus, getTodoStats, listComments, addComment, deleteComment,
  type Todo, type TodoCreate, type TodoUpdate, type TodoStatus,
  type TodoPriority, type TodoType,
  type TodoStats, type TodoComment,
} from '../../api/todos'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<TodoStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  todo:        { label: 'Khởi tạo',       color: '#6b7280', bg: '#f3f4f6', icon: <Circle size={13} /> },
  in_progress: { label: 'Đang làm',       color: '#2563eb', bg: '#eff6ff', icon: <Loader2 size={13} /> },
  pending:     { label: 'Pending',         color: '#f59e0b', bg: '#fef9c3', icon: <AlertTriangle size={13} /> },
  done:        { label: 'Đã hoàn thành',  color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle2 size={13} /> },
  cancelled:   { label: 'Hủy',            color: '#9ca3af', bg: '#f9fafb', icon: <Ban size={13} /> },
}

interface StatusTab { label: string; values: TodoStatus[] | null }
const STATUS_TABS: StatusTab[] = [
  { label: 'Tất cả',         values: null },
  { label: 'Khởi tạo',       values: ['todo'] },
  { label: 'Đang làm',       values: ['in_progress'] },
  { label: 'Đã hoàn thành',  values: ['done'] },
  { label: 'Hủy',            values: ['cancelled'] },
  { label: 'Pending',         values: ['pending'] },
]

const PRIORITY_META: Record<TodoPriority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#7f1d1d' },
  high:     { label: 'High',     color: '#dc2626' },
  medium:   { label: 'Medium',   color: '#f59e0b' },
  low:      { label: 'Low',      color: '#6b7280' },
}

const TYPE_META: Record<TodoType, string> = {
  feature:       '✨ Feature',
  bug:           '🐛 Bug',
  review:        '👁 Review',
  meeting:       '📅 Meeting',
  documentation: '📝 Docs',
  deployment:    '🚀 Deploy',
  other:         '📌 Other',
}

const TRANSITIONS: Record<TodoStatus, TodoStatus[]> = {
  todo:        ['in_progress', 'cancelled'],
  in_progress: ['pending', 'done', 'cancelled'],
  pending:     ['in_progress', 'done', 'cancelled'],
  done:        ['in_progress'],
  cancelled:   ['todo'],
}

const BOARD_COLS: TodoStatus[] = ['todo', 'in_progress', 'pending', 'done']

const C = {
  primary: 'var(--vib-primary)',
  border:  'var(--vib-neutral-200, #e5e7eb)',
  bg:      'var(--vib-neutral-50, #f9fafb)',
  text:    'var(--vib-neutral-700, #374151)',
  muted:   'var(--vib-neutral-400, #9ca3af)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────


function dueDateLabel(d: string | null) {
  if (!d) return null
  const dt = new Date(d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.floor((dt.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return { text: `Quá hạn ${-diff}n`, color: '#dc2626' }
  if (diff === 0) return { text: 'Hôm nay',          color: '#f59e0b' }
  if (diff === 1) return { text: 'Ngày mai',          color: '#f59e0b' }
  return { text: dt.toLocaleDateString('vi-VN'), color: C.muted }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: TodoStatus }) {
  const m = STATUS_META[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500,
      color: m.color, background: m.bg,
    }}>
      {m.icon} {m.label}
    </span>
  )
}

function PriorityFlag({ priority }: { priority: TodoPriority }) {
  return <Flag size={13} style={{ color: PRIORITY_META[priority].color, flexShrink: 0 }} />
}

function TodoCard({
  todo, selected, onClick, onStatusChange,
}: {
  todo: Todo; selected: boolean; onClick: () => void
  onStatusChange: (id: string, s: TodoStatus) => void
}) {
  const due = dueDateLabel(todo.due_date)
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? '#eff6ff' : '#fff',
        border: `1px solid ${selected ? C.primary : C.border}`,
        borderLeft: `4px solid ${PRIORITY_META[todo.priority].color}`,
        borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
        boxShadow: selected ? '0 0 0 2px rgba(37,99,235,0.1)' : 'none',
        transition: 'all 0.1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); const opts = TRANSITIONS[todo.status]; if (opts[0]) onStatusChange(todo.id, opts[0]) }}
          title="Quick status"
          style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', marginTop: 1, color: STATUS_META[todo.status].color }}
        >
          {STATUS_META[todo.status].icon}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: todo.status === 'done' ? C.muted : C.text,
            textDecoration: todo.status === 'done' ? 'line-through' : 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {todo.title}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.muted }}>{TYPE_META[todo.task_type]}</span>
            {due && (
              <span style={{ fontSize: 11, color: due.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Calendar size={10} /> {due.text}
              </span>
            )}
            {todo.assignee_id && (
              <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                <User size={10} /> {todo.assignee_id}
              </span>
            )}
            {(todo.comment_count || 0) > 0 && (
              <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                <MessageSquare size={10} /> {todo.comment_count}
              </span>
            )}
            {(todo.subtask_count || 0) > 0 && (
              <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Minus size={10} /> {todo.subtask_count}
              </span>
            )}
            {todo.tags.slice(0, 2).map(t => (
              <span key={t} style={{ fontSize: 10, background: '#f3f4f6', borderRadius: 4, padding: '1px 5px', color: '#6b7280' }}>{t}</span>
            ))}
          </div>
        </div>
        <PriorityFlag priority={todo.priority} />
      </div>
    </div>
  )
}

// ── Todo Form (create / edit) ─────────────────────────────────────────────────

function TodoForm({
  initial, projects, productOptions, onSave, onClose,
}: {
  initial?: Todo | null
  projects: Project[]
  productOptions: ComboOption[]
  onSave: (data: TodoCreate) => Promise<void>
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TodoCreate>({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    project_id:  initial?.project_id  ?? '',
    task_type:   initial?.task_type   ?? 'other',
    priority:    initial?.priority    ?? 'medium',
    assignee_id: initial?.assignee_id ?? '',
    due_date:    initial?.due_date    ?? '',
    milestone_id: initial?.milestone_id ?? '',
    ref_type:    initial?.ref_type    ?? (initial?.ref_id ? 'PRODUCT' : ''),
    ref_id:      initial?.ref_id      ?? '',
    tags:        initial?.tags        ?? [],
  })
  const [tagInput, setTagInput] = useState('')

  const set = (k: keyof TodoCreate, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags!.includes(t)) { set('tags', [...(form.tags ?? []), t]); setTagInput('') }
  }
  const removeTag = (t: string) => set('tags', (form.tags ?? []).filter(x => x !== t))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Tiêu đề" required>
        <VibInput value={form.title} onChange={e => set('title', e.target.value)} placeholder="Nhập tên task..." autoFocus />
      </Field>
      <Field label="Mô tả">
        <VibTextarea rows={3} value={form.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="Chi tiết task..." />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Dự án">
          <VibSelect value={form.project_id ?? ''} onChange={e => set('project_id', e.target.value)}>
            <option value="">— Không gắn dự án —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </VibSelect>
        </Field>
        <Field label="Ứng dụng / Sản phẩm">
          <ComboSelect
            options={productOptions}
            value={form.ref_id ?? ''}
            onChange={(val, _lbl) => { set('ref_id', val || undefined); set('ref_type', val ? 'PRODUCT' : undefined) }}
            placeholder={`Tìm ứng dụng (${productOptions.length})`}
          />
        </Field>
        <Field label="Loại task">
          <VibSelect value={form.task_type} onChange={e => set('task_type', e.target.value as TodoType)}>
            {(Object.keys(TYPE_META) as TodoType[]).map(k => <option key={k} value={k}>{TYPE_META[k]}</option>)}
          </VibSelect>
        </Field>
        <Field label="Độ ưu tiên">
          <VibSelect value={form.priority} onChange={e => set('priority', e.target.value as TodoPriority)}>
            {(Object.keys(PRIORITY_META) as TodoPriority[]).map(k => (
              <option key={k} value={k}>{PRIORITY_META[k].label}</option>
            ))}
          </VibSelect>
        </Field>
        <Field label="Người thực hiện">
          <UserSelect value={form.assignee_id ?? ''} onChange={val => set('assignee_id', val)} placeholder="Chọn nhân sự..." />
        </Field>
        <Field label="Due date">
          <VibInput type="date" value={form.due_date ?? ''} onChange={e => set('due_date', e.target.value)} />
        </Field>
      </div>
      <Field label="Tags">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {(form.tags ?? []).map(t => (
            <span key={t} style={{ background: '#eff6ff', borderRadius: 4, padding: '2px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              {t}
              <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280' }}><X size={10} /></button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <VibInput value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Thêm tag..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} style={{ flex: 1 }} />
          <Btn type="button" variant="secondary" size="sm" onClick={addTag}>+</Btn>
        </div>
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
        <Btn type="button" variant="secondary" onClick={onClose}>Huỷ</Btn>
        <Btn type="submit" loading={saving}>{initial ? 'Cập nhật' : 'Tạo task'}</Btn>
      </div>
    </form>
  )
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function TodoDetail({
  todoId, onClose, onUpdated, onDeleted, projects, productOptions, username,
}: {
  todoId: string; onClose: () => void
  onUpdated: (t: Todo) => void; onDeleted: (id: string) => void
  projects: Project[]; productOptions: ComboOption[]; username: string
}) {
  const { addToast } = useStore()
  const [todo, setTodo] = useState<Todo | null>(null)
  const [comments, setComments] = useState<TodoComment[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expandSubs, setExpandSubs] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, cRes] = await Promise.all([getTodo(todoId), listComments(todoId)])
      setTodo(res.data)
      setComments(cRes.data)
    } catch (e) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [todoId, addToast])

  useEffect(() => { load() }, [load])

  const handleStatus = async (s: TodoStatus) => {
    if (!todo) return
    try { const r = await setTodoStatus(todo.id, s); setTodo(r.data); onUpdated(r.data) }
    catch (e) { addToast((e as Error).message, 'error') }
  }

  const handleSave = async (data: TodoCreate) => {
    if (!todo) return
    const upd: TodoUpdate = {
      title: data.title, description: data.description ?? undefined,
      task_type: data.task_type, priority: data.priority,
      assignee_id: data.assignee_id ?? null, due_date: data.due_date ?? null,
      tags: data.tags,
    }
    const r = await updateTodo(todo.id, upd)
    setTodo(r.data); onUpdated(r.data); setEditing(false)
    addToast('Đã cập nhật task', 'success')
  }

  const handleDelete = async () => {
    if (!todo) return
    await deleteTodo(todo.id); onDeleted(todo.id); onClose()
    addToast('Đã xoá task', 'success')
  }

  const submitComment = async () => {
    if (!commentText.trim() || !todo) return
    setSendingComment(true)
    try {
      const r = await addComment(todo.id, commentText.trim())
      setComments(c => [...c, r.data]); setCommentText('')
    } catch (e) { addToast((e as Error).message, 'error') }
    finally { setSendingComment(false) }
  }

  const handleDeleteComment = async (cid: string) => {
    if (!todo) return
    await deleteComment(todo.id, cid)
    setComments(c => c.filter(x => x.id !== cid))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
    </div>
  )
  if (!todo) return null

  const due = dueDateLabel(todo.due_date)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <PriorityFlag priority={todo.priority} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{todo.title}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <StatusChip status={todo.status} />
              <span style={{ fontSize: 12, color: C.muted }}>{TYPE_META[todo.task_type]}</span>
              {due && <span style={{ fontSize: 12, color: due.color, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />{due.text}</span>}
              {todo.assignee_id && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} />{todo.assignee_id}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: C.muted }} title="Chỉnh sửa"><Edit2 size={15} /></button>
            <button type="button" onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: '#dc2626' }} title="Xoá"><Trash2 size={15} /></button>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: C.muted }}><X size={15} /></button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {/* Status actions */}
        {TRANSITIONS[todo.status].length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Chuyển trạng thái</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TRANSITIONS[todo.status].map(s => (
                <button key={s} type="button" onClick={() => handleStatus(s)}
                  style={{ padding: '4px 12px', borderRadius: 16, border: `1px solid ${STATUS_META[s].color}`, background: STATUS_META[s].bg, color: STATUS_META[s].color, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  → {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {todo.description && (
          <div style={{ marginBottom: 16, padding: 12, background: C.bg, borderRadius: 8, fontSize: 13, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {todo.description}
          </div>
        )}

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 12 }}>
          {todo.project_name && <div style={{ color: C.muted }}>Dự án: <span style={{ color: C.text, fontWeight: 500 }}>{todo.project_name}</span></div>}
          {todo.created_by   && <div style={{ color: C.muted }}>Tạo bởi: <span style={{ color: C.text }}>{todo.created_by}</span></div>}
          <div style={{ color: C.muted }}>Tạo lúc: <span style={{ color: C.text }}>{new Date(todo.created_at).toLocaleDateString('vi-VN')}</span></div>
          {todo.completed_at && <div style={{ color: '#16a34a' }}>Hoàn thành: {new Date(todo.completed_at).toLocaleDateString('vi-VN')}</div>}
        </div>

        {/* Tags */}
        {todo.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {todo.tags.map(t => (
              <span key={t} style={{ background: '#eff6ff', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: C.primary }}>
                <Tag size={10} style={{ marginRight: 4 }} />{t}
              </span>
            ))}
          </div>
        )}

        {/* Subtasks */}
        {(todo.subtasks ?? []).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button type="button" onClick={() => setExpandSubs(x => !x)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.text, padding: 0, marginBottom: 8 }}>
              {expandSubs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Subtasks ({todo.subtasks!.length})
            </button>
            {expandSubs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
                {todo.subtasks!.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: C.bg, borderRadius: 6, fontSize: 12 }}>
                    <span style={{ color: STATUS_META[s.status].color }}>{STATUS_META[s.status].icon}</span>
                    <span style={{ flex: 1, color: s.status === 'done' ? C.muted : C.text, textDecoration: s.status === 'done' ? 'line-through' : 'none' }}>{s.title}</span>
                    <PriorityFlag priority={s.priority} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity */}
        {(todo.activity ?? []).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>Lịch sử hoạt động</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(todo.activity ?? []).slice(0, 8).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 8, fontSize: 12, color: C.muted, alignItems: 'baseline' }}>
                  <Clock size={10} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><b style={{ color: C.text }}>{a.actor}</b> {a.action}
                    {a.old_value && a.new_value && <> <span style={{ textDecoration: 'line-through' }}>{a.old_value}</span> → <b>{a.new_value}</b></>}
                    {!a.old_value && a.new_value && <> "{a.new_value}"</>}
                  </span>
                  <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{new Date(a.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={14} /> Comments ({comments.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {comments.map(c => (
              <div key={c.id} style={{ background: C.bg, borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: C.text, fontSize: 12 }}>{c.author}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: C.muted, fontSize: 11 }}>{new Date(c.created_at).toLocaleString('vi-VN')}</span>
                    {c.author === username && (
                      <button type="button" onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0 }}><Trash2 size={11} /></button>
                    )}
                  </div>
                </div>
                <div style={{ color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{c.content}</div>
              </div>
            ))}
            {comments.length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>Chưa có comment nào.</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <VibTextarea
              rows={2}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Thêm comment..."
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submitComment() }}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button type="button" onClick={submitComment} disabled={sendingComment || !commentText.trim()}
              style={{ padding: '0 12px', borderRadius: 8, border: `1px solid ${C.primary}`, background: C.primary, color: '#fff', cursor: 'pointer', opacity: commentText.trim() ? 1 : 0.4 }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal title="Chỉnh sửa task" open={editing} onClose={() => setEditing(false)} width="75vw">
        <TodoForm initial={todo} projects={projects} productOptions={productOptions} onSave={handleSave} onClose={() => setEditing(false)} />
      </Modal>

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 360 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Xoá task?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Hành động này không thể hoàn tác. Subtasks và comments cũng sẽ bị xoá.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>Huỷ</Btn>
              <Btn type="button" variant="danger" onClick={handleDelete}>Xoá</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stats Panel ───────────────────────────────────────────────────────────────

function StatsPanel({ stats }: { stats: TodoStats }) {
  const total = (stats.total_open ?? 0) + (stats.by_status?.done ?? 0)
  const doneCount = stats.by_status?.done ?? 0
  const pct = total > 0 ? Math.round(doneCount / total * 100) : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, marginBottom: 20 }}>
      {/* Overview */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Tổng quan</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>{stats.total_open}</span>
          <span style={{ fontSize: 12, color: C.muted, alignSelf: 'flex-end' }}>task đang mở</span>
        </div>
        <ProgressBar value={pct} color="#16a34a" />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{doneCount} / {total} hoàn thành ({pct}%)</div>
      </div>

      {/* Alerts */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Cần chú ý</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> Quá hạn</span>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>{stats.overdue_count}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> Hôm nay</span>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>{stats.due_today}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> Pending</span>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>{stats.by_status?.pending ?? 0}</span>
          </div>
        </div>
      </div>

      {/* By status */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Theo trạng thái</div>
        {(Object.keys(STATUS_META) as TodoStatus[]).map(s => {
          const cnt = stats.by_status?.[s] ?? 0
          const pctBar = total > 0 ? (cnt / total) * 100 : 0
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: STATUS_META[s].color, width: 70, flexShrink: 0 }}>{STATUS_META[s].label}</span>
              <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${pctBar}%`, height: '100%', background: STATUS_META[s].color, borderRadius: 4 }} />
              </div>
              <span style={{ width: 24, textAlign: 'right', color: C.text, fontWeight: 600 }}>{cnt}</span>
            </div>
          )
        })}
      </div>

      {/* Workload */}
      {stats.workload?.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Workload thành viên</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 8 }}>
            {stats.workload.slice(0, 12).map(w => (
              <div key={w.assignee_id} style={{ background: C.bg, borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.assignee_id}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <span style={{ color: C.primary }}>{w.open_count} mở</span>
                  <span style={{ color: '#16a34a' }}>{w.done_count} xong</span>
                  {w.overdue_count > 0 && <span style={{ color: '#dc2626' }}>{w.overdue_count} trễ</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Board (Kanban) ────────────────────────────────────────────────────────────

function BoardView({
  todos, selectedId, onSelect, onStatusChange,
}: {
  todos: Todo[]; selectedId: string | null
  onSelect: (id: string) => void
  onStatusChange: (id: string, s: TodoStatus) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BOARD_COLS.length}, minmax(240px,1fr))`, gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {BOARD_COLS.map(col => {
        const colTodos = todos.filter(t => t.status === col)
        const m = STATUS_META[col]
        return (
          <div key={col} style={{ background: C.bg, borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ color: m.color }}>{m.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: m.color }}>{m.label}</span>
              <span style={{ marginLeft: 'auto', background: m.bg, color: m.color, borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>{colTodos.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {colTodos.map(t => (
                <TodoCard key={t.id} todo={t} selected={t.id === selectedId} onClick={() => onSelect(t.id)} onStatusChange={onStatusChange} />
              ))}
              {colTodos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 12 }}>Trống</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type View = 'list' | 'board' | 'stats'

export default function TodoPage() {
  const { addToast, username } = useStore()

  const [view,         setView]         = useState<View>('list')
  const [activeTabIdx, setActiveTabIdx] = useState(0)
  const [projects,     setProjects]     = useState<Project[]>([])
  const [products,     setProducts]     = useState<CatalogProduct[]>([])
  const [todos,        setTodos]        = useState<Todo[]>([])
  const [stats,        setStats]        = useState<TodoStats | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)

  // Layer-2 filters
  const [filterProject,  setFilterProject]  = useState('')
  const [filterProduct,  setFilterProduct]  = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')

  // Load LOVs once
  useEffect(() => {
    getProjects({ all_years: true }).then(p => setProjects(p)).catch(() => {})
    getProducts({ status: 'active' }).then(p => setProducts(p)).catch(() => {})
  }, [])

  const productOptions: ComboOption[] = products
    .sort((a, b) => a.product_name.localeCompare(b.product_name))
    .map(p => ({
      value: p.id,
      label: p.product_name,
      meta:  `${p.product_code} · ${PRODUCT_TYPE_LABELS[p.product_type] ?? p.product_type}${p.domain_code ? ' · ' + p.domain_code : ''}`,
    }))

  const tabValues = STATUS_TABS[activeTabIdx].values
  const effectiveStatus = tabValues ? tabValues.join(',') : undefined

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [todosRes, statsRes] = await Promise.all([
        listTodos({
          project_id:  filterProject  || undefined,
          assignee_id: filterAssignee || undefined,
          status:      effectiveStatus,
          parent_id:   'root',
          size:        200,
        }),
        getTodoStats({
          project_id:  filterProject  || undefined,
          assignee_id: filterAssignee || undefined,
        }),
      ])
      setTodos(todosRes.data)
      setStats(statsRes.data)
    } catch (e) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [filterProject, filterAssignee, effectiveStatus, addToast])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (data: TodoCreate) => {
    await createTodo({ ...data, project_id: data.project_id || filterProject || undefined })
    setShowCreate(false); loadData()
    addToast('Đã tạo task', 'success')
  }

  const handleStatusChange = async (id: string, status: TodoStatus) => {
    try { const r = await setTodoStatus(id, status); handleTodoUpdated(r.data) }
    catch (e) { addToast((e as Error).message, 'error') }
  }

  const handleTodoUpdated = (t: Todo) => {
    setTodos(ts => ts.map(x => x.id === t.id ? { ...x, ...t } : x))
    loadData()
  }

  const handleTodoDeleted = (id: string) => {
    setTodos(ts => ts.filter(x => x.id !== id))
    if (selectedId === id) setSelectedId(null)
    loadData()
  }

  // Client-side product filter (ref_id match or project scope)
  const visibleTodos = filterProduct
    ? todos.filter(t => t.ref_id === filterProduct || t.project_id === filterProject)
    : todos

  const activeL2Filters = [filterProject, filterProduct, filterAssignee].filter(Boolean).length
  const clearL2 = () => { setFilterProject(''); setFilterProduct(''); setFilterAssignee('') }

  // Group by status for list view
  const todosByStatus = (Object.keys(STATUS_META) as TodoStatus[]).reduce<Record<string, Todo[]>>(
    (acc, s) => { acc[s] = visibleTodos.filter(t => t.status === s); return acc }, {} as Record<string, Todo[]>
  )

  const showDetail = selectedId !== null

  // Count per tab using all loaded todos (unfiltered by tab)
  const countForTab = (tab: StatusTab) =>
    tab.values ? todos.filter(t => tab.values!.includes(t.status)).length : todos.length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Layer 1: View tabs (List / Board / Stats) + title + actions ── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Title */}
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, marginRight: 4 }}>📋 To-do List</span>
          <span style={{ fontSize: 12, color: C.muted }}>
            {todos.length} task
            {(stats?.overdue_count ?? 0) > 0 && <> · <span style={{ color: '#dc2626' }}>{stats!.overdue_count} trễ</span></>}
          </span>
          <div style={{ flex: 1 }} />
          {/* Refresh */}
          <button type="button" onClick={loadData}
            style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          {/* Create */}
          <Btn onClick={() => setShowCreate(true)} style={{ height: 30, padding: '0 12px', fontSize: 13 }}>
            <Plus size={13} style={{ marginRight: 4 }} />Tạo task
          </Btn>
        </div>

        {/* View tabs row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, padding: '0 20px', marginTop: 8 }}>
          {([
            { v: 'list'  as View, icon: <LayoutList size={13} />, label: 'List' },
            { v: 'board' as View, icon: <Columns    size={13} />, label: 'Board' },
            { v: 'stats' as View, icon: <BarChart2  size={13} />, label: 'Dashboard' },
          ]).map(({ v, icon, label }) => (
            <button key={v} type="button" onClick={() => setView(v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', fontSize: 13, fontWeight: view === v ? 600 : 400,
                background: 'none', border: 'none', cursor: 'pointer',
                color: view === v ? C.primary : C.muted,
                borderBottom: view === v ? `2px solid ${C.primary}` : '2px solid transparent',
                marginBottom: -1,
              }}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Layer 2: Status tabs + inline filters (1 row) ── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, flexShrink: 0, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 0 }}>
        {/* Status tabs */}
        {STATUS_TABS.map((tab, idx) => {
          const cnt = countForTab(tab)
          const active = activeTabIdx === idx
          return (
            <button key={idx} type="button" onClick={() => { setActiveTabIdx(idx) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', fontSize: 13, fontWeight: active ? 600 : 400,
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? C.primary : C.muted,
                borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
              {tab.label}
              <span style={{
                background: active ? C.primary : '#f3f4f6',
                color: active ? '#fff' : C.muted,
                borderRadius: 10, padding: '0 7px', fontSize: 11, fontWeight: 600,
              }}>{cnt}</span>
            </button>
          )
        })}

        {/* Spacer */}
        <div style={{ flex: 1, minWidth: 12 }} />

        {/* Project */}
        <VibSelect value={filterProject} onChange={e => setFilterProject(e.target.value)}
          style={{ fontSize: 12, height: 28, width: 130 }}>
          <option value="">Tất cả dự án</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </VibSelect>

        {/* Product — searchable ComboSelect (same as SR) */}
        <ComboSelect
          options={productOptions}
          value={filterProduct}
          onChange={val => setFilterProduct(val)}
          placeholder={`Tìm ứng dụng (${productOptions.length})`}
          style={{ width: 180, marginLeft: 6 }}
        />

        {/* Assignee */}
        <UserSelect
          value={filterAssignee}
          onChange={setFilterAssignee}
          placeholder="Assignee"
          inputSize="sm"
          style={{ width: 150, marginLeft: 6 }}
        />

        {/* Clear */}
        {activeL2Filters > 0 && (
          <button type="button" onClick={clearL2}
            style={{ marginLeft: 6, padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, whiteSpace: 'nowrap' }}>
            <X size={10} />Xoá lọc
          </button>
        )}

        <div style={{ width: 8 }} />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main view */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading && todos.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.muted }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Đang tải...
            </div>
          ) : (
            <>
              {view === 'stats' && stats && <StatsPanel stats={stats} />}

              {view === 'list' && (
                visibleTodos.length === 0 ? (
                  <EmptyState icon="📋" title="Chưa có task nào" desc="Tạo task đầu tiên để bắt đầu." action={<Btn onClick={() => setShowCreate(true)}><Plus size={14} /> Tạo task</Btn>} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {(Object.keys(STATUS_META) as TodoStatus[]).map(s => {
                      const group = todosByStatus[s]
                      if (!group.length) return null
                      return (
                        <div key={s}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ color: STATUS_META[s].color }}>{STATUS_META[s].icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_META[s].color }}>{STATUS_META[s].label}</span>
                            <span style={{ background: STATUS_META[s].bg, color: STATUS_META[s].color, borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>{group.length}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {group.map(t => (
                              <TodoCard key={t.id} todo={t} selected={t.id === selectedId} onClick={() => setSelectedId(t.id === selectedId ? null : t.id)} onStatusChange={handleStatusChange} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}

              {view === 'board' && (
                visibleTodos.length === 0 ? (
                  <EmptyState icon="📋" title="Chưa có task nào" desc="Tạo task đầu tiên để bắt đầu." action={<Btn onClick={() => setShowCreate(true)}><Plus size={14} /> Tạo task</Btn>} />
                ) : (
                  <BoardView todos={visibleTodos} selectedId={selectedId} onSelect={id => setSelectedId(id === selectedId ? null : id)} onStatusChange={handleStatusChange} />
                )
              )}
            </>
          )}
        </div>

        {/* Detail side panel */}
        {showDetail && (
          <div style={{
            width: 380, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
            background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <TodoDetail
              todoId={selectedId!}
              onClose={() => setSelectedId(null)}
              onUpdated={handleTodoUpdated}
              onDeleted={handleTodoDeleted}
              projects={projects}
              productOptions={productOptions}
              username={username ?? ''}
            />
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal title="Tạo task mới" open={showCreate} onClose={() => setShowCreate(false)} width="75vw">
        <TodoForm projects={projects} productOptions={productOptions} onSave={handleCreate} onClose={() => setShowCreate(false)} />
      </Modal>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
