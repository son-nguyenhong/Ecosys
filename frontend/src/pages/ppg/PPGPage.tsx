import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, RefreshCw, Calendar, Trash2, Edit,
  Zap, FileText, MessageSquare, ChevronRight, Download,
  Upload, ExternalLink, Clock, Copy,
} from 'lucide-react'
import {
  getProjects, createProject, updateProject, archiveProject,
  getAnnualPlans,
  getMilestones, updateMilestone, regenerateMilestones,
  getMembers, createMember, updateMember, deleteMember,
  getFiles, createFile, updateFile, deleteFile, getFileVersions, uploadFileVersion, copyFromUrl, getFileDownloadUrl,
  getMeetings, generateMeeting, getMeeting,
  getPublishStatus, triggerPublish, unpublish,
  exportProject, importProject,
  getProjectDomains,
  getActivityTasks, patchActivityTask, createActivityTask,
  type Project, type AnnualPlan, type Milestone, type Member, type ProjectFile,
  type FileVersion, type Meeting, type PublishJob, type ProjectDomain,
  type ActivityTask, type ActivityDomain, type ActivityStatus,
} from '../../api/ppg'
import { useStore } from '../../stores/auth'
import {
  Badge, StatusBadge, Btn, Modal, Field, VibInput, VibSelect,
  VibTextarea, EmptyState, Confirm,
} from '../../components/ui'
import ProjectPCRTab from './ProjectPCRTab'

type Tab = 'projects' | 'overview' | 'milestones' | 'members' | 'files' | 'meetings' | 'publish' | 'checklist' | 'pcr'

const MILESTONE_STATUS_COLOR: Record<string, string> = {
  planned:     'var(--vib-neutral-400)',
  in_progress: 'var(--vib-primary)',
  completed:   'var(--vib-success)',
  delayed:     'var(--vib-danger)',
}
const MILESTONE_TYPE_ICON: Record<string, string> = {
  kickoff: '🚀', requirements: '📋', design: '🏗️', development: '💻',
  sit: '🔬', uat: '✅', golive: '🚀', hypercare: '🛡️', closure: '📦',
}

// ══════════════════════════════════════════════════════════════════
// 1. PROJECT MODAL
// ══════════════════════════════════════════════════════════════════
function ProjectModal({ open, onClose, onSaved, editing, plans, domains }: {
  open: boolean; onClose: () => void; onSaved: () => void
  editing?: Project; plans: AnnualPlan[]; domains: ProjectDomain[]
}) {
  const { addToast } = useStore()
  const [form, setForm] = useState({
    code: '', name: '', description: '', status: 'active',
    owner: '', start_date: '', end_date: '', plan_id: '', domain_code: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code || '', name: editing.name || '',
        description: editing.description || '', status: editing.status || 'active',
        owner: editing.owner || '', start_date: editing.start_date?.slice(0, 10) || '',
        end_date: editing.end_date?.slice(0, 10) || '', plan_id: editing.plan_id || '',
        domain_code: editing.domain_code || '',
      })
    } else {
      setForm({ code: '', name: '', description: '', status: 'active', owner: '', start_date: '', end_date: '', plan_id: '', domain_code: '' })
    }
  }, [editing, open])

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.code || !form.name) return addToast('Cần nhập Code và Tên project', 'warn')
    setSaving(true)
    try {
      const payload = {
        ...form,
        plan_id: form.plan_id || undefined,
        domain_code: form.domain_code || undefined,
      }
      if (editing) {
        await updateProject(editing.id, payload)
        addToast('Đã cập nhật project', 'success')
      } else {
        await createProject(payload)
        addToast('Đã tạo project + milestones tự động', 'success')
      }
      onSaved(); onClose()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={editing ? 'Chỉnh sửa Project' : 'Tạo Project Mới'} open={open} onClose={onClose} width="660px">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Mã Project" required>
          <VibInput value={form.code} onChange={s('code')} placeholder="PRJ-001" readOnly={!!editing} />
        </Field>
        <Field label="Trạng thái">
          <VibSelect value={form.status} onChange={s('status')}>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </VibSelect>
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Domain" required>
          <VibSelect value={form.domain_code} onChange={s('domain_code')}>
            <option value="">— Chọn Domain —</option>
            {domains.map(d => (
              <option key={d.code} value={d.code}>{d.code} · {d.name}</option>
            ))}
          </VibSelect>
        </Field>
        <Field label="Gán Kế hoạch năm">
          <VibSelect value={form.plan_id} onChange={s('plan_id')}>
            <option value="">— Không gán —</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.year} · {p.name}</option>)}
          </VibSelect>
        </Field>
      </div>
      <Field label="Tên Project" required>
        <VibInput value={form.name} onChange={s('name')} placeholder="Tên đầy đủ" />
      </Field>
      <Field label="Owner">
        <VibInput value={form.owner} onChange={s('owner')} placeholder="Tên PM" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Ngày bắt đầu">
          <VibInput type="date" value={form.start_date} onChange={s('start_date')} />
        </Field>
        <Field label="Ngày kết thúc">
          <VibInput type="date" value={form.end_date} onChange={s('end_date')} />
        </Field>
      </div>
      <Field label="Mô tả">
        <VibInput value={form.description} onChange={s('description')} placeholder="Mô tả ngắn" />
      </Field>
      {!editing && (
        <div className="state-banner state-banner-info" style={{ fontSize: 12, marginTop: 4 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>✨ Tự động tạo khi khởi tạo project:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <span>📍 Milestones (Kickoff → Closure)</span>
            <span>📋 BRD + FRD templates</span>
            <span>🧪 Test Plan + Test Case templates</span>
            <span>📝 Meeting Minutes template</span>
            <span>👥 Khung danh sách thành viên</span>
            <span>🚀 Go-Live checklist</span>
            <span>📁 Thư mục BA (domain/project/BA/)</span>
            <span>📁 Thư mục Tester (domain/project/Tester/)</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Btn onClick={submit} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>
          {editing ? 'Cập nhật' : 'Tạo Project'}
        </Btn>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════
// 2. OVERVIEW TAB — Tổng quan dự án
// ══════════════════════════════════════════════════════════════════
function OverviewTab({ project, annualPlans, onNavigate }: {
  project: Project
  annualPlans: AnnualPlan[]
  onNavigate: (tab: Tab) => void
}) {
  const { addToast } = useStore()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportProject(project.id, project.code)
      addToast('Đã tải file XLSX', 'success')
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setExporting(false) }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await importProject(project.id, file)
      const errCount = result.errors?.length ?? 0
      addToast(
        errCount > 0 ? `Import xong — ${errCount} lỗi` : 'Import thành công',
        errCount > 0 ? 'warn' : 'success'
      )
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setImporting(false); e.target.value = '' }
  }

  useEffect(() => {
    getMilestones(project.id).catch(() => [])
      .then(ms => setMilestones(ms as Milestone[]))
      .catch(e => addToast((e as Error).message, 'error'))
  }, [project.id, addToast])

  const linkedPlan = annualPlans.find(p => p.id === project.plan_id)

  const daysDiff = (a?: string, b?: string) => {
    if (!a || !b) return null
    const diff = (new Date(b).getTime() - new Date(a).getTime()) / 86400000
    return Math.round(diff)
  }
  const duration = daysDiff(project.start_date, project.end_date)
  const elapsed = daysDiff(project.start_date, new Date().toISOString().slice(0, 10))
  const progressPct = duration && elapsed !== null ? Math.min(100, Math.max(0, Math.round(elapsed / duration * 100))) : 0

  const STATUS_COLOR: Record<string, string> = {
    active: 'var(--vib-success)', on_hold: 'var(--vib-warning)',
    completed: 'var(--vib-info)', archived: 'var(--vib-neutral-400)',
  }

  // Auto-created templates info
  const DOC_TEMPLATES = [
    { icon: '📋', name: 'BRD Template', cat: 'BRD' },
    { icon: '📐', name: 'FRD Template', cat: 'FRD' },
    { icon: '🧪', name: 'Test Plan Template', cat: 'TestPlan' },
    { icon: '✅', name: 'Test Case Template', cat: 'TestCase' },
    { icon: '📝', name: 'Meeting Minutes', cat: 'MeetingMinutes' },
    { icon: '🚀', name: 'Go-Live Checklist', cat: 'Deployment' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Project header card */}
      <div className="card card-pad" style={{ borderLeft: `5px solid ${STATUS_COLOR[project.status] || 'var(--vib-neutral-300)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
              <span className="txt_mono" style={{ fontSize: 13, color: 'var(--vib-neutral-500)', fontWeight: 600 }}>{project.code}</span>
              <StatusBadge status={project.status} />
              {project.domain_code && (
                <span style={{ fontSize: 11, background: 'var(--vib-warning)20', color: 'var(--vib-warning)', padding: '2px 8px', borderRadius: 10, fontWeight: 700, border: '1px solid var(--vib-warning)40' }}>
                  🏢 {project.domain_code}
                </span>
              )}
              {linkedPlan && (
                <span style={{ fontSize: 11, background: 'var(--vib-primary)15', color: 'var(--vib-primary)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  📅 {linkedPlan.year} · {linkedPlan.name}
                </span>
              )}
            </div>
            <h2 style={{ marginBottom: 4, fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{project.name}</h2>
            {project.description && <p className="txt_r_xxs text-muted">{project.description}</p>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {project.owner && (
              <div style={{ fontSize: 12, color: 'var(--vib-neutral-600)', marginBottom: 4 }}>
                👤 <strong>{project.owner}</strong>
              </div>
            )}
            {project.start_date && (
              <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>
                📅 {project.start_date.slice(0, 10)} → {project.end_date?.slice(0, 10) || '...'}
                {duration !== null && <span style={{ marginLeft: 6, color: 'var(--vib-primary)' }}>({duration} ngày)</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
              <Btn size="sm" loading={exporting} onClick={handleExport}>
                <Download size={13} /> Export XLSX
              </Btn>
              <label style={{ cursor: importing ? 'not-allowed' : 'pointer' }}>
                <Btn size="sm" variant="ghost" loading={importing} onClick={() => {}}>
                  <Upload size={13} /> Import XLSX
                </Btn>
                <input type="file" accept=".xlsx" style={{ display: 'none' }} disabled={importing} onChange={handleImport} />
              </label>
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        {duration !== null && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 4 }}>
              <span>Tiến độ thời gian</span>
              <span>{progressPct}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--vib-neutral-100)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct >= 90 ? 'var(--vib-danger)' : progressPct >= 70 ? 'var(--vib-warning)' : 'var(--vib-primary)', borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Milestone mini timeline */}
      {milestones.length > 0 && (
        <div className="card card-pad-sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span className="txt_s_xxs">Timeline</span>
            <Btn variant="ghost" size="sm" onClick={() => onNavigate('milestones')}>Xem chi tiết →</Btn>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {milestones.slice(0, 6).map(ms => (
              <div key={ms.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>{MILESTONE_TYPE_ICON[ms.milestone_type || ''] || '·'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>{ms.end_date?.slice(0, 10)}</div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 8, fontWeight: 600,
                  background: `${MILESTONE_STATUS_COLOR[ms.status]}20`,
                  color: MILESTONE_STATUS_COLOR[ms.status],
                }}>{ms.status}</span>
              </div>
            ))}
            {milestones.length > 6 && (
              <div style={{ fontSize: 11, color: 'var(--vib-neutral-400)', textAlign: 'center' }}>+ {milestones.length - 6} milestones nữa</div>
            )}
          </div>
        </div>
      )}

      {/* Auto-created doc templates info */}
      <div className="card card-pad-sm" style={{ background: 'var(--vib-primary)08' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span className="txt_s_xxs">Khung tài liệu dự án</span>
          <Btn variant="ghost" size="sm" onClick={() => onNavigate('files')}>Quản lý tài liệu →</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {DOC_TEMPLATES.map(t => (
            <div key={t.cat} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid var(--vib-neutral-200)' }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: 'var(--vib-neutral-400)' }}>{t.cat}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// 3. MILESTONES TAB
// ══════════════════════════════════════════════════════════════════
function MilestonesTab({ project }: { project: Project }) {
  const { addToast } = useStore()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setMilestones(await getMilestones(project.id)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [project.id, addToast])

  useEffect(() => { load() }, [load])

  const regenerate = async () => {
    setGenerating(true)
    try {
      const res = await regenerateMilestones(project.id)
      addToast(`Đã tạo ${res.length} milestones`, 'success')
      load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setGenerating(false) }
  }

  const updateStatus = async (ms: Milestone, status: string) => {
    try { await updateMilestone(project.id, ms.id, { status }); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const totalDays = project.start_date && project.end_date
    ? Math.max(1, (new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / 86400000)
    : 0

  const pct = (d?: string) => {
    if (!d || !project.start_date || !totalDays) return 0
    return Math.min(100, Math.max(0,
      (new Date(d).getTime() - new Date(project.start_date).getTime()) / 86400000 / totalDays * 100
    ))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 className="txt_s_xxs">Timeline — {project.name}</h3>
          <span className="txt_r_xxxs text-muted">
            {project.start_date?.slice(0, 10)} → {project.end_date?.slice(0, 10) || '...'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={load}><RefreshCw size={14} /></Btn>
          <Btn size="sm" loading={generating} onClick={regenerate}>
            <Zap size={13} /> Regenerate
          </Btn>
        </div>
      </div>

      {totalDays > 0 && (
        <div style={{ position: 'relative', height: 32, background: 'var(--vib-neutral-100)', borderRadius: 8, marginBottom: 20, overflow: 'hidden' }}>
          {milestones.map(ms => {
            const left = pct(ms.start_date)
            const width = Math.max(1, pct(ms.end_date) - left)
            const color = MILESTONE_STATUS_COLOR[ms.status] || 'var(--vib-neutral-400)'
            return (
              <div key={ms.id} title={ms.name} style={{
                position: 'absolute', top: 4, height: 24,
                left: `${left}%`, width: `${width}%`,
                background: color, borderRadius: 4, opacity: 0.85,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', fontWeight: 600,
                overflow: 'hidden', whiteSpace: 'nowrap', padding: '0 4px',
                minWidth: 20,
              }}>
                {MILESTONE_TYPE_ICON[ms.milestone_type || ''] || '·'}
              </div>
            )
          })}
        </div>
      )}

      {loading ? <div className="empty-state">Đang tải...</div> :
        milestones.length === 0 ? (
          <EmptyState icon="📍" title="Chưa có milestones"
            desc="Nhấn Regenerate để tự động tạo theo timeline dự án"
            action={<Btn onClick={regenerate} loading={generating}><Zap size={13} /> Tạo milestones</Btn>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {milestones.map((ms, idx) => (
              <div key={ms.id} className="card card-pad-sm" style={{
                borderLeft: `4px solid ${MILESTONE_STATUS_COLOR[ms.status]}`,
                display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 12, alignItems: 'start',
              }}>
                <div style={{ fontSize: 20, textAlign: 'center', paddingTop: 2 }}>
                  {MILESTONE_TYPE_ICON[ms.milestone_type || ''] || String(idx + 1)}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span className="txt_r_xxs" style={{ fontWeight: 700 }}>{ms.name}</span>
                    <StatusBadge status={ms.status} />
                  </div>
                  <div className="txt_r_xxxs text-muted">
                    <Calendar size={11} style={{ display: 'inline', marginRight: 3 }} />
                    {ms.start_date?.slice(0, 10)} → {ms.end_date?.slice(0, 10)}
                  </div>
                  {ms.done_criteria && (
                    <div className="txt_r_xxxs text-muted" style={{ marginTop: 4 }}>✓ {ms.done_criteria}</div>
                  )}
                  {Array.isArray(ms.preconditions) && ms.preconditions.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {ms.preconditions.map((pre, i) => (
                        <span key={i} style={{ fontSize: 10, background: 'var(--vib-neutral-100)', padding: '1px 6px', borderRadius: 8 }}>{pre}</span>
                      ))}
                    </div>
                  )}
                </div>
                <VibSelect value={ms.status} style={{ fontSize: 11, padding: '2px 6px', width: 110 }}
                  onChange={e => updateStatus(ms, e.target.value)}>
                  {['planned','in_progress','completed','delayed'].map(s => <option key={s} value={s}>{s}</option>)}
                </VibSelect>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// 4. MEMBERS TAB
// ══════════════════════════════════════════════════════════════════
function MembersTab({ project }: { project: Project }) {
  const { addToast } = useStore()
  const [members, setMembers] = useState<Member[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Member | undefined>()
  const [form, setForm] = useState({ full_name: '', alias: '', email: '', role: 'BA' })
  const [confirm, setConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setMembers(await getMembers(project.id)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [project.id, addToast])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.full_name) return addToast('Cần nhập họ tên', 'warn')
    try {
      if (editing) {
        await updateMember(project.id, editing.id, form)
        addToast('Đã cập nhật thành viên', 'success')
      } else {
        await createMember(project.id, form)
        addToast('Đã thêm thành viên', 'success')
      }
      setShowModal(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const doDelete = async (id: string) => {
    try { await deleteMember(project.id, id); addToast('Đã xoá', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    setConfirm(null)
  }

  const ROLES = ['PM', 'BA', 'Dev Lead', 'Developer', 'QA Lead', 'QA', 'PO', 'Stakeholder', 'DevOps']
  const ROLE_COLORS: Record<string, string> = {
    PM: '#0066B3', BA: '#1B7A3F', 'Dev Lead': '#6B21A8', Developer: '#6B21A8',
    'QA Lead': '#C97A00', QA: '#C97A00', PO: '#0066B3', Stakeholder: '#64748b',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 className="txt_s_xxs">Thành viên — {project.name}</h3>
          <span className="txt_r_xxxs text-muted">{members.length} thành viên</span>
        </div>
        <Btn size="sm" onClick={() => { setEditing(undefined); setForm({ full_name: '', alias: '', email: '', role: 'BA' }); setShowModal(true) }}>
          <Plus size={13} /> Thêm thành viên
        </Btn>
      </div>

      {members.length === 0 ? (
        <EmptyState icon="👥" title="Chưa có thành viên" desc="Thêm thành viên để dùng alias trong biên bản họp" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {members.map(m => (
            <div key={m.id} className="card card-pad-sm" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `${ROLE_COLORS[m.role || ''] || 'var(--vib-primary)'}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: ROLE_COLORS[m.role || ''] || 'var(--vib-primary)',
              }}>
                {m.full_name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="txt_r_xxs" style={{ fontWeight: 600 }}>{m.full_name}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                  {m.role && <Badge variant="info">{m.role}</Badge>}
                  {m.alias && <span className="txt_mono" style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>@{m.alias}</span>}
                </div>
                {m.email && <div className="txt_r_xxxs text-muted" style={{ marginTop: 2 }}>{m.email}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Btn variant="ghost" size="sm" onClick={() => {
                  setEditing(m)
                  setForm({ full_name: m.full_name, alias: m.alias || '', email: m.email || '', role: m.role || 'BA' })
                  setShowModal(true)
                }}><Edit size={12} /></Btn>
                <Btn variant="ghost" size="sm" onClick={() => setConfirm(m.id)}><Trash2 size={12} /></Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title={editing ? 'Sửa thành viên' : 'Thêm thành viên'} open={showModal} onClose={() => setShowModal(false)}>
        <Field label="Họ và tên" required><VibInput value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Alias (dùng trong note: @alias)">
            <VibInput value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} placeholder="vd: nam, thaoba" />
          </Field>
          <Field label="Vai trò">
            <VibSelect value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </VibSelect>
          </Field>
        </div>
        <Field label="Email"><VibInput type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn onClick={save} style={{ flex: 1, justifyContent: 'center' }}>{editing ? 'Cập nhật' : 'Thêm'}</Btn>
          <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
        </div>
      </Modal>
      <Confirm open={!!confirm} message="Xoá thành viên khỏi dự án?" onConfirm={() => confirm && doDelete(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// 5. FILES TAB
// ══════════════════════════════════════════════════════════════════
function FilesTab({ project }: { project: Project }) {
  const { addToast } = useStore()
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showVersions, setShowVersions] = useState<ProjectFile | null>(null)
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [filterMs, setFilterMs] = useState<string>('')
  const [form, setForm] = useState({ name: '', file_type: 'external_url', doc_category: '', current_version: 'v0.1', external_url: '', milestone_id: '' })
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [renamingFile, setRenamingFile] = useState<ProjectFile | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const [f, ms] = await Promise.all([
        getFiles(project.id, filterMs || undefined),
        getMilestones(project.id),
      ])
      setFiles(f); setMilestones(ms)
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [project.id, filterMs, addToast])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name) return addToast('Cần nhập tên file', 'warn')
    try {
      await createFile(project.id, { ...form, milestone_id: form.milestone_id || undefined })
      addToast('Đã thêm file', 'success'); setShowModal(false); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const doDelete = async (id: string) => {
    try { await deleteFile(project.id, id); addToast('Đã xoá', 'success'); load() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    setConfirm(null)
  }

  const viewVersions = async (f: ProjectFile) => {
    setShowVersions(f)
    try { setVersions(await getFileVersions(project.id, f.id)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const bumpVersion = (ver: string) => {
    try {
      const parts = ver.replace(/^v/, '').split('.')
      parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1)
      return 'v' + parts.join('.')
    } catch { return ver + '.1' }
  }

  const doUpload = async (f: ProjectFile, fileInput: File) => {
    setUploadingId(f.id)
    const nextV = bumpVersion(f.current_version)
    try {
      await uploadFileVersion(project.id, f.id, fileInput, nextV)
      addToast(`Đã upload ${nextV}`, 'success'); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setUploadingId(null) }
  }

  const doCopyFromUrl = async (f: ProjectFile) => {
    if (!f.external_url) return addToast('File không có external URL', 'warn')
    setCopyingId(f.id)
    try {
      await copyFromUrl(project.id, f.id, { external_url: f.external_url, change_note: 'Copied from URL' })
      addToast('Đã tạo version từ URL', 'success'); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setCopyingId(null) }
  }

  const doRename = async () => {
    if (!renamingFile || !renameValue.trim()) return
    try {
      await updateFile(project.id, renamingFile.id, { name: renameValue.trim() })
      addToast('Đã đổi tên', 'success'); setRenamingFile(null); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const FILE_TYPE_ICON: Record<string, string> = { template: '📄', uploaded: '📁', external_url: '🔗' }
  const STATUS_COLORS: Record<string, string> = { draft: 'neutral', review: 'warning', approved: 'success', final: 'info' }
  const msName = (id?: string) => milestones.find(m => m.id === id)?.name

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="txt_s_xxs">Tài liệu — {project.name}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={load}><RefreshCw size={14} /></Btn>
          <Btn size="sm" onClick={() => { setForm({ name: '', file_type: 'external_url', doc_category: '', current_version: 'v0.1', external_url: '', milestone_id: '' }); setShowModal(true) }}>
            <Plus size={13} /> Thêm file
          </Btn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <Btn variant={filterMs === '' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterMs('')}>Tất cả</Btn>
        {milestones.map(ms => (
          <Btn key={ms.id} variant={filterMs === ms.id ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterMs(ms.id)}>
            {MILESTONE_TYPE_ICON[ms.milestone_type || ''] || ''} {ms.name}
          </Btn>
        ))}
      </div>

      {files.length === 0 ? (
        <EmptyState icon="📂" title="Chưa có tài liệu" desc="Attach URL (ADO/SharePoint) hoặc upload file mới" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map(f => (
            <div key={f.id} className="card card-pad-sm" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{FILE_TYPE_ICON[f.file_type] || '📄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="txt_r_xxs" style={{ fontWeight: 600 }}>{f.name}</span>
                  <span className="txt_mono" style={{ fontSize: 11, color: 'var(--vib-primary)' }}>{f.current_version}</span>
                  <Badge variant={(STATUS_COLORS[f.status] as never) || 'neutral'}>{f.status}</Badge>
                </div>
                <div className="txt_r_xxxs text-muted" style={{ marginTop: 2 }}>
                  {f.doc_category && <span style={{ marginRight: 8 }}>{f.doc_category}</span>}
                  {msName(f.milestone_id) && <span>· {msName(f.milestone_id)}</span>}
                </div>
                {f.external_url && (
                  <a href={f.external_url} target="_blank" rel="noreferrer" className="txt_r_xxxs" style={{ color: 'var(--vib-primary)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                    <ExternalLink size={10} /> {f.external_url.length > 60 ? f.external_url.slice(0, 60) + '…' : f.external_url}
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ghost" size="sm" title="Xem versions" onClick={() => viewVersions(f)}>
                  <Clock size={12} />
                </Btn>
                <Btn variant="ghost" size="sm" title="Đổi tên" onClick={() => { setRenamingFile(f); setRenameValue(f.name) }}>
                  <Edit size={12} />
                </Btn>
                {f.external_url && !f.storage_path && (
                  <Btn variant="ghost" size="sm" title="Tải về từ URL" loading={copyingId === f.id} onClick={() => doCopyFromUrl(f)}>
                    <Copy size={12} />
                  </Btn>
                )}
                {f.storage_path && (
                  <Btn variant="ghost" size="sm" title="Download" onClick={() => window.open(getFileDownloadUrl(project.id, f.id))}>
                    <Download size={12} />
                  </Btn>
                )}
                <label title="Upload version mới" style={{ cursor: 'pointer' }}>
                  <input ref={uploadRef} type="file" style={{ display: 'none' }} onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return
                    await doUpload(f, file)
                    e.target.value = ''
                  }} />
                  <Btn variant="ghost" size="sm" loading={uploadingId === f.id} style={{ pointerEvents: 'none' }}>
                    <Upload size={12} />
                  </Btn>
                </label>
                <Btn variant="ghost" size="sm" onClick={() => setConfirm(f.id)}><Trash2 size={12} /></Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title="Thêm tài liệu" open={showModal} onClose={() => setShowModal(false)}>
        <Field label="Tên file" required><VibInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="BRD_EmployeeModule_v0.1.docx" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Loại">
            <VibSelect value={form.file_type} onChange={e => setForm(f => ({ ...f, file_type: e.target.value }))}>
              <option value="external_url">External URL</option>
              <option value="template">Template</option>
            </VibSelect>
          </Field>
          <Field label="Version"><VibInput value={form.current_version} onChange={e => setForm(f => ({ ...f, current_version: e.target.value }))} /></Field>
          <Field label="Danh mục">
            <VibSelect value={form.doc_category} onChange={e => setForm(f => ({ ...f, doc_category: e.target.value }))}>
              <option value="">—</option>
              {['BRD','FRD','TestPlan','TestCase','MeetingMinutes','Signoff','Deployment','Charter','Closure'].map(c => <option key={c} value={c}>{c}</option>)}
            </VibSelect>
          </Field>
        </div>
        <Field label="Milestone">
          <VibSelect value={form.milestone_id} onChange={e => setForm(f => ({ ...f, milestone_id: e.target.value }))}>
            <option value="">— Không gán —</option>
            {milestones.map(ms => <option key={ms.id} value={ms.id}>{ms.name}</option>)}
          </VibSelect>
        </Field>
        <Field label="URL (ADO / SharePoint / File Server)">
          <VibInput value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} placeholder="https://..." />
        </Field>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn onClick={save} style={{ flex: 1, justifyContent: 'center' }}>Thêm</Btn>
          <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
        </div>
      </Modal>

      <Modal title={`Versions — ${showVersions?.name}`} open={!!showVersions} onClose={() => setShowVersions(null)}>
        {versions.length === 0 ? (
          <EmptyState icon="📋" title="Chưa có version nào" />
        ) : versions.map(v => (
          <div key={v.id} className="card card-pad-sm" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="txt_mono" style={{ fontWeight: 700 }}>{v.version}</span>
              <span className="txt_r_xxxs text-muted">{new Date(v.uploaded_at).toLocaleString('vi-VN')}</span>
            </div>
            <div className="txt_r_xxxs text-muted">{v.change_note || '—'} · {v.uploaded_by || 'N/A'}</div>
            {(v.storage_path || v.external_url) && showVersions && (
              <Btn variant="ghost" size="sm" style={{ marginTop: 6 }}
                onClick={() => window.open(getFileDownloadUrl(project.id, showVersions.id, v.version))}>
                <Download size={11} /> Download {v.version}
              </Btn>
            )}
          </div>
        ))}
        <Btn variant="ghost" onClick={() => setShowVersions(null)} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>Đóng</Btn>
      </Modal>

      <Modal title="Đổi tên tài liệu" open={!!renamingFile} onClose={() => setRenamingFile(null)}>
        <Field label="Tên mới" required>
          <VibInput value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="TenFile.md" autoFocus />
        </Field>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn onClick={doRename} style={{ flex: 1, justifyContent: 'center' }}>Lưu</Btn>
          <Btn variant="ghost" onClick={() => setRenamingFile(null)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
        </div>
      </Modal>

      <Confirm open={!!confirm} message="Xoá file này?" onConfirm={() => confirm && doDelete(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// 6. MEETING MINUTES TAB
// ══════════════════════════════════════════════════════════════════
function MeetingsTab({ project }: { project: Project }) {
  const { addToast } = useStore()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [showGenModal, setShowGenModal] = useState(false)
  const [viewMeeting, setViewMeeting] = useState<Meeting | null>(null)
  const [form, setForm] = useState({ raw_notes: '', meeting_date: '', location: '', milestone_id: '', created_by: '' })
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    try {
      const [m, ms] = await Promise.all([getMeetings(project.id), getMilestones(project.id)])
      setMeetings(m); setMilestones(ms)
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }, [project.id, addToast])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    if (!form.raw_notes.trim()) return addToast('Cần nhập nội dung họp', 'warn')
    setGenerating(true)
    try {
      const title = `Biên bản họp ${form.meeting_date || new Date().toLocaleDateString('vi-VN')}`
      const result = await generateMeeting(project.id, {
        title, meeting_date: form.meeting_date, raw_notes: form.raw_notes,
        location: form.location, milestone_id: form.milestone_id || undefined, created_by: form.created_by,
      })
      addToast('Đã tạo biên bản họp', 'success')
      setShowGenModal(false); setViewMeeting(result); load()
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setGenerating(false) }
  }

  const gc = viewMeeting?.generated_content

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="txt_s_xxs">Biên bản họp — {project.name}</h3>
        <Btn size="sm" onClick={() => { setForm({ raw_notes: '', meeting_date: '', location: '', milestone_id: '', created_by: '' }); setShowGenModal(true) }}>
          <MessageSquare size={13} /> Ghi note → Tạo biên bản
        </Btn>
      </div>

      {meetings.length === 0 ? (
        <EmptyState icon="📝" title="Chưa có biên bản" desc="Nhập note cuộc họp và AI sẽ tạo biên bản chuẩn" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {meetings.map(m => (
            <div key={m.id} className="card card-pad-sm" style={{ cursor: 'pointer' }} onClick={async () => {
              try { setViewMeeting(await getMeeting(project.id, m.id)) }
              catch (e: unknown) { addToast((e as Error).message, 'error') }
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="txt_r_xxs" style={{ fontWeight: 600 }}>{m.title}</div>
                  <div className="txt_r_xxxs text-muted">{m.meeting_date?.slice(0, 10)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Badge variant={m.status === 'final' ? 'success' : 'neutral'}>{m.status}</Badge>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title="Nhập note → Tạo Biên bản họp" open={showGenModal} onClose={() => setShowGenModal(false)} width="700px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Ngày họp"><VibInput type="date" value={form.meeting_date} onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))} /></Field>
          <Field label="Địa điểm"><VibInput value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Phòng họp A1 / Teams" /></Field>
          <Field label="Milestone">
            <VibSelect value={form.milestone_id} onChange={e => setForm(f => ({ ...f, milestone_id: e.target.value }))}>
              <option value="">—</option>
              {milestones.map(ms => <option key={ms.id} value={ms.id}>{ms.name}</option>)}
            </VibSelect>
          </Field>
        </div>
        <Field label="Nội dung note (raw)" required>
          <VibTextarea value={form.raw_notes} onChange={e => setForm(f => ({ ...f, raw_notes: e.target.value }))} rows={12}
            placeholder={`Ví dụ:\n@nam @thaoba @hungpm đã tham gia\n\nThảo luận về scope của module HR\nDecision: chốt release ngày 15/6\nAction: @nam chuẩn bị BRD draft -> 2026-04-20\nRisk: vendor chưa confirm API spec`} />
        </Field>
        <div className="state-banner state-banner-info" style={{ fontSize: 12, marginBottom: 8 }}>
          Dùng <code>@alias</code> để nhận diện thành viên · <code>Action:</code> / <code>Decision:</code> / <code>Risk:</code> để phân loại
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Btn onClick={generate} loading={generating} style={{ flex: 1, justifyContent: 'center' }}>
            <Zap size={13} /> Tạo biên bản
          </Btn>
          <Btn variant="ghost" onClick={() => setShowGenModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Hủy</Btn>
        </div>
      </Modal>

      <Modal title={viewMeeting?.title || 'Biên bản họp'} open={!!viewMeeting} onClose={() => setViewMeeting(null)} width="780px">
        {gc && (
          <>
            {gc.attendees && gc.attendees.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {gc.attendees.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--vib-neutral-100)', padding: '3px 10px', borderRadius: 16, fontSize: 12 }}>
                    <span>👤</span><span>{typeof a === 'string' ? a : (a as { display_name?: string }).display_name || String(a)}</span>
                  </div>
                ))}
              </div>
            )}
            {gc.decisions && gc.decisions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="txt_r_xxs" style={{ fontWeight: 700, marginBottom: 8 }}>✅ Quyết định</div>
                {gc.decisions.map((d, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--vib-neutral-100)', fontSize: 13 }}>• {d}</div>
                ))}
              </div>
            )}
            {gc.action_items && gc.action_items.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="txt_r_xxs" style={{ fontWeight: 700, marginBottom: 8 }}>⚡ Action Items</div>
                {gc.action_items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--vib-neutral-100)' }}>
                    <span style={{ color: 'var(--vib-primary)', fontSize: 14 }}>⚡</span>
                    <div style={{ flex: 1 }}>
                      <span className="txt_r_xxs">{item.action}</span>
                      {item.assignee && <span className="txt_mono" style={{ fontSize: 11, marginLeft: 8, color: 'var(--vib-primary)' }}>→ {item.assignee}</span>}
                      {item.due_date && <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--vib-warning)' }}>📅 {item.due_date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {gc.risks && gc.risks.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="txt_r_xxs" style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ Rủi ro</div>
                {gc.risks.map((r, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--vib-neutral-100)', fontSize: 13 }}>⚠️ {r}</div>
                ))}
              </div>
            )}
            {gc.suggestions && gc.suggestions.length > 0 && (
              <div style={{ background: 'var(--vib-primary)10', padding: 12, borderRadius: 8, marginTop: 8 }}>
                <div className="txt_r_xxs" style={{ fontWeight: 700, marginBottom: 6 }}>💡 Đề xuất liên quan</div>
                {gc.suggestions.map((s, i) => (
                  <div key={i} className="txt_r_xxs" style={{ marginBottom: 4 }}>• {s}</div>
                ))}
              </div>
            )}
          </>
        )}
        <Btn variant="ghost" onClick={() => setViewMeeting(null)} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>Đóng</Btn>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// 7. PUBLISH TAB — MkDocs stakeholder portal
// ══════════════════════════════════════════════════════════════════
const PUBLISH_CATS: Record<string, string> = {
  BRD: '📋 BRD', FRD: '📐 BRS/FRD', TestPlan: '🧪 Test Plan',
  TestCase: '✅ Test Cases', UserGuide: '📘 HDSD', Signoff: '✍️ Sign-off',
}

function PublishTab({ project }: { project: Project }) {
  const { addToast } = useStore()
  const [job, setJob] = useState<PublishJob | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [building, setBuilding] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)

  const loadStatus = useCallback(async () => {
    const [j, fs] = await Promise.all([
      getPublishStatus(project.id).catch(() => null),
      getFiles(project.id).catch(() => []),
    ])
    setJob(j)
    setFiles(fs as ProjectFile[])
  }, [project.id])

  useEffect(() => { loadStatus() }, [loadStatus])

  // Poll while building
  useEffect(() => {
    if (job?.status !== 'building') return
    const t = setInterval(async () => {
      const j = await getPublishStatus(project.id).catch(() => null)
      setJob(j)
      if (j?.status !== 'building') setBuilding(false)
    }, 3000)
    return () => clearInterval(t)
  }, [job?.status, project.id])

  const doPublish = async () => {
    setBuilding(true)
    try {
      const j = await triggerPublish(project.id)
      setJob({ status: 'building', job_id: j.job_id })
      addToast('Đang build documentation site…', 'info')
    } catch (e: unknown) { addToast((e as Error).message, 'error'); setBuilding(false) }
  }

  const doUnpublish = async () => {
    setUnpublishing(true)
    try {
      await unpublish(project.id)
      setJob({ status: 'never_published' })
      addToast('Đã gỡ publish', 'success')
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setUnpublishing(false) }
  }

  const finalFiles = files.filter(f => f.status === 'final' && f.doc_category && f.doc_category in PUBLISH_CATS)
  const siteUrl = job?.site_url ? `/sites/${job.site_url.replace(/^\/sites\//, '')}` : null

  const STATUS_BADGE: Record<string, { color: string; label: string }> = {
    never_published: { color: 'var(--vib-neutral-400)', label: 'Chưa publish' },
    building:        { color: 'var(--vib-warning)',     label: '⏳ Đang build…' },
    success:         { color: 'var(--vib-success)',     label: '✅ Published' },
    failed:          { color: 'var(--vib-danger)',      label: '❌ Build thất bại' },
  }
  const badge = STATUS_BADGE[job?.status ?? 'never_published']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Status card */}
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>📡</span>
            <h3 className="txt_s_xxs" style={{ margin: 0 }}>Stakeholder Documentation Portal</h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: badge.color, background: `${badge.color}18`, padding: '2px 10px', borderRadius: 10 }}>
              {badge.label}
            </span>
          </div>
          <p className="txt_r_xxxs text-muted" style={{ marginBottom: 8 }}>
            Publish tài liệu final (BRD / BRS / Test Cases / HDSD) thành static site MkDocs để stakeholder xem.
          </p>
          {job?.triggered_at && (
            <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>
              Lần cuối build: {new Date(job.triggered_at).toLocaleString('vi-VN')}
              {job.doc_count !== undefined && ` · ${job.doc_count} tài liệu`}
              {job.completed_at && ` · Hoàn thành: ${new Date(job.completed_at).toLocaleString('vi-VN')}`}
            </div>
          )}
          {job?.status === 'failed' && job.error_msg && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--vib-danger)', background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>
              {job.error_msg}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {siteUrl && job?.status === 'success' && (
            <Btn variant="primary" size="sm" onClick={() => window.open(siteUrl, '_blank')}>
              <ExternalLink size={13} /> Mở Site
            </Btn>
          )}
          <Btn size="sm" loading={building} onClick={doPublish} disabled={building || finalFiles.length === 0}>
            <Zap size={13} /> {job?.status === 'success' ? 'Re-publish' : 'Publish Now'}
          </Btn>
          {job?.status === 'success' && (
            <Btn variant="ghost" size="sm" loading={unpublishing} onClick={doUnpublish}>
              Gỡ publish
            </Btn>
          )}
        </div>
      </div>

      {/* Documents included */}
      <div className="card card-pad-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="txt_s_xxs">Tài liệu sẽ được publish ({finalFiles.length})</span>
          <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>Chỉ tài liệu có status = <strong>final</strong></span>
        </div>
        {finalFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--vib-neutral-400)', fontSize: 13 }}>
            Chưa có tài liệu nào ở trạng thái <strong>final</strong>.<br />
            Vào tab <strong>Tài liệu</strong> và đổi status → final để include vào site.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {finalFiles.map(f => (
              <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 8px', background: 'var(--vib-neutral-50)', borderRadius: 6 }}>
                <span style={{ fontSize: 16 }}>{PUBLISH_CATS[f.doc_category!]?.split(' ')[0] || '📄'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>
                    {PUBLISH_CATS[f.doc_category!] || f.doc_category} · {f.current_version}
                  </div>
                </div>
                {f.external_url && (
                  <a href={f.external_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--vib-primary)' }}>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Categories legend */}
      <div className="card card-pad-sm" style={{ background: 'var(--vib-primary)06' }}>
        <div className="txt_s_xxs" style={{ marginBottom: 10 }}>Categories được hỗ trợ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
          {Object.entries(PUBLISH_CATS).map(([cat, label]) => {
            const count = files.filter(f => f.doc_category === cat && f.status === 'final').length
            return (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: '#fff', borderRadius: 6, border: '1px solid var(--vib-neutral-200)', fontSize: 12 }}>
                <span>{label}</span>
                <span style={{ fontWeight: 700, color: count > 0 ? 'var(--vib-success)' : 'var(--vib-neutral-300)' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// CHECKLIST TAB — 5-domain governance activity tasks
// ══════════════════════════════════════════════════════════════════
const DOMAIN_META: Record<ActivityDomain, { label: string; icon: string; color: string }> = {
  business_requirements: { label: 'Business Requirements & Product', icon: '📋', color: '#1d4ed8' },
  architecture_code:     { label: 'Architecture & Code',             icon: '🏗️', color: '#7c3aed' },
  infrastructure:        { label: 'Infrastructure (AWS)',            icon: '☁️', color: '#0369a1' },
  security_iam:          { label: 'Security & IAM',                  icon: '🔐', color: '#b91c1c' },
  compliance_governance: { label: 'Compliance & Governance',         icon: '⚖️', color: '#92400e' },
}
const DOMAIN_ORDER: ActivityDomain[] = [
  'business_requirements', 'architecture_code',
  'infrastructure', 'security_iam', 'compliance_governance',
]
const STATUS_META: Record<ActivityStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending',      color: '#6b7280', bg: '#f3f4f6' },
  in_progress: { label: 'In Progress',  color: '#1d4ed8', bg: '#dbeafe' },
  done:        { label: 'Done',         color: '#15803d', bg: '#dcfce7' },
  skipped:     { label: 'Skipped',      color: '#92400e', bg: '#fef3c7' },
  na:          { label: 'N/A',          color: '#6b7280', bg: '#e5e7eb' },
}

function ChecklistTab({ project }: { project: Project }) {
  const { addToast } = useStore()
  const [tasks, setTasks] = useState<ActivityTask[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editAssignee, setEditAssignee] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setTasks(await getActivityTasks(project.id)) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [project.id, addToast])

  useEffect(() => { load() }, [load])

  const setStatus = async (task: ActivityTask, status: ActivityStatus) => {
    try {
      const updated = await patchActivityTask(project.id, task.id, { status })
      setTasks(ts => ts.map(t => t.id === updated.id ? updated : t))
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const saveEdit = async (task: ActivityTask) => {
    try {
      const updated = await patchActivityTask(project.id, task.id, {
        assignee: editAssignee || undefined,
        notes: editNotes || undefined,
      })
      setTasks(ts => ts.map(t => t.id === updated.id ? updated : t))
      setEditingId(null)
    } catch (e: unknown) { addToast((e as Error).message, 'error') }
  }

  const grouped = DOMAIN_ORDER.reduce<Record<ActivityDomain, ActivityTask[]>>((acc, d) => {
    acc[d] = tasks.filter(t => t.activity_domain === d)
    return acc
  }, {} as Record<ActivityDomain, ActivityTask[]>)

  const total = tasks.length
  const done  = tasks.filter(t => t.status === 'done').length
  const pct   = total > 0 ? Math.round(done / total * 100) : 0

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--vib-neutral-500)' }}>Đang tải...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Progress summary */}
      <div className="card card-pad-sm" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--vib-neutral-500)', marginBottom: 4 }}>
            <span>Tiến độ Governance Checklist</span>
            <span style={{ fontWeight: 700 }}>{done} / {total} tasks ({pct}%)</span>
          </div>
          <div style={{ height: 8, background: 'var(--vib-neutral-100)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--vib-success)' : 'var(--vib-primary)', borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {Object.entries(STATUS_META).map(([s, m]) => {
            const count = tasks.filter(t => t.status === s).length
            return count > 0 ? (
              <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, color: m.color, background: m.bg }}>
                {count} {m.label}
              </span>
            ) : null
          })}
        </div>
      </div>

      {/* Domain sections */}
      {DOMAIN_ORDER.map(domain => {
        const meta  = DOMAIN_META[domain]
        const dtasks = grouped[domain] ?? []
        const ddone  = dtasks.filter(t => t.status === 'done').length
        return (
          <div key={domain} className="card" style={{ borderTop: `3px solid ${meta.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--vib-neutral-100)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>{meta.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>{ddone}/{dtasks.length} done</span>
            </div>

            <div style={{ padding: '8px 0' }}>
              {dtasks.map(task => {
                const sm = STATUS_META[task.status]
                const isEditing = editingId === task.id
                return (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 16px', borderBottom: '1px solid var(--vib-neutral-50)',
                    background: task.status === 'done' ? '#f0fdf4' : task.status === 'na' ? '#f9fafb' : 'white',
                    opacity: task.status === 'na' ? 0.6 : 1,
                  }}>
                    {/* Status cycle button */}
                    <button
                      title={`Status: ${sm.label} — click to cycle`}
                      onClick={() => {
                        const cycle: ActivityStatus[] = ['pending', 'in_progress', 'done', 'skipped', 'na']
                        const next = cycle[(cycle.indexOf(task.status) + 1) % cycle.length]
                        setStatus(task, next)
                      }}
                      style={{
                        flexShrink: 0, marginTop: 2, width: 18, height: 18, borderRadius: '50%',
                        border: `2px solid ${sm.color}`, background: task.status === 'done' ? sm.color : 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {task.status === 'done' && <span style={{ fontSize: 9, color: 'white', fontWeight: 900 }}>✓</span>}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 13,
                          color: task.status === 'done' || task.status === 'na' ? 'var(--vib-neutral-400)' : 'var(--vib-neutral-800)',
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        }}>
                          {task.sort_order}. {task.title}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, color: sm.color, background: sm.bg, flexShrink: 0 }}>
                          {sm.label}
                        </span>
                        {task.assignee && (
                          <span style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>👤 {task.assignee}</span>
                        )}
                      </div>

                      {isEditing ? (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <input
                            placeholder="Assignee"
                            value={editAssignee}
                            onChange={e => setEditAssignee(e.target.value)}
                            style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--vib-neutral-200)', borderRadius: 4, width: '100%', maxWidth: 300 }}
                          />
                          <textarea
                            placeholder="Ghi chú..."
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            rows={2}
                            style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--vib-neutral-200)', borderRadius: 4, resize: 'vertical', width: '100%', maxWidth: 500 }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Btn size="sm" onClick={() => saveEdit(task)}>Lưu</Btn>
                            <Btn size="sm" variant="ghost" onClick={() => setEditingId(null)}>Hủy</Btn>
                          </div>
                        </div>
                      ) : (
                        task.notes && (
                          <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginTop: 2, fontStyle: 'italic' }}>
                            {task.notes}
                          </div>
                        )
                      )}
                    </div>

                    {/* Edit toggle */}
                    {!isEditing && (
                      <button
                        onClick={() => { setEditingId(task.id); setEditNotes(task.notes || ''); setEditAssignee(task.assignee || '') }}
                        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vib-neutral-400)', fontSize: 12, padding: '2px 4px' }}
                        title="Sửa notes / assignee"
                      >✏️</button>
                    )}

                    {/* Quick status select */}
                    <select
                      value={task.status}
                      onChange={e => setStatus(task, e.target.value as ActivityStatus)}
                      style={{ fontSize: 11, padding: '2px 4px', border: '1px solid var(--vib-neutral-200)', borderRadius: 4, flexShrink: 0 }}
                    >
                      {(Object.keys(STATUS_META) as ActivityStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function PPGPage() {
  const { projects, setProjects, annualPlans, setAnnualPlans, selectedProject, setSelectedProject, addToast } = useStore()
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()
  const [confirm, setConfirm] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [domains, setDomains] = useState<ProjectDomain[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try { setProjects(await getProjects()) }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [setProjects, addToast])

  const loadPlans = useCallback(async () => {
    try { setAnnualPlans(await getAnnualPlans()) }
    catch { /* silent */ }
  }, [setAnnualPlans])

  useEffect(() => {
    loadProjects()
    loadPlans()
    getProjectDomains().then(setDomains).catch(() => {})
  }, [loadProjects, loadPlans])

  const doDelete = async (id: string) => {
    try { await archiveProject(id); addToast('Đã archive project', 'success'); loadProjects() }
    catch (e: unknown) { addToast((e as Error).message, 'error') }
    setConfirm(null)
  }

  const displayProjects = statusFilter ? projects.filter(p => p.status === statusFilter) : projects
  const counts: Record<string, number> = {
    '': projects.length,
    active: projects.filter(p => p.status === 'active').length,
    on_hold: projects.filter(p => p.status === 'on_hold').length,
    completed: projects.filter(p => p.status === 'completed').length,
    archived: projects.filter(p => p.status === 'archived').length,
  }

  const statusColors: Record<string, string> = {
    active: 'var(--vib-success)', on_hold: 'var(--vib-warning)',
    completed: 'var(--vib-info)', archived: 'var(--vib-neutral-400)',
  }

  const TABS: { key: Tab; icon: string; label: string; needsProject?: boolean }[] = [
    { key: 'projects',   icon: '📁', label: 'Danh sách' },
    { key: 'overview',   icon: '🏠', label: 'Tổng quan',    needsProject: true },
    { key: 'milestones', icon: '📍', label: 'Timeline',     needsProject: true },
    { key: 'members',    icon: '👥', label: 'Nguồn lực',    needsProject: true },
    { key: 'files',      icon: '🗂️', label: 'Tài liệu',     needsProject: true },
    { key: 'checklist',  icon: '✅', label: 'Checklist',    needsProject: true },
    { key: 'meetings',   icon: '📝', label: 'Biên bản họp', needsProject: true },
    { key: 'pcr',        icon: '🔄', label: 'PCR',          needsProject: true },
    { key: 'publish',    icon: '📡', label: 'Publish',      needsProject: true },
  ]

  const tabStyle = (key: Tab) => ({
    padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
    borderBottom: activeTab === key ? '2px solid var(--vib-primary)' : '2px solid transparent',
    color: activeTab === key ? 'var(--vib-primary)' : 'var(--vib-neutral-600)',
    fontWeight: activeTab === key ? 700 : 400, fontSize: 13, fontFamily: 'var(--font)',
    transition: 'all 0.15s',
  })

  return (
    <div>
      {selectedProject && activeTab !== 'projects' ? (
        <>
          {/* Line 1: Project code + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <button
              onClick={() => { setActiveTab('projects') }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--vib-neutral-500)', fontSize: 12, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Danh sách
            </button>
            <span style={{ color: 'var(--vib-neutral-300)', fontSize: 14 }}>|</span>
            <span className="txt_mono" style={{ fontSize: 13, color: 'var(--vib-neutral-500)', fontWeight: 700 }}>{selectedProject.code}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--vib-neutral-900)' }}>{selectedProject.name}</span>
            <StatusBadge status={selectedProject.status} />
          </div>

          {/* Line 2: Project tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--vib-neutral-200)', paddingBottom: 0 }}>
            {TABS.filter(t => t.needsProject).map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={tabStyle(t.key)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {activeTab === 'projects' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {([
              { key: '',          label: 'Tất cả'    },
              { key: 'active',    label: 'Active'    },
              { key: 'on_hold',   label: 'On Hold'   },
              { key: 'completed', label: 'Completed' },
              { key: 'archived',  label: 'Archived'  },
            ] as { key: string; label: string }[]).map(({ key, label }) => {
              const isActive = statusFilter === key
              return (
                <button key={key} onClick={() => setStatusFilter(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: isActive ? 'var(--vib-primary)' : 'var(--vib-neutral-100)',
                    color: isActive ? '#fff' : 'var(--vib-neutral-600)',
                    fontSize: 13, fontFamily: 'var(--font)', fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s',
                  }}>
                  {label}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--vib-neutral-200)',
                    color: isActive ? '#fff' : 'var(--vib-neutral-500)',
                  }}>{counts[key]}</span>
                </button>
              )
            })}
            <Btn variant="ghost" size="sm" onClick={loadProjects}><RefreshCw size={13} /></Btn>
            <div style={{ flex: 1 }} />
            <Btn size="sm" onClick={() => { setEditing(undefined); setShowCreate(true) }}>
              <Plus size={14} /> Tạo Project
            </Btn>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: 2, background: 'var(--vib-neutral-100)', padding: '3px 4px', borderRadius: 8 }}>
              {(['grid', 'list'] as const).map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  title={mode === 'grid' ? 'Dạng thẻ' : 'Dạng bảng'}
                  style={{
                    padding: '4px 10px', border: 'none', cursor: 'pointer', borderRadius: 6,
                    fontSize: 15, fontFamily: 'var(--font)',
                    background: viewMode === mode ? '#fff' : 'transparent',
                    color: viewMode === mode ? 'var(--vib-primary)' : 'var(--vib-neutral-500)',
                    boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                  {mode === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="empty-state">Đang tải...</div>
          ) : displayProjects.length === 0 ? (
            <EmptyState icon="📁" title="Chưa có project" action={<Btn onClick={() => setShowCreate(true)}><Plus size={14} /> Tạo Project</Btn>} />
          ) : viewMode === 'grid' ? (
            /* ── Grid view ── */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {displayProjects.map(p => (
                <div key={p.id} className={`card card-pad${selectedProject?.id === p.id ? ' ring-primary' : ''}`}
                  style={{ borderLeft: `4px solid ${statusColors[p.status] || 'var(--vib-neutral-300)'}`, cursor: 'pointer' }}
                  onClick={() => { setSelectedProject(p); setActiveTab('overview') }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span className="txt_mono" style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>{p.code}</span>
                        <StatusBadge status={p.status} />
                        {p.domain_code && (
                          <span style={{ fontSize: 10, background: 'var(--vib-warning)20', color: 'var(--vib-warning)', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                            {p.domain_code}
                          </span>
                        )}
                      </div>
                      <h3 className="txt_s_xxs">{p.name}</h3>
                    </div>
                  </div>
                  {(p.start_date || p.end_date) && (
                    <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} /> {p.start_date?.slice(0, 10)} → {p.end_date?.slice(0, 10) || '...'}
                    </div>
                  )}
                  {p.plan_id && (
                    <div style={{ fontSize: 11, color: 'var(--vib-primary)', marginBottom: 8 }}>
                      📅 {annualPlans.find(pl => pl.id === p.plan_id)?.name || 'Kế hoạch năm'}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <Btn variant="primary" size="sm" onClick={e => { e.stopPropagation(); setSelectedProject(p); setActiveTab('overview') }} style={{ flex: 1, justifyContent: 'center' }}>
                      <ChevronRight size={12} /> Xem chi tiết
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelectedProject(p); setActiveTab('files') }} title="Tài liệu">
                      <FileText size={12} />
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setEditing(p); setShowCreate(true) }}>
                      <Edit size={12} />
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setConfirm(p.id) }}>
                      <Trash2 size={12} />
                    </Btn>
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
                    {['Code', 'Tên dự án', 'Domain', 'Trạng thái', 'Timeline', 'Kế hoạch năm', ''].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--vib-neutral-500)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayProjects.map(p => (
                    <tr key={p.id}
                      style={{ borderBottom: '1px solid var(--vib-neutral-100)', cursor: 'pointer', borderLeft: `3px solid ${statusColors[p.status] || 'var(--vib-neutral-300)'}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--vib-neutral-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                      onClick={() => { setSelectedProject(p); setActiveTab('overview') }}>
                      <td style={{ padding: '9px 12px' }}>
                        <span className="txt_mono" style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>{p.code}</span>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '9px 12px' }}>
                        {p.domain_code
                          ? <span style={{ fontSize: 11, background: 'var(--vib-warning)20', color: 'var(--vib-warning)', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>{p.domain_code}</span>
                          : <span style={{ color: 'var(--vib-neutral-300)' }}>—</span>}
                      </td>
                      <td style={{ padding: '9px 12px' }}><StatusBadge status={p.status} /></td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--vib-neutral-500)', whiteSpace: 'nowrap' }}>
                        {(p.start_date || p.end_date)
                          ? <><Calendar size={10} style={{ display: 'inline', marginRight: 4 }} />{p.start_date?.slice(0, 10)} → {p.end_date?.slice(0, 10) || '...'}</>
                          : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--vib-primary)' }}>
                        {p.plan_id ? (annualPlans.find(pl => pl.id === p.plan_id)?.name || 'Kế hoạch năm') : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <Btn variant="ghost" size="sm" onClick={() => { setSelectedProject(p); setActiveTab('overview') }}><ChevronRight size={12} /></Btn>
                        <Btn variant="ghost" size="sm" onClick={() => { setSelectedProject(p); setActiveTab('files') }} title="Tài liệu"><FileText size={12} /></Btn>
                        <Btn variant="ghost" size="sm" onClick={() => { setEditing(p); setShowCreate(true) }}><Edit size={12} /></Btn>
                        <Btn variant="ghost" size="sm" onClick={() => setConfirm(p.id)}><Trash2 size={12} /></Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'overview' && selectedProject && (
        <OverviewTab project={selectedProject} annualPlans={annualPlans} onNavigate={setActiveTab} />
      )}
      {activeTab === 'milestones' && selectedProject && <MilestonesTab project={selectedProject} />}
      {activeTab === 'members'   && selectedProject && <MembersTab   project={selectedProject} />}
      {activeTab === 'files'     && selectedProject && <FilesTab     project={selectedProject} />}
      {activeTab === 'checklist' && selectedProject && <ChecklistTab project={selectedProject} />}
      {activeTab === 'meetings'  && selectedProject && <MeetingsTab  project={selectedProject} />}
      {activeTab === 'publish'   && selectedProject && <PublishTab   project={selectedProject} />}
      {activeTab === 'pcr'       && selectedProject && (
        <ProjectPCRTab
          projectId={selectedProject.id}
          projectLabel={`${selectedProject.code} — ${selectedProject.name}`}
        />
      )}

      <ProjectModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={loadProjects} editing={editing} plans={annualPlans} domains={domains} />
      <Confirm open={!!confirm} message="Archive project này?" onConfirm={() => confirm && doDelete(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}
