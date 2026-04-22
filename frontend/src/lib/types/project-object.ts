/**
 * Types for Project Object module (FR-023 – FR-026)
 * Discriminated union by object_type per ADR-004.
 * BRD Reference: BRD-001 v1.1
 */

export type ProjectObjectType = 'web_app' | 'mobile_app' | 'api' | 'elt'
export type ProjectObjectStatus = 'active' | 'deprecated' | 'decommissioned'

// ── Standard info per object type (ADR-004) ─────────────────────

export interface WebAppInfo {
  object_type: 'web_app'
  tech_stack: string
  version: string
  url_dev?: string
  url_staging?: string
  url_uat?: string
  url_prod?: string
  deployment_type?: string
  notes?: string
}

export interface MobileAppInfo {
  object_type: 'mobile_app'
  platform: 'ios' | 'android' | 'cross_platform'
  version: string
  store_link_ios?: string
  store_link_android?: string
  tech_stack?: string
  min_os_version?: string
  notes?: string
}

export interface ApiInfo {
  object_type: 'api'
  base_url: string
  auth_method: 'JWT' | 'OAuth2' | 'API_Key' | 'Basic' | 'None'
  version: string
  protocol?: 'REST' | 'SOAP' | 'GraphQL' | 'gRPC'
  url_dev?: string
  url_uat?: string
  swagger_url?: string
  notes?: string
}

export interface EltInfo {
  object_type: 'elt'
  source_system: string
  target_system: string
  schedule?: string
  technology?: string
  data_format?: string
  volume_estimate?: string
  sla_minutes?: number
  notes?: string
}

export type StandardInfo = WebAppInfo | MobileAppInfo | ApiInfo | EltInfo

// ── Project Object ───────────────────────────────────────────────

export interface ProjectObject {
  id: string
  project_id: string
  object_type: ProjectObjectType
  name: string
  code: string
  description?: string
  owner: string
  status: ProjectObjectStatus
  standard_info: StandardInfo
  created_at: string
  created_by: string
}

export interface ProjectObjectDetail extends ProjectObject {
  ba_docs_count: number
  test_cases_count: number
}

export interface ProjectObjectCreate {
  object_type: ProjectObjectType
  name: string
  code: string
  description?: string
  owner: string
  standard_info: Omit<StandardInfo, 'object_type'>
}

export interface ProjectObjectUpdate {
  name?: string
  description?: string
  owner?: string
  standard_info?: Partial<Omit<StandardInfo, 'object_type'>>
}

// ── Connections (FR-026) ─────────────────────────────────────────

export type ConnectionType = 'api_call' | 'db_link' | 'file_transfer' | 'event_stream' | 'other'

export interface ObjectConnection {
  connection_id: string
  target_object: {
    id: string
    name: string
    object_type: ProjectObjectType
    project: { id: string; name: string }
  }
  connection_type: ConnectionType
  protocol?: string
  frequency?: string
  description?: string
  status: 'active' | 'removed'
}

export interface ConnectionsResponse {
  data: {
    outbound: ObjectConnection[]
    inbound: ObjectConnection[]
  }
}

export interface ConnectionCreate {
  target_object_id: string
  connection_type: ConnectionType
  protocol?: string
  frequency?: string
  description?: string
}

// ── Cross-project report ─────────────────────────────────────────

export interface ConnectionReportItem {
  connection_id: string
  target: {
    id: string
    name: string
    object_type: ProjectObjectType
    project: { id: string; name: string }
  }
  connection_type: ConnectionType
  protocol?: string
  status: string
}

export interface ConnectionReport {
  query_object: {
    id: string
    name: string
    project: { id: string; name: string }
  }
  outbound_connections: ConnectionReportItem[]
  inbound_connections: ConnectionReportItem[]
  total_outbound: number
  total_inbound: number
}

// ── Import/Export ────────────────────────────────────────────────

export type ConflictStrategy = 'ask' | 'overwrite' | 'skip'

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ row: number; error: string }>
}

export interface ImportConflictError {
  code: 'IMPORT_CONFLICT'
  message: string
  details: {
    conflicting_codes: string[]
    hint: string
  }
}
