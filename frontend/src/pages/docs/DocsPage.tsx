import React, { useEffect, useRef, useState } from 'react'
import {
  getProjectDomains, getProjects, getDocsTree, downloadTemplate,
  uploadDocFile, getFolderFiles, downloadDocFile,
  type ProjectDomain, type Project, type DocsTree, type DocFolder,
  type DocFileInfo, type DocFileVersion,
} from '../../api/ppg'
import { useStore } from '../../stores/auth'

// ─── colour helpers ───────────────────────────────────────────────
const TRACK_COLOR: Record<string, string> = {
  project: 'var(--vib-primary)',
  ba:      '#7c3aed',
  test:    '#0891b2',
}
const TRACK_BG: Record<string, string> = {
  project: '#eff6ff',
  ba:      '#f5f3ff',
  test:    '#ecfeff',
}
const DOMAIN_COLORS = [
  '#2563eb','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#4f46e5',
]

function fmtSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// ══════════════════════════════════════════════════════════════════
// VersionHistoryModal — pop-up showing all files + their versions
// ══════════════════════════════════════════════════════════════════
function VersionHistoryModal({
  projectId, track, folder, folderLabel, trackColor,
  onClose,
}: {
  projectId: string; track: string; folder: string
  folderLabel: string; trackColor: string
  onClose: () => void
}) {
  const { addToast } = useStore()
  const [files, setFiles] = useState<DocFileInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    getFolderFiles(projectId, track, folder)
      .then(setFiles)
      .catch(() => addToast('Không tải được lịch sử tài liệu', 'error'))
      .finally(() => setLoading(false))
  }, [projectId, track, folder])

  const handleDownload = async (file: DocFileInfo, ver: DocFileVersion) => {
    const key = `${file.id}/${ver.version}`
    setDownloading(key)
    try {
      await downloadDocFile(projectId, file.id, file.name, ver.version)
    } catch {
      addToast('Không tải được file', 'error')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: 680, maxWidth: '95vw',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--vib-neutral-200)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span style={{
            background: trackColor, color: '#fff',
            padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          }}>
            {folderLabel}
          </span>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--vib-neutral-800)' }}>
            Lịch sử tài liệu
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: 'var(--vib-neutral-400)', lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--vib-neutral-400)', fontSize: 13 }}>
              Đang tải...
            </div>
          )}
          {!loading && files.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--vib-neutral-400)', fontSize: 13 }}>
              Chưa có tài liệu nào được upload
            </div>
          )}
          {files.map(file => (
            <div key={file.id} style={{ marginBottom: 20 }}>
              {/* File name + current version badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--vib-neutral-800)', flex: 1 }}>
                  {file.name}
                </span>
                <span style={{
                  background: trackColor, color: '#fff',
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                }}>
                  {file.current_version}
                </span>
              </div>

              {/* Version list */}
              <div style={{
                border: '1px solid var(--vib-neutral-200)', borderRadius: 10, overflow: 'hidden',
              }}>
                {/* Header row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 100px 80px 80px',
                  gap: 0,
                  background: 'var(--vib-neutral-50)',
                  borderBottom: '1px solid var(--vib-neutral-200)',
                  padding: '6px 12px',
                }}>
                  {['Phiên bản', 'Ghi chú thay đổi', 'Người upload', 'Kích thước', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--vib-neutral-500)', textTransform: 'uppercase' }}>
                      {h}
                    </span>
                  ))}
                </div>

                {file.versions.map((ver, idx) => {
                  const isLatest = ver.version === file.current_version
                  const key = `${file.id}/${ver.version}`
                  return (
                    <div key={ver.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 100px 80px 80px',
                      alignItems: 'center',
                      gap: 0,
                      padding: '8px 12px',
                      borderBottom: idx < file.versions.length - 1 ? '1px solid var(--vib-neutral-100)' : 'none',
                      background: isLatest ? TRACK_BG[track] : '#fff',
                    }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: isLatest ? trackColor : 'var(--vib-neutral-600)' }}>
                        {ver.version}
                        {isLatest && (
                          <span style={{ marginLeft: 4, fontSize: 9, background: trackColor, color: '#fff', padding: '1px 4px', borderRadius: 4 }}>
                            MỚI
                          </span>
                        )}
                      </span>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--vib-neutral-600)' }}>
                          {ver.change_note || <span style={{ color: 'var(--vib-neutral-300)' }}>—</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--vib-neutral-400)', marginTop: 2 }}>
                          {fmtDate(ver.uploaded_at)}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--vib-neutral-500)' }}>
                        {ver.uploaded_by || '—'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>
                        {fmtSize(ver.file_size)}
                      </span>
                      <button
                        onClick={() => handleDownload(file, ver)}
                        disabled={downloading === key}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: downloading === key ? 'var(--vib-neutral-200)' : trackColor,
                          color: downloading === key ? 'var(--vib-neutral-400)' : '#fff',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        {downloading === key ? '...' : '↓ Tải'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// FolderRow — single phase folder
// ══════════════════════════════════════════════════════════════════
function FolderRow({
  folder, track, projectId,
  downloading, onDownload,
  onUploaded,
}: {
  folder: DocFolder
  track: string
  projectId: string
  downloading: string | null
  onDownload: (relPath: string) => void
  onUploaded: () => void
}) {
  const { addToast } = useStore()
  const [open, setOpen]           = useState(false)
  const [uploading, setUploading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasTemplates = folder.template_count > 0
  const trackColor   = TRACK_COLOR[track] ?? 'var(--vib-primary)'

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadDocFile(projectId, track, folder.name, file)
      addToast(`Đã upload "${res.name}" (${res.version})`, 'success')
      onUploaded()
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Upload thất bại', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {historyOpen && (
        <VersionHistoryModal
          projectId={projectId}
          track={track}
          folder={folder.name}
          folderLabel={folder.label}
          trackColor={trackColor}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      <div style={{ borderBottom: '1px solid var(--vib-neutral-100)' }}>
        {/* Row header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: open ? TRACK_BG[track] : 'transparent',
            transition: 'background 0.1s',
          }}
        >
          {/* Expand/collapse — only if has templates */}
          <span
            onClick={() => hasTemplates && setOpen(o => !o)}
            style={{ fontSize: 14, cursor: hasTemplates ? 'pointer' : 'default', flexShrink: 0 }}
          >
            {folder.icon}
          </span>
          <span
            onClick={() => hasTemplates && setOpen(o => !o)}
            style={{
              flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--vib-neutral-700)',
              cursor: hasTemplates ? 'pointer' : 'default',
            }}
          >
            {folder.label}
          </span>

          {/* Template count */}
          {folder.template_count > 0 && (
            <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)', marginRight: 2 }}>
              {folder.template_count} mẫu
            </span>
          )}

          {/* Upload count badge */}
          {folder.file_count > 0 && (
            <span style={{
              fontSize: 11, background: '#dcfce7', color: '#16a34a',
              padding: '1px 7px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
            }}
              onClick={e => { e.stopPropagation(); setHistoryOpen(true) }}
            >
              {folder.file_count} file
            </span>
          )}

          {/* History button */}
          {folder.file_count > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setHistoryOpen(true) }}
              style={{
                padding: '3px 9px', borderRadius: 6, border: `1px solid ${trackColor}`,
                background: 'transparent', color: trackColor,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Lịch sử
            </button>
          )}

          {/* Upload button */}
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            style={{
              padding: '3px 10px', borderRadius: 6, border: 'none',
              background: uploading ? 'var(--vib-neutral-200)' : trackColor,
              color: uploading ? 'var(--vib-neutral-500)' : '#fff',
              fontSize: 11, fontWeight: 600, cursor: uploading ? 'default' : 'pointer',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {uploading ? '...' : '↑ Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Expand arrow */}
          {hasTemplates && (
            <span
              onClick={() => setOpen(o => !o)}
              style={{ fontSize: 11, color: 'var(--vib-neutral-400)', cursor: 'pointer' }}
            >
              {open ? '▲' : '▼'}
            </span>
          )}
        </div>

        {/* Latest file strip */}
        {folder.latest_file && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 12px 5px 34px',
            background: '#f8fffe', borderTop: '1px solid var(--vib-neutral-100)',
          }}>
            <span style={{ fontSize: 12 }}>📄</span>
            <span style={{
              fontSize: 12, color: 'var(--vib-neutral-700)', fontWeight: 600,
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {folder.latest_file.name}
            </span>
            <span style={{
              fontSize: 11, background: TRACK_BG[track], color: trackColor,
              padding: '1px 7px', borderRadius: 6, fontWeight: 700, flexShrink: 0,
            }}>
              {folder.latest_file.current_version}
            </span>
            {folder.latest_file.file_size && (
              <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)', flexShrink: 0 }}>
                {fmtSize(folder.latest_file.file_size)}
              </span>
            )}
            {folder.latest_file.uploaded_at && (
              <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)', flexShrink: 0 }}>
                {fmtDate(folder.latest_file.uploaded_at)}
              </span>
            )}
            <button
              onClick={() => downloadDocFile(
                projectId,
                folder.latest_file!.id,
                folder.latest_file!.name,
              ).catch(() => addToast('Không tải được file', 'error'))}
              style={{
                padding: '2px 8px', borderRadius: 5, border: 'none',
                background: trackColor, color: '#fff',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              ↓ Tải
            </button>
          </div>
        )}

        {/* Template list (collapsible) */}
        {open && (
          <div style={{ padding: '4px 12px 10px 36px', background: TRACK_BG[track] }}>
            {folder.templates.map(tpl => (
              <div key={tpl.rel_path}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: 12 }}>📄</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--vib-neutral-700)' }}>{tpl.display_name}</span>
                <button
                  onClick={() => onDownload(tpl.rel_path)}
                  disabled={downloading === tpl.rel_path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 6, border: 'none',
                    background: downloading === tpl.rel_path ? 'var(--vib-neutral-200)' : TRACK_COLOR[track],
                    color: downloading === tpl.rel_path ? 'var(--vib-neutral-500)' : '#fff',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  ↓ {downloading === tpl.rel_path ? '...' : 'Tải mẫu'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════
// ProjectFolderView — right panel
// ══════════════════════════════════════════════════════════════════
function ProjectFolderView({ project }: { project: Project }) {
  const { addToast } = useStore()
  const [tree, setTree]             = useState<DocsTree | null>(null)
  const [loading, setLoading]       = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [activeTrack, setActiveTrack] = useState<string>('project')

  const loadTree = () => {
    setLoading(true)
    getDocsTree(project.id)
      .then(setTree)
      .catch(() => addToast('Không tải được cấu trúc thư mục', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setTree(null)
    loadTree()
  }, [project.id])

  const handleDownload = async (relPath: string) => {
    setDownloading(relPath)
    try {
      await downloadTemplate(relPath)
    } catch {
      addToast('Không tải được file mẫu', 'error')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return (
    <div style={{ padding: 24, color: 'var(--vib-neutral-400)', fontSize: 13 }}>Đang tải...</div>
  )
  if (!tree) return (
    <div style={{ padding: 24, color: 'var(--vib-neutral-400)', fontSize: 13 }}>Không có dữ liệu</div>
  )

  const currentTrack = tree.tracks.find(t => t.track === activeTrack)
  const totalTemplates = tree.tracks.reduce((s, t) => s + t.folders.reduce((sf, f) => sf + f.template_count, 0), 0)
  const totalUploaded  = tree.tracks.reduce((s, t) => s + t.folders.reduce((sf, f) => sf + f.file_count, 0), 0)

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {/* Summary */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--vib-neutral-500)', margin: 0 }}>
          <span style={{ color: 'var(--vib-neutral-400)' }}>{tree.domain_code}</span>
          <span style={{ margin: '0 4px', color: 'var(--vib-neutral-300)' }}>/</span>
          <span style={{ fontWeight: 700, color: 'var(--vib-neutral-700)' }}>{tree.project_code}</span>
          <span style={{ margin: '0 6px', color: 'var(--vib-neutral-300)' }}>·</span>
          {totalTemplates} tài liệu mẫu
          {totalUploaded > 0 && (
            <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 600 }}>{totalUploaded} đã upload</span>
          )}
        </p>
      </div>

      {/* Track tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '2px solid var(--vib-neutral-100)', paddingBottom: 0 }}>
        {tree.tracks.map(t => {
          const tUploaded = t.folders.reduce((s, f) => s + f.file_count, 0)
          const active = activeTrack === t.track
          return (
            <button key={t.track} onClick={() => setActiveTrack(t.track)} style={{
              padding: '6px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
              borderBottom: active ? `2px solid ${TRACK_COLOR[t.track]}` : '2px solid transparent',
              color: active ? TRACK_COLOR[t.track] : 'var(--vib-neutral-500)',
              fontWeight: active ? 700 : 400, fontSize: 12, fontFamily: 'var(--font)',
              marginBottom: -2, transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
              {t.icon} {t.label}
              {tUploaded > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, background: '#dcfce7', color: '#16a34a', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>
                  {tUploaded}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Folder list */}
      {currentTrack && (
        <div style={{ border: '1px solid var(--vib-neutral-200)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: TRACK_COLOR[currentTrack.track], padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>{currentTrack.icon}</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{currentTrack.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginLeft: 'auto' }}>
              {currentTrack.folders.reduce((s, f) => s + f.template_count, 0)} tài liệu mẫu
            </span>
          </div>
          {currentTrack.folders.map(folder => (
            <FolderRow
              key={folder.name}
              folder={folder}
              track={currentTrack.track}
              projectId={tree.project_id}
              downloading={downloading}
              onDownload={handleDownload}
              onUploaded={loadTree}
            />
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--vib-neutral-400)', marginTop: 10 }}>
        Nhấn "↑ Upload" để tải lên tài liệu · Nhấn "Lịch sử" để xem các phiên bản · Nhấn "▼" để xem tài liệu mẫu
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// FoldersTab — Domain → Project → Folder hierarchy
// ══════════════════════════════════════════════════════════════════
function FoldersTab() {
  const { addToast } = useStore()
  const [domains, setDomains]               = useState<ProjectDomain[]>([])
  const [projects, setProjects]             = useState<Project[]>([])
  const [loadingDomains, setLoadingDomains] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<ProjectDomain | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    getProjectDomains()
      .then(setDomains)
      .catch(() => addToast('Không tải được danh sách domain', 'error'))
      .finally(() => setLoadingDomains(false))
  }, [])

  useEffect(() => {
    if (!selectedDomain) { setProjects([]); return }
    setLoadingProjects(true)
    setSelectedProject(null)
    getProjects({ all_years: true })
      .then(all => setProjects(all.filter(p => p.domain_code === selectedDomain.code)))
      .catch(() => addToast('Không tải được danh sách project', 'error'))
      .finally(() => setLoadingProjects(false))
  }, [selectedDomain?.code])

  const domainColor = (i: number) => DOMAIN_COLORS[i % DOMAIN_COLORS.length]

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', minHeight: 500 }}>

      {/* ── Column 1: Domain list ── */}
      <div style={{
        width: 180, flexShrink: 0,
        borderRight: '1px solid var(--vib-neutral-200)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--vib-neutral-50)',
      }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--vib-neutral-200)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--vib-neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Domain
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingDomains && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--vib-neutral-400)' }}>Đang tải...</div>
          )}
          {domains.map((d, i) => (
            <div
              key={d.code}
              onClick={() => setSelectedDomain(d)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                cursor: 'pointer',
                background: selectedDomain?.code === d.code ? '#eff6ff' : 'transparent',
                borderLeft: selectedDomain?.code === d.code ? `3px solid ${domainColor(i)}` : '3px solid transparent',
                transition: 'all 0.1s',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 6,
                background: domainColor(i), color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, flexShrink: 0,
              }}>
                {d.code.slice(0, 2)}
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: selectedDomain?.code === d.code ? 700 : 500, color: 'var(--vib-neutral-700)' }}>
                  {d.code}
                </div>
                <div style={{ fontSize: 10, color: 'var(--vib-neutral-400)', lineHeight: 1.2 }}>{d.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Column 2: Project list ── */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid var(--vib-neutral-200)',
        display: 'flex', flexDirection: 'column',
        background: '#fff',
      }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--vib-neutral-200)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--vib-neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {selectedDomain ? `${selectedDomain.code} — Projects` : 'Dự án'}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!selectedDomain && (
            <div style={{ padding: '20px 12px', fontSize: 12, color: 'var(--vib-neutral-400)', textAlign: 'center' }}>
              Chọn Domain để xem dự án
            </div>
          )}
          {selectedDomain && loadingProjects && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--vib-neutral-400)' }}>Đang tải...</div>
          )}
          {selectedDomain && !loadingProjects && projects.length === 0 && (
            <div style={{ padding: '20px 12px', fontSize: 12, color: 'var(--vib-neutral-400)', textAlign: 'center' }}>
              Không có dự án trong domain này
            </div>
          )}
          {projects.map(p => {
            const statusColor = p.status === 'active' ? '#16a34a' : p.status === 'completed' ? '#2563eb' : '#9ca3af'
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p)}
                style={{
                  padding: '9px 12px', cursor: 'pointer',
                  borderBottom: '1px solid var(--vib-neutral-100)',
                  background: selectedProject?.id === p.id ? '#eff6ff' : 'transparent',
                  borderLeft: selectedProject?.id === p.id ? '3px solid var(--vib-primary)' : '3px solid transparent',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vib-neutral-700)', lineHeight: 1.3 }}>
                  {p.code}
                </div>
                <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginTop: 2, lineHeight: 1.3 }}>
                  {p.name.length > 32 ? p.name.slice(0, 32) + '…' : p.name}
                </div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: statusColor, fontWeight: 600, textTransform: 'uppercase' }}>{p.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Column 3: Folder tree ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {!selectedProject ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', minHeight: 300, color: 'var(--vib-neutral-400)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Chọn dự án để xem thư mục</div>
            <div style={{ fontSize: 12, marginTop: 6, color: 'var(--vib-neutral-300)' }}>Domain → Dự án → Thư mục</div>
          </div>
        ) : (
          <div>
            <div style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid var(--vib-neutral-200)',
              background: 'var(--vib-neutral-50)',
            }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--vib-neutral-800)' }}>
                {selectedProject.name}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)', marginTop: 4, display: 'flex', gap: 12 }}>
                <span>{selectedProject.code}</span>
                {selectedProject.start_date && (
                  <span>
                    {selectedProject.start_date.slice(0, 10)} → {selectedProject.end_date?.slice(0, 10) ?? '—'}
                  </span>
                )}
              </div>
            </div>
            <ProjectFolderView project={selectedProject} />
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// DocsPage — main export
// ══════════════════════════════════════════════════════════════════
export default function DocsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <FoldersTab />
      </div>
    </div>
  )
}
