/**
 * PPG API client — proxy via Vite /api/ppg → :8001
 */

const BASE = '/api/ppg'

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

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
    throw new Error(err.detail || 'Request failed')
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  request<{ access_token: string; token_type: string }>('POST', '/auth/login', { username, password })

// ── Project Domains (LOV) ─────────────────────────────────────────────────
export const getProjectDomains = () =>
  request<ProjectDomain[]>('GET', '/projects/domains')

// ── Projects ──────────────────────────────────────────────────────────────
export const getProjects = (params?: { status?: string; year?: number; all_years?: boolean }) => {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.year !== undefined) qs.set('year', String(params.year))
  if (params?.all_years) qs.set('all_years', 'true')
  const q = qs.toString()
  return request<Project[]>('GET', `/projects${q ? `?${q}` : ''}`)
}
export const createProject = (data: ProjectCreate) => request<Project>('POST', '/projects', data)
export const getProject = (id: string) => request<Project>('GET', `/projects/${id}`)
export const updateProject = (id: string, data: Partial<ProjectCreate>) =>
  request<Project>('PUT', `/projects/${id}`, data)
export const archiveProject = (id: string) => request<void>('DELETE', `/projects/${id}`)
export const getProjectDashboard = (id: string) => request<Dashboard>('GET', `/projects/${id}/dashboard`)
export const getProjectBrief = (id: string) => request<ProjectBrief | Record<string, never>>('GET', `/projects/${id}/brief`)
export const upsertProjectBrief = (id: string, data: Omit<ProjectBrief, 'id' | 'project_id' | 'updated_at'>) =>
  request<ProjectBrief>('PUT', `/projects/${id}/brief`, data)

// ── Milestones ────────────────────────────────────────────────────────────
export const getMilestones = (projectId: string) =>
  request<Milestone[]>('GET', `/projects/${projectId}/milestones`)
export const updateMilestone = (projectId: string, mid: string, data: Partial<Milestone>) =>
  request<Milestone>('PUT', `/projects/${projectId}/milestones/${mid}`, data)
export const regenerateMilestones = (projectId: string) =>
  request<Milestone[]>('POST', `/projects/${projectId}/milestones/generate`)

// ── Members ───────────────────────────────────────────────────────────────
export const getMembers = (projectId: string) =>
  request<Member[]>('GET', `/projects/${projectId}/members`)
export const createMember = (projectId: string, data: MemberCreate) =>
  request<Member>('POST', `/projects/${projectId}/members`, data)
export const updateMember = (projectId: string, mid: string, data: Partial<MemberCreate>) =>
  request<Member>('PUT', `/projects/${projectId}/members/${mid}`, data)
export const deleteMember = (projectId: string, mid: string) =>
  request<void>('DELETE', `/projects/${projectId}/members/${mid}`)

// ── Files ─────────────────────────────────────────────────────────────────
export const getFiles = (projectId: string, milestoneId?: string) =>
  request<ProjectFile[]>('GET', `/projects/${projectId}/files${milestoneId ? `?milestone_id=${milestoneId}` : ''}`)
export const createFile = (projectId: string, data: FileCreate) =>
  request<ProjectFile>('POST', `/projects/${projectId}/files`, data)
export const updateFile = (projectId: string, fid: string, data: Partial<FileCreate>) =>
  request<ProjectFile>('PUT', `/projects/${projectId}/files/${fid}`, data)
export const deleteFile = (projectId: string, fid: string) =>
  request<void>('DELETE', `/projects/${projectId}/files/${fid}`)
export const getFileVersions = (projectId: string, fid: string) =>
  request<FileVersion[]>('GET', `/projects/${projectId}/files/${fid}/versions`)
export const uploadNewVersion = (projectId: string, fid: string, data: VersionUpload) =>
  request<FileVersion>('POST', `/projects/${projectId}/files/${fid}/versions`, data)
export const copyFromUrl = (projectId: string, fid: string, data: { external_url: string; change_note?: string }) =>
  request<FileVersion>('POST', `/projects/${projectId}/files/${fid}/versions`, {
    external_url: data.external_url, change_note: data.change_note,
  })

/** Download a .md project file as GNM Excel — triggers browser file download. */
export async function exportFileGnm(projectId: string, fileId: string): Promise<void> {
  const token = sessionStorage.getItem('access_token')
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(`${BASE}/projects/${projectId}/files/${fileId}/export/gnm`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'GNM export failed')
  }
  const blob = await res.blob()
  const cd = res.headers.get('content-disposition') ?? ''
  const match = cd.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : `GNM_export_${fileId}.xlsx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Export / Import ───────────────────────────────────────────────────────

/** Download project XLSX (4 sheets: Overview, Timeline, Nguồn lực, To-do list). */
export async function exportProject(projectId: string, projectCode: string): Promise<void> {
  const token = sessionStorage.getItem('access_token')
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(`${BASE}/projects/${projectId}/export`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Export failed')
  }
  const blob = await res.blob()
  const cd = res.headers.get('content-disposition') ?? ''
  const match = cd.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : `project_${projectCode}.xlsx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

export interface ImportResult {
  updated: Record<string, number | boolean>
  errors: string[]
}

/** Upload XLSX to import project data (upserts Overview, Timeline, Nguồn lực, To-do list). */
export async function importProject(projectId: string, file: File): Promise<ImportResult> {
  const token = sessionStorage.getItem('access_token')
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/projects/${projectId}/import`, { method: 'POST', headers, body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Import failed')
  }
  return res.json()
}

// ── Meetings ──────────────────────────────────────────────────────────────
export const getMeetings = (projectId: string) =>
  request<Meeting[]>('GET', `/projects/${projectId}/meetings`)
export const getMeeting = (projectId: string, meetingId: string) =>
  request<Meeting>('GET', `/projects/${projectId}/meetings/${meetingId}`)
export const generateMeeting = (projectId: string, data: MeetingGenerate) =>
  request<Meeting>('POST', `/projects/${projectId}/meetings/generate`, data)

// ── File download URL helper ──────────────────────────────────────────────
export const getFileDownloadUrl = (projectId: string, fid: string, version?: string) =>
  `${BASE}/projects/${projectId}/files/${fid}/download${version ? `?version=${version}` : ''}`

// ── File version upload (multipart) ──────────────────────────────────────
export const uploadFileVersion = async (projectId: string, fid: string, file: File, version: string): Promise<FileVersion> => {
  const token = sessionStorage.getItem('access_token')
  const fd = new FormData()
  fd.append('file', file)
  fd.append('version', version)
  fd.append('uploaded_by', 'UI User')
  const res = await fetch(`${BASE}/projects/${projectId}/files/${fid}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (res.status === 401) { sessionStorage.removeItem('access_token'); window.location.href = '/login' }
  if (!res.ok) { const err = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(err.detail || 'Upload failed') }
  return res.json()
}

// ── Annual Plans (v2 response: {data:[], meta:{}}) ────────────────────────
export const getAnnualPlans = (year?: number) =>
  request<{ data: AnnualPlan[]; meta: { total: number } }>(
    'GET', `/annual-plans${year ? `?year=${year}` : ''}`
  ).then((r) => r.data)
export const createAnnualPlan = (data: AnnualPlanCreate) =>
  request<AnnualPlan>('POST', '/annual-plans', data)
export const updateAnnualPlan = (id: string, data: Partial<AnnualPlanCreate>) =>
  request<AnnualPlan>('PUT', `/annual-plans/${id}`, data)
export const deleteAnnualPlan = (id: string) => request<void>('DELETE', `/annual-plans/${id}`)

export const getPlanItems = (planId: string) =>
  request<PlanItem[]>('GET', `/annual-plans/${planId}/items`)
export const createPlanItem = (planId: string, data: PlanItemCreate) =>
  request<PlanItem>('POST', `/annual-plans/${planId}/items`, data)
export const updatePlanItem = (planId: string, itemId: string, data: Partial<PlanItemCreate>) =>
  request<PlanItem>('PUT', `/annual-plans/${planId}/items/${itemId}`, data)
export const deletePlanItem = (planId: string, itemId: string) =>
  request<void>('DELETE', `/annual-plans/${planId}/items/${itemId}`)

// ── Activity Tasks (5-domain governance checklist) ───────────────────────
export const getActivityTasks = (projectId: string, domain?: string) =>
  request<ActivityTask[]>('GET', `/projects/${projectId}/activity-tasks${domain ? `?domain=${domain}` : ''}`)
export const patchActivityTask = (projectId: string, taskId: string, data: ActivityTaskPatch) =>
  request<ActivityTask>('PATCH', `/projects/${projectId}/activity-tasks/${taskId}`, data)
export const createActivityTask = (projectId: string, data: ActivityTaskCreate) =>
  request<ActivityTask>('POST', `/projects/${projectId}/activity-tasks`, data)
export const deleteActivityTask = (projectId: string, taskId: string) =>
  request<void>('DELETE', `/projects/${projectId}/activity-tasks/${taskId}`)

// ── Publish (MkDocs portal) ───────────────────────────────────────────────
export const getPublishStatus = (projectId: string) =>
  request<PublishJob>('GET', `/projects/${projectId}/publish/status`)
export const triggerPublish = (projectId: string) =>
  request<{ job_id: string; status: string }>('POST', `/projects/${projectId}/publish`)
export const unpublish = (projectId: string) =>
  request<void>('DELETE', `/projects/${projectId}/publish`)

// ── Application Registry ──────────────────────────────────────────────────
export const getAppRegistry = (projectId: string, objectType?: string) =>
  request<AppRegistryObject[]>('GET', `/projects/${projectId}/app-registry${objectType ? `?object_type=${objectType}` : ''}`)
export const createAppRegistryObject = (projectId: string, data: AppRegistryCreate) =>
  request<AppRegistryObject>('POST', `/projects/${projectId}/app-registry`, data)
export const updateAppRegistryObject = (projectId: string, objId: string, data: Partial<AppRegistryCreate>) =>
  request<AppRegistryObject>('PUT', `/projects/${projectId}/app-registry/${objId}`, data)
export const deprecateAppRegistryObject = (projectId: string, objId: string) =>
  request<void>('DELETE', `/projects/${projectId}/app-registry/${objId}`)

// ── Types ─────────────────────────────────────────────────────────────────
export interface ProjectDomain {
  code: string; name: string; description?: string; sort_order: number
}

export type ActivityDomain =
  | 'business_requirements'
  | 'architecture_code'
  | 'infrastructure'
  | 'security_iam'
  | 'compliance_governance'

export type ActivityStatus = 'pending' | 'in_progress' | 'done' | 'skipped' | 'na'

export interface ActivityTask {
  id: string; project_id: string
  activity_domain: ActivityDomain
  title: string; status: ActivityStatus
  assignee?: string; notes?: string; due_date?: string
  sort_order: number; created_at: string; updated_at: string
}
export interface ActivityTaskPatch {
  status?: ActivityStatus
  assignee?: string; notes?: string; due_date?: string
}
export interface ActivityTaskCreate {
  activity_domain: ActivityDomain
  title: string; assignee?: string; notes?: string; due_date?: string
}

export interface Project {
  id: string; name: string; code: string; description?: string
  status: string; owner?: string; start_date?: string; end_date?: string
  plan_id?: string; domain_code?: string; created_at: string; updated_at: string
}

export interface ProjectBrief {
  id?: string
  project_id?: string
  // Section 1 — Business Overview & Objectives
  purpose?: string
  general_info?: string
  success_metrics: string[]
  enduser_value?: string
  // Section 2 — Target Users & Personas
  primary_users?: string
  pain_points?: string
  user_role_matrix: string[]
  // Section 3 — Functional Requirements
  must_have_features: string[]
  nice_to_have_features: string[]
  system_integrations: string[]
  // Section 4 — Non-Functional Requirements
  performance_scalability?: string
  compliance_security?: string
  availability_reliability?: string
  // Section 5 — Data & Reporting Needs
  data_needs?: string
  reporting_needs?: string
  // Section 6 — Constraints, Risks & Assumptions
  time_constraints?: string
  dependencies: string[]
  potential_risks: string[]
  // Section 7 — Project Timeline & Roadmap
  key_milestones_notes: string[]
  methodology?: string
  decision_makers: string[]
  updated_at?: string
}
export interface ProjectCreate {
  name: string; code: string; description?: string
  start_date?: string; end_date?: string
  owner?: string; plan_id?: string; status?: string
  domain_code?: string
}
export interface Dashboard {
  project: Project
  doc_count: number; docs_by_type: Record<string, number>
  test_coverage: number; total_test_cases: number
  passed_tests: number; failed_tests: number
}
export type MilestoneTrack = 'project' | 'ba' | 'test'

export interface Milestone {
  id: string; project_id: string; name: string
  milestone_type?: string; description?: string
  start_date?: string; end_date?: string
  status: string; sort_order: number
  track: MilestoneTrack
  preconditions?: string[]; done_criteria?: string
  created_at: string; updated_at: string
}

export interface ProjectFolder {
  id: string; project_id: string; parent_id?: string
  folder_name: string; folder_path: string
  track: 'project' | 'ba' | 'test' | 'management'
  sort_order: number; created_at: string
}
export interface Member {
  id: string; project_id: string; full_name: string
  email?: string; role?: string; alias?: string
  is_active: boolean; created_at: string
}
export interface MemberCreate {
  full_name: string; email?: string; role?: string; alias?: string
}
export interface ProjectFile {
  id: string; project_id: string; milestone_id?: string; name: string
  file_type: string; doc_category?: string
  current_version: string; storage_path?: string; external_url?: string
  status: string; created_by?: string
  created_at: string; updated_at: string
}
export interface FileVersion {
  id: string; file_id: string; version: string
  storage_path?: string; external_url?: string
  change_note?: string; file_size?: number
  uploaded_by: string; uploaded_at: string
}
export interface FileCreate {
  name: string; file_type?: string; doc_category?: string
  milestone_id?: string; storage_path?: string; external_url?: string; file_size?: number
}
export interface VersionUpload {
  version?: string; storage_path?: string; external_url?: string
  change_note?: string; file_size?: number
}
export interface Meeting {
  id: string; project_id: string; title: string; meeting_date?: string
  raw_notes: string; generated_content: ParsedMeeting
  status: string; created_by: string; created_at: string
}
export interface ParsedMeeting {
  attendees?: string[]; decisions?: string[]
  action_items?: { assignee: string; action: string; due_date?: string }[]
  risks?: string[]; suggestions?: string[]
}
export interface MeetingGenerate {
  title: string; meeting_date?: string; raw_notes: string
  location?: string; milestone_id?: string; created_by?: string
}
export interface AnnualPlan {
  id: string; year: number; code: string; name: string
  description?: string; status: string
  created_by?: string; created_at: string; updated_at: string
}
export interface AnnualPlanCreate {
  year: number; code: string; name: string
  description?: string; status?: string
}
export interface PlanItem {
  id: string; plan_id: string; title: string; description?: string
  priority: number; target_q?: string; done_criteria?: string
  status: string; created_at: string; updated_at: string
}
export interface PlanItemCreate {
  title: string; description?: string; priority?: number
  target_q?: string; done_criteria?: string; status?: string
}
export interface PublishJob {
  status: 'never_published' | 'pending' | 'building' | 'success' | 'failed'
  job_id?: string
  site_url?: string
  doc_count?: number
  error_msg?: string
  triggered_by?: string
  triggered_at?: string
  completed_at?: string
}
export type ObjectType = 'application' | 'system' | 'job' | 'connection'
export interface AppRegistryObject {
  id: string; project_id: string; object_type: ObjectType
  name: string; code: string; description?: string; owner_team?: string
  status: string; environment: string[]; extra: Record<string, unknown>
  created_at: string; updated_at: string; created_by: string
}
export interface AppRegistryCreate {
  object_type: ObjectType; name: string; code: string
  description?: string; owner_team?: string; status?: string
  environment?: string[]; extra?: Record<string, unknown>
}

// ── Portfolio ──────────────────────────────────────────────────────────────
export const getPortfolioSummary = (year?: number) =>
  request<PortfolioItem[]>('GET', `/projects/portfolio/summary${year ? `?year=${year}` : ''}`)

// ── Project Folders ────────────────────────────────────────────────────────
export const getProjectFolders = (projectId: string, track?: string) =>
  request<ProjectFolder[]>('GET', `/projects/${projectId}/folders${track ? `?track=${track}` : ''}`)

// ── Milestones (track-aware) ────────────────────────────────────────────────
export const getMilestonesByTrack = (projectId: string, track?: string) =>
  request<Milestone[]>('GET', `/projects/${projectId}/milestones${track ? `?track=${track}` : ''}`)
export const regenerateMilestonesByTrack = (projectId: string, track?: string) =>
  request<Milestone[]>('POST', `/projects/${projectId}/milestones/generate${track ? `?track=${track}` : ''}`)

// ── Stage Gates ────────────────────────────────────────────────────────────
export const getStageGates = (projectId: string) =>
  request<StageGate[]>('GET', `/projects/${projectId}/stage-gates`)
export const createStageGate = (projectId: string, data: StageGateCreate) =>
  request<StageGate>('POST', `/projects/${projectId}/stage-gates`, data)
export const updateStageGate = (projectId: string, gateId: string, data: Partial<StageGateCreate>) =>
  request<StageGate>('PUT', `/projects/${projectId}/stage-gates/${gateId}`, data)
export const deleteStageGate = (projectId: string, gateId: string) =>
  request<void>('DELETE', `/projects/${projectId}/stage-gates/${gateId}`)

// ── Health Scores ──────────────────────────────────────────────────────────
export const getHealthScores = (projectId: string) =>
  request<HealthScore[]>('GET', `/projects/${projectId}/health`)
export const getLatestHealth = (projectId: string) =>
  request<HealthScore | null>('GET', `/projects/${projectId}/health/latest`)
export const createHealthScore = (projectId: string, data: HealthScoreCreate) =>
  request<HealthScore>('POST', `/projects/${projectId}/health`, data)

// ── Stakeholders ───────────────────────────────────────────────────────────
export const getStakeholders = (projectId: string) =>
  request<Stakeholder[]>('GET', `/projects/${projectId}/stakeholders`)
export const createStakeholder = (projectId: string, data: StakeholderCreate) =>
  request<Stakeholder>('POST', `/projects/${projectId}/stakeholders`, data)
export const updateStakeholder = (projectId: string, sid: string, data: Partial<StakeholderCreate>) =>
  request<Stakeholder>('PUT', `/projects/${projectId}/stakeholders/${sid}`, data)
export const deleteStakeholder = (projectId: string, sid: string) =>
  request<void>('DELETE', `/projects/${projectId}/stakeholders/${sid}`)

// ── Priority ───────────────────────────────────────────────────────────────
export const getPriority = (projectId: string) =>
  request<ProjectPriority | null>('GET', `/projects/${projectId}/priority`)
export const upsertPriority = (projectId: string, data: PriorityUpsert) =>
  request<ProjectPriority>('PUT', `/projects/${projectId}/priority`, data)

// ── Product Registry ───────────────────────────────────────────────────────
export const getProducts = (projectId: string, productType?: string) =>
  request<Product[]>('GET', `/projects/${projectId}/products${productType ? `?product_type=${productType}` : ''}`)
export const createProduct = (projectId: string, data: ProductCreate) =>
  request<Product>('POST', `/projects/${projectId}/products`, data)
export const updateProduct = (projectId: string, productId: string, data: Partial<ProductCreate>) =>
  request<Product>('PUT', `/projects/${projectId}/products/${productId}`, data)
export const deleteProduct = (projectId: string, productId: string) =>
  request<void>('DELETE', `/projects/${projectId}/products/${productId}`)

// ── Environments ───────────────────────────────────────────────────────────
export const getEnvironments = (projectId: string, productId: string) =>
  request<Environment[]>('GET', `/projects/${projectId}/products/${productId}/environments`)
export const upsertEnvironment = (projectId: string, productId: string, envName: string, data: EnvironmentData) =>
  request<Environment>('PUT', `/projects/${projectId}/products/${productId}/environments/${envName}`, data)
export const deleteEnvironment = (projectId: string, productId: string, envName: string) =>
  request<void>('DELETE', `/projects/${projectId}/products/${productId}/environments/${envName}`)

// ── App Details ────────────────────────────────────────────────────────────
export const getAppDetail = (projectId: string, productId: string) =>
  request<AppDetail>('GET', `/projects/${projectId}/products/${productId}/app-detail`)
export const upsertAppDetail = (projectId: string, productId: string, data: AppDetailUpsert) =>
  request<AppDetail>('PUT', `/projects/${projectId}/products/${productId}/app-detail`, data)

// ── Batch Jobs ─────────────────────────────────────────────────────────────
export const getBatchJobs = (projectId: string, productId: string) =>
  request<BatchJob[]>('GET', `/projects/${projectId}/products/${productId}/jobs`)
export const createBatchJob = (projectId: string, productId: string, data: BatchJobCreate) =>
  request<BatchJob>('POST', `/projects/${projectId}/products/${productId}/jobs`, data)
export const updateBatchJob = (projectId: string, productId: string, jobId: string, data: Partial<BatchJobCreate>) =>
  request<BatchJob>('PUT', `/projects/${projectId}/products/${productId}/jobs/${jobId}`, data)
export const deleteBatchJob = (projectId: string, productId: string, jobId: string) =>
  request<void>('DELETE', `/projects/${projectId}/products/${productId}/jobs/${jobId}`)

// ── Licenses ───────────────────────────────────────────────────────────────
export const getLicenses = (projectId: string) =>
  request<License[]>('GET', `/projects/${projectId}/licenses`)
export const createLicense = (projectId: string, data: LicenseCreate) =>
  request<License>('POST', `/projects/${projectId}/licenses`, data)
export const updateLicense = (projectId: string, licenseId: string, data: Partial<LicenseCreate>) =>
  request<License>('PUT', `/projects/${projectId}/licenses/${licenseId}`, data)
export const deleteLicense = (projectId: string, licenseId: string) =>
  request<void>('DELETE', `/projects/${projectId}/licenses/${licenseId}`)

// ── Contracts ──────────────────────────────────────────────────────────────
export const getContracts = (projectId: string) =>
  request<Contract[]>('GET', `/projects/${projectId}/contracts`)
export const createContract = (projectId: string, data: ContractCreate) =>
  request<Contract>('POST', `/projects/${projectId}/contracts`, data)
export const updateContract = (projectId: string, contractId: string, data: Partial<ContractCreate>) =>
  request<Contract>('PUT', `/projects/${projectId}/contracts/${contractId}`, data)
export const deleteContract = (projectId: string, contractId: string) =>
  request<void>('DELETE', `/projects/${projectId}/contracts/${contractId}`)

// ── Security ───────────────────────────────────────────────────────────────
export const getSecurityInfo = (projectId: string, productId: string) =>
  request<SecurityInfo>('GET', `/projects/${projectId}/products/${productId}/security`)
export const upsertSecurityInfo = (projectId: string, productId: string, data: SecurityUpsert) =>
  request<SecurityInfo>('PUT', `/projects/${projectId}/products/${productId}/security`, data)

// ── Operations ─────────────────────────────────────────────────────────────
export const getOperations = (projectId: string, productId: string) =>
  request<Operations>('GET', `/projects/${projectId}/products/${productId}/operations`)
export const upsertOperations = (projectId: string, productId: string, data: OperationsUpsert) =>
  request<Operations>('PUT', `/projects/${projectId}/products/${productId}/operations`, data)

// ── Handover ───────────────────────────────────────────────────────────────
export const getHandover = (projectId: string) =>
  request<Handover>('GET', `/projects/${projectId}/handover`)
export const upsertHandover = (projectId: string, data: HandoverUpsert) =>
  request<Handover>('PUT', `/projects/${projectId}/handover`, data)

// ── Integration Links ──────────────────────────────────────────────────────
export const getIntegrationLinks = (projectId: string, linkType?: string) =>
  request<IntegrationLink[]>('GET', `/projects/${projectId}/integrations${linkType ? `?link_type=${linkType}` : ''}`)
export const createIntegrationLink = (projectId: string, data: IntegrationLinkCreate) =>
  request<IntegrationLink>('POST', `/projects/${projectId}/integrations`, data)
export const updateIntegrationLink = (projectId: string, linkId: string, data: Partial<IntegrationLinkCreate>) =>
  request<IntegrationLink>('PUT', `/projects/${projectId}/integrations/${linkId}`, data)
export const deleteIntegrationLink = (projectId: string, linkId: string) =>
  request<void>('DELETE', `/projects/${projectId}/integrations/${linkId}`)

// ── Extended Types ─────────────────────────────────────────────────────────

export type RagStatus = 'red' | 'amber' | 'green'

export interface PortfolioItem extends Project {
  latest_health_rag: RagStatus | null
  health_assessed_date: string | null
  wsjf_score: number | null
  priority_rank: number | null
}

export interface GateCriterion { criterion: string; is_met: boolean; notes?: string }
export interface StageGate {
  id: string; project_id: string; stage_name: string; stage_order: number
  status: string; gate_criteria: GateCriterion[]; sign_off_by?: string
  gate_date?: string; notes?: string; created_at: string; updated_at: string
}
export interface StageGateCreate {
  stage_name: string; stage_order?: number; status?: string
  gate_criteria?: GateCriterion[]; sign_off_by?: string; gate_date?: string; notes?: string
}

export interface HealthScore {
  id: string; project_id: string; assessed_date: string
  overall_rag: RagStatus; schedule_rag?: RagStatus; budget_rag?: RagStatus
  scope_rag?: RagStatus; team_rag?: RagStatus; risk_rag?: RagStatus
  health_notes: Record<string, string>; assessed_by?: string; created_at: string
}
export interface HealthScoreCreate {
  assessed_date?: string; overall_rag: RagStatus
  schedule_rag?: RagStatus; budget_rag?: RagStatus; scope_rag?: RagStatus
  team_rag?: RagStatus; risk_rag?: RagStatus
  health_notes?: Record<string, string>; assessed_by?: string
}

export interface Stakeholder {
  id: string; project_id: string; name: string; role?: string
  organization?: string; interest_level: string; influence_level: string
  engagement_strategy?: string; contact_info: Record<string, string>
  notes?: string; created_at: string; updated_at: string
}
export interface StakeholderCreate {
  name: string; role?: string; organization?: string
  interest_level?: string; influence_level?: string
  engagement_strategy?: string; contact_info?: Record<string, string>; notes?: string
}

export interface ProjectPriority {
  id: string; project_id: string; business_value: number; time_criticality: number
  risk_reduction: number; job_size: number; wsjf_score: number
  roi_score: number; risk_score: number; priority_rank?: number
  notes?: string; assessed_at?: string; assessed_by?: string
  created_at: string; updated_at: string
}
export interface PriorityUpsert {
  business_value: number; time_criticality: number; risk_reduction: number
  job_size: number; roi_score?: number; risk_score?: number
  priority_rank?: number; notes?: string; assessed_at?: string; assessed_by?: string
}

export type ProductType = 'application' | 'batch_job' | 'api' | 'service'
export interface SystemMapping { system_name: string; relation_type: string; notes?: string }
export interface Product {
  id: string; project_id: string; product_name: string; product_type: ProductType
  business_owner?: string; technical_owner?: string; owner_team?: string
  system_mappings: SystemMapping[]; description?: string; status: string
  created_at: string; updated_at: string
}
export interface ProductCreate {
  product_name: string; product_type: ProductType
  business_owner?: string; technical_owner?: string; owner_team?: string
  system_mappings?: SystemMapping[]; description?: string; status?: string
}

export interface Environment {
  id: string; project_id: string; product_id: string; env_name: string
  infra_info: Record<string, unknown>; access_info: Record<string, unknown>
  deployment_info: Record<string, unknown>; monitoring_setup: Record<string, unknown>
  is_active: boolean; notes?: string; created_at: string; updated_at: string
}
export interface EnvironmentData {
  infra_info?: Record<string, unknown>; access_info?: Record<string, unknown>
  deployment_info?: Record<string, unknown>; monitoring_setup?: Record<string, unknown>
  is_active?: boolean; notes?: string
}

export interface TechStackItem { name: string; version?: string; category: string }
export interface Dependency { system_name: string; dep_type: string; criticality: string; notes?: string }
export interface AppDetail {
  id: string; project_id: string; product_id: string
  architecture_description?: string; tech_stack: TechStackItem[]
  source_repo_url?: string; current_version?: string; release_notes?: string
  dependencies: Dependency[]; created_at: string; updated_at: string
}
export interface AppDetailUpsert {
  architecture_description?: string; tech_stack?: TechStackItem[]
  source_repo_url?: string; current_version?: string
  release_notes?: string; dependencies?: Dependency[]
}

export interface BatchJob {
  id: string; project_id: string; product_id: string; job_name: string
  schedule?: string; trigger_type: string
  input_info: Record<string, unknown>; output_info: Record<string, unknown>
  failure_handling?: string; status: string; notes?: string
  created_at: string; updated_at: string
}
export interface BatchJobCreate {
  job_name: string; schedule?: string; trigger_type?: string
  input_info?: Record<string, unknown>; output_info?: Record<string, unknown>
  failure_handling?: string; status?: string; notes?: string
}

export interface License {
  id: string; project_id: string; software_name: string; license_type: string
  vendor?: string; version_covered?: string; expiry_date?: string
  cost_amount?: number; cost_currency: string; cost_period?: string
  seat_count?: number; compliance_status: string; notes?: string
  created_at: string; updated_at: string
}
export interface LicenseCreate {
  software_name: string; license_type: string; vendor?: string
  version_covered?: string; expiry_date?: string; cost_amount?: number
  cost_currency?: string; cost_period?: string; seat_count?: number
  compliance_status?: string; notes?: string
}

export interface Contract {
  id: string; project_id: string; vendor_name: string
  vendor_contact: Record<string, string>; contract_number?: string
  contract_type?: string; contract_description?: string
  sla_details: Record<string, unknown>; support_contact: Record<string, string>
  start_date?: string; expiry_date?: string; auto_renewal: boolean
  contract_value?: number; currency: string; status: string
  documents_url?: string; notes?: string; created_at: string; updated_at: string
}
export interface ContractCreate {
  vendor_name: string; vendor_contact?: Record<string, string>
  contract_number?: string; contract_type?: string; contract_description?: string
  sla_details?: Record<string, unknown>; support_contact?: Record<string, string>
  start_date?: string; expiry_date?: string; auto_renewal?: boolean
  contract_value?: number; currency?: string; status?: string
  documents_url?: string; notes?: string
}

export interface SecurityInfo {
  id: string; project_id: string; product_id: string
  data_classification: string; data_categories: string[]
  access_control: Record<string, unknown>[]; last_security_scan?: string
  vulnerabilities: Record<string, unknown>[]; pen_test_date?: string
  pen_test_result?: string; notes?: string; created_at: string; updated_at: string
}
export interface SecurityUpsert {
  data_classification?: string; data_categories?: string[]
  access_control?: Record<string, unknown>[]; last_security_scan?: string
  vulnerabilities?: Record<string, unknown>[]; pen_test_date?: string
  pen_test_result?: string; notes?: string
}

export interface Operations {
  id: string; project_id: string; product_id: string
  runbook_url?: string; runbook_content?: string
  incident_guide_url?: string; incident_guide_content?: string
  backup_schedule?: string; recovery_rto_hours?: number; recovery_rpo_hours?: number
  backup_details?: string; dr_plan_url?: string; monitoring_dashboard_url?: string
  on_call_info: Record<string, string>; notes?: string
  created_at: string; updated_at: string
}
export interface OperationsUpsert {
  runbook_url?: string; runbook_content?: string
  incident_guide_url?: string; incident_guide_content?: string
  backup_schedule?: string; recovery_rto_hours?: number; recovery_rpo_hours?: number
  backup_details?: string; dr_plan_url?: string; monitoring_dashboard_url?: string
  on_call_info?: Record<string, string>; notes?: string
}

export interface ChecklistItem { item: string; is_done: boolean; done_by?: string; done_date?: string }
export interface Handover {
  id: string; project_id: string; checklist_items: ChecklistItem[]
  acceptance_sign_off_by?: string; acceptance_sign_off_date?: string
  acceptance_notes?: string; go_live_date?: string
  post_go_live_review_date?: string; post_go_live_review_notes?: string
  status: string; created_at: string; updated_at: string
}
export interface HandoverUpsert {
  checklist_items?: ChecklistItem[]; acceptance_sign_off_by?: string
  acceptance_sign_off_date?: string; acceptance_notes?: string
  go_live_date?: string; post_go_live_review_date?: string
  post_go_live_review_notes?: string; status?: string
}

export interface IntegrationLink {
  id: string; project_id: string; link_type: string; title: string
  url?: string; system_name?: string; description?: string
  is_active: boolean; created_at: string; updated_at: string
}
export interface IntegrationLinkCreate {
  link_type: string; title: string; url?: string
  system_name?: string; description?: string; is_active?: boolean
}

// ── Contract Terms ──────────────────────────────────────────────────────────
export const getContractTerms = (projectId: string, contractId: string) =>
  request<ContractTerm[]>('GET', `/projects/${projectId}/contracts/${contractId}/terms`)
export const createContractTerm = (projectId: string, contractId: string, data: ContractTermCreate) =>
  request<ContractTerm>('POST', `/projects/${projectId}/contracts/${contractId}/terms`, data)
export const updateContractTerm = (projectId: string, contractId: string, termId: string, data: Partial<ContractTermCreate>) =>
  request<ContractTerm>('PUT', `/projects/${projectId}/contracts/${contractId}/terms/${termId}`, data)
export const deleteContractTerm = (projectId: string, contractId: string, termId: string) =>
  request<void>('DELETE', `/projects/${projectId}/contracts/${contractId}/terms/${termId}`)

// ── Contract Payments ───────────────────────────────────────────────────────
export const getContractPayments = (projectId: string, contractId: string) =>
  request<ContractPayment[]>('GET', `/projects/${projectId}/contracts/${contractId}/payments`)
export const createContractPayment = (projectId: string, contractId: string, data: ContractPaymentCreate) =>
  request<ContractPayment>('POST', `/projects/${projectId}/contracts/${contractId}/payments`, data)
export const updateContractPayment = (projectId: string, contractId: string, paymentId: string, data: Partial<ContractPayment>) =>
  request<ContractPayment>('PUT', `/projects/${projectId}/contracts/${contractId}/payments/${paymentId}`, data)
export const deleteContractPayment = (projectId: string, contractId: string, paymentId: string) =>
  request<void>('DELETE', `/projects/${projectId}/contracts/${contractId}/payments/${paymentId}`)
export const getPaymentSummary = (projectId: string, contractId: string) =>
  request<PaymentSummary>('GET', `/projects/${projectId}/contracts/${contractId}/payments/summary`)

// ── App Standard Info ───────────────────────────────────────────────────────
export const getAppStandard = (projectId: string, productId: string) =>
  request<AppStandardInfo | null>('GET', `/projects/${projectId}/products/${productId}/app-standard`)
export const upsertAppStandard = (projectId: string, productId: string, data: AppStandardUpsert) =>
  request<AppStandardInfo>('PUT', `/projects/${projectId}/products/${productId}/app-standard`, data)

// ── Job Standard Info ───────────────────────────────────────────────────────
export const getJobStandard = (projectId: string, productId: string) =>
  request<JobStandardInfo | null>('GET', `/projects/${projectId}/products/${productId}/job-standard`)
export const upsertJobStandard = (projectId: string, productId: string, data: JobStandardUpsert) =>
  request<JobStandardInfo>('PUT', `/projects/${projectId}/products/${productId}/job-standard`, data)

// ── Contract Term Types ────────────────────────────────────────────────────
export type TermType =
  | 'general' | 'sla' | 'warranty' | 'penalty' | 'liability'
  | 'confidential' | 'termination' | 'ip_ownership' | 'payment_term' | 'acceptance' | 'other'

export interface ContractTerm {
  id: string; contract_id: string; project_id: string
  term_order: number; term_type: TermType
  title: string; content: string
  effective_date?: string; expiry_date?: string
  is_key_term: boolean; notes?: string
  created_at: string; updated_at: string
}
export interface ContractTermCreate {
  term_order?: number; term_type?: TermType
  title: string; content: string
  effective_date?: string; expiry_date?: string
  is_key_term?: boolean; notes?: string
}

// ── Contract Payment Types ─────────────────────────────────────────────────
export type PaymentType = 'advance' | 'progress' | 'acceptance' | 'warranty' | 'maintenance' | 'final' | 'penalty' | 'refund'
export type PaymentStatus = 'pending' | 'invoiced' | 'paid' | 'overdue' | 'disputed' | 'cancelled'

export interface ContractPayment {
  id: string; contract_id: string; project_id: string
  payment_order: number; milestone_name: string
  payment_type: PaymentType; payment_basis?: string
  amount: number; currency: string; percentage_of_total?: number
  due_date?: string; status: PaymentStatus
  invoice_number?: string; invoice_date?: string
  paid_date?: string; paid_amount?: number
  bank_reference?: string; approved_by?: string; notes?: string
  created_at: string; updated_at: string
}
export interface ContractPaymentCreate {
  payment_order?: number; milestone_name: string
  payment_type?: PaymentType; payment_basis?: string
  amount: number; currency?: string; percentage_of_total?: number
  due_date?: string; status?: PaymentStatus
  invoice_number?: string; invoice_date?: string
  paid_date?: string; paid_amount?: number
  bank_reference?: string; approved_by?: string; notes?: string
}

export interface PaymentSummary {
  total_scheduled: number; total_paid: number; total_pending: number
  total_invoiced: number; total_overdue: number; total_remaining: number
  currency: string
  count_total: number; count_paid: number; count_pending: number
  count_invoiced: number; count_overdue: number
}

// ── App Standard Info Types ────────────────────────────────────────────────
export interface DbTechItem { name: string; version?: string; role?: string }
export interface IntegrationItem { system: string; direction?: string; protocol?: string; description?: string }

export interface AppStandardInfo {
  id: string; product_id: string; project_id: string
  app_code?: string; app_full_name?: string
  app_type?: string; criticality_level: string
  platform?: string; primary_language?: string; framework?: string
  ui_framework?: string; database_tech: DbTechItem[]; message_queue?: string; api_style?: string
  architecture_style?: string; hosting_type?: string; server_os?: string
  network_zone?: string; container_platform?: string
  source_repo_url?: string; source_repo_type?: string
  current_version?: string; release_date?: string; next_release_date?: string
  user_count_internal?: number; user_count_external?: number; peak_concurrent_users?: number
  sla_uptime_pct?: number; rto_hours?: number; rpo_hours?: number; maintenance_window?: string
  integration_count?: number; integration_list: IntegrationItem[]
  data_classification: string; compliance_standards: string[]
  last_security_audit?: string; next_security_audit?: string; last_pen_test?: string
  monitoring_tool?: string; log_management?: string; deployment_tool?: string; backup_policy?: string
  business_function?: string; target_users?: string; notes?: string
  created_at: string; updated_at: string
}
export interface AppStandardUpsert {
  app_code?: string; app_full_name?: string
  app_type?: string; criticality_level?: string
  platform?: string; primary_language?: string; framework?: string
  ui_framework?: string; database_tech?: DbTechItem[]; message_queue?: string; api_style?: string
  architecture_style?: string; hosting_type?: string; server_os?: string
  network_zone?: string; container_platform?: string
  source_repo_url?: string; source_repo_type?: string
  current_version?: string; release_date?: string; next_release_date?: string
  user_count_internal?: number; user_count_external?: number; peak_concurrent_users?: number
  sla_uptime_pct?: number; rto_hours?: number; rpo_hours?: number; maintenance_window?: string
  integration_count?: number; integration_list?: IntegrationItem[]
  data_classification?: string; compliance_standards?: string[]
  last_security_audit?: string; next_security_audit?: string; last_pen_test?: string
  monitoring_tool?: string; log_management?: string; deployment_tool?: string; backup_policy?: string
  business_function?: string; target_users?: string; notes?: string
}

// ── Job Standard Info Types ────────────────────────────────────────────────
export interface IoSource { name: string; type?: string; system?: string; table_or_path?: string; format?: string }
export interface RetryPolicy { max_retries?: number; retry_interval_min?: number; backoff?: string; alert_on_final_fail?: boolean }
export interface ErrorNotification { channels?: string[]; recipients?: string[]; escalation_after_min?: number }
export interface DependentJob { job_code: string; reason?: string }

export interface JobStandardInfo {
  id: string; product_id: string; project_id: string
  job_code?: string; job_full_name?: string
  job_type?: string; criticality_level: string
  run_platform?: string; run_language?: string; run_framework?: string; run_server?: string
  frequency?: string; schedule_cron?: string; schedule_description?: string
  expected_start_time?: string; deadline_time?: string
  expected_runtime_min?: number; max_runtime_min?: number
  input_sources: IoSource[]; output_targets: IoSource[]; data_volume_estimate?: string
  retry_policy: RetryPolicy; failure_action?: string; error_notification: ErrorNotification
  success_criteria?: string; reconciliation_check?: string
  monitoring_url?: string; last_run_date?: string; last_run_status?: string
  avg_runtime_min?: number; success_rate_pct?: number
  depends_on_jobs: DependentJob[]; dependent_jobs: DependentJob[]
  runbook_url?: string; on_call_contact?: string; data_classification: string; notes?: string
  created_at: string; updated_at: string
}
export interface JobStandardUpsert {
  job_code?: string; job_full_name?: string
  job_type?: string; criticality_level?: string
  run_platform?: string; run_language?: string; run_framework?: string; run_server?: string
  frequency?: string; schedule_cron?: string; schedule_description?: string
  expected_start_time?: string; deadline_time?: string
  expected_runtime_min?: number; max_runtime_min?: number
  input_sources?: IoSource[]; output_targets?: IoSource[]; data_volume_estimate?: string
  retry_policy?: RetryPolicy; failure_action?: string; error_notification?: ErrorNotification
  success_criteria?: string; reconciliation_check?: string
  monitoring_url?: string; last_run_date?: string; last_run_status?: string
  avg_runtime_min?: number; success_rate_pct?: number
  depends_on_jobs?: DependentJob[]; dependent_jobs?: DependentJob[]
  runbook_url?: string; on_call_contact?: string; data_classification?: string; notes?: string
}

// ── Project Docs ─────────────────────────────────────────────────
export interface DocTemplate {
  name: string
  display_name: string
  rel_path: string
  size_bytes: number
}

export interface DocLatestFile {
  id: string
  name: string
  current_version: string
  uploaded_at: string | null
  file_size: number | null
  uploaded_by: string | null
}

export interface DocFolder {
  name: string
  label: string
  icon: string
  template_count: number
  uploaded_count: number
  file_count: number
  templates: DocTemplate[]
  uploaded_files: string[]
  latest_file: DocLatestFile | null
}

export interface DocTrack {
  track: string
  label: string
  icon: string
  folders: DocFolder[]
}

export interface DocsTree {
  project_id: string
  project_code: string
  project_name: string
  domain_code: string
  project_dir: string
  tracks: DocTrack[]
}

export interface DocFileVersion {
  id: string
  version: string
  storage_path: string
  uploaded_by: string | null
  file_size: number | null
  uploaded_at: string | null
  change_note: string | null
}

export interface DocFileInfo {
  id: string
  name: string
  current_version: string
  status: string
  created_at: string | null
  updated_at: string | null
  versions: DocFileVersion[]
}

export async function getDocsTree(projectId: string): Promise<DocsTree> {
  return request('GET', `/projects/${projectId}/docs/tree`)
}

export async function downloadTemplate(relPath: string): Promise<void> {
  const res = await fetch(`${BASE}/projects/docs/templates/download?path=${encodeURIComponent(relPath)}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Template not found')
  const blob = await res.blob()
  const filename = relPath.split('/').pop() ?? 'template'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export async function uploadDocFile(
  projectId: string,
  track: string,
  folder: string,
  file: File,
  changeNote?: string,
): Promise<{ file_id: string; version: string; name: string; size: number }> {
  const token = sessionStorage.getItem('access_token')
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const form = new FormData()
  form.append('track', track)
  form.append('folder', folder)
  form.append('file', file)
  if (changeNote) form.append('change_note', changeNote)
  const res = await fetch(`${BASE}/projects/${projectId}/docs/upload`, {
    method: 'POST',
    headers,
    body: form,
  })
  if (res.status === 401) { sessionStorage.removeItem('access_token'); window.location.href = '/login' }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function getFolderFiles(
  projectId: string,
  track: string,
  folder: string,
): Promise<DocFileInfo[]> {
  return request('GET', `/projects/${projectId}/docs/${track}/${folder}/files`)
}

export async function downloadDocFile(
  projectId: string,
  fileId: string,
  fileName: string,
  version?: string,
): Promise<void> {
  const token = sessionStorage.getItem('access_token')
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const v = version ? `?version=${encodeURIComponent(version)}` : ''
  const res = await fetch(`${BASE}/projects/${projectId}/docs/file/${fileId}/download${v}`, { headers })
  if (!res.ok) throw new Error('File not found')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = fileName; a.click()
  URL.revokeObjectURL(url)
}
