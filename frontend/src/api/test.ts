/**
 * Test Platform API client — proxy via Vite /api/test → :8003
 */

const BASE = '/api/test'

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) { sessionStorage.removeItem('access_token'); window.location.href = '/login' }
  if (!res.ok) { const err = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(err.detail || 'Request failed') }
  return res.status === 204 ? (undefined as T) : res.json()
}

// ── BRS Sync ──────────────────────────────────────────────────────────────
export const getBrsList = () => request<BrsSync[]>('GET', '/brs')
export const rediffBrs = (brsId: string) => request<{ message: string }>('POST', `/brs/${brsId}/rediff`)

// ── Test Cases ────────────────────────────────────────────────────────────
export const getTestCases = (brsId?: string, status?: string) => {
  const p = new URLSearchParams()
  if (brsId) p.set('brs_id', brsId)
  if (status) p.set('status', status)
  return request<TestCase[]>('GET', `/test-cases?${p}`)
}
export const createTestCase = (data: TestCaseCreate) => request<TestCase>('POST', '/test-cases', data)
export const testCaseAction = (id: string, action: string) =>
  request<TestCase>('PUT', `/test-cases/${id}/action`, { action })
export const deleteTestCase = (id: string) => request<void>('DELETE', `/test-cases/${id}`)

// ── Test Reports ──────────────────────────────────────────────────────────
export const getTestReports = (projectId?: string) =>
  request<TestReport[]>('GET', `/test-reports${projectId ? `?project_id=${projectId}` : ''}`)
export const createTestReport = (data: TestReportCreate) => request<TestReport>('POST', '/test-reports', data)
export const approveTestReport = (id: string) =>
  request<{ status: string; report_id: string }>('POST', `/test-reports/${id}/approve`)

// ── Test Tasks ────────────────────────────────────────────────────────────
export const getTestTasks = (params?: { project_id?: string; milestone_id?: string; status?: string }) => {
  const p = new URLSearchParams()
  if (params?.project_id) p.set('project_id', params.project_id)
  if (params?.milestone_id) p.set('milestone_id', params.milestone_id)
  if (params?.status) p.set('status', params.status)
  return request<TestTask[]>('GET', `/test-tasks?${p}`)
}
export const createTestTask = (data: TestTaskCreate) => request<TestTask>('POST', '/test-tasks', data)
export const updateTestTask = (id: string, data: TestTaskUpdate) =>
  request<TestTask>('PUT', `/test-tasks/${id}`, data)
export const deleteTestTask = (id: string) => request<void>('DELETE', `/test-tasks/${id}`)

// ── Discussions ───────────────────────────────────────────────────────────
export const getTestDiscussions = (params?: { project_id?: string; doc_id?: string; status?: string }) => {
  const p = new URLSearchParams()
  if (params?.project_id) p.set('project_id', params.project_id)
  if (params?.doc_id) p.set('doc_id', params.doc_id)
  if (params?.status) p.set('status', params.status)
  return request<Discussion[]>('GET', `/discussions?${p}`)
}
export const createTestDiscussion = (data: DiscussionCreate) =>
  request<Discussion>('POST', '/discussions', data)
export const updateTestDiscussion = (id: string, data: DiscussionUpdate) =>
  request<Discussion>('PUT', `/discussions/${id}`, data)
export const deleteTestDiscussion = (id: string) => request<void>('DELETE', `/discussions/${id}`)

// ── Timeline ──────────────────────────────────────────────────────────────
export const getTestTimeline = (projectId: string) =>
  request<TimelineEntry[]>('GET', `/timeline/${projectId}`)

// ── Metrics Dashboard ─────────────────────────────────────────────────────
export const getStrategyMetrics  = (projectId?: string) =>
  request<StrategyMetrics>('GET',  `/metrics/strategy${projectId  ? `?project_id=${projectId}`  : ''}`)
export const getExecutionMetrics = (projectId?: string) =>
  request<ExecutionMetrics>('GET', `/metrics/execution${projectId ? `?project_id=${projectId}` : ''}`)
export const getControlMetrics   = (projectId?: string) =>
  request<ControlMetrics>('GET',   `/metrics/control${projectId   ? `?project_id=${projectId}`   : ''}`)

// ── Types ─────────────────────────────────────────────────────────────────
export interface BrsSync {
  id: string; brs_id: string; version: string; project_id?: string
  payload?: unknown; synced_at: string
}
export interface TestCase {
  id: string; brs_id?: string; brs_sync_id?: string
  title: string; module?: string; steps?: unknown[]
  expected_result?: string; playwright_script?: string
  status: string; created_at: string; updated_at: string
}
export interface TestCaseCreate {
  brs_id?: string; brs_sync_id?: string; title: string
  module?: string; steps?: unknown[]
  expected_result?: string; playwright_script?: string
}
export interface TestReport {
  id: string; project_id?: string
  total: number; passed: number; failed: number; coverage: number
  logs?: string; status: string; executed_at: string
  approved_at?: string; pushed_at?: string
}
export interface TestReportCreate {
  project_id: string; total: number; passed: number; logs?: string
}
export interface TestTask {
  id: string; project_id: string; milestone_id?: string
  task_type?: string; title: string; description?: string
  preconditions?: unknown; status: string
  assigned_to?: string; due_date?: string
  completed_at?: string; created_at: string; updated_at: string
}
export interface TestTaskCreate {
  project_id: string; milestone_id?: string; task_type?: string
  title: string; description?: string
  assigned_to?: string; due_date?: string; preconditions?: string[]
}
export interface TestTaskUpdate {
  title?: string; description?: string; status?: string
  assigned_to?: string; due_date?: string
  milestone_id?: string; task_type?: string
}
export interface Discussion {
  id: string; project_id?: string; doc_id?: string
  workflow_type: string; title?: string; content: string
  raised_by?: string; status: 'open' | 'resolved' | 'deferred'
  resolution?: string; resolved_by?: string
  created_at: string; updated_at: string
}
export interface DiscussionCreate {
  project_id?: string; doc_id?: string
  title?: string; content: string; raised_by?: string
}
export interface DiscussionUpdate {
  status?: string; resolution?: string; resolved_by?: string
}
// ── Metrics Dashboard ─────────────────────────────────────────────────────────
export interface ModuleScope {
  module: string; total: number; executed: number; approved: number
  reviewed: number; generated: number; executed_pct: number
  risk_level: 'low' | 'medium' | 'high'
  defect_count: number; defect_high: number
}
export interface StrategyMetrics {
  coverage_pct: number; total_requirements: number; tested_requirements: number
  test_scope: ModuleScope[]
}
export interface ExecutionTrend {
  date: string | null; total: number; passed: number
  failed: number; pass_pct: number; coverage: number; status: string
}
export interface ExecutionMetrics {
  total_cases: number
  by_status: { generated: number; reviewed: number; approved: number; executed: number }
  automated_count: number; automation_pct: number
  run_count: number; sum_total: number; sum_passed: number; sum_failed: number
  pass_pct: number; fail_pct: number; last_run: string | null
  trend: ExecutionTrend[]
}
export interface DefectBySeverity {
  severity: string; total: number; resolved: number; open: number
}
export interface ControlMetrics {
  total_defects: number
  defects_by_severity: DefectBySeverity[]
  defects_by_env: { env: string; count: number }[]
  prod_defects: number; leakage_pct: number
  reopened_count: number; total_resolved: number; reopen_rate_pct: number
  release_readiness_score: number
  readiness_breakdown: {
    exec_pass_score: number; coverage_score: number
    defect_score: number; reopen_score: number
  }
}

export interface Milestone {
  id: string; project_id: string; name: string; milestone_type?: string
  start_date?: string; end_date?: string; status: string; sort_order: number
}
export interface TimelineEntry {
  milestone: Milestone | null
  test_tasks: TestTask[]
}
