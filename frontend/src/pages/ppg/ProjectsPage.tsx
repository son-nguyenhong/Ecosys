'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getProjects, createProject, getPortfolioSummary,
  type Project, type ProjectCreate, type PortfolioItem, type RagStatus,
} from '../../api/ppg'
import { StatusBadge } from '../../components/StatusBadge'
import { Toast, useToast } from '../../components/Toast'
import { FilterBar, applyTextFilter, applyDateFilter } from '../../components/FilterBar'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

const PROJECT_STATUS_OPTIONS = [
  { value: 'planning',    label: 'Planning' },
  { value: 'active',      label: 'Active' },
  { value: 'on_hold',     label: 'On Hold' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
]

type ViewMode = 'list' | 'portfolio'

function RagBadge({ rag }: { rag: RagStatus | null | undefined }) {
  if (!rag) return <span className="text-xs text-gray-300">—</span>
  const map: Record<RagStatus, string> = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
  }
  const label: Record<RagStatus, string> = { green: 'Green', amber: 'Amber', red: 'Red' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[rag]}`}>
      {label[rag]}
    </span>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [year, setYear] = useState<number>(CURRENT_YEAR)
  const [allYears, setAllYears] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProjectCreate>({ name: '', code: '' })
  const { toast, show, hide } = useToast()

  // Filters
  const [fText,   setFText]   = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fFrom,   setFFrom]   = useState('')
  const [fTo,     setFTo]     = useState('')

  const clearFilters = () => { setFText(''); setFStatus(''); setFFrom(''); setFTo('') }

  const filteredProjects = useMemo(() => {
    let rows = projects
    if (fText)   rows = applyTextFilter(rows, fText, ['name', 'code', 'owner', 'description'])
    if (fStatus) rows = rows.filter(p => p.status === fStatus)
    return applyDateFilter(rows, 'start_date', fFrom, fTo)
  }, [projects, fText, fStatus, fFrom, fTo])

  // Build portfolio lookup map once (O(n) vs O(n²) per-card find)
  const portfolioMap = useMemo(
    () => Object.fromEntries(portfolio.map(p => [p.id, p])),
    [portfolio],
  )

  const loadProjects = useCallback(async () => {
    try {
      const params = allYears ? { all_years: true } : { year }
      const [list, port] = await Promise.all([
        getProjects(params),
        getPortfolioSummary(allYears ? undefined : year),
      ])
      setProjects(list)
      setPortfolio(port)
    } catch (e) { show(String(e), 'error') }
  }, [year, allYears])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProject(form)
      show('Dự án đã được tạo. 9 milestones đã được sinh tự động.', 'success')
      setShowForm(false)
      setForm({ name: '', code: '' })
      loadProjects()
    } catch (e) { show(String(e), 'error') }
  }

  // Portfolio health summary
  const healthCounts = portfolio.reduce(
    (acc, p) => {
      const rag = p.latest_health_rag ?? 'unknown'
      acc[rag] = (acc[rag] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projects</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {projects.length} dự án{allYears ? ' (tất cả năm)' : ` năm ${year}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year filter */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={allYears}
                onChange={(e) => setAllYears(e.target.checked)}
                className="rounded"
              />
              Tất cả năm
            </label>
            {!allYears && (
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-700"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>

          {/* View toggle */}
          <div className="flex border border-gray-200 rounded overflow-hidden text-sm">
            <button
              onClick={() => setViewMode('portfolio')}
              title="Grid view"
              className={`px-3 py-1.5 ${viewMode === 'portfolio' ? 'bg-vib-blue text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`px-3 py-1.5 ${viewMode === 'list' ? 'bg-vib-blue text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              ☰
            </button>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-vib-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-900"
          >
            + Tạo dự án
          </button>
        </div>
      </div>

      {/* Portfolio health summary bar */}
      {portfolio.length > 0 && (
        <div className="flex gap-3 mb-4">
          {[
            { key: 'green', label: 'Healthy', color: 'bg-green-50 border-green-200 text-green-700' },
            { key: 'amber', label: 'At Risk', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            { key: 'red', label: 'Critical', color: 'bg-red-50 border-red-200 text-red-700' },
            { key: 'unknown', label: 'No Health Data', color: 'bg-gray-50 border-gray-200 text-gray-500' },
          ].map(({ key, label, color }) => (
            <div key={key} className={`flex-1 border rounded-lg px-3 py-2 text-center ${color}`}>
              <p className="text-xl font-bold">{healthCounts[key] ?? 0}</p>
              <p className="text-xs">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4 text-sm">Tạo dự án mới</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tên dự án *</label>
              <input
                required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-3 py-1.5 text-sm"
                placeholder="VD: HiStaff HRM Rebuild"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Code * (A-Z, 0-9, _)</label>
              <input
                required value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full border rounded px-3 py-1.5 text-sm"
                placeholder="VD: HISTAFF_001"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ngày bắt đầu</label>
              <input type="date" value={form.start_date ?? ''}
                onChange={(e) => setForm({ ...form, start_date: e.target.value || undefined })}
                className="w-full border rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ngày kết thúc</label>
              <input type="date" value={form.end_date ?? ''}
                onChange={(e) => setForm({ ...form, end_date: e.target.value || undefined })}
                className="w-full border rounded px-3 py-1.5 text-sm" />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-1.5 text-sm text-gray-600 border rounded hover:bg-gray-50">Hủy</button>
              <button type="submit"
                className="px-4 py-1.5 text-sm bg-vib-blue text-white rounded hover:bg-blue-900">Tạo</button>
            </div>
          </form>
        </div>
      )}

      {/* ── LIST VIEW ────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Filter inner header */}
          <FilterBar
            text={{ value: fText, onChange: setFText, placeholder: 'Tìm code / tên dự án...' }}
            selects={[
              {
                key: 'status', value: fStatus, onChange: setFStatus,
                placeholder: 'Tất cả trạng thái',
                options: PROJECT_STATUS_OPTIONS,
              },
            ]}
            dateFrom={{ value: fFrom, onChange: setFFrom, label: 'Bắt đầu từ' }}
            dateTo={{ value: fTo, onChange: setFTo, label: '→' }}
            onClear={clearFilters}
            right={
              <span className="text-xs text-gray-400">
                {filteredProjects.length}/{projects.length} dự án
              </span>
            }
          />
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">TÊN DỰ ÁN</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">CODE</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">TRẠNG THÁI</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">TIMELINE</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">HEALTH</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">WSJF</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-8 text-sm">
                    {projects.length === 0
                      ? `Chưa có dự án nào${!allYears ? ` trong năm ${year}` : ''}`
                      : 'Không có dự án nào khớp với bộ lọc'}
                  </td>
                </tr>
              )}
              {filteredProjects.map((p) => {
                const pf = portfolioMap[p.id]
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.code}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.start_date && p.end_date ? `${p.start_date} → ${p.end_date}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <RagBadge rag={pf?.latest_health_rag} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {pf?.wsjf_score != null ? pf.wsjf_score.toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/projects/${p.id}`}
                        className="text-vib-blue text-xs hover:underline">Chi tiết →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PORTFOLIO HEATMAP VIEW ────────────────────────────────────────── */}
      {viewMode === 'portfolio' && (
        <div>
          <FilterBar
            text={{ value: fText, onChange: setFText, placeholder: 'Tìm code / tên dự án...' }}
            selects={[
              {
                key: 'status', value: fStatus, onChange: setFStatus,
                placeholder: 'Tất cả trạng thái',
                options: PROJECT_STATUS_OPTIONS,
              },
            ]}
            dateFrom={{ value: fFrom, onChange: setFFrom, label: 'Bắt đầu từ' }}
            dateTo={{ value: fTo, onChange: setFTo, label: '→' }}
            onClear={clearFilters}
            right={<span className="text-xs text-gray-400">{filteredProjects.length}/{projects.length} dự án</span>}
          />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
          {filteredProjects.length === 0 && (
            <div className="col-span-3 text-center text-gray-400 py-12 text-sm">
              {projects.length === 0
                ? `Chưa có dự án nào${!allYears ? ` trong năm ${year}` : ''}`
                : 'Không có dự án nào khớp với bộ lọc'}
            </div>
          )}
          {filteredProjects.map((p) => {
            const ragBorder: Record<string, string> = {
              green: 'border-l-4 border-l-green-400',
              amber: 'border-l-4 border-l-yellow-400',
              red: 'border-l-4 border-l-red-400',
            }
            const borderClass = (p.latest_health_rag as string | undefined)
              ? ragBorder[p.latest_health_rag as string] ?? 'border-l-4 border-l-gray-200'
              : 'border-l-4 border-l-gray-200'
            return (
              <div key={p.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${borderClass}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                    <p className="font-mono text-xs text-gray-400">{p.code}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  {(() => { const pf = portfolioMap[p.id]; return (<>
                    <div>
                      <p className="text-xs text-gray-400">Health</p>
                      <RagBadge rag={pf?.latest_health_rag} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">WSJF</p>
                      <p className="text-sm font-bold text-gray-700">
                        {pf?.wsjf_score != null ? pf.wsjf_score.toFixed(1) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Rank</p>
                      <p className="text-sm font-bold text-gray-700">
                        {pf?.priority_rank != null ? `#${pf.priority_rank}` : '—'}
                      </p>
                    </div>
                  </>)})()}
                </div>
                {(p.start_date || p.end_date) && (
                  <p className="text-xs text-gray-400 mt-2">
                    {p.start_date} → {p.end_date ?? 'TBD'}
                  </p>
                )}
                <div className="mt-3 text-right">
                  <Link to={`/projects/${p.id}`}
                    className="text-vib-blue text-xs hover:underline">Chi tiết →</Link>
                </div>
              </div>
            )
          })}
        </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  )
}
