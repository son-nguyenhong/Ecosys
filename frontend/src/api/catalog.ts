/**
 * Catalog API client — /catalog/products + /catalog/users + /catalog/roles
 * Proxied via Vite /api/ppg → :8001
 */

const BASE = '/api/ppg'

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) { sessionStorage.removeItem('access_token'); window.location.href = '/login' }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

// ── Enums / Union types ────────────────────────────────────────────────────

export type ProductType   = 'web_app' | 'mobile' | 'job' | 'etl' | 'api'
export type ProductStatus = 'active' | 'inactive' | 'deprecated' | 'planned'
export type EnvName       = 'DEV' | 'SIT' | 'UAT' | 'PROD' | 'DR' | 'STAGING'
export type UserType      = 'internal' | 'external' | 'contractor' | 'vendor'
export type UserStatus    = 'active' | 'inactive' | 'on_leave' | 'terminated'
export type RoleCategory  = 'system' | 'business' | 'technical' | 'management'
export type AccessLevel   = 'none' | 'read' | 'write' | 'admin'
export type ScopeType     = 'global' | 'product' | 'team'

// ── Common section interfaces ──────────────────────────────────────────────

export interface ArchitectureInfo {
  arch_type?: string           // Monolith / Microservices / Event-driven
  tech_stack: string[]
  framework?: string
  dependency_systems: string[]
}

export interface DeploymentInfo {
  git_repo?: string
  branch_strategy?: string
  cicd_tool?: string           // Jenkins / GitHub Actions / Azure DevOps
  versioning_type?: string     // Semantic / build number
  deploy_method?: string       // Rolling / Blue-green / Canary
}

export interface SecurityInfo {
  auth_method?: string         // JWT, OAuth2 …
  authorization?: string
  secrets_management?: string
  compliance: string[]         // PCI DSS, ISO 27001 …
}

export interface MonitoringInfo {
  logging_tool?: string        // ELK, Loki …
  monitoring_tool?: string
  alerting?: string
  sla_target?: string
  slo?: string
}

export interface ResourceInfo {
  cpu_config?: string
  ram_config?: string
  autoscaling_rules?: string
  throughput?: string
}

export interface BusinessMetadata {
  sla_business?: string
  critical_level?: string      // Tier 1 / Tier 2 / Tier 3
  downtime_impact?: string
}

// ── Type-specific detail interfaces ───────────────────────────────────────

export interface WebAppDetails {
  domain_dns?: string
  cdn?: string
  browser_support: string[]
  seo_config?: string
  static_assets_storage?: string
  session_management?: string
}

export interface MobileAppDetails {
  platforms: string[]
  app_version?: string
  store_link_android?: string
  store_link_ios?: string
  build_pipeline?: string
  push_notification?: string
  offline_capability: boolean
}

export interface ApiServiceDetails {
  spec_url?: string
  endpoints: string[]
  rate_limit?: string
  auth_type?: string
  api_version?: string
  backward_compat_rule?: string
}

export interface EtlPipelineDetails {
  source_systems: string[]
  target_systems: string[]
  transformation_logic?: string
  data_schema?: string
  data_quality_rules: string[]
  schedule?: string
  batch_or_streaming?: string
  data_lineage?: string
}

export interface JobSchedulerDetails {
  job_type?: string
  schedule_cron?: string
  retry_policy?: string
  timeout_seconds?: number
  is_idempotent: boolean
  queue_system?: string
}

export type TypeDetails =
  | WebAppDetails
  | MobileAppDetails
  | ApiServiceDetails
  | EtlPipelineDetails
  | JobSchedulerDetails
  | Record<string, unknown>

// ── Product ────────────────────────────────────────────────────────────────

export interface CatalogProduct {
  id: string
  product_code: string
  product_name: string
  product_type: ProductType
  description?: string
  domain_code?: string
  domain_name?: string
  business_owner?: string
  technical_owner?: string
  owner_team?: string
  department?: string
  status: ProductStatus
  tags: string[]
  notes?: string
  architecture_info: ArchitectureInfo
  deployment_info: DeploymentInfo
  security_info: SecurityInfo
  monitoring_info: MonitoringInfo
  resource_info: ResourceInfo
  business_metadata: BusinessMetadata
  created_at: string
  updated_at: string
  created_by?: string
}

export interface CatalogProductCreate {
  product_code: string
  product_name: string
  product_type: ProductType
  description?: string
  domain_code?: string
  business_owner?: string
  technical_owner?: string
  owner_team?: string
  department?: string
  status?: ProductStatus
  tags?: string[]
  notes?: string
  architecture_info?: Partial<ArchitectureInfo>
  deployment_info?: Partial<DeploymentInfo>
  security_info?: Partial<SecurityInfo>
  monitoring_info?: Partial<MonitoringInfo>
  resource_info?: Partial<ResourceInfo>
  business_metadata?: Partial<BusinessMetadata>
}

// ── Product Environments ───────────────────────────────────────────────────

export interface ProductEnv {
  id: string
  product_id: string
  env_name: EnvName
  url?: string
  infra_type?: string
  region?: string
  server_info: Record<string, unknown>
  deploy_date?: string
  version?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface ProductEnvCreate {
  env_name: EnvName
  url?: string
  infra_type?: string
  region?: string
  server_info?: Record<string, unknown>
  deploy_date?: string
  version?: string
  status?: string
  notes?: string
}

// ── Product Licenses ───────────────────────────────────────────────────────

export interface ProductLicense {
  id: string
  product_id: string
  license_name: string
  license_type: string
  vendor?: string
  quantity?: number
  start_date?: string
  expiry_date?: string
  cost_amount?: number
  currency: string
  auto_renewal: boolean
  compliance_status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface ProductLicenseCreate {
  license_name: string
  license_type?: string
  vendor?: string
  quantity?: number
  start_date?: string
  expiry_date?: string
  cost_amount?: number
  currency?: string
  auto_renewal?: boolean
  compliance_status?: string
  notes?: string
}

// ── Product Details ────────────────────────────────────────────────────────

export interface ProductDetails {
  id: string
  product_id: string
  details: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ── User ──────────────────────────────────────────────────────────────────

export interface UserRoleInfo {
  id: string
  role_id: string
  role_code: string
  role_name: string
  role_category: string
  scope_type: string
  assigned_at: string
}

export interface CatalogUser {
  id: string
  employee_id?: string
  full_name: string
  email: string
  phone?: string
  user_type: UserType
  department?: string
  position?: string
  manager_id?: string
  team?: string
  location?: string
  status: UserStatus
  start_date?: string
  end_date?: string
  skills: string[]
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  roles: UserRoleInfo[]
  domains: UserDomainInfo[]
}

export interface CatalogUserCreate {
  employee_id?: string
  full_name: string
  email: string
  phone?: string
  user_type?: UserType
  department?: string
  position?: string
  manager_id?: string
  team?: string
  location?: string
  status?: UserStatus
  start_date?: string
  end_date?: string
  skills?: string[]
  notes?: string
}

// ── Role ──────────────────────────────────────────────────────────────────

export interface CatalogRole {
  id: string
  role_code: string
  role_name: string
  role_category: RoleCategory
  description?: string
  workflow_permissions: Record<string, string[]>
  product_access_level: AccessLevel
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface CatalogRoleCreate {
  role_code: string
  role_name: string
  role_category?: RoleCategory
  description?: string
  workflow_permissions?: Record<string, string[]>
  product_access_level?: AccessLevel
  is_active?: boolean
}

export interface UserRoleAssign {
  role_id: string
  scope_type?: ScopeType
  scope_id?: string
  assigned_by?: string
  expires_at?: string
}

// ── Domain ─────────────────────────────────────────────────────────────────

export interface DomainPersonnel {
  user_id: string
  employee_id?: string
  full_name: string
  email: string
  position?: string
  department?: string
  role_in_domain?: string
  is_primary: boolean
  assigned_at: string
}

export interface CatalogDomain {
  code: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  user_count: number
  personnel: DomainPersonnel[]
}

export interface UserDomainInfo {
  id: string
  user_id: string
  domain_code: string
  domain_name: string
  role_in_domain?: string
  is_primary: boolean
  assigned_at: string
  assigned_by?: string
}

export interface UserDomainAssign {
  domain_code: string
  role_in_domain?: string
  is_primary?: boolean
  assigned_by?: string
}

// ── Default empty structures ───────────────────────────────────────────────

export const EMPTY_ARCH_INFO: ArchitectureInfo = { tech_stack: [], dependency_systems: [] }
export const EMPTY_DEPLOY_INFO: DeploymentInfo = {}
export const EMPTY_SECURITY_INFO: SecurityInfo = { compliance: [] }
export const EMPTY_MONITORING_INFO: MonitoringInfo = {}
export const EMPTY_RESOURCE_INFO: ResourceInfo = {}
export const EMPTY_BUSINESS_META: BusinessMetadata = {}

export const DEFAULT_TYPE_DETAILS: Record<ProductType, Record<string, unknown>> = {
  web_app: { domain_dns: '', cdn: '', browser_support: [], seo_config: '', static_assets_storage: '', session_management: '' },
  mobile:  { platforms: [], app_version: '', store_link_android: '', store_link_ios: '', build_pipeline: '', push_notification: '', offline_capability: false },
  api:     { spec_url: '', endpoints: [], rate_limit: '', auth_type: '', api_version: '', backward_compat_rule: '' },
  etl:     { source_systems: [], target_systems: [], transformation_logic: '', data_schema: '', data_quality_rules: [], schedule: '', batch_or_streaming: 'batch', data_lineage: '' },
  job:     { job_type: 'cron', schedule_cron: '', retry_policy: '', timeout_seconds: null, is_idempotent: false, queue_system: '' },
}

// ── API calls — Products ───────────────────────────────────────────────────

export const getProducts = (params?: {
  product_type?: ProductType
  status?: ProductStatus
  department?: string
  domain?: string          // domain_code filter
  q?: string
}) => {
  const qs = new URLSearchParams()
  if (params?.product_type) qs.set('product_type', params.product_type)
  if (params?.status)       qs.set('status', params.status)
  if (params?.department)   qs.set('department', params.department)
  if (params?.domain)       qs.set('domain', params.domain)
  if (params?.q)            qs.set('q', params.q)
  const q = qs.toString()
  return req<CatalogProduct[]>('GET', `/catalog/products${q ? `?${q}` : ''}`)
}

export const createProduct = (data: CatalogProductCreate) =>
  req<CatalogProduct>('POST', '/catalog/products', data)

export const getProduct = (id: string) =>
  req<CatalogProduct>('GET', `/catalog/products/${id}`)

export const updateProduct = (id: string, data: Partial<CatalogProductCreate>) =>
  req<CatalogProduct>('PUT', `/catalog/products/${id}`, data)

export const deleteProduct = (id: string) =>
  req<void>('DELETE', `/catalog/products/${id}`)

// Environments
export const getProductEnvs = (productId: string) =>
  req<ProductEnv[]>('GET', `/catalog/products/${productId}/environments`)

export const createProductEnv = (productId: string, data: ProductEnvCreate) =>
  req<ProductEnv>('POST', `/catalog/products/${productId}/environments`, data)

export const updateProductEnv = (productId: string, envId: string, data: Partial<ProductEnvCreate>) =>
  req<ProductEnv>('PUT', `/catalog/products/${productId}/environments/${envId}`, data)

export const deleteProductEnv = (productId: string, envId: string) =>
  req<void>('DELETE', `/catalog/products/${productId}/environments/${envId}`)

// Licenses
export const getProductLicenses = (productId: string) =>
  req<ProductLicense[]>('GET', `/catalog/products/${productId}/licenses`)

export const createProductLicense = (productId: string, data: ProductLicenseCreate) =>
  req<ProductLicense>('POST', `/catalog/products/${productId}/licenses`, data)

export const updateProductLicense = (productId: string, licId: string, data: Partial<ProductLicenseCreate>) =>
  req<ProductLicense>('PUT', `/catalog/products/${productId}/licenses/${licId}`, data)

export const deleteProductLicense = (productId: string, licId: string) =>
  req<void>('DELETE', `/catalog/products/${productId}/licenses/${licId}`)

// Details (type-specific)
export const getProductDetails = (productId: string) =>
  req<ProductDetails | null>('GET', `/catalog/products/${productId}/details`)

export const upsertProductDetails = (productId: string, details: Record<string, unknown>) =>
  req<ProductDetails>('PUT', `/catalog/products/${productId}/details`, { details })

// ── API calls — Users ──────────────────────────────────────────────────────

export const getCatalogUsers = (params?: {
  user_type?: UserType; department?: string; team?: string; status?: UserStatus; q?: string
}) => {
  const qs = new URLSearchParams()
  if (params?.user_type)   qs.set('user_type', params.user_type)
  if (params?.department)  qs.set('department', params.department)
  if (params?.team)        qs.set('team', params.team)
  if (params?.status)      qs.set('status', params.status)
  if (params?.q)           qs.set('q', params.q)
  const q = qs.toString()
  return req<CatalogUser[]>('GET', `/catalog/users${q ? `?${q}` : ''}`)
}

export const createCatalogUser = (data: CatalogUserCreate) =>
  req<CatalogUser>('POST', '/catalog/users', data)

export const getCatalogUser = (id: string) =>
  req<CatalogUser>('GET', `/catalog/users/${id}`)

export const updateCatalogUser = (id: string, data: Partial<CatalogUserCreate>) =>
  req<CatalogUser>('PUT', `/catalog/users/${id}`, data)

export const deleteCatalogUser = (id: string) =>
  req<void>('DELETE', `/catalog/users/${id}`)

export const assignUserRole = (userId: string, data: UserRoleAssign) =>
  req<UserRoleInfo>('POST', `/catalog/users/${userId}/roles`, data)

export const removeUserRole = (userId: string, roleId: string) =>
  req<void>('DELETE', `/catalog/users/${userId}/roles/${roleId}`)

// ── API calls — Roles ──────────────────────────────────────────────────────

export const getCatalogRoles = (params?: { role_category?: RoleCategory; is_active?: boolean }) => {
  const qs = new URLSearchParams()
  if (params?.role_category)          qs.set('role_category', params.role_category)
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active))
  const q = qs.toString()
  return req<CatalogRole[]>('GET', `/catalog/roles${q ? `?${q}` : ''}`)
}

export const createCatalogRole = (data: CatalogRoleCreate) =>
  req<CatalogRole>('POST', '/catalog/roles', data)

export const updateCatalogRole = (id: string, data: Partial<CatalogRoleCreate>) =>
  req<CatalogRole>('PUT', `/catalog/roles/${id}`, data)

export const deleteCatalogRole = (id: string) =>
  req<void>('DELETE', `/catalog/roles/${id}`)

export const getRoleUsers = (roleId: string) =>
  req<CatalogUser[]>('GET', `/catalog/roles/${roleId}/users`)

// ── API calls — Domains ────────────────────────────────────────────────────

export const getCatalogDomains = () =>
  req<CatalogDomain[]>('GET', '/catalog/domains')

export const getCatalogDomain = (code: string) =>
  req<CatalogDomain>('GET', `/catalog/domains/${code}`)

export const updateCatalogDomain = (code: string, data: { code?: string; name?: string; description?: string; is_active?: boolean }) =>
  req<CatalogDomain>('PUT', `/catalog/domains/${code}`, data)

export const getUserDomains = (userId: string) =>
  req<UserDomainInfo[]>('GET', `/catalog/users/${userId}/domains`)

export const assignUserDomain = (userId: string, data: UserDomainAssign) =>
  req<UserDomainInfo>('POST', `/catalog/users/${userId}/domains`, data)

export const updateUserDomain = (userId: string, domainCode: string, data: UserDomainAssign) =>
  req<UserDomainInfo>('PUT', `/catalog/users/${userId}/domains/${domainCode}`, data)

export const removeUserDomain = (userId: string, domainCode: string) =>
  req<void>('DELETE', `/catalog/users/${userId}/domains/${domainCode}`)
