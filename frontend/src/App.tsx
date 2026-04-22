import React, { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from './stores/auth'
import { ToastContainer } from './components/ui'
import LoginPage from './pages/LoginPage'
import PPGPage from './pages/ppg/PPGPage'
import BAPage from './pages/ba/BAPage'
import AnnualPlansPage from './pages/annual-plans/AnnualPlansPage'
import ProjectObjectsPage from './pages/projects/ProjectObjectsPage'
import BAWorkflowPage from './pages/ba-workflow/BAWorkflowPage'
import TestWorkflowPage from './pages/test-workflow/TestWorkflowPage'
import DocsPage from './pages/docs/DocsPage'
import CatalogPage from './pages/catalog/CatalogPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import RequestsPage from './pages/requests/RequestsPage'
import TodoPage from './pages/todos/TodoPage'
import './styles.css'

const APPS = [
  { key: 'dashboard'     as const, icon: '📊', label: 'Dashboard',    sub: 'Portfolio Overview',            path: '/dashboard',      desc: '' },
  { key: 'annual-plans'  as const, icon: '📅', label: 'Kế hoạch năm', sub: 'Annual Plan Management',        path: '/annual-plans',   desc: 'Quản lý mục tiêu, Definition of Done và danh mục dự án theo năm' },
  { key: 'ppg'           as const, icon: '🏗️', label: 'PPG System',   sub: 'Project Governance',            path: '/ppg',            desc: 'Single Source of Truth · IT Project Portfolio' },
  { key: 'ba-workflow'   as const, icon: '📝', label: 'BA',           sub: 'BA Document Hub',               path: '/ba-workflow',    desc: 'Transform Raw Requirements → BRD / BRS / ERD / API Spec' },
  { key: 'test-workflow' as const, icon: '🧪', label: 'Test',         sub: 'Test Dashboard',                path: '/test-workflow',  desc: 'Strategy · Execution · Control · Tài liệu' },
  { key: 'docs'          as const, icon: '📚', label: 'Tài liệu',     sub: 'Dự án / BA / Test',             path: '/docs',           desc: '' },
  { key: 'catalog'       as const, icon: '🗂️', label: 'Danh mục',     sub: 'Product & User Catalog',        path: '/catalog',        desc: 'Sản phẩm · Nhân sự · Vai trò & Phân quyền' },
  { key: 'requests'      as const, icon: '🎫', label: 'Requests',     sub: 'Change Request · Service Request', path: '/requests',    desc: 'Quản lý yêu cầu thay đổi dự án và yêu cầu dịch vụ vận hành' },
  { key: 'todos'         as const, icon: '✅', label: 'To-do',         sub: 'Task Tracking · Kanban · Workload', path: '/todos',      desc: '' },
]

function Shell() {
  const { logout, username } = useStore()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const currentApp = APPS.find(a => location.pathname.startsWith(a.path)) || APPS[0]

  return (
    <div className="shell">
      {/* Sidebar */}
      <nav className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}>
        <div className="sidebar__header">
          <button className="sidebar__toggle" onClick={() => setSidebarExpanded(e => !e)} aria-label="Toggle navigation">
            ☰
          </button>
          <span className="sidebar__brand">DevOps Hub</span>
        </div>
        <div className="sidebar-nav">
          {APPS.map(app => (
            <div key={app.key}
              className={`sidebar-item${currentApp.key === app.key ? ' active' : ''}`}
              onClick={() => navigate(app.path)}>
              <div className="sidebar-item__icon">{app.icon}</div>
              <span className="sidebar-item__label">{app.label}</span>
            </div>
          ))}
          <div className="sidebar-divider" />
          <div className="sidebar-item" onClick={() => window.open('http://localhost:8001/docs', '_blank')}>
            <div className="sidebar-item__icon">⚙️</div>
            <span className="sidebar-item__label">API — PPG</span>
          </div>
          <div className="sidebar-item" onClick={() => window.open('http://localhost:8002/docs', '_blank')}>
            <div className="sidebar-item__icon">⚙️</div>
            <span className="sidebar-item__label">API — BA</span>
          </div>
          <div className="sidebar-item" onClick={() => window.open('http://localhost:8003/docs', '_blank')}>
            <div className="sidebar-item__icon">⚙️</div>
            <span className="sidebar-item__label">API — Test</span>
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-item" onClick={logout}>
            <div className="sidebar-item__icon">🚪</div>
            <span className="sidebar-item__label">Đăng xuất</span>
          </div>
        </div>
      </nav>

      {/* Right Panel */}
      <div className="right-panel">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar__search-wrap">
            <span className="topbar__search-icon">🔍</span>
            <input className="topbar__search" type="text" placeholder="Tìm project, document, test case..." />
          </div>
          <div className="topbar__spacer" />
          <div className="topbar__actions">
            <div style={{ display: 'flex', gap: 4, background: 'var(--vib-neutral-100)', padding: '4px 6px', borderRadius: 20 }}>
              {APPS.map(a => (
                <button key={a.key}
                  onClick={() => navigate(a.path)}
                  style={{
                    padding: '4px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
                    background: currentApp.key === a.key ? 'var(--vib-primary)' : 'transparent',
                    color: currentApp.key === a.key ? '#fff' : 'var(--vib-neutral-600)',
                    transition: 'all 0.15s',
                  }}
                >{a.icon} {a.label}</button>
              ))}
            </div>
            <div className="topbar__avatar">{(username || 'U').slice(0, 2).toUpperCase()}</div>
            <span className="topbar__user-name">{username || 'User'}</span>
          </div>
        </header>

        {/* Body */}
        <div className="body-area">
          <div className="main-wrap">
            <div className="breadcrumb-bar">
              <span>DevOps Hub</span>
              <span className="sep">›</span>
              <span>{currentApp.label}</span>
              <span className="sep">›</span>
              <span className="active">{currentApp.sub}</span>
              {currentApp.desc && (
                <>
                  <span className="sep">·</span>
                  <span className="desc">{currentApp.desc}</span>
                </>
              )}
            </div>
            <main className="main-content">
              <Routes>
                <Route path="/dashboard"     element={<DashboardPage />} />
                <Route path="/annual-plans"  element={<AnnualPlansPage />} />
                <Route path="/ppg"           element={<PPGPage />} />
                <Route path="/catalog"       element={<CatalogPage />} />
                <Route path="/ba-workflow"   element={<BAWorkflowPage />} />
                <Route path="/test-workflow" element={<TestWorkflowPage />} />
                <Route path="/docs"          element={<DocsPage />} />
                <Route path="/requests"     element={<RequestsPage />} />
                <Route path="/todos"        element={<TodoPage />} />
                {/* legacy routes — still accessible, not in nav */}
                <Route path="/ba"            element={<BAPage />} />
                <Route path="/objects"       element={<ProjectObjectsPage />} />
                <Route path="*"              element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <RequireAuth>
          <Shell />
        </RequireAuth>
      } />
    </Routes>
  )
}
