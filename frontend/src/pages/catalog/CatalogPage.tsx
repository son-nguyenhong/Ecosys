/**
 * CatalogPage — Module Danh Mục Dữ Liệu
 * Tabs: Products | Users | Roles
 *
 * Product detail sections:
 *  - Tổng quan    : identification + basic owners
 *  - Kiến trúc    : tech stack, framework, arch type, dependencies
 *  - Môi trường   : environments (DEV/SIT/UAT/PROD/DR/STAGING)
 *  - Deployment   : git repo, CI/CD, deploy method
 *  - Bảo mật      : auth, secrets, compliance
 *  - Vận hành     : monitoring, resources, business metadata
 *  - Chi tiết     : type-specific fields (structured form per type)
 *  - Licence      : license records
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Badge, Btn, Modal, StatusBadge } from '../../components/ui'
import { FilterBar, applyTextFilter, applyDateFilter } from '../../components/FilterBar'
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getProductEnvs, createProductEnv, updateProductEnv, deleteProductEnv,
  getProductLicenses, createProductLicense, deleteProductLicense,
  getProductDetails, upsertProductDetails,
  getCatalogUsers, createCatalogUser, updateCatalogUser, deleteCatalogUser,
  assignUserRole, removeUserRole,
  getCatalogRoles, createCatalogRole, updateCatalogRole, deleteCatalogRole,
  getCatalogDomains, updateCatalogDomain,
  assignUserDomain, removeUserDomain,
  EMPTY_ARCH_INFO, EMPTY_DEPLOY_INFO, EMPTY_SECURITY_INFO,
  EMPTY_MONITORING_INFO, EMPTY_RESOURCE_INFO, EMPTY_BUSINESS_META,
  DEFAULT_TYPE_DETAILS,
  type CatalogProduct, type CatalogProductCreate,
  type ArchitectureInfo, type DeploymentInfo, type SecurityInfo,
  type MonitoringInfo, type ResourceInfo, type BusinessMetadata,
  type ProductEnv, type ProductEnvCreate,
  type ProductLicense, type ProductLicenseCreate,
  type CatalogUser, type CatalogUserCreate,
  type CatalogRole, type CatalogRoleCreate,
  type CatalogDomain, type UserDomainAssign,
  type ProductType, type UserType,
} from '../../api/catalog'

// ── Shared constants ───────────────────────────────────────────────────────

const PRODUCT_TYPES: { key: ProductType | 'all'; label: string; icon: string }[] = [
  { key: 'all',     label: 'Tất cả',       icon: '🗂️' },
  { key: 'web_app', label: 'Web App',      icon: '🌐' },
  { key: 'mobile',  label: 'Mobile App',   icon: '📱' },
  { key: 'job',     label: 'Job/Scheduler',icon: '⏱️' },
  { key: 'etl',     label: 'ETL Pipeline', icon: '🔄' },
  { key: 'api',     label: 'API Service',  icon: '🔗' },
]

const USER_TYPES: { key: UserType | 'all'; label: string }[] = [
  { key: 'all',        label: 'Tất cả' },
  { key: 'internal',   label: 'Internal' },
  { key: 'external',   label: 'External' },
  { key: 'contractor', label: 'Contractor' },
  { key: 'vendor',     label: 'Vendor' },
]

const ROLE_CATEGORY_LABELS: Record<string, string> = {
  system: 'System', business: 'Business', technical: 'Technical', management: 'Management',
}

const ACCESS_LEVEL_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  admin: 'danger', write: 'warning', read: 'info', none: 'neutral',
}

const DOMAIN_COLORS: Record<string, string> = {
  HR: '#8b5cf6', FS: '#0ea5e9', RETAIL: '#f59e0b', CARDS: '#ef4444',
  RISK: '#dc2626', COMPLIANCE: '#6366f1', IT: '#0284c7', DIGITAL: '#10b981',
  BOS: '#f97316', DATA: '#6b7280', SME: '#d97706', TREASURY: '#7c3aed', ESD: '#059669',
}
function domainBgColor(code: string) { return (DOMAIN_COLORS[code] ?? '#64748b') + '18' }
function domainFgColor(code: string) { return DOMAIN_COLORS[code] ?? '#64748b' }

const ARCH_TYPES = ['Monolith', 'Microservices', 'Event-driven', 'Serverless', 'BFF', 'Hybrid']
const DEPLOY_METHODS = ['Rolling', 'Blue-green', 'Canary', 'Recreate', 'A/B Testing']
const CICD_TOOLS = ['Azure DevOps', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'ArgoCD', 'Khác']
const INFRA_TYPES = ['VM', 'K8s', 'Serverless', 'Bare Metal', 'PaaS']
const CRITICAL_LEVELS = ['Tier 1 (Critical)', 'Tier 2 (High)', 'Tier 3 (Medium)', 'Tier 4 (Low)']

function typeIcon(t: string) { return PRODUCT_TYPES.find(p => p.key === t)?.icon ?? '📦' }
function typeLabel(t: string) { return PRODUCT_TYPES.find(p => p.key === t)?.label ?? t }

function statusVariant(s: string): 'success' | 'neutral' | 'warning' | 'danger' | 'info' {
  const m: Record<string, 'success' | 'neutral' | 'warning' | 'danger' | 'info'> = {
    active: 'success', planned: 'info', inactive: 'neutral', deprecated: 'danger',
    terminated: 'danger', on_leave: 'warning',
  }
  return m[s] || 'neutral'
}

// ── Shared small components ────────────────────────────────────────────────

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--vib-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, marginTop: 4, borderBottom: '1px solid var(--vib-neutral-100)', paddingBottom: 6, ...style }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null | React.ReactNode }) {
  return (
    <div style={{ padding: '5px 0', borderBottom: '1px solid var(--vib-neutral-100)' }}>
      <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{value || <span style={{ color: 'var(--vib-neutral-400)' }}>—</span>}</div>
    </div>
  )
}

function TagList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <span style={{ color: 'var(--vib-neutral-400)', fontSize: 12 }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((s, i) => (
        <span key={i} style={{ fontSize: 11, background: 'var(--vib-neutral-100)', color: 'var(--vib-neutral-700)', padding: '2px 8px', borderRadius: 10 }}>{s}</span>
      ))}
    </div>
  )
}

function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label style={{ fontSize: 11, color: 'var(--vib-neutral-600)', display: 'block', marginBottom: 3 }}>{children}{required && <span style={{ color: 'var(--vib-danger)', marginLeft: 2 }}>*</span>}</label>
}

function F({ children, full }: { children: React.ReactNode; full?: boolean }) {
  return <div style={{ gridColumn: full ? '1/-1' : undefined }}>{children}</div>
}

// Editable tag list (comma separated input)
function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <input
      className="vib-input"
      value={value.join(', ')}
      placeholder={placeholder || 'Phân cách bằng dấu phẩy'}
      onChange={e => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
    />
  )
}

// ══════════════════════════════════════════════════════════════════
// ProductDetailModal — 8 tabs of structured information
// ══════════════════════════════════════════════════════════════════

type DetailTab = 'overview' | 'architecture' | 'environments' | 'deployment'
  | 'security' | 'operations' | 'type_details' | 'license'

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview',      label: '📋 Tổng quan' },
  { key: 'architecture',  label: '🏗️ Kiến trúc' },
  { key: 'environments',  label: '🌐 Môi trường' },
  { key: 'deployment',    label: '🚀 Deployment' },
  { key: 'security',      label: '🔐 Bảo mật' },
  { key: 'operations',    label: '📊 Vận hành' },
  { key: 'type_details',  label: '⚙️ Chi tiết' },
  { key: 'license',       label: '📦 Licence' },
]

function ProductDetailModal({
  product,
  onClose,
  onUpdated,
}: {
  product: CatalogProduct
  onClose: () => void
  onUpdated: (p: CatalogProduct) => void
}) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const [envs, setEnvs]         = useState<ProductEnv[]>([])
  const [licenses, setLicenses] = useState<ProductLicense[]>([])
  const [typeDetails, setTypeDetails] = useState<Record<string, unknown>>({})
  const [saving, setSaving]     = useState(false)

  // ── Section edit states (clone from product) ──────────────────
  const [archEdit, setArchEdit] = useState<ArchitectureInfo>({ ...EMPTY_ARCH_INFO, ...product.architecture_info })
  const [deployEdit, setDeployEdit] = useState<DeploymentInfo>({ ...EMPTY_DEPLOY_INFO, ...product.deployment_info })
  const [secEdit, setSecEdit]   = useState<SecurityInfo>({ ...EMPTY_SECURITY_INFO, ...product.security_info })
  const [monEdit, setMonEdit]   = useState<MonitoringInfo>({ ...EMPTY_MONITORING_INFO, ...product.monitoring_info })
  const [resEdit, setResEdit]   = useState<ResourceInfo>({ ...EMPTY_RESOURCE_INFO, ...product.resource_info })
  const [bizEdit, setBizEdit]   = useState<BusinessMetadata>({ ...EMPTY_BUSINESS_META, ...product.business_metadata })
  const [typeDetailsEdit, setTypeDetailsEdit] = useState<Record<string, unknown>>({})

  // ── Env form ───────────────────────────────────────────────────
  const [envForm, setEnvForm]   = useState<ProductEnvCreate>({ env_name: 'DEV' })
  const [showEnvForm, setShowEnvForm] = useState(false)

  // ── License form ───────────────────────────────────────────────
  const [licForm, setLicForm]   = useState<ProductLicenseCreate>({ license_name: '' })
  const [showLicForm, setShowLicForm] = useState(false)

  useEffect(() => { loadEnvs(); loadLicenses(); loadTypeDetails() }, [product.id])

  const loadEnvs = async () => { try { setEnvs(await getProductEnvs(product.id)) } catch { /**/ } }
  const loadLicenses = async () => { try { setLicenses(await getProductLicenses(product.id)) } catch { /**/ } }
  const loadTypeDetails = async () => {
    try {
      const d = await getProductDetails(product.id)
      const v = d?.details ?? DEFAULT_TYPE_DETAILS[product.product_type] ?? {}
      setTypeDetails(v)
      setTypeDetailsEdit({ ...v })
    } catch { /**/ }
  }

  // ── Save section helpers ───────────────────────────────────────
  const saveSection = async (patch: Partial<CatalogProductCreate>) => {
    setSaving(true)
    try {
      const updated = await updateProduct(product.id, patch)
      onUpdated(updated)
      alert('Đã lưu')
    } catch (e: unknown) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  const saveTypeDetails = async () => {
    setSaving(true)
    try {
      await upsertProductDetails(product.id, typeDetailsEdit)
      setTypeDetails({ ...typeDetailsEdit })
    } catch (e: unknown) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  // ── Env CRUD ───────────────────────────────────────────────────
  const handleAddEnv = async () => {
    setSaving(true)
    try { await createProductEnv(product.id, envForm); await loadEnvs(); setShowEnvForm(false) }
    catch (e: unknown) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleDeleteEnv = async (envId: string) => {
    if (!confirm('Xóa môi trường này?')) return
    try { await deleteProductEnv(product.id, envId); await loadEnvs() }
    catch (e: unknown) { alert((e as Error).message) }
  }

  // ── License CRUD ───────────────────────────────────────────────
  const handleAddLicense = async () => {
    if (!licForm.license_name.trim()) { alert('Vui lòng nhập tên license'); return }
    setSaving(true)
    try { await createProductLicense(product.id, licForm); await loadLicenses(); setShowLicForm(false) }
    catch (e: unknown) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleDeleteLicense = async (licId: string) => {
    if (!confirm('Xóa license này?')) return
    try { await deleteProductLicense(product.id, licId); await loadLicenses() }
    catch (e: unknown) { alert((e as Error).message) }
  }

  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' } as const

  return (
    <Modal
      title={`${typeIcon(product.product_type)} ${product.product_name} · ${product.product_code}`}
      open onClose={onClose} width="860px"
    >
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--vib-neutral-100)', marginBottom: 16, flexWrap: 'wrap' }}>
        {DETAIL_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '6px 12px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              fontSize: 12, fontWeight: tab === t.key ? 700 : 400, fontFamily: 'var(--font)',
              background: 'transparent',
              color: tab === t.key ? 'var(--vib-primary)' : 'var(--vib-neutral-600)',
              borderBottom: tab === t.key ? '2px solid var(--vib-primary)' : '2px solid transparent',
              marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Tổng quan ────────────────────────────────── */}
      {tab === 'overview' && (
        <div>
          <SectionTitle>🧾 Identification</SectionTitle>
          <div style={grid2}>
            <InfoRow label="Mã sản phẩm" value={<Badge variant="neutral">{product.product_code}</Badge>} />
            <InfoRow label="Loại" value={`${typeIcon(product.product_type)} ${typeLabel(product.product_type)}`} />
            <InfoRow label="Domain" value={product.domain} />
            <InfoRow label="Trạng thái" value={<Badge variant={statusVariant(product.status)}>{product.status}</Badge>} />
            <InfoRow label="Business Owner (PO)" value={product.business_owner} />
            <InfoRow label="Technical Owner" value={product.technical_owner} />
            <InfoRow label="Team phụ trách" value={product.owner_team} />
            <InfoRow label="Phòng ban" value={product.department} />
          </div>
          {product.description && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 4 }}>Mô tả nghiệp vụ</div>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>{product.description}</p>
            </div>
          )}
          {product.tags && product.tags.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 4 }}>Tags</div>
              <TagList items={product.tags} />
            </div>
          )}
          {product.notes && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 4 }}>Ghi chú</div>
              <p style={{ fontSize: 13, margin: 0, color: 'var(--vib-neutral-600)' }}>{product.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Kiến trúc ────────────────────────────────── */}
      {tab === 'architecture' && (
        <div>
          <SectionTitle>🏗️ Architecture</SectionTitle>
          <div style={grid2}>
            <div>
              <Lbl>Kiến trúc</Lbl>
              <select className="vib-input" value={archEdit.arch_type || ''}
                onChange={e => setArchEdit(f => ({ ...f, arch_type: e.target.value || undefined }))}>
                <option value="">— Chọn —</option>
                {ARCH_TYPES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Framework chính</Lbl>
              <input className="vib-input" value={archEdit.framework || ''}
                placeholder="FastAPI, Spring Boot, NestJS…"
                onChange={e => setArchEdit(f => ({ ...f, framework: e.target.value || undefined }))} />
            </div>
            <F full>
              <Lbl>Tech Stack (phân cách bằng dấu phẩy)</Lbl>
              <TagInput value={archEdit.tech_stack} onChange={v => setArchEdit(f => ({ ...f, tech_stack: v }))}
                placeholder="Python, Node.js, React, Go…" />
            </F>
            <F full>
              <Lbl>Dependency Systems</Lbl>
              <TagInput value={archEdit.dependency_systems} onChange={v => setArchEdit(f => ({ ...f, dependency_systems: v }))}
                placeholder="CoreBanking T24, CRM Salesforce…" />
            </F>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Btn size="sm" loading={saving} onClick={() => saveSection({ architecture_info: archEdit })}>Lưu Kiến trúc</Btn>
          </div>

          {/* Read-only preview */}
          <div style={{ marginTop: 16 }}>
            <SectionTitle>Preview</SectionTitle>
            <div style={grid2}>
              <InfoRow label="Kiến trúc" value={product.architecture_info?.arch_type} />
              <InfoRow label="Framework" value={product.architecture_info?.framework} />
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 4 }}>Tech Stack</div>
                <TagList items={(product.architecture_info?.tech_stack as string[]) || []} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 4 }}>Dependencies</div>
                <TagList items={(product.architecture_info?.dependency_systems as string[]) || []} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Môi trường ───────────────────────────────── */}
      {tab === 'environments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionTitle style={{ margin: 0 }}>🌐 Danh sách môi trường</SectionTitle>
            <Btn size="sm" onClick={() => setShowEnvForm(v => !v)}>+ Thêm</Btn>
          </div>

          {showEnvForm && (
            <div style={{ background: 'var(--vib-neutral-50)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <div style={grid2}>
                <div>
                  <Lbl required>Môi trường</Lbl>
                  <select className="vib-input" value={envForm.env_name}
                    onChange={e => setEnvForm(f => ({ ...f, env_name: e.target.value as ProductEnvCreate['env_name'] }))}>
                    {['DEV','SIT','UAT','STAGING','PROD','DR'].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>URL / Endpoint</Lbl>
                  <input className="vib-input" value={envForm.url || ''} placeholder="https://..."
                    onChange={e => setEnvForm(f => ({ ...f, url: e.target.value }))} />
                </div>
                <div>
                  <Lbl>Infra Type</Lbl>
                  <select className="vib-input" value={envForm.infra_type || ''}
                    onChange={e => setEnvForm(f => ({ ...f, infra_type: e.target.value || undefined }))}>
                    <option value="">— Chọn —</option>
                    {INFRA_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Region / Data Center</Lbl>
                  <input className="vib-input" value={envForm.region || ''} placeholder="HCM-DC1, AWS ap-southeast-1…"
                    onChange={e => setEnvForm(f => ({ ...f, region: e.target.value }))} />
                </div>
                <div>
                  <Lbl>Version</Lbl>
                  <input className="vib-input" value={envForm.version || ''}
                    onChange={e => setEnvForm(f => ({ ...f, version: e.target.value }))} />
                </div>
                <div>
                  <Lbl>Deploy date</Lbl>
                  <input className="vib-input" type="date" value={envForm.deploy_date || ''}
                    onChange={e => setEnvForm(f => ({ ...f, deploy_date: e.target.value }))} />
                </div>
                <F full>
                  <Lbl>Ghi chú</Lbl>
                  <input className="vib-input" value={envForm.notes || ''}
                    onChange={e => setEnvForm(f => ({ ...f, notes: e.target.value }))} />
                </F>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Btn size="sm" loading={saving} onClick={handleAddEnv}>Lưu</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setShowEnvForm(false)}>Hủy</Btn>
              </div>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--vib-neutral-50)' }}>
                {['Env','URL','Infra','Region','Version','Deploy','Status',''].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, color: 'var(--vib-neutral-500)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {envs.length === 0
                ? <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: 'var(--vib-neutral-400)' }}>Chưa có môi trường nào</td></tr>
                : envs.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--vib-neutral-100)' }}>
                    <td style={{ padding: '6px 8px' }}><Badge variant="info">{e.env_name}</Badge></td>
                    <td style={{ padding: '6px 8px' }}>
                      {e.url ? <a href={e.url} target="_blank" rel="noreferrer" style={{ color: 'var(--vib-primary)', fontSize: 11 }}>{e.url.replace(/https?:\/\//, '').slice(0, 35)}</a> : '—'}
                    </td>
                    <td style={{ padding: '6px 8px' }}>{e.infra_type || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.region || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.version || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.deploy_date?.slice(0, 10) || '—'}</td>
                    <td style={{ padding: '6px 8px' }}><Badge variant={statusVariant(e.status)}>{e.status}</Badge></td>
                    <td style={{ padding: '6px 8px' }}>
                      <button onClick={() => handleDeleteEnv(e.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vib-danger)', fontSize: 14 }}>🗑</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Deployment ───────────────────────────────── */}
      {tab === 'deployment' && (
        <div>
          <SectionTitle>🚀 Deployment Info</SectionTitle>
          <div style={grid2}>
            <F full>
              <Lbl>Git Repository URL</Lbl>
              <input className="vib-input" value={deployEdit.git_repo || ''} placeholder="https://dev.azure.com/..."
                onChange={e => setDeployEdit(f => ({ ...f, git_repo: e.target.value || undefined }))} />
            </F>
            <div>
              <Lbl>Branch Strategy</Lbl>
              <input className="vib-input" value={deployEdit.branch_strategy || ''} placeholder="GitFlow, trunk-based…"
                onChange={e => setDeployEdit(f => ({ ...f, branch_strategy: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>CI/CD Tool</Lbl>
              <select className="vib-input" value={deployEdit.cicd_tool || ''}
                onChange={e => setDeployEdit(f => ({ ...f, cicd_tool: e.target.value || undefined }))}>
                <option value="">— Chọn —</option>
                {CICD_TOOLS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Versioning Type</Lbl>
              <input className="vib-input" value={deployEdit.versioning_type || ''} placeholder="Semantic, build number…"
                onChange={e => setDeployEdit(f => ({ ...f, versioning_type: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>Deployment Method</Lbl>
              <select className="vib-input" value={deployEdit.deploy_method || ''}
                onChange={e => setDeployEdit(f => ({ ...f, deploy_method: e.target.value || undefined }))}>
                <option value="">— Chọn —</option>
                {DEPLOY_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn size="sm" loading={saving} onClick={() => saveSection({ deployment_info: deployEdit })}>Lưu Deployment</Btn>
          </div>
        </div>
      )}

      {/* ── Tab: Bảo mật ─────────────────────────────────── */}
      {tab === 'security' && (
        <div>
          <SectionTitle>🔐 Security</SectionTitle>
          <div style={grid2}>
            <div>
              <Lbl>Authentication Method</Lbl>
              <input className="vib-input" value={secEdit.auth_method || ''} placeholder="JWT, OAuth2, SAML…"
                onChange={e => setSecEdit(f => ({ ...f, auth_method: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>Authorization</Lbl>
              <input className="vib-input" value={secEdit.authorization || ''} placeholder="RBAC, ABAC…"
                onChange={e => setSecEdit(f => ({ ...f, authorization: e.target.value || undefined }))} />
            </div>
            <F full>
              <Lbl>Secrets Management</Lbl>
              <input className="vib-input" value={secEdit.secrets_management || ''} placeholder="HashiCorp Vault, AWS Secrets Manager…"
                onChange={e => setSecEdit(f => ({ ...f, secrets_management: e.target.value || undefined }))} />
            </F>
            <F full>
              <Lbl>Compliance Standards</Lbl>
              <TagInput value={secEdit.compliance} onChange={v => setSecEdit(f => ({ ...f, compliance: v }))}
                placeholder="PCI DSS, ISO 27001, SOX…" />
            </F>
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn size="sm" loading={saving} onClick={() => saveSection({ security_info: secEdit })}>Lưu Bảo mật</Btn>
          </div>
        </div>
      )}

      {/* ── Tab: Vận hành ─────────────────────────────────── */}
      {tab === 'operations' && (
        <div>
          <SectionTitle>📊 Monitoring & Logging</SectionTitle>
          <div style={grid2}>
            <div>
              <Lbl>Logging Tool</Lbl>
              <input className="vib-input" value={monEdit.logging_tool || ''} placeholder="ELK, Loki, Splunk…"
                onChange={e => setMonEdit(f => ({ ...f, logging_tool: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>Monitoring Tool</Lbl>
              <input className="vib-input" value={monEdit.monitoring_tool || ''} placeholder="Prometheus + Grafana…"
                onChange={e => setMonEdit(f => ({ ...f, monitoring_tool: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>Alerting</Lbl>
              <input className="vib-input" value={monEdit.alerting || ''} placeholder="Slack, Email, PagerDuty…"
                onChange={e => setMonEdit(f => ({ ...f, alerting: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>SLA Target</Lbl>
              <input className="vib-input" value={monEdit.sla_target || ''} placeholder="99.9%…"
                onChange={e => setMonEdit(f => ({ ...f, sla_target: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>SLO / SLI</Lbl>
              <input className="vib-input" value={monEdit.slo || ''} placeholder="p95 < 500ms…"
                onChange={e => setMonEdit(f => ({ ...f, slo: e.target.value || undefined }))} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn size="sm" loading={saving} onClick={() => saveSection({ monitoring_info: monEdit })}>Lưu Monitoring</Btn>
          </div>

          <div style={{ marginTop: 20 }}>
            <SectionTitle>📦 Resource & Scaling</SectionTitle>
            <div style={grid2}>
              <div>
                <Lbl>CPU Config</Lbl>
                <input className="vib-input" value={resEdit.cpu_config || ''} placeholder="2 vCPU…"
                  onChange={e => setResEdit(f => ({ ...f, cpu_config: e.target.value || undefined }))} />
              </div>
              <div>
                <Lbl>RAM Config</Lbl>
                <input className="vib-input" value={resEdit.ram_config || ''} placeholder="4 GB…"
                  onChange={e => setResEdit(f => ({ ...f, ram_config: e.target.value || undefined }))} />
              </div>
              <F full>
                <Lbl>Autoscaling Rules</Lbl>
                <input className="vib-input" value={resEdit.autoscaling_rules || ''} placeholder="Min 2, Max 10, CPU > 70%…"
                  onChange={e => setResEdit(f => ({ ...f, autoscaling_rules: e.target.value || undefined }))} />
              </F>
              <div>
                <Lbl>Throughput</Lbl>
                <input className="vib-input" value={resEdit.throughput || ''} placeholder="500 req/s, 1000 job/hour…"
                  onChange={e => setResEdit(f => ({ ...f, throughput: e.target.value || undefined }))} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn size="sm" loading={saving} onClick={() => saveSection({ resource_info: resEdit })}>Lưu Resources</Btn>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <SectionTitle>🧾 Business Metadata</SectionTitle>
            <div style={grid2}>
              <div>
                <Lbl>SLA Business</Lbl>
                <input className="vib-input" value={bizEdit.sla_business || ''} placeholder="99.9% uptime 8-22h weekdays…"
                  onChange={e => setBizEdit(f => ({ ...f, sla_business: e.target.value || undefined }))} />
              </div>
              <div>
                <Lbl>Critical Level</Lbl>
                <select className="vib-input" value={bizEdit.critical_level || ''}
                  onChange={e => setBizEdit(f => ({ ...f, critical_level: e.target.value || undefined }))}>
                  <option value="">— Chọn —</option>
                  {CRITICAL_LEVELS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <F full>
                <Lbl>Downtime Impact</Lbl>
                <textarea className="vib-input" rows={2} value={bizEdit.downtime_impact || ''}
                  placeholder="Mô tả tác động khi hệ thống ngừng hoạt động…"
                  onChange={e => setBizEdit(f => ({ ...f, downtime_impact: e.target.value || undefined }))} />
              </F>
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn size="sm" loading={saving} onClick={() => saveSection({ business_metadata: bizEdit })}>Lưu Business</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Chi tiết (type-specific) ─────────────────── */}
      {tab === 'type_details' && (
        <div>
          <SectionTitle>⚙️ Chi tiết kỹ thuật — {typeIcon(product.product_type)} {typeLabel(product.product_type)}</SectionTitle>

          {/* Web App */}
          {product.product_type === 'web_app' && (
            <div style={grid2}>
              <div><Lbl>Domain / DNS</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.domain_dns as string) || ''}
                  placeholder="app.vib.com.vn" onChange={e => setTypeDetailsEdit(d => ({ ...d, domain_dns: e.target.value }))} /></div>
              <div><Lbl>CDN</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.cdn as string) || ''}
                  placeholder="Cloudflare, AWS CloudFront…" onChange={e => setTypeDetailsEdit(d => ({ ...d, cdn: e.target.value }))} /></div>
              <F full><Lbl>Browser Support</Lbl>
                <TagInput value={(typeDetailsEdit.browser_support as string[]) || []}
                  onChange={v => setTypeDetailsEdit(d => ({ ...d, browser_support: v }))}
                  placeholder="Chrome, Firefox, Edge, Safari…" /></F>
              <div><Lbl>SEO Config</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.seo_config as string) || ''}
                  placeholder="Next.js SSR, SPA, SSG…" onChange={e => setTypeDetailsEdit(d => ({ ...d, seo_config: e.target.value }))} /></div>
              <div><Lbl>Static Assets Storage</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.static_assets_storage as string) || ''}
                  placeholder="S3, Azure Blob, CDN…" onChange={e => setTypeDetailsEdit(d => ({ ...d, static_assets_storage: e.target.value }))} /></div>
              <F full><Lbl>Session Management</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.session_management as string) || ''}
                  placeholder="Redis + JWT, Cookie-based…" onChange={e => setTypeDetailsEdit(d => ({ ...d, session_management: e.target.value }))} /></F>
            </div>
          )}

          {/* Mobile App */}
          {product.product_type === 'mobile' && (
            <div style={grid2}>
              <F full><Lbl>Platforms</Lbl>
                <TagInput value={(typeDetailsEdit.platforms as string[]) || []}
                  onChange={v => setTypeDetailsEdit(d => ({ ...d, platforms: v }))}
                  placeholder="iOS, Android" /></F>
              <div><Lbl>App Version (Store)</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.app_version as string) || ''}
                  placeholder="3.2.1" onChange={e => setTypeDetailsEdit(d => ({ ...d, app_version: e.target.value }))} /></div>
              <div><Lbl>Store Link Android</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.store_link_android as string) || ''}
                  placeholder="https://play.google.com/..." onChange={e => setTypeDetailsEdit(d => ({ ...d, store_link_android: e.target.value }))} /></div>
              <div><Lbl>Store Link iOS</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.store_link_ios as string) || ''}
                  placeholder="https://apps.apple.com/..." onChange={e => setTypeDetailsEdit(d => ({ ...d, store_link_ios: e.target.value }))} /></div>
              <div><Lbl>Build Pipeline</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.build_pipeline as string) || ''}
                  placeholder="Fastlane, Firebase App Distribution…" onChange={e => setTypeDetailsEdit(d => ({ ...d, build_pipeline: e.target.value }))} /></div>
              <div><Lbl>Push Notification</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.push_notification as string) || ''}
                  placeholder="FCM, APNS, OneSignal…" onChange={e => setTypeDetailsEdit(d => ({ ...d, push_notification: e.target.value }))} /></div>
              <div>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 20 }}>
                  <input type="checkbox" checked={!!(typeDetailsEdit.offline_capability)}
                    onChange={e => setTypeDetailsEdit(d => ({ ...d, offline_capability: e.target.checked }))} />
                  Offline Capability
                </label>
              </div>
            </div>
          )}

          {/* API Service */}
          {product.product_type === 'api' && (
            <div style={grid2}>
              <F full><Lbl>API Spec URL (OpenAPI/Swagger)</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.spec_url as string) || ''}
                  placeholder="https://api.vib.com.vn/docs" onChange={e => setTypeDetailsEdit(d => ({ ...d, spec_url: e.target.value }))} /></F>
              <F full><Lbl>Endpoints</Lbl>
                <TagInput value={(typeDetailsEdit.endpoints as string[]) || []}
                  onChange={v => setTypeDetailsEdit(d => ({ ...d, endpoints: v }))}
                  placeholder="/v1/accounts, /v1/transfers…" /></F>
              <div><Lbl>Rate Limit</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.rate_limit as string) || ''}
                  placeholder="100 req/min per user…" onChange={e => setTypeDetailsEdit(d => ({ ...d, rate_limit: e.target.value }))} /></div>
              <div><Lbl>Auth Type</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.auth_type as string) || ''}
                  placeholder="OAuth2, API Key, JWT…" onChange={e => setTypeDetailsEdit(d => ({ ...d, auth_type: e.target.value }))} /></div>
              <div><Lbl>API Version</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.api_version as string) || ''}
                  placeholder="v1, v2…" onChange={e => setTypeDetailsEdit(d => ({ ...d, api_version: e.target.value }))} /></div>
              <F full><Lbl>Backward Compatibility Rule</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.backward_compat_rule as string) || ''}
                  placeholder="Deprecated after 6 months…" onChange={e => setTypeDetailsEdit(d => ({ ...d, backward_compat_rule: e.target.value }))} /></F>
            </div>
          )}

          {/* ETL Pipeline */}
          {product.product_type === 'etl' && (
            <div style={grid2}>
              <F full><Lbl>Source Systems</Lbl>
                <TagInput value={(typeDetailsEdit.source_systems as string[]) || []}
                  onChange={v => setTypeDetailsEdit(d => ({ ...d, source_systems: v }))}
                  placeholder="Core Banking T24, CRM Salesforce…" /></F>
              <F full><Lbl>Target Systems (DWH / Data Lake)</Lbl>
                <TagInput value={(typeDetailsEdit.target_systems as string[]) || []}
                  onChange={v => setTypeDetailsEdit(d => ({ ...d, target_systems: v }))}
                  placeholder="DWH Teradata, Data Lake S3…" /></F>
              <F full><Lbl>Transformation Logic</Lbl>
                <textarea className="vib-input" rows={2} value={(typeDetailsEdit.transformation_logic as string) || ''}
                  placeholder="PySpark aggregations, dbt models…" onChange={e => setTypeDetailsEdit(d => ({ ...d, transformation_logic: e.target.value }))} /></F>
              <div><Lbl>Data Schema</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.data_schema as string) || ''}
                  placeholder="Star schema, Flat, ODS…" onChange={e => setTypeDetailsEdit(d => ({ ...d, data_schema: e.target.value }))} /></div>
              <div><Lbl>Schedule (cron hoặc "streaming")</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.schedule as string) || ''}
                  placeholder="0 2 * * * hoặc streaming" onChange={e => setTypeDetailsEdit(d => ({ ...d, schedule: e.target.value }))} /></div>
              <div><Lbl>Batch or Streaming</Lbl>
                <select className="vib-input" value={(typeDetailsEdit.batch_or_streaming as string) || 'batch'}
                  onChange={e => setTypeDetailsEdit(d => ({ ...d, batch_or_streaming: e.target.value }))}>
                  <option value="batch">Batch</option>
                  <option value="streaming">Streaming</option>
                  <option value="micro-batch">Micro-batch</option>
                </select>
              </div>
              <F full><Lbl>Data Quality Rules</Lbl>
                <TagInput value={(typeDetailsEdit.data_quality_rules as string[]) || []}
                  onChange={v => setTypeDetailsEdit(d => ({ ...d, data_quality_rules: v }))}
                  placeholder="No nulls in account_id, Amount > 0…" /></F>
              <F full><Lbl>Data Lineage</Lbl>
                <textarea className="vib-input" rows={2} value={(typeDetailsEdit.data_lineage as string) || ''}
                  placeholder="T24 → Staging → DWH → BI Reports…" onChange={e => setTypeDetailsEdit(d => ({ ...d, data_lineage: e.target.value }))} /></F>
            </div>
          )}

          {/* Job / Scheduler */}
          {product.product_type === 'job' && (
            <div style={grid2}>
              <div><Lbl>Job Type</Lbl>
                <select className="vib-input" value={(typeDetailsEdit.job_type as string) || 'cron'}
                  onChange={e => setTypeDetailsEdit(d => ({ ...d, job_type: e.target.value }))}>
                  <option value="cron">Cron</option>
                  <option value="event-driven">Event-driven</option>
                  <option value="manual">Manual / On-demand</option>
                </select>
              </div>
              <div><Lbl>Schedule (cron expression)</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.schedule_cron as string) || ''}
                  placeholder="*/5 * * * *" onChange={e => setTypeDetailsEdit(d => ({ ...d, schedule_cron: e.target.value }))} /></div>
              <F full><Lbl>Retry Policy</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.retry_policy as string) || ''}
                  placeholder="3 attempts, 5 min interval…" onChange={e => setTypeDetailsEdit(d => ({ ...d, retry_policy: e.target.value }))} /></F>
              <div><Lbl>Timeout (giây)</Lbl>
                <input className="vib-input" type="number" value={(typeDetailsEdit.timeout_seconds as number) || ''}
                  placeholder="3600" onChange={e => setTypeDetailsEdit(d => ({ ...d, timeout_seconds: Number(e.target.value) || undefined }))} /></div>
              <div><Lbl>Queue System</Lbl>
                <input className="vib-input" value={(typeDetailsEdit.queue_system as string) || ''}
                  placeholder="RabbitMQ, Kafka, SQS…" onChange={e => setTypeDetailsEdit(d => ({ ...d, queue_system: e.target.value }))} /></div>
              <div>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 20 }}>
                  <input type="checkbox" checked={!!(typeDetailsEdit.is_idempotent)}
                    onChange={e => setTypeDetailsEdit(d => ({ ...d, is_idempotent: e.target.checked }))} />
                  Idempotent (chạy nhiều lần = kết quả không đổi)
                </label>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <Btn size="sm" loading={saving} onClick={saveTypeDetails}>Lưu Chi tiết</Btn>
          </div>
        </div>
      )}

      {/* ── Tab: Licence ──────────────────────────────────── */}
      {tab === 'license' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionTitle style={{ margin: 0 }}>📦 Licence liên quan</SectionTitle>
            <Btn size="sm" onClick={() => setShowLicForm(v => !v)}>+ Thêm</Btn>
          </div>

          {showLicForm && (
            <div style={{ background: 'var(--vib-neutral-50)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <div style={grid2}>
                <F full><Lbl required>Tên License</Lbl>
                  <input className="vib-input" value={licForm.license_name}
                    onChange={e => setLicForm(f => ({ ...f, license_name: e.target.value }))} /></F>
                <div><Lbl>Loại</Lbl>
                  <select className="vib-input" value={licForm.license_type || 'commercial'}
                    onChange={e => setLicForm(f => ({ ...f, license_type: e.target.value }))}>
                    {['commercial','open_source','proprietary','subscription','free'].map(v => <option key={v}>{v}</option>)}
                  </select></div>
                <div><Lbl>Vendor</Lbl>
                  <input className="vib-input" value={licForm.vendor || ''}
                    onChange={e => setLicForm(f => ({ ...f, vendor: e.target.value }))} /></div>
                <div><Lbl>Số lượng</Lbl>
                  <input className="vib-input" type="number" value={licForm.quantity || ''}
                    onChange={e => setLicForm(f => ({ ...f, quantity: Number(e.target.value) || undefined }))} /></div>
                <div><Lbl>Ngày hết hạn</Lbl>
                  <input className="vib-input" type="date" value={licForm.expiry_date || ''}
                    onChange={e => setLicForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
                <div><Lbl>Chi phí</Lbl>
                  <input className="vib-input" type="number" value={licForm.cost_amount || ''}
                    onChange={e => setLicForm(f => ({ ...f, cost_amount: Number(e.target.value) || undefined }))} /></div>
                <div><Lbl>Compliance</Lbl>
                  <select className="vib-input" value={licForm.compliance_status || 'compliant'}
                    onChange={e => setLicForm(f => ({ ...f, compliance_status: e.target.value }))}>
                    {['compliant','non_compliant','pending_review'].map(v => <option key={v}>{v}</option>)}
                  </select></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Btn size="sm" loading={saving} onClick={handleAddLicense}>Lưu</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setShowLicForm(false)}>Hủy</Btn>
              </div>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--vib-neutral-50)' }}>
                {['Tên License','Loại','Vendor','Hết hạn','Chi phí','Compliance',''].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, color: 'var(--vib-neutral-500)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licenses.length === 0
                ? <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--vib-neutral-400)' }}>Chưa có license nào</td></tr>
                : licenses.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--vib-neutral-100)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{l.license_name}</td>
                    <td style={{ padding: '6px 8px' }}><Badge variant="neutral">{l.license_type}</Badge></td>
                    <td style={{ padding: '6px 8px' }}>{l.vendor || '—'}</td>
                    <td style={{ padding: '6px 8px', color: l.expiry_date && new Date(l.expiry_date) < new Date() ? 'var(--vib-danger)' : undefined }}>
                      {l.expiry_date || '—'}
                    </td>
                    <td style={{ padding: '6px 8px' }}>{l.cost_amount ? `${l.cost_amount.toLocaleString()} ${l.currency}` : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <Badge variant={l.compliance_status === 'compliant' ? 'success' : l.compliance_status === 'pending_review' ? 'warning' : 'danger'}>
                        {l.compliance_status}
                      </Badge>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <button onClick={() => handleDeleteLicense(l.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vib-danger)', fontSize: 14 }}>🗑</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════
// ProductForm — Create / Edit form (multi-section)
// ══════════════════════════════════════════════════════════════════

type FormSection = 'basic' | 'architecture' | 'deployment' | 'security' | 'operations'

function ProductForm({
  form,
  setForm,
  domains,
}: {
  form: CatalogProductCreate
  setForm: React.Dispatch<React.SetStateAction<CatalogProductCreate>>
  domains: CatalogDomain[]
}) {
  const [section, setSection] = useState<FormSection>('basic')

  const arch   = (form.architecture_info  ?? EMPTY_ARCH_INFO) as ArchitectureInfo
  const deploy = (form.deployment_info    ?? EMPTY_DEPLOY_INFO) as DeploymentInfo
  const sec    = (form.security_info      ?? EMPTY_SECURITY_INFO) as SecurityInfo
  const mon    = (form.monitoring_info    ?? EMPTY_MONITORING_INFO) as MonitoringInfo
  const res    = (form.resource_info      ?? EMPTY_RESOURCE_INFO) as ResourceInfo
  const biz    = (form.business_metadata  ?? EMPTY_BUSINESS_META) as BusinessMetadata

  const setArch   = (fn: (f: ArchitectureInfo) => ArchitectureInfo) => setForm(f => ({ ...f, architecture_info: fn(arch) }))
  const setDeploy = (fn: (f: DeploymentInfo) => DeploymentInfo)     => setForm(f => ({ ...f, deployment_info: fn(deploy) }))
  const setSec    = (fn: (f: SecurityInfo) => SecurityInfo)          => setForm(f => ({ ...f, security_info: fn(sec) }))
  const setMon    = (fn: (f: MonitoringInfo) => MonitoringInfo)      => setForm(f => ({ ...f, monitoring_info: fn(mon) }))
  const setRes    = (fn: (f: ResourceInfo) => ResourceInfo)          => setForm(f => ({ ...f, resource_info: fn(res) }))
  const setBiz    = (fn: (f: BusinessMetadata) => BusinessMetadata)  => setForm(f => ({ ...f, business_metadata: fn(biz) }))

  const SECTIONS: { key: FormSection; label: string }[] = [
    { key: 'basic',        label: '📋 Cơ bản' },
    { key: 'architecture', label: '🏗️ Kiến trúc' },
    { key: 'deployment',   label: '🚀 Deployment' },
    { key: 'security',     label: '🔐 Bảo mật' },
    { key: 'operations',   label: '📊 Vận hành' },
  ]

  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' } as const

  return (
    <div>
      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'var(--vib-neutral-100)', borderRadius: 20, padding: '3px 4px', flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            style={{
              padding: '4px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: section === s.key ? 700 : 400, fontFamily: 'var(--font)',
              background: section === s.key ? 'var(--vib-primary)' : 'transparent',
              color: section === s.key ? '#fff' : 'var(--vib-neutral-600)',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Section: Basic */}
      {section === 'basic' && (
        <div style={grid2}>
          <div>
            <Lbl required>Mã sản phẩm (auto UPPERCASE)</Lbl>
            <input className="vib-input" value={form.product_code}
              onChange={e => setForm(f => ({ ...f, product_code: e.target.value.toUpperCase() }))} />
          </div>
          <div>
            <Lbl required>Loại</Lbl>
            <select className="vib-input" value={form.product_type}
              onChange={e => setForm(f => ({ ...f, product_type: e.target.value as ProductType }))}>
              {PRODUCT_TYPES.filter(t => t.key !== 'all').map(t => (
                <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          <F full>
            <Lbl required>Tên sản phẩm / Tên hệ thống</Lbl>
            <input className="vib-input" value={form.product_name}
              onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} />
          </F>
          <F full>
            <Lbl>Mô tả nghiệp vụ</Lbl>
            <textarea className="vib-input" rows={2} value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </F>
          <div>
            <Lbl>Domain nghiệp vụ</Lbl>
            <select className="vib-input" value={form.domain_code || ''}
              onChange={e => setForm(f => ({ ...f, domain_code: e.target.value || undefined }))}>
              <option value="">— Chọn domain —</option>
              {domains.filter(d => d.is_active).map(d => (
                <option key={d.code} value={d.code}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Lbl>Trạng thái</Lbl>
            <select className="vib-input" value={form.status || 'active'}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as CatalogProductCreate['status'] }))}>
              {['active','planned','inactive','deprecated'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <Lbl>Business Owner (PO)</Lbl>
            <input className="vib-input" value={form.business_owner || ''}
              onChange={e => setForm(f => ({ ...f, business_owner: e.target.value }))} />
          </div>
          <div>
            <Lbl>Technical Owner</Lbl>
            <input className="vib-input" value={form.technical_owner || ''}
              onChange={e => setForm(f => ({ ...f, technical_owner: e.target.value }))} />
          </div>
          <div>
            <Lbl>Team phụ trách</Lbl>
            <input className="vib-input" value={form.owner_team || ''}
              onChange={e => setForm(f => ({ ...f, owner_team: e.target.value }))} />
          </div>
          <div>
            <Lbl>Phòng ban</Lbl>
            <input className="vib-input" value={form.department || ''}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          </div>
          <F full>
            <Lbl>Tags</Lbl>
            <TagInput value={form.tags || []} onChange={v => setForm(f => ({ ...f, tags: v }))} />
          </F>
          <F full>
            <Lbl>Ghi chú</Lbl>
            <textarea className="vib-input" rows={2} value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </F>
        </div>
      )}

      {/* Section: Architecture */}
      {section === 'architecture' && (
        <div style={grid2}>
          <div>
            <Lbl>Kiến trúc</Lbl>
            <select className="vib-input" value={arch.arch_type || ''}
              onChange={e => setArch(a => ({ ...a, arch_type: e.target.value || undefined }))}>
              <option value="">— Chọn —</option>
              {ARCH_TYPES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <Lbl>Framework</Lbl>
            <input className="vib-input" value={arch.framework || ''} placeholder="FastAPI, Spring Boot…"
              onChange={e => setArch(a => ({ ...a, framework: e.target.value || undefined }))} />
          </div>
          <F full>
            <Lbl>Tech Stack</Lbl>
            <TagInput value={arch.tech_stack} onChange={v => setArch(a => ({ ...a, tech_stack: v }))}
              placeholder="Python, Node.js, React, Java…" />
          </F>
          <F full>
            <Lbl>Dependency Systems</Lbl>
            <TagInput value={arch.dependency_systems} onChange={v => setArch(a => ({ ...a, dependency_systems: v }))}
              placeholder="Core Banking T24, CRM…" />
          </F>
        </div>
      )}

      {/* Section: Deployment */}
      {section === 'deployment' && (
        <div style={grid2}>
          <F full>
            <Lbl>Git Repository</Lbl>
            <input className="vib-input" value={deploy.git_repo || ''} placeholder="https://dev.azure.com/..."
              onChange={e => setDeploy(d => ({ ...d, git_repo: e.target.value || undefined }))} />
          </F>
          <div>
            <Lbl>Branch Strategy</Lbl>
            <input className="vib-input" value={deploy.branch_strategy || ''} placeholder="GitFlow…"
              onChange={e => setDeploy(d => ({ ...d, branch_strategy: e.target.value || undefined }))} />
          </div>
          <div>
            <Lbl>CI/CD Tool</Lbl>
            <select className="vib-input" value={deploy.cicd_tool || ''}
              onChange={e => setDeploy(d => ({ ...d, cicd_tool: e.target.value || undefined }))}>
              <option value="">— Chọn —</option>
              {CICD_TOOLS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Lbl>Versioning Type</Lbl>
            <input className="vib-input" value={deploy.versioning_type || ''} placeholder="Semantic v1.2.3…"
              onChange={e => setDeploy(d => ({ ...d, versioning_type: e.target.value || undefined }))} />
          </div>
          <div>
            <Lbl>Deploy Method</Lbl>
            <select className="vib-input" value={deploy.deploy_method || ''}
              onChange={e => setDeploy(d => ({ ...d, deploy_method: e.target.value || undefined }))}>
              <option value="">— Chọn —</option>
              {DEPLOY_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Section: Security */}
      {section === 'security' && (
        <div style={grid2}>
          <div>
            <Lbl>Auth Method</Lbl>
            <input className="vib-input" value={sec.auth_method || ''} placeholder="JWT, OAuth2, SAML…"
              onChange={e => setSec(s => ({ ...s, auth_method: e.target.value || undefined }))} />
          </div>
          <div>
            <Lbl>Authorization</Lbl>
            <input className="vib-input" value={sec.authorization || ''} placeholder="RBAC, ABAC…"
              onChange={e => setSec(s => ({ ...s, authorization: e.target.value || undefined }))} />
          </div>
          <F full>
            <Lbl>Secrets Management</Lbl>
            <input className="vib-input" value={sec.secrets_management || ''} placeholder="HashiCorp Vault…"
              onChange={e => setSec(s => ({ ...s, secrets_management: e.target.value || undefined }))} />
          </F>
          <F full>
            <Lbl>Compliance Standards</Lbl>
            <TagInput value={sec.compliance} onChange={v => setSec(s => ({ ...s, compliance: v }))}
              placeholder="PCI DSS, ISO 27001…" />
          </F>
        </div>
      )}

      {/* Section: Operations */}
      {section === 'operations' && (
        <div>
          <SectionTitle>📊 Monitoring</SectionTitle>
          <div style={grid2}>
            <div>
              <Lbl>Logging Tool</Lbl>
              <input className="vib-input" value={mon.logging_tool || ''} placeholder="ELK, Loki…"
                onChange={e => setMon(m => ({ ...m, logging_tool: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>Monitoring Tool</Lbl>
              <input className="vib-input" value={mon.monitoring_tool || ''} placeholder="Prometheus + Grafana…"
                onChange={e => setMon(m => ({ ...m, monitoring_tool: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>Alerting</Lbl>
              <input className="vib-input" value={mon.alerting || ''} placeholder="Slack, Email…"
                onChange={e => setMon(m => ({ ...m, alerting: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>SLA Target</Lbl>
              <input className="vib-input" value={mon.sla_target || ''} placeholder="99.9%…"
                onChange={e => setMon(m => ({ ...m, sla_target: e.target.value || undefined }))} />
            </div>
          </div>
          <SectionTitle>📦 Resources</SectionTitle>
          <div style={grid2}>
            <div>
              <Lbl>CPU</Lbl>
              <input className="vib-input" value={res.cpu_config || ''} placeholder="2 vCPU…"
                onChange={e => setRes(r => ({ ...r, cpu_config: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>RAM</Lbl>
              <input className="vib-input" value={res.ram_config || ''} placeholder="4 GB…"
                onChange={e => setRes(r => ({ ...r, ram_config: e.target.value || undefined }))} />
            </div>
            <div>
              <Lbl>Throughput</Lbl>
              <input className="vib-input" value={res.throughput || ''} placeholder="500 req/s…"
                onChange={e => setRes(r => ({ ...r, throughput: e.target.value || undefined }))} />
            </div>
          </div>
          <SectionTitle>🧾 Business</SectionTitle>
          <div style={grid2}>
            <div>
              <Lbl>Critical Level</Lbl>
              <select className="vib-input" value={biz.critical_level || ''}
                onChange={e => setBiz(b => ({ ...b, critical_level: e.target.value || undefined }))}>
                <option value="">— Chọn —</option>
                {CRITICAL_LEVELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Lbl>SLA Business</Lbl>
              <input className="vib-input" value={biz.sla_business || ''} placeholder="99.9% uptime…"
                onChange={e => setBiz(b => ({ ...b, sla_business: e.target.value || undefined }))} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ProductsTab
// ══════════════════════════════════════════════════════════════════

const EMPTY_FORM: CatalogProductCreate = {
  product_code: '', product_name: '', product_type: 'web_app',
  architecture_info: { ...EMPTY_ARCH_INFO },
  deployment_info:   { ...EMPTY_DEPLOY_INFO },
  security_info:     { ...EMPTY_SECURITY_INFO },
  monitoring_info:   { ...EMPTY_MONITORING_INFO },
  resource_info:     { ...EMPTY_RESOURCE_INFO },
  business_metadata: { ...EMPTY_BUSINESS_META },
}

function ProductsTab({ domains }: { domains: CatalogDomain[] }) {
  const [products, setProducts]   = useState<CatalogProduct[]>([])
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all')
  const [q, setQ]                 = useState('')
  const [fStatus, setFStatus]     = useState('')
  const [fFrom, setFFrom]         = useState('')
  const [fTo, setFTo]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState<CatalogProduct | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<CatalogProduct | null>(null)
  const [form, setForm]           = useState<CatalogProductCreate>({ ...EMPTY_FORM })
  const [saving, setSaving]       = useState(false)
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('list')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Parameters<typeof getProducts>[0] = {}
      if (typeFilter !== 'all') params.product_type = typeFilter
      if (q.trim()) params.q = q.trim()
      setProducts(await getProducts(params))
    } catch { /**/ } finally { setLoading(false) }
  }, [typeFilter, q])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, product_type: typeFilter !== 'all' ? typeFilter : 'web_app' })
    setShowForm(true)
  }

  const openEdit = (p: CatalogProduct) => {
    setEditTarget(p)
    setForm({
      product_code: p.product_code, product_name: p.product_name, product_type: p.product_type,
      description: p.description, domain_code: p.domain_code,
      business_owner: p.business_owner, technical_owner: p.technical_owner,
      owner_team: p.owner_team, department: p.department,
      status: p.status, tags: p.tags, notes: p.notes,
      architecture_info: { ...EMPTY_ARCH_INFO, ...p.architecture_info },
      deployment_info:   { ...EMPTY_DEPLOY_INFO, ...p.deployment_info },
      security_info:     { ...EMPTY_SECURITY_INFO, ...p.security_info },
      monitoring_info:   { ...EMPTY_MONITORING_INFO, ...p.monitoring_info },
      resource_info:     { ...EMPTY_RESOURCE_INFO, ...p.resource_info },
      business_metadata: { ...EMPTY_BUSINESS_META, ...p.business_metadata },
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.product_code.trim() || !form.product_name.trim()) { alert('Mã và tên sản phẩm là bắt buộc'); return }
    setSaving(true)
    try {
      if (editTarget) await updateProduct(editTarget.id, form)
      else await createProduct(form)
      setShowForm(false); await load()
    } catch (e: unknown) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (p: CatalogProduct) => {
    if (!confirm(`Đánh dấu deprecated: ${p.product_name}?`)) return
    try { await deleteProduct(p.id); await load() }
    catch (e: unknown) { alert((e as Error).message) }
  }

  const handleUpdated = (updated: CatalogProduct) => {
    setSelected(updated)
    setProducts(ps => ps.map(p => p.id === updated.id ? updated : p))
  }

  const displayed = (() => {
    let rows = products
    if (fStatus) rows = rows.filter(p => p.status === fStatus)
    rows = applyDateFilter(rows, 'created_at', fFrom, fTo)
    return rows
  })()

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 0, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--vib-neutral-100)', padding: '3px 5px', borderRadius: 20 }}>
          {PRODUCT_TYPES.map(t => (
            <button key={t.key} onClick={() => setTypeFilter(t.key)}
              style={{
                padding: '3px 10px', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
                background: typeFilter === t.key ? 'var(--vib-primary)' : 'transparent',
                color: typeFilter === t.key ? '#fff' : 'var(--vib-neutral-600)',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <input className="vib-input" style={{ width: 200, flexShrink: 0 }}
          placeholder="Tìm tên, mã…" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <div style={{ flex: 1 }} />
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--vib-neutral-100)', padding: '3px 4px', borderRadius: 8 }}>
          {([['grid', '⊞'], ['list', '☰']] as const).map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              title={mode === 'grid' ? 'Dạng thẻ' : 'Dạng bảng'}
              style={{
                padding: '4px 10px', border: 'none', cursor: 'pointer', borderRadius: 6,
                fontSize: 15, fontFamily: 'var(--font)',
                background: viewMode === mode ? '#fff' : 'transparent',
                color: viewMode === mode ? 'var(--vib-primary)' : 'var(--vib-neutral-500)',
                boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s',
              }}>
              {icon}
            </button>
          ))}
        </div>
        <Btn size="sm" onClick={openCreate}>+ Thêm sản phẩm</Btn>
      </div>

      {/* Filter inner header */}
      <FilterBar
        selects={[
          {
            key: 'status', value: fStatus, onChange: setFStatus,
            placeholder: 'Tất cả trạng thái',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'planned', label: 'Planned' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'deprecated', label: 'Deprecated' },
            ],
          },
        ]}
        dateFrom={{ value: fFrom, onChange: setFFrom, label: 'Tạo từ' }}
        dateTo={{ value: fTo, onChange: setFTo }}
        onClear={() => { setFStatus(''); setFFrom(''); setFTo('') }}
        right={<span style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>{displayed.length}/{products.length} sản phẩm</span>}
      />

      {/* Product list */}
      {loading
        ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--vib-neutral-400)' }}>Đang tải…</div>
        : displayed.length === 0
          ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--vib-neutral-400)' }}>
              {products.length === 0 ? 'Chưa có sản phẩm nào' : 'Không có sản phẩm nào khớp với bộ lọc'}
            </div>
          : viewMode === 'grid'
            ? (
              /* ── Grid view ── */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {displayed.map(p => (
                  <div key={p.id} onClick={() => setSelected(p)}
                    style={{ background: '#fff', border: '1px solid var(--vib-neutral-200)', borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <span style={{ fontSize: 16 }}>{typeIcon(p.product_type)}</span>{' '}
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{p.product_name}</span>
                      </div>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Badge variant="neutral">{p.product_code}</Badge>
                      <Badge variant="info">{typeLabel(p.product_type)}</Badge>
                      {p.domain_code && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: domainBgColor(p.domain_code), color: domainFgColor(p.domain_code),
                          border: `1px solid ${domainFgColor(p.domain_code)}40` }}>
                          {p.domain_name ?? p.domain_code}
                        </span>
                      )}
                    </div>

                    {p.description && (
                      <div style={{ fontSize: 12, color: 'var(--vib-neutral-600)', marginBottom: 6, lineHeight: 1.4,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {p.description}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                      {p.architecture_info?.arch_type && (
                        <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0284c7', padding: '1px 7px', borderRadius: 8 }}>
                          {p.architecture_info.arch_type}
                        </span>
                      )}
                      {p.business_metadata?.critical_level && (
                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', padding: '1px 7px', borderRadius: 8 }}>
                          {p.business_metadata.critical_level}
                        </span>
                      )}
                      {(p.architecture_info?.tech_stack as string[] | undefined)?.slice(0, 3).map((s, i) => (
                        <span key={i} style={{ fontSize: 10, background: 'var(--vib-neutral-100)', color: 'var(--vib-neutral-700)', padding: '1px 7px', borderRadius: 8 }}>{s}</span>
                      ))}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', display: 'flex', gap: 12 }}>
                      {p.business_owner && <span>👤 {p.business_owner}</span>}
                      {p.owner_team     && <span>🏷 {p.owner_team}</span>}
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                      <Btn size="sm" variant="ghost" onClick={() => openEdit(p)}>Sửa</Btn>
                      <Btn size="sm" variant="danger" onClick={() => handleDelete(p)}>Xóa</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )
            : (
              /* ── List view ── */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--vib-neutral-50)', borderBottom: '2px solid var(--vib-neutral-200)' }}>
                    {['Mã', 'Tên sản phẩm', 'Loại', 'Domain', 'Tech Stack', 'Owner', 'Trạng thái', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--vib-neutral-500)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(p => (
                    <tr key={p.id}
                      onClick={() => setSelected(p)}
                      style={{ borderBottom: '1px solid var(--vib-neutral-100)', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--vib-neutral-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '9px 12px' }}>
                        <Badge variant="neutral">{p.product_code}</Badge>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 600, minWidth: 180 }}>
                        <span style={{ marginRight: 6 }}>{typeIcon(p.product_type)}</span>{p.product_name}
                        {p.description && (
                          <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--vib-neutral-500)', marginTop: 2,
                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <Badge variant="info">{typeLabel(p.product_type)}</Badge>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        {p.domain_code
                          ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                              background: domainBgColor(p.domain_code), color: domainFgColor(p.domain_code),
                              border: `1px solid ${domainFgColor(p.domain_code)}40`, whiteSpace: 'nowrap' }}>
                              {p.domain_name ?? p.domain_code}
                            </span>
                          : <span style={{ color: 'var(--vib-neutral-400)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '9px 12px', maxWidth: 200 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {p.architecture_info?.arch_type && (
                            <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0284c7', padding: '1px 7px', borderRadius: 8 }}>
                              {p.architecture_info.arch_type}
                            </span>
                          )}
                          {(p.architecture_info?.tech_stack as string[] | undefined)?.slice(0, 3).map((s, i) => (
                            <span key={i} style={{ fontSize: 10, background: 'var(--vib-neutral-100)', color: 'var(--vib-neutral-700)', padding: '1px 7px', borderRadius: 8 }}>{s}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 12 }}>
                        <div style={{ color: 'var(--vib-neutral-700)' }}>{p.business_owner || '—'}</div>
                        {p.owner_team && <div style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>{p.owner_team}</div>}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                        {p.business_metadata?.critical_level && (
                          <div style={{ marginTop: 3 }}>
                            <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', padding: '1px 7px', borderRadius: 8 }}>
                              {p.business_metadata.critical_level}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <Btn size="sm" variant="ghost" onClick={() => openEdit(p)}>Sửa</Btn>
                        <Btn size="sm" variant="danger" onClick={() => handleDelete(p)}>Xóa</Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
      }

      {/* Create / Edit Modal */}
      <Modal
        title={editTarget ? `Sửa: ${editTarget.product_name}` : 'Thêm sản phẩm mới'}
        open={showForm} onClose={() => setShowForm(false)} width="720px"
      >
        <ProductForm form={form} setForm={setForm} domains={domains} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, borderTop: '1px solid var(--vib-neutral-100)', paddingTop: 16 }}>
          <Btn variant="ghost" onClick={() => setShowForm(false)}>Hủy</Btn>
          <Btn loading={saving} onClick={handleSave}>
            {editTarget ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Btn>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <ProductDetailModal
          product={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// UsersTab — unchanged logic, keep existing
// ══════════════════════════════════════════════════════════════════

function UsersTab({ roles, domains }: { roles: CatalogRole[]; domains: CatalogDomain[] }) {
  const [users, setUsers]         = useState<CatalogUser[]>([])
  const [typeFilter, setTypeFilter] = useState<UserType | 'all'>('all')
  const [q, setQ]                 = useState('')
  const [loading, setLoading]     = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<CatalogUser | null>(null)
  const [form, setForm]           = useState<CatalogUserCreate>({ full_name: '', email: '' })
  const [saving, setSaving]       = useState(false)
  const [assignUserId, setAssignUserId] = useState<string | null>(null)
  const [assignRoleId, setAssignRoleId] = useState('')
  // domain assign state
  const [assignDomainUserId, setAssignDomainUserId] = useState<string | null>(null)
  const [assignDomainCode, setAssignDomainCode]     = useState('')
  const [assignDomainRole, setAssignDomainRole]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Parameters<typeof getCatalogUsers>[0] = {}
      if (typeFilter !== 'all') params.user_type = typeFilter
      if (q.trim()) params.q = q.trim()
      setUsers(await getCatalogUsers(params))
    } catch { /**/ } finally { setLoading(false) }
  }, [typeFilter, q])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditTarget(null); setForm({ full_name: '', email: '', user_type: 'internal' }); setShowForm(true) }
  const openEdit   = (u: CatalogUser) => {
    setEditTarget(u)
    setForm({ employee_id: u.employee_id, full_name: u.full_name, email: u.email,
      phone: u.phone, user_type: u.user_type, department: u.department,
      position: u.position, team: u.team, location: u.location, status: u.status,
      start_date: u.start_date, end_date: u.end_date, skills: u.skills, notes: u.notes })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { alert('Họ tên và email là bắt buộc'); return }
    setSaving(true)
    try {
      if (editTarget) await updateCatalogUser(editTarget.id, form)
      else await createCatalogUser(form)
      setShowForm(false); await load()
    } catch (e: unknown) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (u: CatalogUser) => {
    if (!confirm(`Chuyển trạng thái terminated: ${u.full_name}?`)) return
    try { await deleteCatalogUser(u.id); await load() }
    catch (e: unknown) { alert((e as Error).message) }
  }

  const handleAssignRole = async (userId: string) => {
    if (!assignRoleId) { alert('Chọn vai trò'); return }
    try { await assignUserRole(userId, { role_id: assignRoleId, scope_type: 'global' }); setAssignUserId(null); setAssignRoleId(''); await load() }
    catch (e: unknown) { alert((e as Error).message) }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    if (!confirm('Bỏ vai trò này?')) return
    try { await removeUserRole(userId, roleId); await load() }
    catch (e: unknown) { alert((e as Error).message) }
  }

  const handleAssignDomain = async (userId: string) => {
    if (!assignDomainCode) { alert('Chọn domain'); return }
    try {
      await assignUserDomain(userId, {
        domain_code: assignDomainCode,
        role_in_domain: assignDomainRole || undefined,
      } as UserDomainAssign)
      setAssignDomainUserId(null); setAssignDomainCode(''); setAssignDomainRole('')
      await load()
    } catch (e: unknown) { alert((e as Error).message) }
  }

  const handleRemoveDomain = async (userId: string, domainCode: string) => {
    if (!confirm('Gỡ domain này?')) return
    try { await removeUserDomain(userId, domainCode); await load() }
    catch (e: unknown) { alert((e as Error).message) }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--vib-neutral-100)', padding: '3px 5px', borderRadius: 20 }}>
          {USER_TYPES.map(t => (
            <button key={t.key} onClick={() => setTypeFilter(t.key)}
              style={{ padding: '3px 10px', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
                background: typeFilter === t.key ? 'var(--vib-primary)' : 'transparent',
                color: typeFilter === t.key ? '#fff' : 'var(--vib-neutral-600)' }}>
              {t.label}
            </button>
          ))}
        </div>
        <input className="vib-input" style={{ width: 220, flexShrink: 0 }}
          placeholder="Tìm tên, email, mã NV…" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <div style={{ flex: 1 }} />
        <Btn size="sm" onClick={openCreate}>+ Thêm nhân sự</Btn>
      </div>

      {loading
        ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--vib-neutral-400)' }}>Đang tải…</div>
        : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--vib-neutral-50)' }}>
                {['Mã NV','Họ tên','Email','Loại','Phòng ban / Team','Chức danh','Trạng thái','Vai trò','Domain phụ trách',''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: 'var(--vib-neutral-500)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0
                ? <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--vib-neutral-400)' }}>Chưa có nhân sự nào</td></tr>
                : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--vib-neutral-100)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--vib-neutral-500)', fontSize: 11 }}>{u.employee_id || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{u.full_name}</td>
                    <td style={{ padding: '8px 10px' }}><a href={`mailto:${u.email}`} style={{ color: 'var(--vib-primary)' }}>{u.email}</a></td>
                    <td style={{ padding: '8px 10px' }}><Badge variant={u.user_type === 'internal' ? 'primary' : 'info'}>{u.user_type}</Badge></td>
                    <td style={{ padding: '8px 10px' }}>{[u.department, u.team].filter(Boolean).join(' / ') || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{u.position || '—'}</td>
                    <td style={{ padding: '8px 10px' }}><Badge variant={statusVariant(u.status)}>{u.status}</Badge></td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {u.roles.map(r => (
                          <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'var(--vib-neutral-100)', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>
                            {r.role_code}
                            <button onClick={() => handleRemoveRole(u.id, r.role_id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vib-neutral-400)', padding: 0, fontSize: 11 }}>×</button>
                          </span>
                        ))}
                        {assignUserId === u.id ? (
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            <select className="vib-input" style={{ fontSize: 11, padding: '2px 6px', height: 22 }}
                              value={assignRoleId} onChange={e => setAssignRoleId(e.target.value)}>
                              <option value="">Chọn vai trò</option>
                              {roles.filter(r => r.is_active).map(r => <option key={r.id} value={r.id}>{r.role_code}</option>)}
                            </select>
                            <button onClick={() => handleAssignRole(u.id)}
                              style={{ background: 'var(--vib-success)', color: '#fff', border: 'none', borderRadius: 4, padding: '0 6px', cursor: 'pointer', fontSize: 11 }}>✓</button>
                            <button onClick={() => setAssignUserId(null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>✕</button>
                          </span>
                        ) : (
                          <button onClick={() => { setAssignUserId(u.id); setAssignRoleId('') }}
                            style={{ background: 'none', border: '1px dashed var(--vib-neutral-300)', borderRadius: 10, padding: '1px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--vib-neutral-500)' }}>
                            + Role
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(u.domains ?? []).map(d => (
                          <span key={d.domain_code} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: '#e0f2fe', color: '#0369a1', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: d.is_primary ? 700 : 400 }}>
                            {d.is_primary ? '⭐' : ''}{d.domain_code}
                            {d.role_in_domain ? <span style={{ opacity: 0.7, marginLeft: 2 }}>· {d.role_in_domain}</span> : null}
                            <button onClick={() => handleRemoveDomain(u.id, d.domain_code)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, fontSize: 11, marginLeft: 2 }}>×</button>
                          </span>
                        ))}
                        {assignDomainUserId === u.id ? (
                          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                            <select className="vib-input" style={{ fontSize: 11, padding: '2px 6px', height: 22 }}
                              value={assignDomainCode} onChange={e => setAssignDomainCode(e.target.value)}>
                              <option value="">Domain</option>
                              {domains.filter(d => d.is_active && !(u.domains ?? []).some(ud => ud.domain_code === d.code))
                                .map(d => <option key={d.code} value={d.code}>{d.code} – {d.name}</option>)}
                            </select>
                            <select className="vib-input" style={{ fontSize: 11, padding: '2px 6px', height: 22 }}
                              value={assignDomainRole} onChange={e => setAssignDomainRole(e.target.value)}>
                              <option value="">Vai trò</option>
                              {DOMAIN_ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <button onClick={() => handleAssignDomain(u.id)}
                              style={{ background: 'var(--vib-success)', color: '#fff', border: 'none', borderRadius: 4, padding: '0 6px', cursor: 'pointer', fontSize: 11 }}>✓</button>
                            <button onClick={() => setAssignDomainUserId(null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>✕</button>
                          </span>
                        ) : (
                          <button onClick={() => { setAssignDomainUserId(u.id); setAssignDomainCode(''); setAssignDomainRole('') }}
                            style={{ background: 'none', border: '1px dashed #93c5fd', borderRadius: 10, padding: '1px 8px', cursor: 'pointer', fontSize: 11, color: '#3b82f6' }}>
                            + Domain
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <Btn size="sm" variant="ghost" onClick={() => openEdit(u)}>✏️</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => handleDelete(u)}>🗑</Btn>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )
      }

      <Modal title={editTarget ? `Sửa: ${editTarget.full_name}` : 'Thêm nhân sự'} open={showForm} onClose={() => setShowForm(false)} width="640px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          <div><Lbl>Mã nhân viên</Lbl><input className="vib-input" value={form.employee_id || ''} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} /></div>
          <div><Lbl>Loại *</Lbl>
            <select className="vib-input" value={form.user_type || 'internal'} onChange={e => setForm(f => ({ ...f, user_type: e.target.value as UserType }))}>
              {['internal','external','contractor','vendor'].map(v => <option key={v}>{v}</option>)}
            </select></div>
          <F full><Lbl>Họ tên *</Lbl><input className="vib-input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></F>
          <div><Lbl>Email *</Lbl><input className="vib-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><Lbl>Điện thoại</Lbl><input className="vib-input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><Lbl>Phòng ban</Lbl><input className="vib-input" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
          <div><Lbl>Team</Lbl><input className="vib-input" value={form.team || ''} onChange={e => setForm(f => ({ ...f, team: e.target.value }))} /></div>
          <div><Lbl>Chức danh</Lbl><input className="vib-input" value={form.position || ''} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} /></div>
          <div><Lbl>Địa điểm</Lbl><input className="vib-input" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
          <div><Lbl>Trạng thái</Lbl>
            <select className="vib-input" value={form.status || 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value as CatalogUserCreate['status'] }))}>
              {['active','inactive','on_leave','terminated'].map(v => <option key={v}>{v}</option>)}
            </select></div>
          <div><Lbl>Ngày bắt đầu</Lbl><input className="vib-input" type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
          <div><Lbl>Ngày kết thúc</Lbl><input className="vib-input" type="date" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          <F full><Lbl>Kỹ năng</Lbl><TagInput value={form.skills || []} onChange={v => setForm(f => ({ ...f, skills: v }))} /></F>
          <F full><Lbl>Ghi chú</Lbl><textarea className="vib-input" rows={2} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></F>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setShowForm(false)}>Hủy</Btn>
          <Btn loading={saving} onClick={handleSave}>Lưu</Btn>
        </div>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// RolesTab
// ══════════════════════════════════════════════════════════════════

function RolesTab({ roles, onReload }: { roles: CatalogRole[]; onReload: () => void }) {
  const [showForm, setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<CatalogRole | null>(null)
  const [form, setForm]           = useState<CatalogRoleCreate>({ role_code: '', role_name: '' })
  const [saving, setSaving]       = useState(false)
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('list')

  const openCreate = () => { setEditTarget(null); setForm({ role_code: '', role_name: '', role_category: 'business', product_access_level: 'read' }); setShowForm(true) }
  const openEdit   = (r: CatalogRole) => {
    setEditTarget(r)
    setForm({ role_code: r.role_code, role_name: r.role_name, role_category: r.role_category,
      description: r.description, product_access_level: r.product_access_level, is_active: r.is_active })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.role_code.trim() || !form.role_name.trim()) { alert('Mã và tên vai trò là bắt buộc'); return }
    setSaving(true)
    try {
      if (editTarget) await updateCatalogRole(editTarget.id, form)
      else await createCatalogRole(form)
      setShowForm(false); onReload()
    } catch (e: unknown) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (r: CatalogRole) => {
    if (!confirm(`Deactivate vai trò: ${r.role_name}?`)) return
    try { await deleteCatalogRole(r.id); onReload() }
    catch (e: unknown) { alert((e as Error).message) }
  }

  const categoryColors: Record<string, string> = {
    system: '#6366f1', business: '#f59e0b', technical: '#0ea5e9', management: '#10b981',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--vib-neutral-100)', padding: '3px 4px', borderRadius: 8 }}>
          {([['grid', '⊞'], ['list', '☰']] as const).map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              title={mode === 'grid' ? 'Dạng thẻ' : 'Dạng bảng'}
              style={{
                padding: '4px 10px', border: 'none', cursor: 'pointer', borderRadius: 6,
                fontSize: 15, fontFamily: 'var(--font)',
                background: viewMode === mode ? '#fff' : 'transparent',
                color: viewMode === mode ? 'var(--vib-primary)' : 'var(--vib-neutral-500)',
                boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s',
              }}>
              {icon}
            </button>
          ))}
        </div>
        <Btn size="sm" onClick={openCreate}>+ Thêm vai trò</Btn>
      </div>

      {viewMode === 'grid' ? (
        /* ── Grid view ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {roles.map(r => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid var(--vib-neutral-200)', borderRadius: 10, padding: 14, opacity: r.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{r.role_name}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--vib-neutral-100)', borderRadius: 8, padding: '2px 8px', color: 'var(--vib-neutral-600)' }}>{r.role_code}</span>
                </div>
                <Badge variant={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'active' : 'inactive'}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, background: categoryColors[r.role_category] + '22', color: categoryColors[r.role_category], borderRadius: 8, padding: '2px 8px', fontWeight: 600 }}>
                  {ROLE_CATEGORY_LABELS[r.role_category]}
                </span>
                <Badge variant={ACCESS_LEVEL_VARIANT[r.product_access_level] ?? 'neutral'}>{r.product_access_level}</Badge>
              </div>
              {r.description && <div style={{ fontSize: 12, color: 'var(--vib-neutral-600)', marginBottom: 8, lineHeight: 1.4 }}>{r.description}</div>}
              {Object.keys(r.workflow_permissions).length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: 8 }}>
                  {Object.entries(r.workflow_permissions).map(([k, v]) => (
                    <div key={k}><b>{k}:</b> {Array.isArray(v) ? v.join(', ') : String(v)}</div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
                <Btn size="sm" variant="ghost" onClick={() => openEdit(r)}>Sửa</Btn>
                <Btn size="sm" variant="danger" onClick={() => handleDelete(r)}>Deactivate</Btn>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── List view ── */
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--vib-neutral-50)', borderBottom: '2px solid var(--vib-neutral-200)' }}>
              {['Mã vai trò', 'Tên vai trò', 'Phân loại', 'Quyền Product', 'Mô tả', 'Trạng thái', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--vib-neutral-500)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id}
                style={{ borderBottom: '1px solid var(--vib-neutral-100)', opacity: r.is_active ? 1 : 0.55, transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--vib-neutral-50)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: categoryColors[r.role_category] + '22', color: categoryColors[r.role_category], padding: '3px 9px', borderRadius: 6 }}>
                    {r.role_code}
                  </span>
                </td>
                <td style={{ padding: '9px 12px', fontWeight: 600 }}>{r.role_name}</td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 11, background: categoryColors[r.role_category] + '22', color: categoryColors[r.role_category], padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                    {ROLE_CATEGORY_LABELS[r.role_category]}
                  </span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <Badge variant={ACCESS_LEVEL_VARIANT[r.product_access_level] ?? 'neutral'}>{r.product_access_level}</Badge>
                </td>
                <td style={{ padding: '9px 12px', color: 'var(--vib-neutral-500)', fontSize: 12, maxWidth: 280 }}>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.description || '—'}
                  </span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <Badge variant={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'active' : 'inactive'}</Badge>
                </td>
                <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                  <Btn size="sm" variant="ghost" onClick={() => openEdit(r)}>Sửa</Btn>
                  <Btn size="sm" variant="danger" onClick={() => handleDelete(r)}>Deactivate</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal title={editTarget ? `Sửa: ${editTarget.role_name}` : 'Thêm vai trò mới'} open={showForm} onClose={() => setShowForm(false)} width="560px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          <div><Lbl>Mã vai trò * (UPPERCASE)</Lbl><input className="vib-input" value={form.role_code} onChange={e => setForm(f => ({ ...f, role_code: e.target.value.toUpperCase() }))} /></div>
          <div><Lbl>Phân loại</Lbl>
            <select className="vib-input" value={form.role_category || 'business'} onChange={e => setForm(f => ({ ...f, role_category: e.target.value as CatalogRoleCreate['role_category'] }))}>
              {['system','business','technical','management'].map(v => <option key={v}>{v}</option>)}
            </select></div>
          <F full><Lbl>Tên vai trò *</Lbl><input className="vib-input" value={form.role_name} onChange={e => setForm(f => ({ ...f, role_name: e.target.value }))} /></F>
          <F full><Lbl>Mô tả</Lbl><textarea className="vib-input" rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></F>
          <div><Lbl>Quyền truy cập Product</Lbl>
            <select className="vib-input" value={form.product_access_level || 'read'} onChange={e => setForm(f => ({ ...f, product_access_level: e.target.value as CatalogRoleCreate['product_access_level'] }))}>
              {['none','read','write','admin'].map(v => <option key={v}>{v}</option>)}
            </select></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 4 }}>
            <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active !== false} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Đang hoạt động
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setShowForm(false)}>Hủy</Btn>
          <Btn loading={saving} onClick={handleSave}>Lưu</Btn>
        </div>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// DomainsTab — quản lý danh mục domain + nhân sự phụ trách
// ══════════════════════════════════════════════════════════════════

const DOMAIN_ROLE_OPTIONS = [
  'Domain Lead', 'BA Lead', 'Tech Lead', 'QA Lead', 'PM', 'PO',
  'DevOps Lead', 'Security Lead', 'Data Lead', 'Khác',
]

function DomainsTab({ allUsers }: { allUsers: CatalogUser[] }) {
  const [domains, setDomains]       = useState<CatalogDomain[]>([])
  const [loading, setLoading]       = useState(false)
  const [selected, setSelected]     = useState<CatalogDomain | null>(null)
  const [editDomain, setEditDomain] = useState<CatalogDomain | null>(null)
  const [editForm, setEditForm]     = useState({ code: '', name: '', description: '' })
  const [saving, setSaving]         = useState(false)
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('list')
  // inline assign state per domain detail modal
  const [assignUserId, setAssignUserId]   = useState('')
  const [assignRole, setAssignRole]       = useState('')
  const [assignPrimary, setAssignPrimary] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setDomains(await getCatalogDomains()) }
    catch { /**/ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openDetail = (d: CatalogDomain) => {
    setSelected(d)
    setAssignUserId(''); setAssignRole(''); setAssignPrimary(false)
  }

  const openEdit = (d: CatalogDomain, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditDomain(d)
    setEditForm({ code: d.code, name: d.name, description: d.description || '' })
  }

  const handleSaveEdit = async () => {
    if (!editDomain) return
    if (!editForm.code.trim()) { alert('Mã domain không được để trống'); return }
    setSaving(true)
    try {
      const updated = await updateCatalogDomain(editDomain.code, {
        code: editForm.code.toUpperCase().trim() !== editDomain.code ? editForm.code.toUpperCase().trim() : undefined,
        name: editForm.name || undefined,
        description: editForm.description || undefined,
      })
      await load()
      // Nếu code thay đổi, sync lại selected
      if (selected?.code === editDomain.code) setSelected(updated)
      setEditDomain(null)
    } catch (e: unknown) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleAssignUser = async () => {
    if (!selected || !assignUserId) { alert('Chọn nhân sự'); return }
    try {
      await assignUserDomain(assignUserId, {
        domain_code: selected.code,
        role_in_domain: assignRole || undefined,
        is_primary: assignPrimary,
      } as UserDomainAssign)
      const refreshed = await getCatalogDomains()
      setDomains(refreshed)
      setSelected(refreshed.find(d => d.code === selected.code) ?? null)
      setAssignUserId(''); setAssignRole(''); setAssignPrimary(false)
    } catch (e: unknown) { alert((e as Error).message) }
  }

  const handleRemoveUser = async (domainCode: string, userId: string) => {
    if (!confirm('Gỡ nhân sự khỏi domain này?')) return
    try {
      await removeUserDomain(userId, domainCode)
      const refreshed = await getCatalogDomains()
      setDomains(refreshed)
      setSelected(refreshed.find(d => d.code === domainCode) ?? null)
    } catch (e: unknown) { alert((e as Error).message) }
  }

  // users not yet in this domain
  const availableUsers = selected
    ? allUsers.filter(u => u.status !== 'terminated' && !selected.personnel.some(p => p.user_id === u.id))
    : []

  const bgColor = domainBgColor
  const fgColor = domainFgColor

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--vib-neutral-500)' }}>
          {domains.length} domains · {domains.reduce((s, d) => s + d.user_count, 0)} lượt phân công nhân sự
        </div>
        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--vib-neutral-100)', padding: '3px 4px', borderRadius: 8 }}>
          {([['grid', '⊞'], ['list', '☰']] as const).map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              title={mode === 'grid' ? 'Dạng thẻ' : 'Dạng bảng'}
              style={{
                padding: '4px 10px', border: 'none', cursor: 'pointer', borderRadius: 6,
                fontSize: 15, fontFamily: 'var(--font)',
                background: viewMode === mode ? '#fff' : 'transparent',
                color: viewMode === mode ? 'var(--vib-primary)' : 'var(--vib-neutral-500)',
                boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s',
              }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {loading
        ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--vib-neutral-400)' }}>Đang tải…</div>
        : viewMode === 'grid'
          ? (
          /* ── Grid view ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {domains.map(d => (
              <div key={d.code} onClick={() => openDetail(d)}
                style={{
                  background: '#fff', border: `1px solid ${fgColor(d.code)}44`,
                  borderLeft: `4px solid ${fgColor(d.code)}`,
                  borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'box-shadow 0.15s',
                  opacity: d.is_active ? 1 : 0.55,
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: bgColor(d.code), color: fgColor(d.code), padding: '2px 8px', borderRadius: 6 }}>{d.code}</span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</span>
                  </div>
                  <button onClick={e => openEdit(d, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vib-neutral-400)', fontSize: 14, padding: 2 }}>✏️</button>
                </div>

                {d.description && (
                  <div style={{ fontSize: 12, color: 'var(--vib-neutral-500)', marginBottom: 8, lineHeight: 1.4 }}>{d.description}</div>
                )}

                <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginBottom: d.personnel.length ? 6 : 0 }}>
                  👤 {d.user_count} nhân sự phụ trách
                </div>

                {d.personnel.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {d.personnel.slice(0, 4).map(p => (
                      <span key={p.user_id} style={{
                        fontSize: 11, background: 'var(--vib-neutral-100)', color: 'var(--vib-neutral-700)',
                        padding: '2px 8px', borderRadius: 10, fontWeight: p.is_primary ? 700 : 400,
                      }}>
                        {p.is_primary ? '⭐ ' : ''}{p.full_name.split(' ').slice(-1)[0]}
                        {p.role_in_domain ? ` · ${p.role_in_domain}` : ''}
                      </span>
                    ))}
                    {d.personnel.length > 4 && (
                      <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>+{d.personnel.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          )
          : (
          /* ── List view ── */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--vib-neutral-50)', borderBottom: '2px solid var(--vib-neutral-200)' }}>
                {['Mã', 'Tên Domain', 'Mô tả', 'Nhân sự phụ trách', 'Trạng thái', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--vib-neutral-500)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domains.map(d => (
                <tr key={d.code}
                  onClick={() => openDetail(d)}
                  style={{ borderBottom: '1px solid var(--vib-neutral-100)', cursor: 'pointer', opacity: d.is_active ? 1 : 0.55, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--vib-neutral-50)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '10px 12px', width: 90 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: bgColor(d.code), color: fgColor(d.code), padding: '3px 9px', borderRadius: 6 }}>{d.code}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 3, height: 18, borderRadius: 2, background: fgColor(d.code), display: 'inline-block', flexShrink: 0 }} />
                      {d.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--vib-neutral-500)', fontSize: 12, maxWidth: 280 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {d.description || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', minWidth: 200 }}>
                    {d.personnel.length === 0
                      ? <span style={{ color: 'var(--vib-neutral-400)', fontSize: 12 }}>Chưa phân công</span>
                      : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {d.personnel.map(p => (
                            <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              {p.is_primary && <span title="Domain chính" style={{ fontSize: 12 }}>⭐</span>}
                              <span style={{ fontWeight: p.is_primary ? 700 : 400 }}>{p.full_name}</span>
                              {p.role_in_domain && (
                                <span style={{ fontSize: 11, background: fgColor(d.code) + '18', color: fgColor(d.code), padding: '1px 7px', borderRadius: 8, fontWeight: 600 }}>
                                  {p.role_in_domain}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                      background: d.is_active ? '#dcfce7' : '#f1f5f9',
                      color: d.is_active ? '#16a34a' : '#64748b',
                    }}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={e => openEdit(d, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vib-neutral-400)', fontSize: 14, padding: '2px 6px', borderRadius: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--vib-neutral-100)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )
      }

      {/* ── Domain Detail Modal ─────────────────────────────── */}
      {selected && (
        <Modal
          title={`🏷 ${selected.name} (${selected.code})`}
          open onClose={() => setSelected(null)} width="700px"
        >
          {selected.description && (
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--vib-neutral-600)' }}>{selected.description}</p>
          )}

          <SectionTitle>👥 Nhân sự phụ trách ({selected.user_count})</SectionTitle>

          {selected.personnel.length === 0 ? (
            <div style={{ padding: '16px 0', color: 'var(--vib-neutral-400)', fontSize: 13, textAlign: 'center' }}>
              Chưa có nhân sự phụ trách domain này
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: 'var(--vib-neutral-50)' }}>
                  {['', 'Họ tên', 'Email', 'Chức danh / Phòng ban', 'Vai trò trong Domain', ''].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, color: 'var(--vib-neutral-500)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.personnel.map(p => (
                  <tr key={p.user_id} style={{ borderBottom: '1px solid var(--vib-neutral-100)' }}>
                    <td style={{ padding: '7px 10px', width: 28 }}>
                      {p.is_primary && <span title="Domain chính" style={{ fontSize: 14 }}>⭐</span>}
                    </td>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>
                      {p.full_name}
                      {p.employee_id && <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)', marginLeft: 6 }}>#{p.employee_id}</span>}
                    </td>
                    <td style={{ padding: '7px 10px' }}>
                      <a href={`mailto:${p.email}`} style={{ color: 'var(--vib-primary)', fontSize: 12 }}>{p.email}</a>
                    </td>
                    <td style={{ padding: '7px 10px', fontSize: 12, color: 'var(--vib-neutral-600)' }}>
                      {[p.position, p.department].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td style={{ padding: '7px 10px' }}>
                      {p.role_in_domain
                        ? <span style={{ fontSize: 11, background: fgColor(selected.code) + '20', color: fgColor(selected.code), padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>{p.role_in_domain}</span>
                        : <span style={{ color: 'var(--vib-neutral-400)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '7px 10px' }}>
                      <button onClick={() => handleRemoveUser(selected.code, p.user_id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vib-danger)', fontSize: 14 }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <SectionTitle>+ Thêm nhân sự phụ trách</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 8, alignItems: 'end' }}>
            <div>
              <Lbl>Nhân sự</Lbl>
              <select className="vib-input" value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
                <option value="">— Chọn nhân sự —</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}{u.employee_id ? ` (${u.employee_id})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <Lbl>Vai trò trong Domain</Lbl>
              <select className="vib-input" value={assignRole} onChange={e => setAssignRole(e.target.value)}>
                <option value="">— Không xác định —</option>
                {DOMAIN_ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ paddingBottom: 4 }}>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={assignPrimary} onChange={e => setAssignPrimary(e.target.checked)} />
                ⭐ Domain chính
              </label>
            </div>
            <div style={{ paddingBottom: 2 }}>
              <Btn size="sm" onClick={handleAssignUser}>Thêm</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Domain Modal ───────────────────────────────── */}
      {editDomain && (
        <Modal title={`Sửa thông tin domain`} open onClose={() => setEditDomain(null)} width="480px">
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <Lbl required>Mã domain (UPPERCASE)</Lbl>
              <input className="vib-input"
                value={editForm.code}
                onChange={e => setEditForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="VD: HR, FS, RETAIL…"
              />
              {editForm.code !== editDomain.code && (
                <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>
                  ⚠️ Đổi mã sẽ cập nhật tất cả project và phân công nhân sự liên quan (ON UPDATE CASCADE)
                </div>
              )}
            </div>
            <div><Lbl required>Tên domain</Lbl>
              <input className="vib-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div><Lbl>Mô tả</Lbl>
              <textarea className="vib-input" rows={3} value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setEditDomain(null)}>Hủy</Btn>
            <Btn loading={saving} onClick={handleSaveEdit}>Lưu</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// Main CatalogPage
// ══════════════════════════════════════════════════════════════════

export default function CatalogPage() {
  const [tab, setTab]       = useState<'products' | 'users' | 'roles' | 'domains'>('products')
  const [roles, setRoles]   = useState<CatalogRole[]>([])
  const [users, setUsers]   = useState<CatalogUser[]>([])
  const [domains, setDomains] = useState<CatalogDomain[]>([])

  const loadRoles = useCallback(async () => {
    try { setRoles(await getCatalogRoles()) } catch { /**/ }
  }, [])

  const loadUsers = useCallback(async () => {
    try { setUsers(await (await import('../../api/catalog')).getCatalogUsers()) } catch { /**/ }
  }, [])

  const loadDomains = useCallback(async () => {
    try { setDomains(await getCatalogDomains()) } catch { /**/ }
  }, [])

  useEffect(() => { loadRoles(); loadUsers(); loadDomains() }, [loadRoles, loadUsers, loadDomains])

  const TABS = [
    { key: 'products' as const, label: 'Danh mục sản phẩm', icon: '📦' },
    { key: 'users'    as const, label: 'Danh mục nhân sự',  icon: '👥' },
    { key: 'domains'  as const, label: 'Danh mục Domain',   icon: '🏷' },
    { key: 'roles'    as const, label: 'Vai trò & Quyền',   icon: '🔐' },
  ]

  return (
    <div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--vib-neutral-200)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', background: 'transparent',
              color: tab === t.key ? 'var(--vib-primary)' : 'var(--vib-neutral-600)',
              borderBottom: tab === t.key ? '2px solid var(--vib-primary)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && <ProductsTab domains={domains} />}
      {tab === 'users'    && <UsersTab roles={roles} domains={domains} />}
      {tab === 'domains'  && <DomainsTab allUsers={users} />}
      {tab === 'roles'    && <RolesTab roles={roles} onReload={loadRoles} />}
    </div>
  )
}
