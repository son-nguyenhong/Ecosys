/**
 * Workflow Documents API client (FR-027 – FR-032)
 * BA documents: Proxy via /api/ba → :8002
 * Test documents: Proxy via /api/test → :8003
 */

import type {
  BADocument,
  BADocumentCreate,
  BADocumentUpdate,
  BADocType,
  BADocStatus,
  BAStatusRequest,
  BADocumentObjectLink,
  TestDocument,
  TestDocumentCreate,
  TestDocumentUpdate,
  TestDocType,
  TestDocStatus,
  TestStatusRequest,
  ObjectTestCoverage,
  TestCaseObjectLink,
} from '../types/workflow-doc'

const BA_BASE = '/api/ba'
const TEST_BASE = '/api/test'

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

async function request<T>(
  base: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
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

function baRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(BA_BASE, method, path, body)
}

function testRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(TEST_BASE, method, path, body)
}

// ─────────────────────────────────────────────────────────────────
// BA Documents (FR-027 – FR-029)
// ─────────────────────────────────────────────────────────────────

export interface BADocumentsFilter {
  project_id?: string
  object_id?: string
  doc_type?: BADocType
  status?: BADocStatus
  milestone_id?: string
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

export function getBADocuments(
  filter?: BADocumentsFilter,
): Promise<ListResponse<BADocument>> {
  const p = new URLSearchParams()
  if (filter?.project_id) p.set('project_id', filter.project_id)
  if (filter?.object_id) p.set('object_id', filter.object_id)
  if (filter?.doc_type) p.set('doc_type', filter.doc_type)
  if (filter?.status) p.set('status', filter.status)
  if (filter?.milestone_id) p.set('milestone_id', filter.milestone_id)
  if (filter?.page) p.set('page', String(filter.page))
  if (filter?.size) p.set('size', String(filter.size))
  const qs = p.toString()
  // v2 router lives at /api/v1/documents on port 8002; proxy strips /api/ba → hits 8002/api/v1/documents
  return baRequest<ListResponse<BADocument>>('GET', `/api/v1/documents${qs ? `?${qs}` : ''}`)
}

export function getBADocument(docId: string): Promise<SingleResponse<BADocument>> {
  return baRequest<SingleResponse<BADocument>>('GET', `/api/v1/documents/${docId}`)
}

export function createBADocument(
  data: BADocumentCreate,
): Promise<SingleResponse<BADocument>> {
  return baRequest<SingleResponse<BADocument>>('POST', '/api/v1/documents', data)
}

export function updateBADocument(
  docId: string,
  data: BADocumentUpdate,
): Promise<SingleResponse<BADocument>> {
  return baRequest<SingleResponse<BADocument>>('PUT', `/api/v1/documents/${docId}`, data)
}

export function transitionBADocumentStatus(
  docId: string,
  body: BAStatusRequest,
): Promise<SingleResponse<BADocument>> {
  return baRequest<SingleResponse<BADocument>>(
    'POST',
    `/api/v1/documents/${docId}/status`,
    body,
  )
}

// BA Document <-> Object links (FR-027)
export function getBADocumentObjects(
  docId: string,
): Promise<ListResponse<BADocumentObjectLink>> {
  return baRequest<ListResponse<BADocumentObjectLink>>(
    'GET',
    `/api/v1/documents/${docId}/objects`,
  )
}

export function linkBADocumentToObject(
  docId: string,
  objectId: string,
): Promise<void> {
  return baRequest<void>('POST', `/api/v1/documents/${docId}/objects`, {
    object_id: objectId,
  })
}

export function unlinkBADocumentFromObject(
  docId: string,
  objectId: string,
): Promise<void> {
  return baRequest<void>('DELETE', `/api/v1/documents/${docId}/objects/${objectId}`)
}

// ─────────────────────────────────────────────────────────────────
// Test Documents (FR-030 – FR-032)
// ─────────────────────────────────────────────────────────────────

export interface TestDocumentsFilter {
  project_id?: string
  object_id?: string
  doc_type?: TestDocType
  status?: TestDocStatus
  milestone_id?: string
  severity?: string
  page?: number
  size?: number
}

// Base path for all test-document endpoints
// Backend router: prefix="/api/v1/test-documents" mounted on test-platform (port 8003)
// Vite proxy: /api/test → http://127.0.0.1:8003  (strips /api/test, forwards remainder)
// So frontend must use /api/v1/test-documents/... to reach /api/v1/test-documents on the backend.
const TEST_DOC_BASE = '/api/v1/test-documents'

export function getTestDocuments(
  filter?: TestDocumentsFilter,
): Promise<ListResponse<TestDocument>> {
  const p = new URLSearchParams()
  if (filter?.project_id) p.set('project_id', filter.project_id)
  if (filter?.object_id) p.set('object_id', filter.object_id)
  if (filter?.doc_type) p.set('doc_type', filter.doc_type)
  if (filter?.status) p.set('status', filter.status)
  if (filter?.milestone_id) p.set('milestone_id', filter.milestone_id)
  if (filter?.severity) p.set('severity', filter.severity)
  if (filter?.page) p.set('page', String(filter.page))
  if (filter?.size) p.set('size', String(filter.size))
  const qs = p.toString()
  return testRequest<ListResponse<TestDocument>>(
    'GET',
    `${TEST_DOC_BASE}${qs ? `?${qs}` : ''}`,
  )
}

export function getTestDocument(
  docId: string,
): Promise<SingleResponse<TestDocument>> {
  return testRequest<SingleResponse<TestDocument>>(
    'GET',
    `${TEST_DOC_BASE}/${docId}`,
  )
}

export function createTestDocument(
  data: TestDocumentCreate,
): Promise<SingleResponse<TestDocument>> {
  return testRequest<SingleResponse<TestDocument>>(
    'POST',
    TEST_DOC_BASE,
    data,
  )
}

export function updateTestDocument(
  docId: string,
  data: TestDocumentUpdate,
): Promise<SingleResponse<TestDocument>> {
  return testRequest<SingleResponse<TestDocument>>(
    'PUT',
    `${TEST_DOC_BASE}/${docId}`,
    data,
  )
}

export function transitionTestDocumentStatus(
  docId: string,
  body: TestStatusRequest,
): Promise<SingleResponse<TestDocument>> {
  return testRequest<SingleResponse<TestDocument>>(
    'POST',
    `${TEST_DOC_BASE}/${docId}/status`,
    body,
  )
}

// Test case <-> object links (FR-030)
// Sub-route of test-documents router: /api/v1/test-documents/test-cases/{id}/objects
export function getTestCaseObjects(
  testCaseId: string,
): Promise<ListResponse<TestCaseObjectLink>> {
  return testRequest<ListResponse<TestCaseObjectLink>>(
    'GET',
    `${TEST_DOC_BASE}/test-cases/${testCaseId}/objects`,
  )
}

// Coverage summary per object (FR-031)
// Sub-route of test-documents router: /api/v1/test-documents/objects/{id}/test-coverage
export function getObjectTestCoverage(
  objectId: string,
): Promise<SingleResponse<ObjectTestCoverage>> {
  return testRequest<SingleResponse<ObjectTestCoverage>>(
    'GET',
    `${TEST_DOC_BASE}/objects/${objectId}/test-coverage`,
  )
}
