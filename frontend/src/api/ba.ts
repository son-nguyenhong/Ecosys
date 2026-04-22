/**
 * BA Workflow API client — proxy via Vite /api/ba → :8002
 */

const BASE = '/api/ba'

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

// ── Requirements ──────────────────────────────────────────────────────────
export const getRequirements = (projectId?: string) =>
  request<Requirement[]>('GET', `/requirements${projectId ? `?project_id=${projectId}` : ''}`)
export const createRequirement = (data: RequirementCreate) =>
  request<Requirement>('POST', '/requirements', data)
export const getRequirement = (id: string) =>
  request<Requirement>('GET', `/requirements/${id}`)

// ── Documents ─────────────────────────────────────────────────────────────
export const getDocuments = (projectId?: string, docType?: string, status?: string) => {
  const p = new URLSearchParams()
  if (projectId) p.set('project_id', projectId)
  if (docType) p.set('doc_type', docType)
  if (status) p.set('status', status)
  return request<Document[]>('GET', `/documents?${p}`)
}
export const createDocument = (data: DocumentCreate) => request<Document>('POST', '/documents', data)
export const getDocument = (id: string) => request<Document>('GET', `/documents/${id}`)
export const updateDocument = (id: string, data: DocumentUpdate) => request<Document>('PUT', `/documents/${id}`, data)
export const documentAction = (id: string, action: string, actor?: string) =>
  request<{ status: string; doc_id: string }>('POST', `/documents/${id}/action`, { action, actor })

// ── Discussions ───────────────────────────────────────────────────────────
export const getDiscussions = (params?: { project_id?: string; doc_id?: string; status?: string }) => {
  const p = new URLSearchParams()
  if (params?.project_id) p.set('project_id', params.project_id)
  if (params?.doc_id) p.set('doc_id', params.doc_id)
  if (params?.status) p.set('status', params.status)
  return request<Discussion[]>('GET', `/discussions?${p}`)
}
export const createDiscussion = (data: DiscussionCreate) =>
  request<Discussion>('POST', '/discussions', data)
export const updateDiscussion = (id: string, data: DiscussionUpdate) =>
  request<Discussion>('PUT', `/discussions/${id}`, data)
export const deleteDiscussion = (id: string) =>
  request<void>('DELETE', `/discussions/${id}`)

// ── BA Tasks ──────────────────────────────────────────────────────────────
export const getBaTasks = (params?: { project_id?: string; milestone_id?: string; status?: string }) => {
  const p = new URLSearchParams()
  if (params?.project_id) p.set('project_id', params.project_id)
  if (params?.milestone_id) p.set('milestone_id', params.milestone_id)
  if (params?.status) p.set('status', params.status)
  return request<BaTask[]>('GET', `/ba-tasks?${p}`)
}
export const createBaTask = (data: BaTaskCreate) => request<BaTask>('POST', '/ba-tasks', data)
export const updateBaTask = (id: string, data: BaTaskUpdate) => request<BaTask>('PUT', `/ba-tasks/${id}`, data)
export const deleteBaTask = (id: string) => request<void>('DELETE', `/ba-tasks/${id}`)

// ── Timeline ──────────────────────────────────────────────────────────────
export const getBATimeline = (projectId: string) =>
  request<TimelineEntry[]>('GET', `/timeline/${projectId}`)

// ── Types ─────────────────────────────────────────────────────────────────
export interface Requirement {
  id: string; project_id: string; title: string; raw_text?: string
  status: string; created_by?: string; created_at: string; updated_at: string
}
export interface RequirementCreate {
  project_id: string; title: string; raw_text?: string; created_by?: string
}
export type DocType = 'BRD' | 'BRS' | 'ERD' | 'API'
export type DocStatus = 'draft' | 'review' | 'approved' | 'archived'
export interface Document {
  id: string; req_id?: string; project_id: string
  doc_type: DocType; title: string; content?: unknown
  version: string; status: DocStatus
  reviewed_by?: string; approved_by?: string
  pushed_at?: string
  created_at: string; updated_at: string
}
export interface DocumentCreate {
  req_id?: string; project_id: string; doc_type: DocType
  title: string; content?: unknown; version?: string
}
export interface DocumentUpdate {
  title?: string; content?: unknown
  changed_by?: string; change_note?: string
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
export interface BaTask {
  id: string; project_id: string; milestone_id?: string
  task_type?: string; title: string; description?: string
  preconditions?: unknown; status: string
  assigned_to?: string; due_date?: string
  completed_at?: string; created_at: string; updated_at: string
}
export interface BaTaskCreate {
  project_id: string; milestone_id?: string; task_type?: string
  title: string; description?: string
  assigned_to?: string; due_date?: string; preconditions?: string[]
}
export interface BaTaskUpdate {
  title?: string; description?: string; status?: string
  assigned_to?: string; due_date?: string
  milestone_id?: string; task_type?: string
}
export interface Milestone {
  id: string; project_id: string; name: string; milestone_type?: string
  start_date?: string; end_date?: string; status: string; sort_order: number
}
export interface TimelineEntry {
  milestone: Milestone | null
  ba_tasks: BaTask[]
}
