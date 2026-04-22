import React, { useEffect, useState, useCallback } from 'react'
import {
  Plus, RefreshCw, FileText, ArrowRight, Send, CheckCircle,
  RotateCcw, Archive, MessageSquare, CheckSquare, Calendar, ChevronRight
} from 'lucide-react'
import {
  getRequirements, createRequirement, getDocuments, createDocument, documentAction,
  getBaTasks, createBaTask, updateBaTask, getDiscussions, createDiscussion, updateDiscussion,
  getBATimeline,
  type Requirement, type Document, type BaTask, type Discussion, type TimelineEntry,
} from '../../api/ba'
import { useStore } from '../../stores/auth'
import {
  StatusBadge, Btn, Modal, Field, VibInput, VibTextarea,
  VibSelect, EmptyState,
} from '../../components/ui'

const DOC_COLORS: Record<string, string> = {
  BRD: '#0066B3', BRS: '#1B7A3F', ERD: '#C97A00', API: '#6B21A8'
}

const TASK_STATUS_COLOR: Record<string, string> = {
  pending:     'var(--vib-neutral-400)',
  in_progress: 'var(--vib-primary)',
  done:        'var(--vib-success)',
  blocked:     'var(--vib-danger)',
}

// ── State machine bar ────────────────────────────────────────────
const STATUS_STEPS = ['draft', 'review', 'approved', 'archived']
function StateMachineBar({ status }: { status: string }) {
  const idx = STATUS_STEPS.indexOf(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
      {STATUS_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{
            padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
            background: i <= idx ? (i === idx ? 'var(--vib-primary)' : 'var(--vib-success)') : 'var(--vib-neutral-200)',
            color: i <= idx ? '#fff' : 'var(--vib-neutral-500)',
          }}>{i < idx ? '✓ ' : ''}{s}</div>
          {i < STATUS_STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < idx ? 'var(--vib-success)' : 'var(--vib-neutral-200)', minWidth: 16 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ── Requirement Modal ────────────────────────────────────────────
function RequirementModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { addToast, selectedProject } = useStore()
  const [form, setForm] = useState({ project_id: '', title: '', raw_text: '', created_by: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && selectedProject) setForm(f => ({ ...f, project_id: selectedProject.id }))
  }, [open, selectedProject])

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.title) return addToast('Cần nhập tiêu đề', 'warn')
    setSaving(true)
    try {
      await createRequirement(form)
      addToast('Đã tạo requirement', 'success')
      onSaved(); onClose()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Tạo Requirement Mới" open={open} onClose={onClose}>
      <Field label="Project ID"><VibInput value={form.project_id} onChange={s('project_id')} placeholder="UUID của project" /></Field>
      <Field label="Tiêu đề" required><VibInput value={form.title} onChange={s('title')} placeholder="Mô tả ngắn requirement" /></Field>
      <Field label="Nội dung Raw">
        <VibTextarea value={form.raw_text} onChange={s('raw_text')} rows={5} placeholder="Paste raw requirement text vào đây..." />
      </Field>
      <Field label="Người tạo"><VibInput value={form.created_by} onChange={s('created_by')} placeholder="Tên BA / PO" /></Field>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Btn onClick={submit} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Tạo</Btn>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
      </div>
    </Modal>
  )
}

// ── Document Modal ───────────────────────────────────────────────
function DocumentModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { addToast, selectedProject } = useStore()
  const [form, setForm] = useState({ project_id: '', req_id: '', doc_type: 'BRD', title: '', version: 'v1.0', content_raw: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && selectedProject) setForm(f => ({ ...f, project_id: selectedProject.id }))
  }, [open, selectedProject])

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.doc_type || !form.title) return addToast('Cần chọn loại và tiêu đề', 'warn')
    let content: Record<string, unknown> = {}
    try { if (form.content_raw) content = JSON.parse(form.content_raw) } catch { content = { raw: form.content_raw } }
    setSaving(true)
    try {
      await createDocument({ ...form, content, doc_type: form.doc_type as 'BRD' | 'BRS' | 'ERD' | 'API' })
      addToast('Đã tạo document', 'success')
      onSaved(); onClose()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Tạo Document Mới" open={open} onClose={onClose} width="640px">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Field label="Loại Document" required>
          <VibSelect value={form.doc_type} onChange={s('doc_type')}>
            <option value="BRD">BRD — Business Requirements</option>
            <option value="BRS">BRS — Business Rules Spec</option>
            <option value="ERD">ERD — Entity Relationship</option>
            <option value="API">API Specification</option>
          </VibSelect>
        </Field>
        <Field label="Version"><VibInput value={form.version} onChange={s('version')} /></Field>
      </div>
      <Field label="Tiêu đề" required><VibInput value={form.title} onChange={s('title')} placeholder="Tên document" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Field label="Project ID"><VibInput value={form.project_id} onChange={s('project_id')} placeholder="UUID project" /></Field>
        <Field label="Requirement ID"><VibInput value={form.req_id} onChange={s('req_id')} placeholder="UUID requirement" /></Field>
      </div>
      <Field label="Nội dung (JSON hoặc text)">
        <VibTextarea value={form.content_raw} onChange={s('content_raw')} rows={6}
          placeholder={'{\n  "modules": [\n    {\n      "name": "Login",\n      "rules": ["..."],\n      "api": []\n    }\n  ]\n}'} />
      </Field>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Btn onClick={submit} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Tạo Document</Btn>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
      </div>
    </Modal>
  )
}

// ── Document Detail Modal ────────────────────────────────────────
function DocumentDetailModal({ doc, open, onClose, onUpdated }: {
  doc: Document; open: boolean; onClose: () => void; onUpdated: () => void
}) {
  const { addToast } = useStore()
  const [acting, setActing] = useState(false)

  const action = async (act: string) => {
    setActing(true)
    try {
      const res = await documentAction(doc.id, act)
      addToast(`Chuyển trạng thái → ${res.status}`, 'success')
      if (act === 'approve') addToast('Document đã được push sang PPG & Test Platform (nếu BRS)', 'info')
      onUpdated(); onClose()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setActing(false) }
  }

  const actionMap: Record<string, { label: string; variant: 'primary' | 'secondary' | 'danger' | 'ghost'; icon: React.ReactNode }> = {
    draft:    { label: 'Gửi Review', variant: 'primary', icon: <Send size={14} /> },
    review:   { label: 'Phê duyệt', variant: 'primary', icon: <CheckCircle size={14} /> },
    approved: { label: 'Archive', variant: 'ghost', icon: <Archive size={14} /> },
  }

  return (
    <Modal title={`${doc.doc_type} — ${doc.title}`} open={open} onClose={onClose} width="680px">
      <StateMachineBar status={doc.status} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="card card-pad-sm">
          <div className="vib-label">Loại</div>
          <div style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: DOC_COLORS[doc.doc_type] || 'var(--vib-primary)', color: '#fff', marginTop: 4 }}>
            {doc.doc_type}
          </div>
        </div>
        <div className="card card-pad-sm">
          <div className="vib-label">Version</div>
          <div className="txt_mono" style={{ marginTop: 4 }}>{doc.version}</div>
        </div>
        <div className="card card-pad-sm">
          <div className="vib-label">Approved by</div>
          <div style={{ marginTop: 4, fontSize: 13 }}>{doc.approved_by || '—'}</div>
        </div>
      </div>
      {doc.content && (
        <div className="card card-pad-sm" style={{ marginBottom: 16 }}>
          <div className="vib-label" style={{ marginBottom: 8 }}>Content JSON</div>
          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto', color: 'var(--vib-neutral-700)' }}>
            {JSON.stringify(doc.content, null, 2)}
          </pre>
        </div>
      )}
      {doc.pushed_at && (
        <div className="state-banner state-banner-ok" style={{ marginBottom: 16 }}>
          ✓ Đã push sang PPG{doc.doc_type === 'BRS' ? ' & Test Platform' : ''} lúc {new Date(doc.pushed_at).toLocaleString('vi-VN')}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {actionMap[doc.status] && (
          <Btn variant={actionMap[doc.status].variant} loading={acting}
            onClick={() => {
              const actKey = doc.status === 'draft' ? 'submit_review' : doc.status === 'review' ? 'approve' : 'archive'
              action(actKey)
            }}>
            {actionMap[doc.status].icon} {actionMap[doc.status].label}
          </Btn>
        )}
        {doc.status === 'review' && (
          <Btn variant="danger" loading={acting} onClick={() => action('reject')}>
            <RotateCcw size={14} /> Từ chối
          </Btn>
        )}
        <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
      </div>
    </Modal>
  )
}

// ── BA Tasks Tab ─────────────────────────────────────────────────
function BaTasksTab({ projectId }: { projectId: string }) {
  const { addToast } = useStore()
  const [tasks, setTasks] = useState<BaTask[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ title: '', description: '', task_type: 'requirements', assigned_to: '', due_date: '', status: 'pending' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setTasks(await getBaTasks({ project_id: projectId, status: statusFilter || undefined })) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [projectId, statusFilter, addToast])

  useEffect(() => { load() }, [load])

  const updateStatus = async (taskId: string, status: string) => {
    try { await updateBaTask(taskId, { status }); addToast('Đã cập nhật trạng thái', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const submit = async () => {
    if (!form.title) return addToast('Cần nhập tiêu đề task', 'warn')
    setSaving(true)
    try {
      await createBaTask({ ...form, project_id: projectId })
      addToast('Đã tạo BA task', 'success')
      setShowCreate(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const fs = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const statusTransitions: Record<string, string> = { pending: 'in_progress', in_progress: 'done', blocked: 'in_progress' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'pending', 'in_progress', 'done', 'blocked'].map(s => (
            <Btn key={s} variant={statusFilter === s ? 'primary' : 'ghost'} size="sm" onClick={() => setStatusFilter(s)}>
              {s || 'Tất cả'}
            </Btn>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /></Btn>
          <Btn size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> BA Task</Btn>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div>Đang tải...</div></div>
      ) : tasks.length === 0 ? (
        <EmptyState icon="✅" title="Chưa có BA task nào" action={<Btn onClick={() => setShowCreate(true)}><Plus size={14} /> Tạo Task</Btn>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(t => (
            <div key={t.id} className="card card-pad-sm" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 10, borderRadius: 5, alignSelf: 'stretch', background: TASK_STATUS_COLOR[t.status] || 'var(--vib-neutral-300)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="txt_s_xxs">{t.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: TASK_STATUS_COLOR[t.status] + '22', color: TASK_STATUS_COLOR[t.status] }}>
                    {t.status?.replace('_', ' ').toUpperCase()}
                  </span>
                  {t.task_type && <span style={{ fontSize: 10, color: 'var(--vib-neutral-500)', background: 'var(--vib-neutral-100)', padding: '2px 6px', borderRadius: 6 }}>{t.task_type}</span>}
                </div>
                {t.description && <p style={{ fontSize: 12, color: 'var(--vib-neutral-600)', marginBottom: 6 }}>{t.description}</p>}
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--vib-neutral-400)' }}>
                  {t.assigned_to && <span>👤 {t.assigned_to}</span>}
                  {t.due_date && <span>📅 {new Date(t.due_date).toLocaleDateString('vi-VN')}</span>}
                </div>
              </div>
              {statusTransitions[t.status] && (
                <Btn variant="ghost" size="sm" onClick={() => updateStatus(t.id, statusTransitions[t.status])}>
                  <ChevronRight size={13} /> {statusTransitions[t.status].replace('_', ' ')}
                </Btn>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal title="Tạo BA Task" open={showCreate} onClose={() => setShowCreate(false)}>
        <Field label="Tiêu đề" required><VibInput value={form.title} onChange={fs('title')} placeholder="Tên task" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Loại task">
            <VibSelect value={form.task_type} onChange={fs('task_type')}>
              <option value="requirements">Requirements</option>
              <option value="analysis">Analysis</option>
              <option value="documentation">Documentation</option>
              <option value="review">Review</option>
              <option value="approval">Approval</option>
            </VibSelect>
          </Field>
          <Field label="Trạng thái">
            <VibSelect value={form.status} onChange={fs('status')}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </VibSelect>
          </Field>
        </div>
        <Field label="Mô tả">
          <VibTextarea value={form.description} onChange={fs('description')} rows={3} placeholder="Chi tiết task..." />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Assigned to"><VibInput value={form.assigned_to} onChange={fs('assigned_to')} placeholder="Tên BA" /></Field>
          <Field label="Due date"><VibInput type="date" value={form.due_date} onChange={fs('due_date')} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn onClick={submit} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Tạo Task</Btn>
          <Btn variant="ghost" onClick={() => setShowCreate(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
        </div>
      </Modal>
    </div>
  )
}

// ── Discussions Tab ──────────────────────────────────────────────
function DiscussionsTab({ projectId }: { projectId: string }) {
  const { addToast } = useStore()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [resolving, setResolving] = useState<Discussion | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [createForm, setCreateForm] = useState({ title: '', content: '', raised_by: '', doc_id: '' })
  const [resolveForm, setResolveForm] = useState({ resolution: '', resolved_by: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setDiscussions(await getDiscussions({ project_id: projectId, status: statusFilter || undefined })) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [projectId, statusFilter, addToast])

  useEffect(() => { load() }, [load])

  const submitCreate = async () => {
    if (!createForm.content) return addToast('Cần nhập nội dung', 'warn')
    setSaving(true)
    try {
      await createDiscussion({ ...createForm, project_id: projectId })
      addToast('Đã tạo discussion', 'success')
      setShowCreate(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const submitResolve = async () => {
    if (!resolving || !resolveForm.resolution) return addToast('Cần nhập nội dung giải quyết', 'warn')
    setSaving(true)
    try {
      await updateDiscussion(resolving.id, { status: 'resolved', resolution: resolveForm.resolution, resolved_by: resolveForm.resolved_by })
      addToast('Đã resolve discussion', 'success')
      setResolving(null); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'open', 'resolved'].map(s => (
            <Btn key={s} variant={statusFilter === s ? 'primary' : 'ghost'} size="sm" onClick={() => setStatusFilter(s)}>
              {s || 'Tất cả'}
            </Btn>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /></Btn>
          <Btn size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Discussion</Btn>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div>Đang tải...</div></div>
      ) : discussions.length === 0 ? (
        <EmptyState icon="💬" title="Chưa có discussion nào"
          desc="Ghi nhận các vấn đề / câu hỏi của stakeholder tại đây"
          action={<Btn onClick={() => setShowCreate(true)}><Plus size={14} /> Mở Discussion</Btn>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {discussions.map(d => (
            <div key={d.id} className="card card-pad-sm"
              style={{ borderLeft: `3px solid ${d.status === 'resolved' ? 'var(--vib-success)' : 'var(--vib-warning)'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <MessageSquare size={14} color="var(--vib-neutral-400)" />
                    <span className="txt_s_xxs">{d.title || 'Discussion'}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: d.status === 'resolved' ? 'var(--vib-success-bg)' : 'var(--vib-warning-bg)',
                      color: d.status === 'resolved' ? 'var(--vib-success)' : 'var(--vib-warning)',
                    }}>{d.status?.toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--vib-neutral-700)', marginBottom: 8, lineHeight: 1.5 }}>{d.content}</p>
                  {d.resolution && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--vib-success-bg)', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--vib-success)' }}>✓ Giải quyết: </span>
                      <span style={{ fontSize: 12, color: 'var(--vib-neutral-700)' }}>{d.resolution}</span>
                      {d.resolved_by && <span style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}> — {d.resolved_by}</span>}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>
                    {d.raised_by && <span>👤 {d.raised_by} · </span>}
                    {d.created_at && new Date(d.created_at).toLocaleString('vi-VN')}
                  </div>
                </div>
                {d.status === 'open' && (
                  <Btn variant="secondary" size="sm" onClick={() => { setResolving(d); setResolveForm({ resolution: '', resolved_by: '' }) }}>
                    <CheckSquare size={13} /> Resolve
                  </Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title="Mở Discussion Mới" open={showCreate} onClose={() => setShowCreate(false)}>
        <Field label="Tiêu đề"><VibInput value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="Chủ đề thảo luận" /></Field>
        <Field label="Nội dung" required>
          <VibTextarea value={createForm.content} onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Mô tả vấn đề / câu hỏi cần thảo luận..." />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Người tạo"><VibInput value={createForm.raised_by} onChange={e => setCreateForm(f => ({ ...f, raised_by: e.target.value }))} placeholder="Tên stakeholder" /></Field>
          <Field label="Doc ID liên quan"><VibInput value={createForm.doc_id} onChange={e => setCreateForm(f => ({ ...f, doc_id: e.target.value }))} placeholder="UUID document (tuỳ chọn)" /></Field>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn onClick={submitCreate} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Tạo</Btn>
          <Btn variant="ghost" onClick={() => setShowCreate(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
        </div>
      </Modal>

      {resolving && (
        <Modal title="Resolve Discussion" open={!!resolving} onClose={() => setResolving(null)}>
          <div className="card card-pad-sm" style={{ marginBottom: 16, background: 'var(--vib-neutral-50)' }}>
            <div className="vib-label">Vấn đề</div>
            <p style={{ marginTop: 6, fontSize: 13 }}>{resolving.content}</p>
          </div>
          <Field label="Cách giải quyết" required>
            <VibTextarea value={resolveForm.resolution} onChange={e => setResolveForm(f => ({ ...f, resolution: e.target.value }))} rows={4} placeholder="Mô tả cách đã giải quyết, kết luận..." />
          </Field>
          <Field label="Người giải quyết">
            <VibInput value={resolveForm.resolved_by} onChange={e => setResolveForm(f => ({ ...f, resolved_by: e.target.value }))} placeholder="Tên" />
          </Field>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Btn onClick={submitResolve} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Resolve</Btn>
            <Btn variant="ghost" onClick={() => setResolving(null)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Timeline Tab ─────────────────────────────────────────────────
function TimelineTab({ projectId }: { projectId: string }) {
  const { addToast } = useStore()
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setTimeline(await getBATimeline(projectId)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [projectId, addToast])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="empty-state"><div>Đang tải timeline...</div></div>
  if (timeline.length === 0) return (
    <EmptyState icon="📅" title="Chưa có timeline" desc="Tạo milestones cho project trong PPG để xem timeline BA tại đây" />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {timeline.map((entry, idx) => {
        const ms = entry.milestone
        const tasks = entry.ba_tasks || []
        const doneCount = tasks.filter(t => t.status === 'done').length
        const progress = tasks.length > 0 ? Math.round(doneCount / tasks.length * 100) : 0
        return (
          <div key={idx} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px',
              background: ms ? 'var(--vib-primary)' : 'var(--vib-neutral-200)',
              color: ms ? '#fff' : 'var(--vib-neutral-500)',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <Calendar size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{ms ? ms.name : 'Chưa gán milestone'}</div>
                {ms && (
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                    {ms.start_date && new Date(ms.start_date).toLocaleDateString('vi-VN')}
                    {ms.end_date && ` → ${new Date(ms.end_date).toLocaleDateString('vi-VN')}`}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>{doneCount}/{tasks.length} tasks</div>
                {tasks.length > 0 && <div style={{ opacity: 0.85 }}>{progress}%</div>}
              </div>
            </div>
            {tasks.length > 0 && (
              <div style={{ height: 4, background: 'var(--vib-neutral-200)' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--vib-success)' : 'var(--vib-primary)', transition: 'width 0.3s' }} />
              </div>
            )}
            {tasks.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--vib-neutral-400)' }}>Chưa có BA task nào cho milestone này</div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {tasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: '1px solid var(--vib-neutral-100)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: TASK_STATUS_COLOR[t.status] || 'var(--vib-neutral-300)' }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{t.title}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: TASK_STATUS_COLOR[t.status] + '22', color: TASK_STATUS_COLOR[t.status], fontWeight: 600 }}>
                      {t.status?.replace('_', ' ')}
                    </span>
                    {t.assigned_to && <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>👤 {t.assigned_to}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main BA Page ──────────────────────────────────────────────────
type TabId = 'docs' | 'reqs' | 'tasks' | 'discussions' | 'timeline'

export default function BAPage() {
  const { documents, setDocuments, addToast, selectedProject } = useStore()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('docs')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReqModal, setShowReqModal] = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDocuments(
        selectedProject?.id || undefined,
        undefined,
        undefined
      )
      setDocuments(data)
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [selectedProject, setDocuments, addToast])

  const loadReqs = useCallback(async () => {
    try { setRequirements(await getRequirements(selectedProject?.id)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [selectedProject, addToast])

  useEffect(() => { loadDocs(); loadReqs() }, [loadDocs, loadReqs])

  const projectOnlyTabs: TabId[] = ['tasks', 'discussions', 'timeline']
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'docs', label: 'Documents', count: documents.length },
    { id: 'reqs', label: 'Requirements', count: requirements.length },
    { id: 'tasks', label: 'BA Tasks' },
    { id: 'discussions', label: 'Discussions' },
    { id: 'timeline', label: 'Timeline' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Btn variant="ghost" size="sm" onClick={() => { loadDocs(); loadReqs() }}><RefreshCw size={14} /></Btn>
      </div>

      {selectedProject && (
        <div className="state-banner state-banner-ok" style={{ marginBottom: 16 }}>
          📁 Project: <strong>{selectedProject.name}</strong> — Đang xem dữ liệu theo project này
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--vib-neutral-200)', marginBottom: 16 }}>
        {tabs.map(tab => {
          const disabled = projectOnlyTabs.includes(tab.id) && !selectedProject
          return (
            <button key={tab.id}
              onClick={() => !disabled && setActiveTab(tab.id)}
              disabled={disabled}
              title={disabled ? 'Chọn project trong PPG để sử dụng tính năng này' : undefined}
              style={{
                padding: '10px 20px', fontWeight: 600, fontSize: 13, border: 'none', background: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
                color: activeTab === tab.id ? 'var(--vib-primary)' : 'var(--vib-neutral-500)',
                borderBottom: activeTab === tab.id ? '2px solid var(--vib-primary)' : '2px solid transparent',
              }}>
              {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
            </button>
          )
        })}
      </div>

      {activeTab === 'docs' && (() => {
        const displayDocs = documents.filter(doc =>
          (!typeFilter || doc.doc_type === typeFilter) &&
          (!statusFilter || doc.status === statusFilter)
        )
        return (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['', 'BRD', 'BRS', 'ERD', 'API'] as const).map(t => {
              const isActive = typeFilter === t
              const count = t === '' ? documents.length : documents.filter(d => d.doc_type === t).length
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font)', fontSize: 13, fontWeight: isActive ? 700 : 400,
                    background: isActive ? 'var(--vib-primary)' : 'var(--vib-neutral-100)',
                    color: isActive ? '#fff' : 'var(--vib-neutral-600)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t || 'Tất cả loại'}
                  <span style={{
                    fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center',
                    padding: '1px 5px', borderRadius: 10,
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--vib-neutral-200)',
                    color: isActive ? '#fff' : 'var(--vib-neutral-500)',
                  }}>{count}</span>
                </button>
              )
            })}
            <div style={{ marginLeft: 12, display: 'flex', gap: 8 }}>
              {['', 'draft', 'review', 'approved'].map(s => (
                <Btn key={s} variant={statusFilter === s ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter(s)}>
                  {s || 'Tất cả status'}
                </Btn>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <Btn variant="secondary" size="sm" onClick={() => setShowReqModal(true)}><Plus size={14} /> Requirement</Btn>
            <Btn size="sm" onClick={() => setShowDocModal(true)}><Plus size={14} /> Document</Btn>
          </div>
          {loading ? (
            <div className="empty-state"><div>Đang tải...</div></div>
          ) : displayDocs.length === 0 ? (
            <EmptyState icon="📄" title="Chưa có document nào" action={<Btn onClick={() => setShowDocModal(true)}><Plus size={14} /> Tạo Document</Btn>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayDocs.map(doc => (
                <div key={doc.id} className="card card-pad-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  onClick={() => setSelectedDoc(doc)}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: DOC_COLORS[doc.doc_type] || 'var(--vib-primary)', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0
                  }}>{doc.doc_type}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span className="txt_s_xxs">{doc.title}</span>
                      <StatusBadge status={doc.status} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>
                      {doc.version} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString('vi-VN') : ''}
                      {doc.approved_by && <span> · ✓ {doc.approved_by}</span>}
                    </div>
                  </div>
                  {doc.pushed_at && <div style={{ fontSize: 11, color: 'var(--vib-success)', flexShrink: 0 }}>📤 Pushed</div>}
                  <div style={{ color: 'var(--vib-neutral-400)' }}><ArrowRight size={16} /></div>
                </div>
              ))}
            </div>
          )}
        </>
        )
      })()}

      {activeTab === 'reqs' && (
        requirements.length === 0 ? (
          <EmptyState icon="📝" title="Chưa có requirement nào" action={<Btn onClick={() => setShowReqModal(true)}><Plus size={14} /> Tạo Requirement</Btn>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requirements.map(r => (
              <div key={r.id} className="card card-pad-sm" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="txt_s_xxs">{r.title}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.raw_text && <p className="txt_r_xxxs text-muted" style={{ maxWidth: 600 }}>{r.raw_text.slice(0, 120)}...</p>}
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-400)', marginTop: 4 }}>
                    {r.created_by} · {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : ''}
                  </div>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => setShowDocModal(true)}>
                  <FileText size={13} /> Tạo Doc
                </Btn>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'tasks' && selectedProject && <BaTasksTab projectId={selectedProject.id} />}
      {activeTab === 'discussions' && selectedProject && <DiscussionsTab projectId={selectedProject.id} />}
      {activeTab === 'timeline' && selectedProject && <TimelineTab projectId={selectedProject.id} />}

      <RequirementModal open={showReqModal} onClose={() => setShowReqModal(false)} onSaved={loadReqs} />
      <DocumentModal open={showDocModal} onClose={() => setShowDocModal(false)} onSaved={loadDocs} />
      {selectedDoc && <DocumentDetailModal doc={selectedDoc} open={!!selectedDoc} onClose={() => setSelectedDoc(null)} onUpdated={loadDocs} />}
    </div>
  )
}
