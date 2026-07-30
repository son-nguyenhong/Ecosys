/**
 * BA Studio API client — proxy qua Vite /api/ba → :8002 (router /api/v1/ba-studio)
 */

import type {
  CrHistoryEntry,
  DocCr,
  DocCrCreatePayload,
  DocCrDetail,
  DocCrUpdatePayload,
  DocVersion,
  MasterDocBase,
  MasterDocCreatePayload,
  MasterDocDetail,
  MasterDocListItem,
  MasterDocUpdatePayload,
  MergeResult,
  OpenStage,
  SectionInput,
} from '../lib/ba-studio/types'

const BASE = '/api/ba/api/v1/ba-studio'

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

interface Envelope<T> { data: T }

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
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
    const detail = typeof err.detail === 'string'
      ? err.detail
      : Array.isArray(err.detail)
        ? err.detail.map((e: { msg?: string }) => e.msg ?? '').filter(Boolean).join('; ')
        : err.detail?.message ?? 'Yêu cầu thất bại'
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  const payload = (await res.json()) as Envelope<T>
  return payload.data
}

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v) })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

// ── Master Docs ─────────────────────────────────────────────────────────────

export const listDocs = (params: {
  project_id?: string; doc_type?: string; status?: string
} = {}) => request<MasterDocListItem[]>('GET', `/docs${qs(params)}`)

export const getDoc = (docId: string) =>
  request<MasterDocDetail>('GET', `/docs/${docId}`)

export const createDoc = (payload: MasterDocCreatePayload) =>
  request<MasterDocBase>('POST', '/docs', payload)

export const updateDoc = (docId: string, payload: MasterDocUpdatePayload) =>
  request<MasterDocBase>('PUT', `/docs/${docId}`, payload)

export const replaceSections = (docId: string, sections: SectionInput[]) =>
  request<{ doc_id: string; sections: SectionInput[] }>('PUT', `/docs/${docId}/sections`, { sections })

/** Ghi lại toàn bộ nội dung tài liệu bằng 1 file Markdown (cách dùng chính) */
export const replaceContent = (docId: string, content_md: string) =>
  request<{ doc_id: string; sections: SectionInput[]; content_md: string }>(
    'PUT', `/docs/${docId}/sections`, { content_md })

export const deleteDoc = (docId: string) =>
  request<void>('DELETE', `/docs/${docId}`)

export const listVersions = (docId: string) =>
  request<DocVersion[]>('GET', `/docs/${docId}/versions`)

// ── Change Requests cấp tài liệu ────────────────────────────────────────────

export const listDocCrs = (params: {
  doc_id?: string; project_id?: string; merge_state?: string; stage?: string
} = {}) => request<DocCr[]>('GET', `/doc-crs${qs(params)}`)

export const getDocCr = (crId: string) =>
  request<DocCrDetail>('GET', `/doc-crs/${crId}`)

export const createDocCr = (payload: DocCrCreatePayload) =>
  request<DocCr>('POST', '/doc-crs', payload)

export const updateDocCr = (crId: string, payload: DocCrUpdatePayload) =>
  request<DocCr>('PUT', `/doc-crs/${crId}`, payload)

export const deleteDocCr = (crId: string) =>
  request<void>('DELETE', `/doc-crs/${crId}`)

export const changeCrStage = (crId: string, stage: OpenStage, comment?: string) =>
  request<{ request_code: string; stage: string }>('POST', `/doc-crs/${crId}/stage`, { stage, comment })

export const mergeDocCr = (crId: string, opts: { comment?: string; force_approve?: boolean } = {}) =>
  request<MergeResult>('POST', `/doc-crs/${crId}/merge`, opts)

export const rejectDocCr = (crId: string, reason: string) =>
  request<{ request_code: string; merge_state: string }>('POST', `/doc-crs/${crId}/reject`, { reason })

export const getCrHistory = (crId: string) =>
  request<CrHistoryEntry[]>('GET', `/doc-crs/${crId}/history`)
