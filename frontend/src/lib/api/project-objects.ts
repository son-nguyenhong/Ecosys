/**
 * Project Objects API client (FR-023 – FR-026)
 * Proxy via Vite /api/ppg → :8001
 */

import type {
  ProjectObject,
  ProjectObjectDetail,
  ProjectObjectCreate,
  ProjectObjectUpdate,
  ProjectObjectType,
  ProjectObjectStatus,
  ConnectionsResponse,
  ConnectionCreate,
  ConnectionReport,
  ConflictStrategy,
  ImportResult,
} from '../types/project-object'

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

export interface ObjectsFilter {
  object_type?: ProjectObjectType
  status?: ProjectObjectStatus
  q?: string
  page?: number
  size?: number
}

export interface ListResponse<T> {
  data: T[]
  meta: { total: number; page: number; size: number }
}

export interface SingleResponse<T> {
  data: T
}

// ── Project Objects CRUD ─────────────────────────────────────────

export function getProjectObjects(
  projectId: string,
  filter?: ObjectsFilter,
): Promise<ListResponse<ProjectObject>> {
  const p = new URLSearchParams()
  if (filter?.object_type) p.set('object_type', filter.object_type)
  if (filter?.status) p.set('status', filter.status)
  if (filter?.q) p.set('q', filter.q)
  if (filter?.page) p.set('page', String(filter.page))
  if (filter?.size) p.set('size', String(filter.size))
  const qs = p.toString()
  return request<ListResponse<ProjectObject>>(
    'GET',
    `/projects/${projectId}/objects${qs ? `?${qs}` : ''}`,
  )
}

export function getProjectObject(
  projectId: string,
  objectId: string,
): Promise<SingleResponse<ProjectObjectDetail>> {
  return request<SingleResponse<ProjectObjectDetail>>(
    'GET',
    `/projects/${projectId}/objects/${objectId}`,
  )
}

export function createProjectObject(
  projectId: string,
  data: ProjectObjectCreate,
): Promise<SingleResponse<ProjectObject>> {
  return request<SingleResponse<ProjectObject>>(
    'POST',
    `/projects/${projectId}/objects`,
    data,
  )
}

export function updateProjectObject(
  projectId: string,
  objectId: string,
  data: ProjectObjectUpdate,
): Promise<SingleResponse<ProjectObject>> {
  return request<SingleResponse<ProjectObject>>(
    'PUT',
    `/projects/${projectId}/objects/${objectId}`,
    data,
  )
}

export function deleteProjectObject(
  projectId: string,
  objectId: string,
): Promise<void> {
  return request<void>(
    'DELETE',
    `/projects/${projectId}/objects/${objectId}`,
  )
}

// ── Connections ──────────────────────────────────────────────────

export function getObjectConnections(
  projectId: string,
  objectId: string,
): Promise<ConnectionsResponse> {
  return request<ConnectionsResponse>(
    'GET',
    `/projects/${projectId}/objects/${objectId}/connections`,
  )
}

export function createObjectConnection(
  projectId: string,
  objectId: string,
  data: ConnectionCreate,
): Promise<SingleResponse<unknown>> {
  return request<SingleResponse<unknown>>(
    'POST',
    `/projects/${projectId}/objects/${objectId}/connections`,
    data,
  )
}

export function deleteObjectConnection(
  projectId: string,
  objectId: string,
  connId: string,
): Promise<void> {
  return request<void>(
    'DELETE',
    `/projects/${projectId}/objects/${objectId}/connections/${connId}`,
  )
}

// ── Export ───────────────────────────────────────────────────────

export function getExportUrl(
  projectId: string,
  objectType: ProjectObjectType,
): string {
  const token = sessionStorage.getItem('access_token')
  return `${BASE}/projects/${projectId}/objects/export?object_type=${objectType}&token=${token ?? ''}`
}

// ── Import ───────────────────────────────────────────────────────

export interface ImportOptions {
  objectType: ProjectObjectType
  conflictStrategy?: ConflictStrategy
}

export interface ImportConflictPayload {
  error: {
    code: 'IMPORT_CONFLICT'
    message: string
    details: { conflicting_codes: string[]; hint: string }
  }
}

export type ImportResponse =
  | { success: true; result: ImportResult }
  | { success: false; conflict: ImportConflictPayload['error'] }

export async function importProjectObjects(
  projectId: string,
  file: File,
  options: ImportOptions,
): Promise<ImportResponse> {
  const token = sessionStorage.getItem('access_token')
  const fd = new FormData()
  fd.append('file', file)
  fd.append('object_type', options.objectType)
  fd.append('conflict_strategy', options.conflictStrategy ?? 'ask')

  const res = await fetch(
    `${BASE}/projects/${projectId}/objects/import`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    },
  )

  if (res.status === 401) {
    sessionStorage.removeItem('access_token')
    window.location.href = '/login'
  }

  if (res.status === 409) {
    const body = await res.json() as ImportConflictPayload
    return { success: false, conflict: body.error }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Import failed')
  }

  const body = await res.json() as { data: ImportResult }
  return { success: true, result: body.data }
}

// ── Cross-project connection report (FR-026) ─────────────────────

export interface ConnectionReportFilter {
  object_name?: string
  object_id?: string
  project_id?: string
  direction?: 'in' | 'out' | 'both'
  status?: string
}

export interface ConnectionReportResponse {
  data: ConnectionReport
}

export function getConnectionReport(
  filter: ConnectionReportFilter,
): Promise<ConnectionReportResponse> {
  const p = new URLSearchParams()
  if (filter.object_name) p.set('object_name', filter.object_name)
  if (filter.object_id) p.set('object_id', filter.object_id)
  if (filter.project_id) p.set('project_id', filter.project_id)
  if (filter.direction) p.set('direction', filter.direction)
  if (filter.status) p.set('status', filter.status)
  return request<ConnectionReportResponse>(
    'GET',
    `/reports/connections?${p.toString()}`,
  )
}
