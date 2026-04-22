/**
 * Annual Plans API client (FR-019 – FR-022)
 * Proxy via Vite /api/ppg → :8001
 */

import type {
  AnnualPlan, AnnualPlanDetail, AnnualPlanCreate, AnnualPlanUpdate,
  AnnualPlanStatusRequest, DodItem, DodItemCreate, DodItemUpdate,
  LinkedProject, AnnualPlanSummary, ListResponse, SingleResponse,
  Initiative, InitiativeCreate, InitiativeUpdate,
  BizObjective, BizObjectiveCreate, BizObjectiveUpdate,
  BudgetEntry, BudgetCreate, BudgetUpdate,
  ResourceAlloc, ResourceCreate, ResourceUpdate,
  PlanKpi, KpiCreate, KpiUpdate,
  Dependency, DependencyCreate, DependencyUpdate,
  PlanRisk, RiskCreate, RiskUpdate,
} from '../types/annual-plan'

const BASE = '/api/ppg'

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    sessionStorage.removeItem('access_token')
    window.location.href = '/login'
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || err.error?.message || 'Request failed')
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

// ── Annual Plans CRUD ────────────────────────────────────────────

export interface AnnualPlansFilter {
  year?: number
  status?: string
  page?: number
  size?: number
}

export function getAnnualPlans(
  filter?: AnnualPlansFilter,
): Promise<ListResponse<AnnualPlan>> {
  const p = new URLSearchParams()
  if (filter?.year) p.set('year', String(filter.year))
  if (filter?.status) p.set('status', filter.status)
  if (filter?.page) p.set('page', String(filter.page))
  if (filter?.size) p.set('size', String(filter.size))
  const qs = p.toString()
  return request<ListResponse<AnnualPlan>>(
    'GET',
    `/annual-plans${qs ? `?${qs}` : ''}`,
  )
}

export function getAnnualPlan(
  planId: string,
): Promise<SingleResponse<AnnualPlanDetail>> {
  return request<SingleResponse<AnnualPlanDetail>>(
    'GET',
    `/annual-plans/${planId}`,
  )
}

export function createAnnualPlan(
  data: AnnualPlanCreate,
): Promise<SingleResponse<AnnualPlanDetail>> {
  return request<SingleResponse<AnnualPlanDetail>>(
    'POST',
    '/annual-plans',
    data,
  )
}

export function updateAnnualPlan(
  planId: string,
  data: AnnualPlanUpdate,
): Promise<SingleResponse<AnnualPlan>> {
  return request<SingleResponse<AnnualPlan>>(
    'PUT',
    `/annual-plans/${planId}`,
    data,
  )
}

export function deleteAnnualPlan(planId: string): Promise<void> {
  return request<void>('DELETE', `/annual-plans/${planId}`)
}

export function transitionAnnualPlanStatus(
  planId: string,
  body: AnnualPlanStatusRequest,
): Promise<SingleResponse<AnnualPlan>> {
  return request<SingleResponse<AnnualPlan>>(
    'POST',
    `/annual-plans/${planId}/status`,
    body,
  )
}

// ── DoD Items ────────────────────────────────────────────────────

export function getDodItems(
  planId: string,
): Promise<ListResponse<DodItem>> {
  return request<ListResponse<DodItem>>(
    'GET',
    `/annual-plans/${planId}/dod-items`,
  )
}

export function addDodItem(
  planId: string,
  data: DodItemCreate,
): Promise<SingleResponse<DodItem>> {
  return request<SingleResponse<DodItem>>(
    'POST',
    `/annual-plans/${planId}/dod-items`,
    data,
  )
}

export function updateDodItem(
  planId: string,
  itemId: string,
  data: DodItemUpdate,
): Promise<SingleResponse<DodItem>> {
  return request<SingleResponse<DodItem>>(
    'PUT',
    `/annual-plans/${planId}/dod-items/${itemId}`,
    data,
  )
}

export function deleteDodItem(planId: string, itemId: string): Promise<void> {
  return request<void>('DELETE', `/annual-plans/${planId}/dod-items/${itemId}`)
}

// ── Project Links ────────────────────────────────────────────────

export function getPlanProjects(
  planId: string,
): Promise<ListResponse<LinkedProject>> {
  return request<ListResponse<LinkedProject>>(
    'GET',
    `/annual-plans/${planId}/projects`,
  )
}

export function linkProjectToPlan(
  planId: string,
  projectId: string,
): Promise<void> {
  return request<void>('POST', `/annual-plans/${planId}/projects`, {
    project_id: projectId,
  })
}

export function unlinkProjectFromPlan(
  planId: string,
  projectId: string,
): Promise<void> {
  return request<void>(
    'DELETE',
    `/annual-plans/${planId}/projects/${projectId}`,
  )
}

// ── Initiatives ──────────────────────────────────────────────
export const getInitiatives = (planId: string) =>
  request<Initiative[]>('GET', `/annual-plans/${planId}/initiatives`)
export const createInitiative = (planId: string, d: InitiativeCreate) =>
  request<Initiative>('POST', `/annual-plans/${planId}/initiatives`, d)
export const updateInitiative = (planId: string, id: string, d: InitiativeUpdate) =>
  request<Initiative>('PUT', `/annual-plans/${planId}/initiatives/${id}`, d)
export const deleteInitiative = (planId: string, id: string) =>
  request<void>('DELETE', `/annual-plans/${planId}/initiatives/${id}`)

// ── Business Objectives ──────────────────────────────────────
export const getBizObjectives = (planId: string) =>
  request<BizObjective[]>('GET', `/annual-plans/${planId}/biz-objectives`)
export const createBizObjective = (planId: string, d: BizObjectiveCreate) =>
  request<BizObjective>('POST', `/annual-plans/${planId}/biz-objectives`, d)
export const updateBizObjective = (planId: string, id: string, d: BizObjectiveUpdate) =>
  request<BizObjective>('PUT', `/annual-plans/${planId}/biz-objectives/${id}`, d)
export const deleteBizObjective = (planId: string, id: string) =>
  request<void>('DELETE', `/annual-plans/${planId}/biz-objectives/${id}`)
export const mapInitiative = (planId: string, oid: string, initiativeId: string) =>
  request<void>('POST', `/annual-plans/${planId}/biz-objectives/${oid}/map`, { initiative_id: initiativeId })
export const unmapInitiative = (planId: string, oid: string, initiativeId: string) =>
  request<void>('DELETE', `/annual-plans/${planId}/biz-objectives/${oid}/map/${initiativeId}`)

// ── Budget ───────────────────────────────────────────────────
export const getBudget = (planId: string) =>
  request<BudgetEntry[]>('GET', `/annual-plans/${planId}/budget`)
export const createBudget = (planId: string, d: BudgetCreate) =>
  request<BudgetEntry>('POST', `/annual-plans/${planId}/budget`, d)
export const updateBudget = (planId: string, id: string, d: BudgetUpdate) =>
  request<BudgetEntry>('PUT', `/annual-plans/${planId}/budget/${id}`, d)
export const deleteBudget = (planId: string, id: string) =>
  request<void>('DELETE', `/annual-plans/${planId}/budget/${id}`)

// ── Resources ────────────────────────────────────────────────
export const getResources = (planId: string) =>
  request<ResourceAlloc[]>('GET', `/annual-plans/${planId}/resources`)
export const createResource = (planId: string, d: ResourceCreate) =>
  request<ResourceAlloc>('POST', `/annual-plans/${planId}/resources`, d)
export const updateResource = (planId: string, id: string, d: ResourceUpdate) =>
  request<ResourceAlloc>('PUT', `/annual-plans/${planId}/resources/${id}`, d)
export const deleteResource = (planId: string, id: string) =>
  request<void>('DELETE', `/annual-plans/${planId}/resources/${id}`)

// ── KPIs ─────────────────────────────────────────────────────
export const getKpis = (planId: string) =>
  request<PlanKpi[]>('GET', `/annual-plans/${planId}/kpis`)
export const createKpi = (planId: string, d: KpiCreate) =>
  request<PlanKpi>('POST', `/annual-plans/${planId}/kpis`, d)
export const updateKpi = (planId: string, id: string, d: KpiUpdate) =>
  request<PlanKpi>('PUT', `/annual-plans/${planId}/kpis/${id}`, d)
export const deleteKpi = (planId: string, id: string) =>
  request<void>('DELETE', `/annual-plans/${planId}/kpis/${id}`)

// ── Dependencies ─────────────────────────────────────────────
export const getDependencies = (planId: string) =>
  request<Dependency[]>('GET', `/annual-plans/${planId}/dependencies`)
export const createDependency = (planId: string, d: DependencyCreate) =>
  request<Dependency>('POST', `/annual-plans/${planId}/dependencies`, d)
export const updateDependency = (planId: string, id: string, d: DependencyUpdate) =>
  request<Dependency>('PUT', `/annual-plans/${planId}/dependencies/${id}`, d)
export const deleteDependency = (planId: string, id: string) =>
  request<void>('DELETE', `/annual-plans/${planId}/dependencies/${id}`)

// ── Risks ────────────────────────────────────────────────────
export const getRisks = (planId: string) =>
  request<PlanRisk[]>('GET', `/annual-plans/${planId}/risks`)
export const createRisk = (planId: string, d: RiskCreate) =>
  request<PlanRisk>('POST', `/annual-plans/${planId}/risks`, d)
export const updateRisk = (planId: string, id: string, d: RiskUpdate) =>
  request<PlanRisk>('PUT', `/annual-plans/${planId}/risks/${id}`, d)
export const deleteRisk = (planId: string, id: string) =>
  request<void>('DELETE', `/annual-plans/${planId}/risks/${id}`)

// ── Dashboard summary (FR-022) ───────────────────────────────────

export function getAnnualPlanSummary(
  planId: string,
): Promise<SingleResponse<AnnualPlanSummary>> {
  return request<SingleResponse<AnnualPlanSummary>>(
    'GET',
    `/reports/annual-plan-summary/${planId}`,
  )
}
