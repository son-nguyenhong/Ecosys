/**
 * BA Studio — types dùng chung cho API client, diff engine và các view.
 * Khớp với backend/ba-workflow/app/routers/ba_studio.py
 */

export type DocType = 'BRS' | 'FSD' | 'BRD' | 'FRS' | 'SRS'
export type DocStatus = 'active' | 'archived'
export type MergeState = 'pending' | 'merged' | 'rejected'
/** stage = cột status của project_change_requests */
export type CrStage =
  | 'submitted' | 'reviewing' | 'approved'
  | 'implementing' | 'implemented' | 'rejected' | 'cancelled'
export type OpenStage = 'submitted' | 'reviewing' | 'approved'
export type ChangeType =
  'scope' | 'timeline' | 'resource' | 'budget' | 'technical' | 'process' | 'other'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type OpKind = 'add' | 'modify' | 'remove' | 'move'

export interface Section {
  section_key: string
  heading: string
  /** cấp heading Markdown: 0 = phần mở đầu, 1..6 = # .. ###### (V051) */
  heading_level?: number
  body: string
  sort_order?: number
}

export interface SectionOp {
  id?: string
  op: OpKind
  section_key: string
  after_section_key?: string | null
  heading?: string | null
  heading_level?: number | null
  body?: string | null
  sort_order?: number
}

export interface Delta {
  add: number
  modify: number
  remove: number
  /** đổi vị trí mục — có từ V051, snapshot cũ không có */
  move?: number
}

export interface MasterDocBase {
  id: string
  doc_code: string
  project_id: string
  project_code?: string | null
  project_name?: string | null
  doc_type: DocType
  title: string
  abbr?: string | null
  owner?: string | null
  base_version: string
  base_date?: string | null
  base_note?: string | null
  current_version: string
  status: DocStatus
  ba_document_id?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface MasterDocListItem extends MasterDocBase {
  section_count: number
  version_count: number
  last_released_on?: string | null
  cr_pending: number
  cr_merged: number
  cr_rejected: number
}

export interface DocVersion {
  id: string
  version_label: string
  seq: number
  kind: 'base' | 'merge'
  note?: string | null
  released_on?: string | null
  released_by?: string | null
  sections: Section[]
  /** toàn bộ phiên bản dưới dạng 1 file Markdown (backend ghép từ snapshot) */
  content_md?: string
  source_cr_id?: string | null
  source_cr_code?: string | null
  source_cr_title?: string | null
  delta?: Delta
}

export interface DocCr {
  id: string
  request_code: string
  project_id: string
  project_code?: string | null
  project_name?: string | null
  target_doc_id: string
  doc_code?: string | null
  doc_title?: string | null
  doc_type?: DocType | null
  doc_current_version?: string | null
  title: string
  description?: string | null
  change_type: ChangeType
  priority: Priority
  /** stage trong quy trình phê duyệt (= cột status của PCR) */
  stage: CrStage
  status: CrStage
  merge_state: MergeState
  merged_version?: string | null
  merged_at?: string | null
  impact_scope?: string | null
  requested_by: string
  reviewer?: string | null
  assigned_to?: string | null
  approved_by?: string | null
  approved_at?: string | null
  reviewed_at?: string | null
  notes?: string | null
  acceptance: string[]
  dependencies: string[]
  created_at: string
  updated_at: string
  delta: Delta
  ops_count?: number
}

export interface DocCrDetail extends DocCr {
  ops: SectionOp[]
  before_sections: Section[]
  after_sections: Section[]
  /** Markdown đầy đủ trước / sau khi áp CR — dùng cho editor và tải file */
  before_content_md: string
  after_content_md: string
  next_version_label: string
  can_merge: boolean
  /** khác rỗng = tài liệu đã đổi sau khi CR được tạo, CR cần cập nhật lại */
  drift: string[]
}

export interface MasterDocDetail extends MasterDocBase {
  sections: Section[]
  /** toàn bộ tài liệu dưới dạng 1 file Markdown */
  content_md: string
  versions: DocVersion[]
  change_requests: DocCr[]
  next_section_key: string
  next_version_label: string
  editable_sections: boolean
}

export interface CrHistoryEntry {
  id: string
  action: string
  actor: string
  from_status?: string | null
  to_status?: string | null
  comment?: string | null
  created_at: string
}

// ── Payload ─────────────────────────────────────────────────────────────────

export interface SectionInput {
  section_key?: string
  heading: string
  heading_level?: number
  body: string
}

export interface MasterDocCreatePayload {
  project_id: string
  doc_type: DocType
  title: string
  doc_code?: string
  abbr?: string
  owner?: string
  base_version?: string
  base_date?: string
  base_note?: string
  /** cách dùng chính: cả tài liệu là 1 file Markdown */
  content_md?: string
  sections?: SectionInput[]
}

export interface MasterDocUpdatePayload {
  title?: string
  abbr?: string
  owner?: string
  base_note?: string
  doc_type?: DocType
  status?: DocStatus
}

export interface DocCrCreatePayload {
  target_doc_id: string
  title: string
  description?: string
  change_type: ChangeType
  priority: Priority
  stage?: OpenStage
  requested_by: string
  reviewer?: string
  impact_scope?: string
  notes?: string
  acceptance: string[]
  dependencies: string[]
  /** cách dùng chính: file Markdown đề nghị sau thay đổi — backend tự suy ra ops */
  content_md?: string
  ops?: SectionOp[]
}

export interface DocCrUpdatePayload {
  title?: string
  description?: string
  change_type?: ChangeType
  priority?: Priority
  reviewer?: string
  impact_scope?: string
  notes?: string
  acceptance?: string[]
  dependencies?: string[]
  content_md?: string
  ops?: SectionOp[]
}

export interface MergeResult {
  doc_id: string
  request_code: string
  version_label: string
  section_count: number
  delta: Delta
}
