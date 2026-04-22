"""
Pydantic models — Module Danh Mục Dữ Liệu (Data Catalog)
"""
from uuid import UUID
from datetime import datetime, date
from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator

# ── Enums ──────────────────────────────────────────────────────────────────
ProductType      = Literal['web_app', 'mobile', 'job', 'etl', 'api']
ProductStatus    = Literal['active', 'inactive', 'deprecated', 'planned']
EnvName          = Literal['DEV', 'SIT', 'UAT', 'PROD', 'DR', 'STAGING']
EnvStatus        = Literal['active', 'inactive', 'maintenance']
LicenseType      = Literal['commercial', 'open_source', 'proprietary', 'subscription', 'free']
ComplianceStatus = Literal['compliant', 'non_compliant', 'pending_review']
UserType         = Literal['internal', 'external', 'contractor', 'vendor']
UserStatus       = Literal['active', 'inactive', 'on_leave', 'terminated']
RoleCategory     = Literal['system', 'business', 'technical', 'management']
AccessLevel      = Literal['none', 'read', 'write', 'admin']
ScopeType        = Literal['global', 'product', 'team']


# ── JSONB section sub-models ───────────────────────────────────────────────

class ArchitectureInfo(BaseModel):
    """Tech stack, framework, arch pattern, dependency systems."""
    arch_type: str | None = None             # Monolith / Microservices / Event-driven
    tech_stack: list[str] = []               # Python, Java, Node.js, Go …
    framework: str | None = None             # FastAPI, Spring Boot, NestJS …
    dependency_systems: list[str] = []       # other systems this app depends on


class DeploymentInfo(BaseModel):
    """Source control, CI/CD, versioning, deployment strategy."""
    git_repo: str | None = None
    branch_strategy: str | None = None       # GitFlow, trunk-based …
    cicd_tool: str | None = None             # Jenkins / GitHub Actions / Azure DevOps
    versioning_type: str | None = None       # Semantic / build number
    deploy_method: str | None = None         # Rolling / Blue-green / Canary


class SecurityInfo(BaseModel):
    """Authentication, authorization, secrets, compliance standards."""
    auth_method: str | None = None           # JWT, OAuth2, SAML …
    authorization: str | None = None         # RBAC, ABAC …
    secrets_management: str | None = None    # Vault, AWS Secrets Manager …
    compliance: list[str] = []               # PCI DSS, ISO 27001 …


class MonitoringInfo(BaseModel):
    """Logging, monitoring, alerting, SLA/SLO targets."""
    logging_tool: str | None = None          # ELK, Loki, Splunk …
    monitoring_tool: str | None = None       # Prometheus + Grafana …
    alerting: str | None = None              # Slack, Email, PagerDuty …
    sla_target: str | None = None            # e.g. 99.9%
    slo: str | None = None                   # e.g. p95 < 500ms


class ResourceInfo(BaseModel):
    """Compute resources and autoscaling configuration."""
    cpu_config: str | None = None            # e.g. 2 vCPU
    ram_config: str | None = None            # e.g. 4 GB
    autoscaling_rules: str | None = None     # Min 2 / Max 10 / CPU > 70%
    throughput: str | None = None            # req/s, job/hour …


class BusinessMetadata(BaseModel):
    """Business SLA, criticality tier, downtime impact."""
    sla_business: str | None = None          # 99.9% uptime 8-22h weekdays
    critical_level: str | None = None        # Tier 1 / Tier 2 / Tier 3
    downtime_impact: str | None = None       # Description of business impact


# ── Type-specific detail models (stored in catalog_product_details.details) ─

class WebAppDetails(BaseModel):
    domain_dns: str | None = None
    cdn: str | None = None                   # Cloudflare, AWS CloudFront …
    browser_support: list[str] = []          # Chrome, Firefox, Edge …
    seo_config: str | None = None
    static_assets_storage: str | None = None  # S3, Azure Blob …
    session_management: str | None = None


class MobileAppDetails(BaseModel):
    platforms: list[str] = []               # iOS, Android
    app_version: str | None = None
    store_link_android: str | None = None
    store_link_ios: str | None = None
    build_pipeline: str | None = None       # Fastlane, Firebase App Distribution …
    push_notification: str | None = None    # FCM, APNS
    offline_capability: bool = False


class ApiServiceDetails(BaseModel):
    spec_url: str | None = None             # OpenAPI / Swagger URL
    endpoints: list[str] = []
    rate_limit: str | None = None           # e.g. 100 req/min per user
    auth_type: str | None = None            # API key, OAuth2, JWT …
    api_version: str | None = None          # v1, v2 …
    backward_compat_rule: str | None = None


class EtlPipelineDetails(BaseModel):
    source_systems: list[str] = []
    target_systems: list[str] = []          # DWH, Data Lake …
    transformation_logic: str | None = None
    data_schema: str | None = None          # star schema, flat, …
    data_quality_rules: list[str] = []
    schedule: str | None = None             # cron expression or "streaming"
    batch_or_streaming: str | None = None   # batch / streaming
    data_lineage: str | None = None


class JobSchedulerDetails(BaseModel):
    job_type: str | None = None             # cron / event-driven
    schedule_cron: str | None = None        # cron expression
    retry_policy: str | None = None         # e.g. 3 attempts, 5min interval
    timeout_seconds: int | None = None
    is_idempotent: bool = False
    queue_system: str | None = None         # Kafka, RabbitMQ …


# ── Product Catalog ────────────────────────────────────────────────────────

class CatalogProductCreate(BaseModel):
    product_code:        str = Field(..., min_length=2, max_length=50)
    product_name:        str = Field(..., max_length=200)
    product_type:        ProductType
    description:         str | None = None
    domain_code:         str | None = Field(None, max_length=50)   # FK → project_domains.code
    business_owner:      str | None = None
    technical_owner:     str | None = None
    owner_team:          str | None = None
    department:          str | None = None
    status:              ProductStatus = 'active'
    tags:                list[str] = []
    notes:               str | None = None
    # Common sections
    architecture_info:   ArchitectureInfo = Field(default_factory=ArchitectureInfo)
    deployment_info:     DeploymentInfo = Field(default_factory=DeploymentInfo)
    security_info:       SecurityInfo = Field(default_factory=SecurityInfo)
    monitoring_info:     MonitoringInfo = Field(default_factory=MonitoringInfo)
    resource_info:       ResourceInfo = Field(default_factory=ResourceInfo)
    business_metadata:   BusinessMetadata = Field(default_factory=BusinessMetadata)

    @field_validator('product_code')
    @classmethod
    def code_upper(cls, v: str) -> str:
        return v.upper().strip()


class CatalogProductUpdate(BaseModel):
    product_name:        str | None = None
    description:         str | None = None
    domain_code:         str | None = None
    business_owner:      str | None = None
    technical_owner:     str | None = None
    owner_team:          str | None = None
    department:          str | None = None
    status:              ProductStatus | None = None
    tags:                list[str] | None = None
    notes:               str | None = None
    # Common sections (partial update — only send sections you want to change)
    architecture_info:   ArchitectureInfo | None = None
    deployment_info:     DeploymentInfo | None = None
    security_info:       SecurityInfo | None = None
    monitoring_info:     MonitoringInfo | None = None
    resource_info:       ResourceInfo | None = None
    business_metadata:   BusinessMetadata | None = None


class CatalogProductOut(BaseModel):
    id:                  UUID
    product_code:        str
    product_name:        str
    product_type:        ProductType
    description:         str | None = None
    domain_code:         str | None = None
    domain_name:         str | None = None
    business_owner:      str | None = None
    technical_owner:     str | None = None
    owner_team:          str | None = None
    department:          str | None = None
    status:              ProductStatus
    tags:                list[str]
    notes:               str | None = None
    architecture_info:   dict[str, Any]
    deployment_info:     dict[str, Any]
    security_info:       dict[str, Any]
    monitoring_info:     dict[str, Any]
    resource_info:       dict[str, Any]
    business_metadata:   dict[str, Any]
    created_at:          datetime
    updated_at:          datetime
    created_by:          str | None = None


# ── Product Environment ────────────────────────────────────────────────────

class EnvCreate(BaseModel):
    env_name:    EnvName
    url:         str | None = None
    infra_type:  str | None = None           # VM / K8s / Serverless
    region:      str | None = None           # Data center / region / cloud zone
    server_info: dict[str, Any] = {}
    deploy_date: date | None = None
    version:     str | None = None
    status:      EnvStatus = 'active'
    notes:       str | None = None


class EnvUpdate(BaseModel):
    url:         str | None = None
    infra_type:  str | None = None
    region:      str | None = None
    server_info: dict[str, Any] | None = None
    deploy_date: date | None = None
    version:     str | None = None
    status:      EnvStatus | None = None
    notes:       str | None = None


class EnvOut(EnvCreate):
    id:         UUID
    product_id: UUID
    created_at: datetime
    updated_at: datetime


# ── Product License ────────────────────────────────────────────────────────

class ProductLicenseCreate(BaseModel):
    license_name:      str = Field(..., max_length=200)
    license_type:      LicenseType = 'commercial'
    vendor:            str | None = None
    quantity:          int | None = None
    start_date:        date | None = None
    expiry_date:       date | None = None
    cost_amount:       float | None = None
    currency:          str = 'VND'
    auto_renewal:      bool = False
    compliance_status: ComplianceStatus = 'compliant'
    notes:             str | None = None


class ProductLicenseUpdate(BaseModel):
    license_name:      str | None = None
    license_type:      LicenseType | None = None
    vendor:            str | None = None
    quantity:          int | None = None
    start_date:        date | None = None
    expiry_date:       date | None = None
    cost_amount:       float | None = None
    currency:          str | None = None
    auto_renewal:      bool | None = None
    compliance_status: ComplianceStatus | None = None
    notes:             str | None = None


class ProductLicenseOut(ProductLicenseCreate):
    id:         UUID
    product_id: UUID
    created_at: datetime
    updated_at: datetime


# ── Product Details (type-specific JSONB) ─────────────────────────────────

class ProductDetailsUpsert(BaseModel):
    details: dict[str, Any] = {}


class ProductDetailsOut(BaseModel):
    id:         UUID
    product_id: UUID
    details:    dict[str, Any]
    created_at: datetime
    updated_at: datetime


# ── User Catalog ───────────────────────────────────────────────────────────

class CatalogUserCreate(BaseModel):
    employee_id: str | None = None
    full_name:   str = Field(..., max_length=200)
    email:       str = Field(..., max_length=200)
    phone:       str | None = None
    user_type:   UserType = 'internal'
    department:  str | None = None
    position:    str | None = None
    manager_id:  UUID | None = None
    team:        str | None = None
    location:    str | None = None
    status:      UserStatus = 'active'
    start_date:  date | None = None
    end_date:    date | None = None
    skills:      list[str] = []
    notes:       str | None = None


class CatalogUserUpdate(BaseModel):
    employee_id: str | None = None
    full_name:   str | None = None
    email:       str | None = None
    phone:       str | None = None
    user_type:   UserType | None = None
    department:  str | None = None
    position:    str | None = None
    manager_id:  UUID | None = None
    team:        str | None = None
    location:    str | None = None
    status:      UserStatus | None = None
    start_date:  date | None = None
    end_date:    date | None = None
    skills:      list[str] | None = None
    notes:       str | None = None


class CatalogUserOut(CatalogUserCreate):
    id:         UUID
    created_at: datetime
    updated_at: datetime
    created_by: str | None = None
    roles:      list[dict[str, Any]] = []
    domains:    list[dict[str, Any]] = []


# ── Roles ──────────────────────────────────────────────────────────────────

class CatalogRoleCreate(BaseModel):
    role_code:            str = Field(..., min_length=2, max_length=50)
    role_name:            str = Field(..., max_length=200)
    role_category:        RoleCategory = 'business'
    description:          str | None = None
    workflow_permissions: dict[str, Any] = {}
    product_access_level: AccessLevel = 'read'
    is_active:            bool = True

    @field_validator('role_code')
    @classmethod
    def code_upper(cls, v: str) -> str:
        return v.upper().strip()


class CatalogRoleUpdate(BaseModel):
    role_name:            str | None = None
    role_category:        RoleCategory | None = None
    description:          str | None = None
    workflow_permissions: dict[str, Any] | None = None
    product_access_level: AccessLevel | None = None
    is_active:            bool | None = None


class CatalogRoleOut(CatalogRoleCreate):
    id:         UUID
    created_at: datetime
    updated_at: datetime
    created_by: str | None = None


# ── User-Role Assignment ───────────────────────────────────────────────────

class UserRoleAssign(BaseModel):
    role_id:     UUID
    scope_type:  ScopeType = 'global'
    scope_id:    UUID | None = None
    assigned_by: str | None = None
    expires_at:  datetime | None = None


class UserRoleOut(BaseModel):
    id:            UUID
    user_id:       UUID
    role_id:       UUID
    role_code:     str
    role_name:     str
    role_category: str
    scope_type:    str
    scope_id:      UUID | None
    assigned_by:   str | None
    assigned_at:   datetime
    expires_at:    datetime | None


# ── User-Domain Assignment ─────────────────────────────────────────────────

class UserDomainAssign(BaseModel):
    domain_code:    str = Field(..., min_length=1, max_length=50)
    role_in_domain: str | None = Field(None, max_length=200)
    is_primary:     bool = False
    assigned_by:    str | None = None


class UserDomainOut(BaseModel):
    id:             UUID
    user_id:        UUID
    domain_code:    str
    domain_name:    str
    role_in_domain: str | None
    is_primary:     bool
    assigned_at:    datetime
    assigned_by:    str | None


# ── Domain Catalog (project_domains + personnel) ───────────────────────────

class DomainPersonnel(BaseModel):
    user_id:        UUID
    employee_id:    str | None
    full_name:      str
    email:          str
    position:       str | None
    department:     str | None
    role_in_domain: str | None
    is_primary:     bool
    assigned_at:    datetime


class CatalogDomainUpdate(BaseModel):
    code:        str | None = Field(None, min_length=1, max_length=50)
    name:        str | None = Field(None, max_length=200)
    description: str | None = None
    is_active:   bool | None = None

    @field_validator('code')
    @classmethod
    def code_upper(cls, v: str | None) -> str | None:
        return v.upper().strip() if v else v


class CatalogDomainOut(BaseModel):
    code:        str
    name:        str
    description: str | None
    sort_order:  int
    is_active:   bool
    user_count:  int = 0
    personnel:   list[DomainPersonnel] = []
