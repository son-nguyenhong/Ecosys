/**
 * Dashboard API client — /api/ppg/dashboard
 */

const BASE = '/api/ppg'

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (res.status === 401) {
    sessionStorage.removeItem('access_token')
    window.location.href = '/login'
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface KpiData {
  total_projects: number
  active_projects: number
  completed_projects: number
  open_risks: number
  avg_risk_score: number
  total_budget_planned: number
  total_budget_actual: number
  budget_utilization_pct: number
}

export interface StatusDistItem {
  status: string
  count: number
}

export interface BudgetChartItem {
  quarter: string
  planned: number
  actual: number
}

export interface BudgetByTypeItem {
  budget_type: string
  planned: number
  actual: number
}

export interface DashboardSummary {
  kpi: KpiData
  status_distribution: StatusDistItem[]
  budget_chart: BudgetChartItem[]
  budget_by_type: BudgetByTypeItem[]
}

export interface DashboardProject {
  id: string
  code: string
  name: string
  status: string
  owner: string | null
  start_date: string | null
  end_date: string | null
  domain_code: string | null
  domain_label: string | null
  created_at: string | null
  member_count: number
}

export interface PlanSummary {
  plan_id: string
  plan_name: string
  year: number
  plan_status: string
  total_planned: number
  total_actual: number
  variance: number
  utilization_pct: number
  line_count: number
}

export interface QuarterlyDetail {
  plan_name: string
  year: number
  quarter: string
  budget_type: string
  planned: number
  actual: number
  variance: number
  currency: string
}

export interface FinancialData {
  plan_summary: PlanSummary[]
  quarterly_detail: QuarterlyDetail[]
}

export interface RiskItem {
  id: string
  title: string
  description: string | null
  category: string | null
  probability: number | null
  impact: number | null
  risk_score: number | null
  mitigation: string | null
  owner: string | null
  quarter: string | null
  status: string
  plan_name: string
  plan_year: number
  created_at: string | null
}

export interface MemberItem {
  name: string
  role: string | null
  email: string | null
}

export interface ProjectHeadcount {
  project_id: string
  code: string
  project_name: string
  project_status: string
  domain_code: string | null
  domain_label: string | null
  headcount: number
  members: MemberItem[]
}

export interface PlanResourceItem {
  plan_name: string
  year: number
  team: string | null
  role: string | null
  unique_members: number
  avg_allocation_pct: number
  quarter: string
}

export interface ResourceData {
  project_headcount: ProjectHeadcount[]
  plan_resources: PlanResourceItem[]
}

// ── API calls ──────────────────────────────────────────────────────────────

export const getDashboardSummary = () =>
  request<DashboardSummary>('/dashboard/summary')

export const getDashboardProjects = () =>
  request<DashboardProject[]>('/dashboard/projects')

export const getDashboardFinancial = () =>
  request<FinancialData>('/dashboard/financial')

export const getDashboardRisks = (limit = 20) =>
  request<RiskItem[]>(`/dashboard/risks?limit=${limit}`)

export const getDashboardResources = () =>
  request<ResourceData>('/dashboard/resources')
