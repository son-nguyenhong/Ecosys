/**
 * BA Studio — module Master Doc & Change Request cho đội BA.
 *
 * 8 view (đồng bộ vào URL query để share link được):
 *   console · docs · doc · crs · cr · compare · ai · pillar
 * Dữ liệu: /api/ba/api/v1/ba-studio (service ba-workflow :8002).
 * Sổ CR dùng chung bảng project_change_requests với module Requests — CR gắn tài liệu
 * có merge_state khác NULL và chỉ được merge/từ chối tại đây.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Files, FolderOpen, GitBranch, GitCompare, LayoutDashboard, RefreshCw, Search, Sparkles,
} from 'lucide-react'
import { Btn } from '../../components/ui'
import { useStore } from '../../stores/auth'
import * as api from '../../api/ba-studio'
import { getProjects, type Project } from '../../api/ppg'
import { BA_AI_ADOPTION, type PillarId } from '../../data/ba-ai-adoption'
import type {
  DocCr, DocCrCreatePayload, DocCrDetail, MasterDocDetail, MasterDocListItem,
} from '../../lib/ba-studio/types'
import { CommandPalette, buildPaletteItems } from './components/CommandPalette'
import { CrForm } from './components/CrForm'
import { MasterDocForm, type MasterDocFormValue } from './components/MasterDocForm'
import type { BaStudioNav, CrFilter, DocTab, ViewKey } from './nav'
import { AiOverviewView, AiPillarView } from './views/AiAdoptionView'
import { CompareDocView } from './views/CompareDocView'
import { CompareView } from './views/CompareView'
import { ConsoleView } from './views/ConsoleView'
import { CrDetailView } from './views/CrDetailView'
import { CrRegisterView } from './views/CrRegisterView'
import { DocDetailView } from './views/DocDetailView'
import { DocLibraryView } from './views/DocLibraryView'

const PILLAR_IDS = BA_AI_ADOPTION.pillars.map(p => p.id)

export default function BAStudioPage() {
  const { username, addToast } = useStore()
  const [params, setParams] = useSearchParams()

  const [docs, setDocs] = useState<MasterDocListItem[]>([])
  const [crs, setCrs] = useState<DocCr[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const [docForm, setDocForm] = useState<{ open: boolean; doc: MasterDocDetail | null }>({ open: false, doc: null })
  const [crForm, setCrForm] = useState<{ open: boolean; doc: MasterDocDetail | null; cr: DocCrDetail | null }>({
    open: false, doc: null, cr: null,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const view = (params.get('view') ?? 'console') as ViewKey
  const docId = params.get('doc') ?? ''
  const crId = params.get('cr') ?? ''
  const docTab = (params.get('tab') ?? 'content') as DocTab
  const crFilter = (params.get('filter') ?? 'all') as CrFilter
  const pillar = (params.get('pillar') ?? 'usecases') as PillarId
  const cmpA = params.get('a') ?? ''
  const cmpB = params.get('b') ?? ''

  const setView = useCallback((next: Record<string, string | undefined>) => {
    setParams(prev => {
      const sp = new URLSearchParams(prev)
      Object.entries(next).forEach(([k, v]) => { if (v) sp.set(k, v); else sp.delete(k) })
      return sp
    }, { replace: false })
  }, [setParams])

  const nav: BaStudioNav = useMemo(() => ({
    goConsole: () => setView({ view: 'console', doc: undefined, cr: undefined }),
    goDocs: () => setView({ view: 'docs', doc: undefined, cr: undefined }),
    goDoc: (id, tab) => setView({ view: 'doc', doc: id, cr: undefined, tab: tab ?? 'content' }),
    goCrs: filter => setView({ view: 'crs', cr: undefined, doc: undefined, filter: filter ?? 'all' }),
    goCr: id => setView({ view: 'cr', cr: id }),
    goCompare: (id, a, b) => setView({ view: 'compare', doc: id ?? docId, a: a ?? '', b: b ?? '' }),
    goCompareDoc: (l, r) => setView({ view: 'compare-doc', doc: l ?? '', b: r ?? '' }),
    goAi: p => setView(p ? { view: 'pillar', pillar: p } : { view: 'ai' }),
  }), [setView, docId])

  const loadLists = useCallback(async () => {
    setLoading(true)
    try {
      const [docList, crList] = await Promise.all([api.listDocs(), api.listDocCrs()])
      setDocs(docList)
      setCrs(crList)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu BA Studio')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadLists() }, [loadLists])

  useEffect(() => {
    getProjects().then(setProjects).catch(() => { /* danh sách dự án chỉ dùng cho form */ })
  }, [])

  // ⌘K / Ctrl+K mở palette, ESC đóng
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = (e.key || '').toLowerCase()
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      } else if (key === 'escape') {
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const refreshAll = useCallback(() => {
    setRefreshKey(k => k + 1)
    void loadLists()
  }, [loadLists])

  const showError = useCallback((msg: string) => { addToast(msg, 'error') }, [addToast])
  const showToast = useCallback((msg: string) => { addToast(msg, 'success') }, [addToast])

  // ── Form handlers ──────────────────────────────────────────────────────────

  async function submitDocForm(value: MasterDocFormValue) {
    setSaving(true)
    setFormError(null)
    try {
      if (docForm.doc) {
        const target = docForm.doc
        await api.updateDoc(target.id, {
          title: value.title,
          abbr: value.abbr,
          owner: value.owner,
          base_note: value.base_note,
          doc_type: value.doc_type,
        })
        if (target.editable_sections && value.content_md.trim()) {
          await api.replaceContent(target.id, value.content_md)
        }
        showToast(`Đã cập nhật ${target.doc_code}`)
        setDocForm({ open: false, doc: null })
        refreshAll()
      } else {
        const created = await api.createDoc(value)
        showToast(`Đã tạo ${created.doc_code} — bản ${created.base_version}`)
        setDocForm({ open: false, doc: null })
        await loadLists()
        nav.goDoc(created.id)
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Lưu tài liệu thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function submitCrForm(payload: DocCrCreatePayload) {
    setSaving(true)
    setFormError(null)
    try {
      if (crForm.cr) {
        await api.updateDocCr(crForm.cr.id, {
          title: payload.title,
          description: payload.description,
          change_type: payload.change_type,
          priority: payload.priority,
          reviewer: payload.reviewer,
          impact_scope: payload.impact_scope,
          acceptance: payload.acceptance,
          dependencies: payload.dependencies,
          content_md: payload.content_md,
        })
        showToast(`Đã cập nhật ${crForm.cr.request_code}`)
        setCrForm({ open: false, doc: null, cr: null })
        refreshAll()
      } else {
        const created = await api.createDocCr(payload)
        showToast(`Đã tạo ${created.request_code}`)
        setCrForm({ open: false, doc: null, cr: null })
        await loadLists()
        nav.goCr(created.id)
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Lưu Change Request thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function openCreateDoc() {
    setFormError(null)
    setDocForm({ open: true, doc: null })
  }

  async function openCreateCrFor(docIdArg?: string) {
    const target = docIdArg ?? docId ?? docs[0]?.id
    if (!target) { showError('Chưa có Master Doc nào để tạo CR'); return }
    try {
      const doc = await api.getDoc(target)
      setFormError(null)
      setCrForm({ open: true, doc, cr: null })
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Không tải được tài liệu')
    }
  }

  // ── Sub-nav ────────────────────────────────────────────────────────────────

  const pendingCount = crs.filter(c => c.merge_state === 'pending').length

  const workspaceItems: {
    key: string; label: string; icon: React.ReactNode; active: boolean
    count?: number; tone?: 'danger'; onClick: () => void
  }[] = [
    {
      key: 'console', label: 'Bảng điều khiển', icon: <LayoutDashboard size={15} />,
      active: view === 'console', onClick: nav.goConsole,
    },
    {
      key: 'docs', label: 'Master Doc', icon: <FolderOpen size={15} />,
      active: view === 'docs' || view === 'doc', count: docs.length, onClick: nav.goDocs,
    },
    {
      key: 'crs', label: 'Sổ Change Request', icon: <GitBranch size={15} />,
      active: view === 'crs' || view === 'cr', count: pendingCount, tone: 'danger',
      onClick: () => nav.goCrs(),
    },
    {
      key: 'compare', label: 'So sánh phiên bản', icon: <GitCompare size={15} />,
      active: view === 'compare', onClick: () => nav.goCompare(),
    },
    {
      key: 'compare-doc', label: 'So sánh tài liệu', icon: <Files size={15} />,
      active: view === 'compare-doc', onClick: () => nav.goCompareDoc(),
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Sub-nav của module */}
      <nav style={{
        width: 208, minWidth: 208, background: 'var(--vib-white)',
        border: '1px solid var(--vib-neutral-200)', borderRadius: 8,
        boxShadow: 'var(--shadow-card)', padding: '10px 8px', position: 'sticky', top: 0,
      }}>
        <div style={navGroupLabel}>Workspace</div>
        {workspaceItems.map(item => (
          <button key={item.key} onClick={item.onClick} style={navItemStyle(item.active)}>
            <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center' }}>{item.icon}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span style={navBadge(item.tone === 'danger' && item.count > 0)}>{item.count}</span>
            )}
          </button>
        ))}

        <div style={navGroupLabel}>AI Adoption</div>
        <button onClick={() => nav.goAi()} style={navItemStyle(view === 'ai')}>
          <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center' }}><Sparkles size={15} /></span>
          <span style={{ flex: 1, textAlign: 'left' }}>Tổng quan</span>
        </button>
        {BA_AI_ADOPTION.pillars.map(p => (
          <button
            key={p.id}
            onClick={() => nav.goAi(p.id)}
            style={navItemStyle(view === 'pillar' && pillar === p.id)}
          >
            <span style={{
              display: 'inline-flex', width: 16, justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 10,
            }}>{p.code}</span>
            <span style={{
              flex: 1, textAlign: 'left', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{p.name}</span>
            <span style={navBadge(false)}>{p.items.length}</span>
          </button>
        ))}

        <div style={{ borderTop: '1px solid var(--vib-neutral-200)', margin: '8px 0' }} />
        <button onClick={() => setPaletteOpen(true)} style={navItemStyle(false)}>
          <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center' }}><Search size={15} /></span>
          <span style={{ flex: 1, textAlign: 'left' }}>Tìm kiếm</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--vib-neutral-500)',
            border: '1px solid var(--vib-neutral-200)', borderRadius: 3, padding: '0 4px',
          }}>⌘K</span>
        </button>
        <button onClick={refreshAll} style={navItemStyle(false)}>
          <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center' }}><RefreshCw size={15} /></span>
          <span style={{ flex: 1, textAlign: 'left' }}>Tải lại</span>
        </button>
      </nav>

      {/* Nội dung */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
            padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: 'var(--vib-danger-bg)', border: '1px solid #F0C4C0',
            color: 'var(--vib-danger)',
          }}>
            <span style={{ flex: 1 }}>{error}</span>
            <Btn variant="secondary" size="sm" onClick={refreshAll}>Thử lại</Btn>
          </div>
        )}

        {loading && docs.length === 0 && !error ? (
          <div style={{ padding: 40, color: 'var(--vib-neutral-500)' }}>Đang tải BA Studio…</div>
        ) : (
          <>
            {view === 'console' && (
              <ConsoleView docs={docs} crs={crs} nav={nav} onCreateDoc={openCreateDoc} />
            )}
            {view === 'docs' && (
              <DocLibraryView docs={docs} nav={nav} onCreateDoc={openCreateDoc} />
            )}
            {view === 'doc' && docId && (
              <DocDetailView
                docId={docId}
                tab={docTab}
                refreshKey={refreshKey}
                nav={nav}
                onTabChange={tab => setView({ tab })}
                onEdit={doc => { setFormError(null); setDocForm({ open: true, doc }) }}
                onCreateCr={doc => { setFormError(null); setCrForm({ open: true, doc, cr: null }) }}
                onDeleted={() => { showToast('Đã xoá tài liệu'); refreshAll(); nav.goDocs() }}
                onError={showError}
              />
            )}
            {view === 'crs' && (
              <CrRegisterView
                crs={crs}
                filter={crFilter}
                onFilterChange={f => setView({ filter: f })}
                nav={nav}
                onCreateCr={() => void openCreateCrFor()}
              />
            )}
            {view === 'cr' && crId && (
              <CrDetailView
                crId={crId}
                refreshKey={refreshKey}
                nav={nav}
                onChanged={refreshAll}
                onEdit={(cr, doc) => { setFormError(null); setCrForm({ open: true, doc, cr }) }}
                onError={showError}
                onToast={showToast}
              />
            )}
            {view === 'compare' && (
              <CompareView
                docs={docs}
                docId={docId}
                versionA={cmpA}
                versionB={cmpB}
                onChange={(id, a, b) => setView({ view: 'compare', doc: id, a, b })}
                onError={showError}
              />
            )}
            {view === 'compare-doc' && (
              <CompareDocView
                docs={docs}
                initialLeftDocId={docId || undefined}
                initialRightDocId={cmpB || undefined}
                onError={showError}
              />
            )}
            {view === 'ai' && <AiOverviewView nav={nav} />}
            {view === 'pillar' && PILLAR_IDS.includes(pillar) && (
              <AiPillarView pillarId={pillar} nav={nav} />
            )}
          </>
        )}
      </div>

      {/* Form + palette */}
      <MasterDocForm
        open={docForm.open}
        doc={docForm.doc}
        sectionsEditable={docForm.doc ? docForm.doc.editable_sections : true}
        projects={projects}
        saving={saving}
        error={formError}
        onClose={() => { setDocForm({ open: false, doc: null }); setFormError(null) }}
        onSubmit={submitDocForm}
      />

      {crForm.open && crForm.doc && (
        <CrForm
          open={crForm.open}
          doc={crForm.doc}
          cr={crForm.cr}
          allCrCodes={crs.map(c => c.request_code)}
          currentUser={username ?? ''}
          saving={saving}
          error={formError}
          onClose={() => { setCrForm({ open: false, doc: null, cr: null }); setFormError(null) }}
          onSubmit={submitCrForm}
        />
      )}

      <CommandPalette
        open={paletteOpen}
        items={buildPaletteItems(docs, crs, nav)}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  )
}

// ── styles ───────────────────────────────────────────────────────────────────

const navGroupLabel: React.CSSProperties = {
  padding: '8px 10px 4px', fontSize: 11, fontWeight: 600, letterSpacing: '.06em',
  textTransform: 'uppercase', color: 'var(--vib-neutral-400)',
}

function navItemStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 10px',
    marginBottom: 2, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
    fontFamily: 'var(--font)',
    background: active ? 'var(--vib-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--vib-neutral-700)',
    fontWeight: active ? 600 : 400,
    transition: 'background .15s',
  }
}

function navBadge(danger: boolean): React.CSSProperties {
  return {
    minWidth: 18, height: 18, lineHeight: '18px', padding: '0 5px', borderRadius: 9,
    fontSize: 11, textAlign: 'center', flexShrink: 0, fontVariantNumeric: 'tabular-nums',
    background: danger ? 'var(--vib-danger)' : 'var(--vib-neutral-100)',
    color: danger ? '#fff' : 'var(--vib-neutral-600)',
  }
}
