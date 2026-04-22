/**
 * Types for BA Workflow and Test Workflow modules (FR-027 – FR-032)
 * BRD Reference: BRD-001 v1.1
 */

// ── BA Document types (FR-027 – FR-029) ─────────────────────────

export type BADocType =
  | 'BRD'
  | 'BRS'
  | 'FSD'
  | 'API_SPEC'
  | 'ERD'
  | 'DATA_DICT'
  | 'WIREFRAME'
  | 'PROCESS_FLOW'

export type BADocStatus = 'draft' | 'review' | 'approved' | 'archived'

export interface BADocument {
  id: string
  project_id: string
  doc_type: BADocType
  title: string
  content?: string
  version: string
  status: BADocStatus
  milestone_id?: string
  object_ids: string[]
  metadata?: Record<string, string>
  reviewed_by?: string
  approved_by?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface BADocumentCreate {
  project_id: string
  doc_type: BADocType
  title: string
  content?: string
  milestone_id?: string
  object_ids?: string[]
  metadata?: Record<string, string>
}

export interface BADocumentUpdate {
  title?: string
  content?: string
  milestone_id?: string
  changed_by?: string
  change_note?: string
}

export interface BADocumentObjectLink {
  object_id: string
  name: string
  object_type: string
  project: { id: string; name: string }
}

export type BAStatusAction = 'submit_review' | 'approve' | 'archive' | 'reject_to_draft'

export interface BAStatusRequest {
  action: BAStatusAction
  notes?: string
}

// ── Test Document types (FR-030 – FR-032) ───────────────────────

export type TestDocType = 'TEST_PLAN' | 'BUG_REPORT' | 'UAT_SIGNOFF'

export type TestDocStatus =
  // TEST_PLAN
  | 'draft'
  | 'review'
  | 'approved'
  | 'archived'
  // BUG_REPORT
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  // UAT_SIGNOFF
  | 'pending_sign'
  | 'signed'

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface TestDocMetadata {
  // BUG_REPORT fields
  severity?: BugSeverity
  component?: string
  // UAT_SIGNOFF fields
  approver?: string
  sign_date?: string
  // Shared
  format?: string
}

export interface TestDocument {
  id: string
  project_id: string
  doc_type: TestDocType
  title: string
  content?: string
  status: TestDocStatus
  object_id?: string
  milestone_id?: string
  metadata?: TestDocMetadata
  created_at: string
  updated_at: string
  created_by?: string
}

export interface TestDocumentCreate {
  project_id: string
  doc_type: TestDocType
  title: string
  content?: string
  object_id?: string
  milestone_id?: string
  metadata?: TestDocMetadata
}

export interface TestDocumentUpdate {
  title?: string
  content?: string
  milestone_id?: string
  metadata?: TestDocMetadata
}

export type TestStatusAction =
  | 'submit_review'
  | 'approve'
  | 'archive'
  // BUG_REPORT
  | 'start'
  | 'resolve'
  | 'close'
  // UAT_SIGNOFF
  | 'submit'
  | 'sign'

export interface TestStatusRequest {
  action: TestStatusAction
  notes?: string
  /** UAT_SIGNOFF sign action */
  approver?: string
  sign_date?: string
}

// ── Test coverage per object (FR-031) ───────────────────────────

export interface MilestoneCoverage {
  milestone_id: string
  milestone_name: string
  coverage_pct: number
  threshold_pct: number
  is_below_threshold: boolean
  alert?: string
}

export interface ObjectTestCoverage {
  object_id: string
  object_name: string
  total_test_cases: number
  executed: number
  passed: number
  failed: number
  coverage_pct: number
  milestone_coverage: MilestoneCoverage[]
}

// ── Test case linked to object (FR-030) ─────────────────────────

export interface TestCaseObjectLink {
  object_id: string
  name: string
  object_type: string
  inherited_from_brs: boolean
  project: { id: string; name: string }
}
