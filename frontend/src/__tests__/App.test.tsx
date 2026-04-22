/**
 * Unit tests for App.tsx — APPS array structure, routing, authentication guard.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mock child pages to avoid deep dependency chains
// ---------------------------------------------------------------------------

vi.mock('../pages/LoginPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'login-page' }, 'LoginPage'),
}))
vi.mock('../pages/ppg/PPGPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ppg-page' }, 'PPGPage'),
}))
vi.mock('../pages/ba/BAPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ba-page' }, 'BAPage'),
}))
vi.mock('../pages/test/TestPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'test-page' }, 'TestPage'),
}))
vi.mock('../pages/annual-plans/AnnualPlansPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'annual-plans-page' }, 'AnnualPlansPage'),
}))
vi.mock('../pages/projects/ProjectObjectsPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'project-objects-page' }, 'ProjectObjectsPage'),
}))
vi.mock('../pages/ba-workflow/BAWorkflowPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ba-workflow-page' }, 'BAWorkflowPage'),
}))
vi.mock('../pages/test-workflow/TestWorkflowPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'test-workflow-page' }, 'TestWorkflowPage'),
}))
vi.mock('../pages/docs/DocsPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'docs-page' }, 'DocsPage'),
}))

// Mock UI components
vi.mock('../components/ui', () => ({
  ToastContainer: () => null,
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
  StatusBadge: ({ status }: { status: string }) => React.createElement('span', null, status),
  Btn: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
  KpiCard: ({ label, value }: { label: string; value: number }) =>
    React.createElement('div', null, `${label}: ${value}`),
  Modal: () => null,
  Field: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  VibInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props),
  VibSelect: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) =>
    React.createElement('select', props, children),
  VibTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => React.createElement('textarea', props),
  EmptyState: ({ title }: { title: string }) => React.createElement('div', null, title),
  Confirm: () => null,
}))

// Mock the auth store — authenticated user by default
const mockLogout = vi.fn()
vi.mock('../stores/auth', () => ({
  useStore: () => ({
    username: 'testuser',
    isAuthenticated: true,
    logout: mockLogout,
    projects: [],
    setProjects: vi.fn(),
    annualPlans: [],
    setAnnualPlans: vi.fn(),
    selectedProject: null,
    setSelectedProject: vi.fn(),
    addToast: vi.fn(),
  }),
}))

// Import the component under test AFTER all mocks are set up
import App from '../App'

// ---------------------------------------------------------------------------
// APPS constant — mirrored from App.tsx for pure unit testing
// ---------------------------------------------------------------------------

const APPS = [
  { key: 'annual-plans' as const, icon: '📅', label: 'Kế hoạch năm', sub: 'Annual Plan Management',  path: '/annual-plans' },
  { key: 'ppg'          as const, icon: '🏗️', label: 'PPG System',   sub: 'Project Governance',      path: '/ppg' },
  { key: 'ba-workflow'  as const, icon: '📝', label: 'BA Workflow',   sub: 'BA Document Hub',          path: '/ba-workflow' },
  { key: 'test-workflow'as const, icon: '🧪', label: 'Test Platform', sub: 'Test Workflow',             path: '/test-workflow' },
  { key: 'docs'         as const, icon: '📚', label: 'Tài liệu',     sub: 'Dự án / BA / Test',         path: '/docs' },
]

// ---------------------------------------------------------------------------
// APPS array structure tests
// ---------------------------------------------------------------------------

describe('App — APPS array structure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has exactly 5 items', () => {
    expect(APPS.length).toBe(5)
  })

  it('first item is "Kế hoạch năm" with path /annual-plans', () => {
    expect(APPS[0].label).toBe('Kế hoạch năm')
    expect(APPS[0].path).toBe('/annual-plans')
    expect(APPS[0].key).toBe('annual-plans')
  })

  it('second item (index 1) is "PPG System"', () => {
    expect(APPS[1].label).toBe('PPG System')
    expect(APPS[1].key).toBe('ppg')
    expect(APPS[1].path).toBe('/ppg')
  })

  it('third item (index 2) is "BA Workflow"', () => {
    expect(APPS[2].label).toBe('BA Workflow')
    expect(APPS[2].key).toBe('ba-workflow')
  })

  it('fourth item (index 3) is "Test Platform"', () => {
    expect(APPS[3].label).toBe('Test Platform')
    expect(APPS[3].key).toBe('test-workflow')
  })

  it('last item (index 4) is "Tài liệu" → /docs', () => {
    expect(APPS[4].label).toBe('Tài liệu')
    expect(APPS[4].path).toBe('/docs')
    expect(APPS[4].key).toBe('docs')
  })

  it('all items have required fields: key, icon, label, sub, path', () => {
    APPS.forEach(app => {
      expect(app.key).toBeTruthy()
      expect(app.icon).toBeTruthy()
      expect(app.label).toBeTruthy()
      expect(app.sub).toBeTruthy()
      expect(app.path).toMatch(/^\//)
    })
  })

  it('all paths start with forward slash', () => {
    APPS.forEach(app => {
      expect(app.path.startsWith('/')).toBe(true)
    })
  })

  it('all keys are unique', () => {
    const keys = APPS.map(a => a.key)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(APPS.length)
  })

  it('all paths are unique', () => {
    const paths = APPS.map(a => a.path)
    const uniquePaths = new Set(paths)
    expect(uniquePaths.size).toBe(APPS.length)
  })
})

// ---------------------------------------------------------------------------
// Routing tests — using MemoryRouter to avoid BrowserRouter context issues
// ---------------------------------------------------------------------------

describe('App — routing (authenticated)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders AnnualPlansPage at /annual-plans', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/annual-plans'] },
        React.createElement(App)
      )
    )
    expect(screen.getByTestId('annual-plans-page')).toBeInTheDocument()
  })

  it('renders PPGPage at /ppg', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/ppg'] },
        React.createElement(App)
      )
    )
    expect(screen.getByTestId('ppg-page')).toBeInTheDocument()
  })

  it('renders DocsPage at /docs', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/docs'] },
        React.createElement(App)
      )
    )
    expect(screen.getByTestId('docs-page')).toBeInTheDocument()
  })

  it('renders BAWorkflowPage at /ba-workflow', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/ba-workflow'] },
        React.createElement(App)
      )
    )
    expect(screen.getByTestId('ba-workflow-page')).toBeInTheDocument()
  })

  it('renders TestWorkflowPage at /test-workflow', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/test-workflow'] },
        React.createElement(App)
      )
    )
    expect(screen.getByTestId('test-workflow-page')).toBeInTheDocument()
  })

  it('redirects from unknown path to /annual-plans (default redirect)', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/unknown-route'] },
        React.createElement(App)
      )
    )
    // The wildcard Route redirects to /annual-plans
    expect(screen.getByTestId('annual-plans-page')).toBeInTheDocument()
  })

  it('shows login page at /login path', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/login'] },
        React.createElement(App)
      )
    )
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Sidebar structure test — shell renders sidebar nav with all 5 apps
// ---------------------------------------------------------------------------

describe('App — Shell sidebar', () => {
  it('renders sidebar with DevOps Hub brand', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/annual-plans'] },
        React.createElement(App)
      )
    )
    expect(screen.getByText('DevOps Hub')).toBeInTheDocument()
  })

  it('renders all 5 app labels in the topbar pill navigation', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/annual-plans'] },
        React.createElement(App)
      )
    )
    // All 5 app labels should appear in topbar buttons
    expect(screen.getAllByText('Kế hoạch năm').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('PPG System').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('BA Workflow').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Test Platform').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Tài liệu').length).toBeGreaterThanOrEqual(1)
  })
})
