import { create } from 'zustand'
import { login as apiLogin } from '../api/ppg'
import type { Project, AnnualPlan, Milestone, Member, ProjectFile, Meeting } from '../api/ppg'
import type { Document } from '../api/ba'
import type { TestCase, TestReport } from '../api/test'

interface Toast {
  id: string
  message: string
  type: 'success' | 'warn' | 'error' | 'info'
}

interface AppState {
  // ── Auth ──────────────────────────────────────────────────────
  username: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void

  // ── Navigation ────────────────────────────────────────────────
  activeApp: 'ppg' | 'ba' | 'test'
  setActiveApp: (a: AppState['activeApp']) => void

  // ── Projects ──────────────────────────────────────────────────
  projects: Project[]
  setProjects: (p: Project[]) => void

  selectedProject: Project | null
  setSelectedProject: (p: Project | null) => void

  // ── Annual Plans ──────────────────────────────────────────────
  annualPlans: AnnualPlan[]
  setAnnualPlans: (plans: AnnualPlan[]) => void

  // ── Milestones ────────────────────────────────────────────────
  milestones: Milestone[]
  setMilestones: (m: Milestone[]) => void

  // ── Members ───────────────────────────────────────────────────
  members: Member[]
  setMembers: (m: Member[]) => void

  // ── Documents (BA) ────────────────────────────────────────────
  documents: Document[]
  setDocuments: (d: Document[]) => void

  // ── Test Cases ────────────────────────────────────────────────
  testCases: TestCase[]
  setTestCases: (t: TestCase[]) => void

  // ── Reports ───────────────────────────────────────────────────
  reports: TestReport[]
  setReports: (r: TestReport[]) => void

  // ── Toasts ────────────────────────────────────────────────────
  toasts: Toast[]
  addToast: (msg: string, type?: Toast['type']) => void
  removeToast: (id: string) => void

  // ── Global loading ────────────────────────────────────────────
  loading: boolean
  setLoading: (v: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  // Auth
  username: null,
  isAuthenticated: !!sessionStorage.getItem('access_token'),

  login: async (username, password) => {
    const res = await apiLogin(username, password)
    sessionStorage.setItem('access_token', res.access_token)
    set({ username, isAuthenticated: true })
  },

  logout: () => {
    sessionStorage.removeItem('access_token')
    set({ username: null, isAuthenticated: false, selectedProject: null })
  },

  // Navigation
  activeApp: 'ppg',
  setActiveApp: (activeApp) => set({ activeApp }),

  // Projects
  projects: [],
  setProjects: (projects) => set({ projects }),

  selectedProject: null,
  setSelectedProject: (selectedProject) => set({ selectedProject }),

  // Annual Plans
  annualPlans: [],
  setAnnualPlans: (annualPlans) => set({ annualPlans }),

  // Milestones
  milestones: [],
  setMilestones: (milestones) => set({ milestones }),

  // Members
  members: [],
  setMembers: (members) => set({ members }),

  // Documents
  documents: [],
  setDocuments: (documents) => set({ documents }),

  // Test Cases
  testCases: [],
  setTestCases: (testCases) => set({ testCases }),

  // Reports
  reports: [],
  setReports: (reports) => set({ reports }),

  // Toasts
  toasts: [],
  addToast: (message, type = 'info') =>
    set((s) => ({
      toasts: [...s.toasts, { id: Date.now().toString() + Math.random(), message, type }],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Loading
  loading: false,
  setLoading: (loading) => set({ loading }),
}))

// Backwards-compat alias for components that import useAuthStore
export const useAuthStore = useStore
