'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  // existing
  getProject, getProjectDashboard, getProjectBrief, upsertProjectBrief,
  getAppRegistry, createAppRegistryObject,
  getMilestones, getMilestonesByTrack, updateMilestone, regenerateMilestones,
  getProjectFolders,
  getMembers, createMember, deleteMember,
  getFiles, createFile, uploadNewVersion, exportFileGnm,
  exportProject, importProject,
  type ImportResult,
  getMeetings, generateMeeting,
  // management
  getStageGates, createStageGate, updateStageGate,
  getLatestHealth, createHealthScore,
  getStakeholders, createStakeholder, deleteStakeholder,
  getPriority, upsertPriority,
  // products
  getProducts, createProduct, deleteProduct,
  getEnvironments, upsertEnvironment,
  getAppDetail, upsertAppDetail,
  getBatchJobs, createBatchJob, deleteBatchJob,
  getAppStandard, upsertAppStandard,
  getJobStandard, upsertJobStandard,
  // compliance
  getLicenses, createLicense, deleteLicense,
  getContracts, createContract, deleteContract,
  getContractTerms, createContractTerm, deleteContractTerm,
  getContractPayments, createContractPayment, updateContractPayment, deleteContractPayment, getPaymentSummary,
  getHandover, upsertHandover,
  getIntegrationLinks, createIntegrationLink, deleteIntegrationLink,
  // types
  type Project, type ProjectBrief, type Dashboard, type AppRegistryObject, type AppRegistryCreate,
  type Milestone, type MilestoneTrack, type ProjectFolder, type Member, type MemberCreate,
  type ProjectFile, type FileCreate, type Meeting, type MeetingGenerate,
  type StageGate, type StageGateCreate, type HealthScore, type HealthScoreCreate,
  type Stakeholder, type StakeholderCreate, type ProjectPriority, type PriorityUpsert,
  type Product, type ProductCreate, type Environment, type EnvironmentData,
  type AppDetail, type AppDetailUpsert, type BatchJob, type BatchJobCreate,
  type AppStandardInfo, type AppStandardUpsert, type JobStandardInfo, type JobStandardUpsert,
  type License, type LicenseCreate, type Contract, type ContractCreate,
  type ContractTerm, type ContractTermCreate,
  type ContractPayment, type ContractPaymentCreate, type PaymentSummary,
  type Handover, type HandoverUpsert, type IntegrationLink, type IntegrationLinkCreate,
  type RagStatus,
} from '../../api/ppg'
import ProjectPCRTab from './ProjectPCRTab'
import { X } from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge'
import { KpiCard } from '../../components/KpiCard'
import { ProgressBar } from '../../components/ProgressBar'
import { Modal } from '../../components/Modal'
import { Toast, useToast } from '../../components/Toast'

const OBJ_TYPES = ['application', 'system', 'job', 'connection'] as const
const MEMBER_ROLES = ['PM', 'BA', 'Dev', 'QA', 'PO', 'Stakeholder', 'DevOps', 'Architect'] as const
const MS_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const
const ENV_NAMES = ['DEV', 'SIT', 'UAT', 'PROD', 'DR'] as const
const PRODUCT_TYPES = ['application', 'batch_job', 'api', 'service'] as const
const LINK_TYPES = ['ba_doc', 'qa_doc', 'backlog', 'feedback', 'monitoring', 'other'] as const

type TabKey =
  | 'overview' | 'milestones' | 'members' | 'files' | 'meetings' | 'registry'
  | 'management' | 'products' | 'licenses' | 'contracts' | 'handover' | 'integrations'
  | 'requests'

function RagBadge({ rag }: { rag?: RagStatus | null }) {
  if (!rag) return <span className="text-gray-300 text-xs">—</span>
  const map: Record<RagStatus, string> = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
  }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[rag]}`}>{rag.toUpperCase()}</span>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">{children}</h3>
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [registry, setRegistry] = useState<AppRegistryObject[]>([])
  const [tab, setTab] = useState<TabKey>('overview')
  const [milestoneTrack, setMilestoneTrack] = useState<MilestoneTrack | 'all'>('all')

  // Brief state
  const EMPTY_BRIEF: Omit<ProjectBrief, 'id' | 'project_id' | 'updated_at'> = {
    purpose: '', general_info: '', success_metrics: [], enduser_value: '',
    primary_users: '', pain_points: '', user_role_matrix: [],
    must_have_features: [], nice_to_have_features: [], system_integrations: [],
    performance_scalability: '', compliance_security: '', availability_reliability: '',
    data_needs: '', reporting_needs: '',
    time_constraints: '', dependencies: [], potential_risks: [],
    key_milestones_notes: [], methodology: '', decision_makers: [],
  }
  const [brief, setBrief] = useState<ProjectBrief | null>(null)
  const [briefEdit, setBriefEdit] = useState(false)
  const [briefForm, setBriefForm] = useState(EMPTY_BRIEF)
  const [briefSaving, setBriefSaving] = useState(false)
  const [folders, setFolders] = useState<ProjectFolder[]>([])

  // Management state
  const [stageGates, setStageGates] = useState<StageGate[]>([])
  const [latestHealth, setLatestHealth] = useState<HealthScore | null>(null)
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [priority, setPriority] = useState<ProjectPriority | null>(null)

  // Product state
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [appDetail, setAppDetail] = useState<AppDetail | null>(null)
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([])

  // Compliance state
  const [licenses, setLicenses] = useState<License[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [contractSubTab, setContractSubTab] = useState<'terms' | 'payments'>('terms')
  const [contractTerms, setContractTerms] = useState<ContractTerm[]>([])
  const [contractPayments, setContractPayments] = useState<ContractPayment[]>([])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null)
  const [handover, setHandover] = useState<Handover | null>(null)
  const [integrationLinks, setIntegrationLinks] = useState<IntegrationLink[]>([])

  // App/Job standard state
  const [appStandard, setAppStandard] = useState<AppStandardInfo | null>(null)
  const [jobStandard, setJobStandard] = useState<JobStandardInfo | null>(null)

  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [showRegistryModal, setShowRegistryModal] = useState(false)
  const [showMeetingDetail, setShowMeetingDetail] = useState<Meeting | null>(null)
  const [uploadTargetFile, setUploadTargetFile] = useState<ProjectFile | null>(null)
  const [showGateModal, setShowGateModal] = useState(false)
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [showStakeholderModal, setShowStakeholderModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showEnvModal, setShowEnvModal] = useState<string | null>(null) // env_name
  const [showJobModal, setShowJobModal] = useState(false)
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  const [showTermModal, setShowTermModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showHandoverModal, setShowHandoverModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [gnmExporting, setGnmExporting] = useState<string | null>(null) // file_id being exported
  const [exporting, setExporting]       = useState(false)
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showAppDetailModal, setShowAppDetailModal] = useState(false)
  const [showAppStandardModal, setShowAppStandardModal] = useState(false)
  const [showJobStandardModal, setShowJobStandardModal] = useState(false)

  // Forms
  const [memberForm, setMemberForm] = useState<MemberCreate>({ full_name: '', role: 'BA' })
  const [fileForm, setFileForm] = useState<FileCreate>({ name: '', file_type: 'uploaded', external_url: '' })
  const [meetingForm, setMeetingForm] = useState<MeetingGenerate>({ title: '', raw_notes: '' })
  const [regForm, setRegForm] = useState<AppRegistryCreate>({ object_type: 'application', name: '', code: '' })
  const [copyUrlInput, setCopyUrlInput] = useState('')
  const [gateForm, setGateForm] = useState<StageGateCreate>({ stage_name: '' })
  const [healthForm, setHealthForm] = useState<HealthScoreCreate>({ overall_rag: 'green' })
  const [stakeholderForm, setStakeholderForm] = useState<StakeholderCreate>({ name: '' })
  const [productForm, setProductForm] = useState<ProductCreate>({ product_name: '', product_type: 'application' })
  const [envForm, setEnvForm] = useState<EnvironmentData>({ infra_info: {}, access_info: {}, deployment_info: {}, monitoring_setup: {} })
  const [appDetailForm, setAppDetailForm] = useState<AppDetailUpsert>({})
  const [jobForm, setJobForm] = useState<BatchJobCreate>({ job_name: '' })
  const [licenseForm, setLicenseForm] = useState<LicenseCreate>({ software_name: '', license_type: 'commercial' })
  const [contractForm, setContractForm] = useState<ContractCreate>({ vendor_name: '' })
  const [termForm, setTermForm] = useState<ContractTermCreate>({ title: '', content: '' })
  const [paymentForm, setPaymentForm] = useState<ContractPaymentCreate>({ milestone_name: '', amount: 0 })
  const [appStandardForm, setAppStandardForm] = useState<AppStandardUpsert>({})
  const [jobStandardForm, setJobStandardForm] = useState<JobStandardUpsert>({})
  const [handoverForm, setHandoverForm] = useState<HandoverUpsert>({ checklist_items: [] })
  const [linkForm, setLinkForm] = useState<IntegrationLinkCreate>({ link_type: 'ba_doc', title: '' })
  const [priorityForm, setPriorityForm] = useState<PriorityUpsert>({
    business_value: 5, time_criticality: 5, risk_reduction: 3, job_size: 3,
  })

  const { toast, show, hide } = useToast()

  const handleExport = async () => {
    if (!id || !project) return
    setExporting(true)
    try {
      await exportProject(id, project.code)
      show('Đã tải file XLSX', 'success')
    } catch (e: unknown) { show((e as Error).message, 'error') }
    finally { setExporting(false) }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setImporting(true)
    try {
      const result = await importProject(id, file)
      setImportResult(result)
      // Reload affected data
      await Promise.all([
        getProject(id).then(setProject),
        getProjectBrief(id).then((b) => { if (b && 'project_id' in b) setBrief(b as ProjectBrief) }).catch(() => {}),
        getMilestones(id).then(setMilestones),
        getMembers(id).then(setMembers),
        getStakeholders(id).then(setStakeholders),
        getStageGates(id).then(setStageGates),
      ])
      const errCount = result.errors?.length ?? 0
      show(errCount > 0 ? `Import xong (${errCount} lỗi)` : 'Import thành công', errCount > 0 ? 'error' : 'success')
    } catch (e: unknown) { show((e as Error).message, 'error') }
    finally { setImporting(false); e.target.value = '' }
  }

  const bumpVersion = (ver: string) => {
    try {
      const parts = ver.replace(/^v/, '').split('.')
      parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1)
      return 'v' + parts.join('.')
    } catch { return ver + '.1' }
  }

  useEffect(() => {
    if (!id) return
    Promise.all([
      getProject(id).then(setProject),
      getProjectDashboard(id).then(setDashboard),
      getProjectBrief(id).then((b) => {
        if (b && 'project_id' in b) {
          setBrief(b as ProjectBrief)
          setBriefForm({ ...EMPTY_BRIEF, ...(b as ProjectBrief) })
        }
      }).catch(() => {}),
      getMilestones(id).then(setMilestones),
      getMembers(id).then(setMembers),
      getFiles(id).then(setFiles),
      getMeetings(id).then(setMeetings),
      getAppRegistry(id).then(setRegistry),
      getStageGates(id).then(setStageGates),
      getLatestHealth(id).then(setLatestHealth),
      getStakeholders(id).then(setStakeholders),
      getPriority(id).then(setPriority),
      getProducts(id).then(setProducts),
      getProjectFolders(id).then(setFolders),
      getLicenses(id).then(setLicenses),
      getContracts(id).then(setContracts),
      getHandover(id).then((h) => setHandover(h?.id ? h : null)),
      getIntegrationLinks(id).then(setIntegrationLinks),

    ]).catch((e) => show(String(e), 'error'))
  }, [id])

  // load product detail data when product is selected
  useEffect(() => {
    if (!id || !selectedProduct) return
    setAppStandard(null)
    setJobStandard(null)
    Promise.all([
      getEnvironments(id, selectedProduct.id).then(setEnvironments),
      getAppDetail(id, selectedProduct.id).then((d) => setAppDetail(d?.id ? d : null)),
      getBatchJobs(id, selectedProduct.id).then(setBatchJobs),
      getAppStandard(id, selectedProduct.id).then((d) => setAppStandard(d?.id ? d : null)).catch(() => {}),
      getJobStandard(id, selectedProduct.id).then((d) => setJobStandard(d?.id ? d : null)).catch(() => {}),
    ]).catch(() => {})
  }, [selectedProduct])

  if (!project || !id) return <div className="p-6 text-gray-400 text-sm">Đang tải...</div>

  // ── Milestone handlers ──────────────────────────────────────────────────
  const handleMilestoneStatusChange = async (mid: string, status: string) => {
    try {
      const updated = await updateMilestone(id, mid, { status })
      setMilestones((ms) => ms.map((m) => (m.id === mid ? { ...m, ...updated } : m)))
    } catch (e) { show(String(e), 'error') }
  }

  const handleRegenMilestones = async () => {
    try {
      const ms = await regenerateMilestones(id)
      setMilestones(ms)
      show(`${ms.length} milestones đã được tái sinh`, 'success')
    } catch (e) { show(String(e), 'error') }
  }

  // ── Member handlers ─────────────────────────────────────────────────────
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMember(id, memberForm)
      setMembers(await getMembers(id))
      show('Thành viên đã được thêm', 'success')
      setShowMemberModal(false)
      setMemberForm({ full_name: '', role: 'BA' })
    } catch (e) { show(String(e), 'error') }
  }

  const handleDeleteMember = async (mid: string) => {
    try {
      await deleteMember(id, mid)
      setMembers((ms) => ms.filter((m) => m.id !== mid))
    } catch (e) { show(String(e), 'error') }
  }

  // ── File handlers ───────────────────────────────────────────────────────
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createFile(id, { ...fileForm, external_url: fileForm.external_url || undefined })
      setFiles(await getFiles(id))
      show('File đã được tạo', 'success')
      setShowFileModal(false)
      setFileForm({ name: '', file_type: 'uploaded', external_url: '' })
    } catch (e) { show(String(e), 'error') }
  }

  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadTargetFile) return
    try {
      await uploadNewVersion(id, uploadTargetFile.id, { external_url: copyUrlInput || undefined })
      setFiles(await getFiles(id))
      show(`${bumpVersion(uploadTargetFile.current_version)} đã được tạo`, 'success')
      setUploadTargetFile(null)
      setCopyUrlInput('')
    } catch (e) { show(String(e), 'error') }
  }

  // ── Meeting handlers ────────────────────────────────────────────────────
  const handleGenerateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const meeting = await generateMeeting(id, meetingForm)
      setMeetings((ms) => [meeting, ...ms])
      show('Biên bản họp đã được tạo', 'success')
      setShowMeetingModal(false)
      setShowMeetingDetail(meeting)
      setMeetingForm({ title: '', raw_notes: '' })
    } catch (e) { show(String(e), 'error') }
  }

  // ── Registry handlers ───────────────────────────────────────────────────
  const handleCreateRegistry = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAppRegistryObject(id, regForm)
      setRegistry(await getAppRegistry(id))
      show('Object đã được tạo', 'success')
      setShowRegistryModal(false)
      setRegForm({ object_type: 'application', name: '', code: '' })
    } catch (e) { show(String(e), 'error') }
  }

  // ── Management handlers ─────────────────────────────────────────────────
  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createStageGate(id, gateForm)
      setStageGates(await getStageGates(id))
      show('Stage gate đã được tạo', 'success')
      setShowGateModal(false)
      setGateForm({ stage_name: '' })
    } catch (e) { show(String(e), 'error') }
  }

  const handleGateStatusChange = async (gateId: string, status: string) => {
    try {
      await updateStageGate(id, gateId, { status })
      setStageGates(await getStageGates(id))
    } catch (e) { show(String(e), 'error') }
  }

  const handleCreateHealth = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const score = await createHealthScore(id, healthForm)
      setLatestHealth(score)
      show('Health score đã được ghi', 'success')
      setShowHealthModal(false)
      setHealthForm({ overall_rag: 'green' })
    } catch (e) { show(String(e), 'error') }
  }

  const handleCreateStakeholder = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createStakeholder(id, stakeholderForm)
      setStakeholders(await getStakeholders(id))
      show('Stakeholder đã được thêm', 'success')
      setShowStakeholderModal(false)
      setStakeholderForm({ name: '' })
    } catch (e) { show(String(e), 'error') }
  }

  const handleSavePriority = async () => {
    try {
      const p = await upsertPriority(id, priorityForm)
      setPriority(p)
      show('Priority đã được lưu', 'success')
    } catch (e) { show(String(e), 'error') }
  }

  // ── Product handlers ────────────────────────────────────────────────────
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProduct(id, productForm)
      const list = await getProducts(id)
      setProducts(list)
      show('Sản phẩm đã được tạo', 'success')
      setShowProductModal(false)
      setProductForm({ product_name: '', product_type: 'application' })
    } catch (e) { show(String(e), 'error') }
  }

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p)
    setEnvironments([])
    setAppDetail(null)
    setBatchJobs([])
  }

  const handleUpsertEnv = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !showEnvModal) return
    try {
      await upsertEnvironment(id, selectedProduct.id, showEnvModal, envForm)
      setEnvironments(await getEnvironments(id, selectedProduct.id))
      show(`Môi trường ${showEnvModal} đã được lưu`, 'success')
      setShowEnvModal(null)
    } catch (e) { show(String(e), 'error') }
  }

  const handleSaveAppDetail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    try {
      const d = await upsertAppDetail(id, selectedProduct.id, appDetailForm)
      setAppDetail(d)
      show('App detail đã được lưu', 'success')
      setShowAppDetailModal(false)
    } catch (e) { show(String(e), 'error') }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    try {
      await createBatchJob(id, selectedProduct.id, jobForm)
      setBatchJobs(await getBatchJobs(id, selectedProduct.id))
      show('Job đã được tạo', 'success')
      setShowJobModal(false)
      setJobForm({ job_name: '' })
    } catch (e) { show(String(e), 'error') }
  }

  // ── Compliance handlers ─────────────────────────────────────────────────
  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createLicense(id, licenseForm)
      setLicenses(await getLicenses(id))
      show('License đã được thêm', 'success')
      setShowLicenseModal(false)
      setLicenseForm({ software_name: '', license_type: 'commercial' })
    } catch (e) { show(String(e), 'error') }
  }

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createContract(id, contractForm)
      setContracts(await getContracts(id))
      show('Hợp đồng đã được thêm', 'success')
      setShowContractModal(false)
      setContractForm({ vendor_name: '' })
    } catch (e) { show(String(e), 'error') }
  }

  const handleSelectContract = async (c: Contract) => {
    setSelectedContract(c)
    setContractSubTab('terms')
    try {
      const [terms, payments, summary] = await Promise.all([
        getContractTerms(id, c.id),
        getContractPayments(id, c.id),
        getPaymentSummary(id, c.id),
      ])
      setContractTerms(terms)
      setContractPayments(payments)
      setPaymentSummary(summary)
    } catch (e) { show(String(e), 'error') }
  }

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContract) return
    try {
      await createContractTerm(id, selectedContract.id, termForm)
      setContractTerms(await getContractTerms(id, selectedContract.id))
      show('Điều khoản đã được thêm', 'success')
      setShowTermModal(false)
      setTermForm({ title: '', content: '' })
    } catch (e) { show(String(e), 'error') }
  }

  const handleDeleteTerm = async (termId: string) => {
    if (!selectedContract) return
    try {
      await deleteContractTerm(id, selectedContract.id, termId)
      setContractTerms((ts) => ts.filter((t) => t.id !== termId))
    } catch (e) { show(String(e), 'error') }
  }

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContract) return
    try {
      await createContractPayment(id, selectedContract.id, paymentForm)
      const [payments, summary] = await Promise.all([
        getContractPayments(id, selectedContract.id),
        getPaymentSummary(id, selectedContract.id),
      ])
      setContractPayments(payments)
      setPaymentSummary(summary)
      show('Khoản thanh toán đã được thêm', 'success')
      setShowPaymentModal(false)
      setPaymentForm({ milestone_name: '', amount: 0 })
    } catch (e) { show(String(e), 'error') }
  }

  const handleUpdatePaymentStatus = async (paymentId: string, status: string) => {
    if (!selectedContract) return
    try {
      await updateContractPayment(id, selectedContract.id, paymentId, { status: status as ContractPayment['status'] })
      const [payments, summary] = await Promise.all([
        getContractPayments(id, selectedContract.id),
        getPaymentSummary(id, selectedContract.id),
      ])
      setContractPayments(payments)
      setPaymentSummary(summary)
    } catch (e) { show(String(e), 'error') }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedContract) return
    try {
      await deleteContractPayment(id, selectedContract.id, paymentId)
      const [payments, summary] = await Promise.all([
        getContractPayments(id, selectedContract.id),
        getPaymentSummary(id, selectedContract.id),
      ])
      setContractPayments(payments)
      setPaymentSummary(summary)
    } catch (e) { show(String(e), 'error') }
  }

  const handleSaveAppStandard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    try {
      const d = await upsertAppStandard(id, selectedProduct.id, appStandardForm)
      setAppStandard(d)
      show('App standard info đã được lưu', 'success')
      setShowAppStandardModal(false)
    } catch (e) { show(String(e), 'error') }
  }

  const handleSaveJobStandard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    try {
      const d = await upsertJobStandard(id, selectedProduct.id, jobStandardForm)
      setJobStandard(d)
      show('Job standard info đã được lưu', 'success')
      setShowJobStandardModal(false)
    } catch (e) { show(String(e), 'error') }
  }

  const handleSaveHandover = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const h = await upsertHandover(id, handoverForm)
      setHandover(h)
      show('Handover đã được lưu', 'success')
      setShowHandoverModal(false)
    } catch (e) { show(String(e), 'error') }
  }

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createIntegrationLink(id, linkForm)
      setIntegrationLinks(await getIntegrationLinks(id))
      show('Link đã được thêm', 'success')
      setShowLinkModal(false)
      setLinkForm({ link_type: 'ba_doc', title: '' })
    } catch (e) { show(String(e), 'error') }
  }

  // ── Tabs config ─────────────────────────────────────────────────────────
  const TABS: { key: TabKey; label: string; group?: string }[] = [
    // Core
    { key: 'overview', label: 'Tổng quan' },
    { key: 'milestones', label: `Milestones (${milestones.filter(m => m.track === 'project').length}P / ${milestones.filter(m => m.track === 'ba').length}BA / ${milestones.filter(m => m.track === 'test').length}T)` },
    { key: 'members', label: `Thành viên (${members.length})` },
    { key: 'files', label: `Files (${files.length})` },
    { key: 'meetings', label: `Meetings (${meetings.length})` },
    { key: 'registry', label: `App Registry (${registry.length})` },
    // Management
    { key: 'management', label: 'Quản lý chung', group: 'mgmt' },
    // Products
    { key: 'products', label: `Sản phẩm (${products.length})`, group: 'prod' },
    // Compliance
    { key: 'licenses', label: `Licenses (${licenses.length})`, group: 'comp' },
    { key: 'contracts', label: `Hợp đồng (${contracts.length})`, group: 'comp' },
    { key: 'handover', label: 'Handover', group: 'comp' },
    { key: 'integrations', label: `Links (${integrationLinks.length})`, group: 'comp' },
    // Requests
    { key: 'requests', label: 'PCR' },
  ]

  const ragOptions: RagStatus[] = ['green', 'amber', 'red']

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-xs text-gray-500">{project.code}</span>
            <StatusBadge status={project.status} />
            {latestHealth && <RagBadge rag={latestHealth.overall_rag} />}
            {project.start_date && (
              <span className="text-xs text-gray-400">{project.start_date} → {project.end_date ?? 'TBD'}</span>
            )}
          </div>
        </div>

      </div>

      {/* KPI row */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        <KpiCard label="Milestones Done" value={milestones.filter((m) => m.status === 'completed').length + '/' + milestones.length} />
        <KpiCard label="Team Size" value={members.length} />
        <KpiCard label="Files" value={files.length} />
        <KpiCard label="Test Coverage" value={dashboard?.test_coverage != null ? `${dashboard.test_coverage}%` : '—'} />
        <KpiCard label="App Registry" value={registry.length} sub="objects" />
        <KpiCard label="Products" value={products.length} sub="registered" />
      </div>
      {dashboard?.test_coverage != null && (
        <div className="mb-5">
          <ProgressBar value={dashboard.test_coverage} label="Test Coverage" color="bg-green-500" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-vib-blue text-vib-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (() => {
        const arr = (v: string[] | undefined) => (v ?? []).filter(Boolean)
        const txt = (v: string | undefined) => v?.trim() || '—'
        const lines = (v: string[] | undefined) => arr(v).length > 0
          ? <ul className="list-disc list-inside space-y-0.5">{arr(v).map((s, i) => <li key={i} className="text-sm text-gray-700">{s}</li>)}</ul>
          : <span className="text-sm text-gray-400">—</span>

        const bf = (k: keyof typeof briefForm) => briefForm[k] as string
        const bfArr = (k: keyof typeof briefForm) => ((briefForm[k] as string[]) ?? []).join('\n')
        const setTxt = (k: keyof typeof briefForm) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
          setBriefForm(f => ({ ...f, [k]: e.target.value }))
        const setArr = (k: keyof typeof briefForm) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setBriefForm(f => ({ ...f, [k]: e.target.value.split('\n') }))

        const handleSave = async () => {
          if (!id) return
          setBriefSaving(true)
          try {
            const saved = await upsertProjectBrief(id, briefForm)
            setBrief(saved)
            setBriefForm({ ...EMPTY_BRIEF, ...saved })
            setBriefEdit(false)
            show('Project Brief đã được lưu.', 'success')
          } catch (e) { show(String(e), 'error') }
          finally { setBriefSaving(false) }
        }

        const METHODOLOGY_OPTIONS = ['Agile/Scrum', 'Kanban', 'Waterfall', 'Hybrid', 'SAFe', 'Khác']

        const ViewField = ({ label, value }: { label: string; value?: string }) => (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{txt(value)}</p>
          </div>
        )

        const BriefSection = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>{icon}</span>{title}
            </h3>
            {children}
          </div>
        )

        return (
          <div className="space-y-4">
            {/* Project base info bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Mô tả dự án</p>
                <p className="text-sm text-gray-700">{project.description || '—'}</p>
              </div>
              <div className="flex gap-6 text-sm shrink-0">
                <div><p className="text-xs text-gray-400 mb-0.5">Owner</p><p className="font-medium">{project.owner || '—'}</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">Last updated</p><p className="font-medium">{new Date(project.updated_at).toLocaleString('vi-VN')}</p></div>
              </div>
              <div className="shrink-0 flex flex-col gap-2 items-end">
                {briefEdit ? (
                  <div className="flex gap-2">
                    <button onClick={() => { setBriefEdit(false); setBriefForm({ ...EMPTY_BRIEF, ...(brief ?? {}) }) }}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600">Hủy</button>
                    <button onClick={handleSave} disabled={briefSaving}
                      className="px-3 py-1.5 text-xs bg-vib-blue text-white rounded hover:bg-blue-900 disabled:opacity-50">
                      {briefSaving ? 'Đang lưu…' : 'Lưu Brief'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setBriefEdit(true)}
                    className="px-3 py-1.5 text-xs border border-vib-blue text-vib-blue rounded hover:bg-blue-50">
                    ✏️ Sửa Project Brief
                  </button>
                )}
                {/* Export / Import */}
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-vib-blue rounded hover:bg-blue-900 disabled:opacity-50 transition-colors"
                  >
                    {exporting ? '⏳' : '⬇'} Export XLSX
                  </button>
                  <label className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border cursor-pointer transition-colors ${importing ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                    {importing ? '⏳' : '⬆'} Import XLSX
                    <input type="file" accept=".xlsx" className="hidden" disabled={importing} onChange={handleImport} />
                  </label>
                </div>
                {importResult && importResult.errors && importResult.errors.length > 0 && (
                  <button onClick={() => setImportResult(null)}
                    className="text-xs text-red-500 underline"
                    title={importResult.errors.join('\n')}>
                    ⚠ {importResult.errors.length} lỗi import
                  </button>
                )}
              </div>
            </div>

            {/* Section 1 — Business Overview & Objectives */}
            <BriefSection title="Business Overview & Objectives" icon="🎯">
              {briefEdit ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Purpose — Mục tiêu dự án</label>
                    <textarea rows={3} value={bf('purpose')} onChange={setTxt('purpose')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none" placeholder="Tại sao dự án này tồn tại…" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">General Info — Thông tin chung</label>
                    <textarea rows={3} value={bf('general_info')} onChange={setTxt('general_info')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none" placeholder="Context, background, phạm vi tổng thể…" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Success Metrics (mỗi dòng 1 chỉ số)</label>
                    <textarea rows={4} value={bfArr('success_metrics')} onChange={setArr('success_metrics')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none font-mono text-xs"
                      placeholder={"≥ 80% test coverage\nDeployment trong 6 tháng\nZero P1 post go-live"} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End User Value — Giá trị mang lại</label>
                    <textarea rows={4} value={bf('enduser_value')} onChange={setTxt('enduser_value')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none" placeholder="Người dùng cuối được gì từ dự án này…" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <ViewField label="Purpose" value={brief?.purpose} />
                  <ViewField label="General Info" value={brief?.general_info} />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Success Metrics</p>
                    {lines(brief?.success_metrics)}
                  </div>
                  <ViewField label="End User Value" value={brief?.enduser_value} />
                </div>
              )}
            </BriefSection>

            {/* Section 2 — Target Users & Personas */}
            <BriefSection title="Target Users & Personas" icon="👥">
              {briefEdit ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Primary Users</label>
                    <textarea rows={3} value={bf('primary_users')} onChange={setTxt('primary_users')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none" placeholder="Đối tượng người dùng chính…" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pain Points & Expectations</label>
                    <textarea rows={3} value={bf('pain_points')} onChange={setTxt('pain_points')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none" placeholder="Vấn đề họ đang gặp, kỳ vọng họ có…" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">User / Role Matrix (mỗi dòng 1 entry: Role | Quyền hạn | Kỳ vọng)</label>
                    <textarea rows={5} value={bfArr('user_role_matrix')} onChange={setArr('user_role_matrix')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none font-mono text-xs"
                      placeholder={"BA | Tạo/sửa BRD, FRS | Workflow rõ ràng, phê duyệt nhanh\nDev | Read BRD/FRS | Tài liệu đầy đủ, API spec rõ\nQA | Tạo test case | Liên kết RTM tự động"} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <ViewField label="Primary Users" value={brief?.primary_users} />
                  <ViewField label="Pain Points & Expectations" value={brief?.pain_points} />
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">User / Role Matrix</p>
                    {lines(brief?.user_role_matrix)}
                  </div>
                </div>
              )}
            </BriefSection>

            {/* Section 3 — Functional Requirements */}
            <BriefSection title="Functional Requirements" icon="⚙️">
              {briefEdit ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Must Have Features (mỗi dòng 1 tính năng)</label>
                    <textarea rows={5} value={bfArr('must_have_features')} onChange={setArr('must_have_features')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none font-mono text-xs"
                      placeholder={"Đăng nhập SSO\nQuản lý hồ sơ nhân viên\nBáo cáo tổng hợp"} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nice to Have Features</label>
                    <textarea rows={5} value={bfArr('nice_to_have_features')} onChange={setArr('nice_to_have_features')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none font-mono text-xs"
                      placeholder={"Dashboard mobile\nExport Excel\nNotification real-time"} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">System Integrations (mỗi dòng: Tên hệ thống | Loại | Mô tả)</label>
                    <textarea rows={4} value={bfArr('system_integrations')} onChange={setArr('system_integrations')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none font-mono text-xs"
                      placeholder={"CoreBanking T24 | API REST | Đồng bộ thông tin tài khoản\nAD/LDAP | LDAP | Xác thực người dùng"} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Must Have</p>
                    {lines(brief?.must_have_features)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Nice to Have</p>
                    {lines(brief?.nice_to_have_features)}
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">System Integrations</p>
                    {lines(brief?.system_integrations)}
                  </div>
                </div>
              )}
            </BriefSection>

            {/* Section 4 — Non-Functional Requirements */}
            <BriefSection title="Non-Functional Requirements" icon="🛡️">
              {briefEdit ? (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Performance & Scalability</label>
                    <textarea rows={3} value={bf('performance_scalability')} onChange={setTxt('performance_scalability')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      placeholder="Response time < 2s, tải đồng thời 1000 users, uptime 99.9%…" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Regulatory, Compliance & Security</label>
                    <textarea rows={3} value={bf('compliance_security')} onChange={setTxt('compliance_security')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      placeholder="Tuân thủ Thông tư 09/2020, mã hoá AES-256, audit log…" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Availability & Reliability</label>
                    <textarea rows={3} value={bf('availability_reliability')} onChange={setTxt('availability_reliability')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      placeholder="RTO < 4h, RPO < 1h, DR site tại datacenter dự phòng…" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <ViewField label="Performance & Scalability" value={brief?.performance_scalability} />
                  <ViewField label="Regulatory, Compliance & Security" value={brief?.compliance_security} />
                  <ViewField label="Availability & Reliability" value={brief?.availability_reliability} />
                </div>
              )}
            </BriefSection>

            {/* Section 5 — Data & Reporting Needs */}
            <BriefSection title="Data & Reporting Needs" icon="📊">
              {briefEdit ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data Needs</label>
                    <textarea rows={4} value={bf('data_needs')} onChange={setTxt('data_needs')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      placeholder="Dữ liệu cần thiết, data retention, data migration…" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Reporting Needs</label>
                    <textarea rows={4} value={bf('reporting_needs')} onChange={setTxt('reporting_needs')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      placeholder="Báo cáo vận hành, dashboard KPI, export định kỳ…" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <ViewField label="Data Needs" value={brief?.data_needs} />
                  <ViewField label="Reporting Needs" value={brief?.reporting_needs} />
                </div>
              )}
            </BriefSection>

            {/* Section 6 — Constraints, Risks & Assumptions */}
            <BriefSection title="Constraints, Risks & Assumptions" icon="⚠️">
              {briefEdit ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Time Constraints</label>
                    <textarea rows={2} value={bf('time_constraints')} onChange={setTxt('time_constraints')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      placeholder="Deadline cứng, go-live mùa cao điểm, budget approval deadline…" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Dependencies (mỗi dòng 1 phụ thuộc)</label>
                    <textarea rows={4} value={bfArr('dependencies')} onChange={setArr('dependencies')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none font-mono text-xs"
                      placeholder={"CoreBanking upgrade hoàn thành trước Q3\nTeam DevOps cần setup môi trường SIT\nVendor cung cấp API trước tháng 5"} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Potential Risks (mỗi dòng: Rủi ro | Mức độ | Mitigation)</label>
                    <textarea rows={4} value={bfArr('potential_risks')} onChange={setArr('potential_risks')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none font-mono text-xs"
                      placeholder={"Scope creep | High | Strict change control process\nResource thiếu | Medium | Backup resource plan\nVendor delay | Medium | Penalty clause trong contract"} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="col-span-2">
                    <ViewField label="Time Constraints" value={brief?.time_constraints} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Dependencies</p>
                    {lines(brief?.dependencies)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Potential Risks</p>
                    {lines(brief?.potential_risks)}
                  </div>
                </div>
              )}
            </BriefSection>

            {/* Section 7 — Project Timeline & Roadmap */}
            <BriefSection title="Project Timeline & Roadmap" icon="🗓️">
              {briefEdit ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Key Milestones (mỗi dòng: Milestone | Target Date | Ghi chú)</label>
                    <textarea rows={5} value={bfArr('key_milestones_notes')} onChange={setArr('key_milestones_notes')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none font-mono text-xs"
                      placeholder={"BRD Sign-off | 2026-04-30 | Chờ approval từ CTO\nFRS Sign-off | 2026-05-31 |\nGo-Live | 2026-09-15 | Deadline cứng theo kế hoạch năm"} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Methodology</label>
                    <select value={briefForm.methodology ?? ''} onChange={e => setBriefForm(f => ({ ...f, methodology: e.target.value }))}
                      className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">— Chọn phương pháp —</option>
                      {METHODOLOGY_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Decision Makers (mỗi dòng: Tên | Vai trò | Quyết định)</label>
                    <textarea rows={4} value={bfArr('decision_makers')} onChange={setArr('decision_makers')}
                      className="w-full border rounded px-3 py-2 text-sm resize-none font-mono text-xs"
                      placeholder={"Nguyễn A | CTO | Approve architecture & budget\nTrần B | PO | Approve requirements & UAT\nLê C | PM | Approve timeline & resources"} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Key Milestones</p>
                    {lines(brief?.key_milestones_notes)}
                  </div>
                  <ViewField label="Methodology" value={brief?.methodology} />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Decision Makers</p>
                    {lines(brief?.decision_makers)}
                  </div>
                </div>
              )}
            </BriefSection>

            {brief?.updated_at && (
              <p className="text-xs text-gray-400 text-right">
                Brief cập nhật lần cuối: {new Date(brief.updated_at).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        )
      })()}

      {/* ── MILESTONES ───────────────────────────────────────────────────── */}
      {tab === 'milestones' && (() => {
        const TRACKS: { key: MilestoneTrack | 'all'; label: string; color: string }[] = [
          { key: 'all',     label: 'Tất cả', color: 'bg-gray-600' },
          { key: 'project', label: 'Project Track', color: 'bg-vib-blue' },
          { key: 'ba',      label: 'BA Track', color: 'bg-purple-600' },
          { key: 'test',    label: 'Test Track', color: 'bg-green-600' },
        ]
        const TRACK_BADGE: Record<string, string> = {
          project: 'bg-blue-50 text-blue-700',
          ba:      'bg-purple-50 text-purple-700',
          test:    'bg-green-50 text-green-700',
        }
        const filtered = milestoneTrack === 'all'
          ? milestones
          : milestones.filter((m) => m.track === milestoneTrack)

        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              {/* Track filter pills */}
              <div className="flex gap-1.5">
                {TRACKS.map((t) => {
                  const count = t.key === 'all'
                    ? milestones.length
                    : milestones.filter((m) => m.track === t.key).length
                  return (
                    <button key={t.key} onClick={() => setMilestoneTrack(t.key)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        milestoneTrack === t.key
                          ? `${t.color} text-white`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {t.label} ({count})
                    </button>
                  )
                })}
              </div>
              <button onClick={handleRegenMilestones}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                Tái sinh Milestones
              </button>
            </div>

            <div className="space-y-1.5">
              {filtered.length === 0 && (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
                  Chưa có milestone
                </div>
              )}
              {filtered.map((ms) => (
                <div key={ms.id} className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5 text-center shrink-0">{ms.sort_order}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{ms.name}</p>
                      {milestoneTrack === 'all' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TRACK_BADGE[ms.track] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ms.track}
                        </span>
                      )}
                    </div>
                    {ms.start_date && (
                      <p className="text-xs text-gray-400 mt-0.5">{ms.start_date} → {ms.end_date ?? 'TBD'}</p>
                    )}
                    {ms.done_criteria && (
                      <p className="text-xs text-gray-400 truncate max-w-lg">{ms.done_criteria}</p>
                    )}
                  </div>
                  <StatusBadge status={ms.status} />
                  <select value={ms.status}
                    onChange={(e) => handleMilestoneStatusChange(ms.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 shrink-0">
                    {MS_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── MEMBERS ──────────────────────────────────────────────────────── */}
      {tab === 'members' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowMemberModal(true)}
              className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-900">
              + Thêm thành viên
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Tên', 'Email', 'Role', 'Alias', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-6 text-sm">Chưa có thành viên</td></tr>
                )}
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{m.full_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{m.email || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{m.role}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{m.alias ? `@${m.alias}` : '—'}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDeleteMember(m.id)}
                        className="text-xs text-red-400 hover:text-red-600">Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FILES ────────────────────────────────────────────────────────── */}
      {tab === 'files' && (
        <div className="space-y-4">
          {/* Document folder structure */}
          {folders.length > 0 && (() => {
            const TRACK_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
              project: { label: 'Project Track', color: 'border-blue-200 bg-blue-50', icon: '📁' },
              ba:      { label: 'BA Track',      color: 'border-purple-200 bg-purple-50', icon: '📋' },
              test:    { label: 'Test Track',    color: 'border-green-200 bg-green-50', icon: '🧪' },
              management: { label: 'Quản lý',   color: 'border-gray-200 bg-gray-50', icon: '🗂️' },
            }
            const trackGroups = ['project', 'ba', 'test', 'management'] as const
            return (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Cấu trúc Tài liệu Dự án</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {trackGroups.map((t) => {
                    const cfg = TRACK_CONFIG[t]
                    const trackFolders = folders.filter((f) => f.track === t)
                    if (trackFolders.length === 0) return null
                    return (
                      <div key={t} className={`border rounded-lg p-3 ${cfg.color}`}>
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          {cfg.icon} {cfg.label}
                        </p>
                        <ul className="space-y-1">
                          {trackFolders.map((f) => (
                            <li key={f.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <span className="text-gray-400">📂</span>
                              <span className="truncate">{f.folder_name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          <div>
            <div className="flex justify-end mb-3">
              <button onClick={() => setShowFileModal(true)}
                className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-900">
                + Thêm file
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Tên file', 'Loại', 'Version', 'URL / Path', 'Uploaded by', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-6 text-sm">Chưa có file</td></tr>
                )}
                {files.map((f) => {
                  const isMd = f.name?.toLowerCase().endsWith('.md') && !!f.storage_path
                  const isExporting = gnmExporting === f.id
                  return (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-sm">{f.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{f.file_type}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{f.current_version}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">
                        {f.external_url
                          ? <a href={f.external_url} target="_blank" rel="noreferrer" className="text-vib-blue hover:underline">{f.external_url}</a>
                          : f.storage_path || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{f.created_by || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <button onClick={() => { setUploadTargetFile(f); setCopyUrlInput('') }}
                            className="text-xs text-vib-blue hover:underline whitespace-nowrap">
                            Upload {bumpVersion(f.current_version)}
                          </button>
                          {isMd && (
                            <button
                              disabled={isExporting}
                              onClick={async () => {
                                if (!id) return
                                setGnmExporting(f.id)
                                try {
                                  await exportFileGnm(id, f.id)
                                } catch (e) {
                                  show(`Export GNM thất bại: ${String(e)}`, 'error')
                                } finally {
                                  setGnmExporting(null)
                                }
                              }}
                              title="Export sang GNM Excel format"
                              className="text-xs text-green-700 hover:underline whitespace-nowrap disabled:opacity-40">
                              {isExporting ? '⏳ Đang xuất…' : '📊 GNM'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MEETINGS ─────────────────────────────────────────────────────── */}
      {tab === 'meetings' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowMeetingModal(true)}
              className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-900">
              + Parse Meeting Notes
            </button>
          </div>
          <div className="space-y-3">
            {meetings.length === 0 && (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">Chưa có biên bản họp</div>
            )}
            {meetings.map((m) => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-vib-blue transition-colors"
                onClick={() => setShowMeetingDetail(m)}>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{m.title}</p>
                  <span className="text-xs text-gray-400">{m.meeting_date || new Date(m.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
                {m.generated_content && (
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>👥 {m.generated_content.attendees?.length ?? 0} người</span>
                    <span>✅ {m.generated_content.decisions?.length ?? 0} decisions</span>
                    <span>📋 {m.generated_content.action_items?.length ?? 0} actions</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── APP REGISTRY ─────────────────────────────────────────────────── */}
      {tab === 'registry' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowRegistryModal(true)}
              className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-900">
              + Thêm object
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Code', 'Tên', 'Loại', 'Owner', 'Môi trường', 'Trạng thái'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registry.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-6 text-sm">Chưa có object nào</td></tr>
                )}
                {registry.map((obj) => (
                  <tr key={obj.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{obj.code}</td>
                    <td className="px-4 py-2.5 font-medium text-sm">{obj.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{obj.object_type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{obj.owner_team || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{obj.environment.join(', ') || '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={obj.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── QUẢN LÝ CHUNG ────────────────────────────────────────────────── */}
      {tab === 'management' && (
        <div className="space-y-6">
          {/* Stage Gate Control */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Stage Gate Control</SectionTitle>
              <button onClick={() => setShowGateModal(true)}
                className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium">
                + Thêm gate
              </button>
            </div>
            <div className="space-y-2">
              {stageGates.length === 0 && <p className="text-sm text-gray-400">Chưa có stage gate</p>}
              {stageGates.map((g) => (
                <div key={g.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                  <span className="text-xs text-gray-400 w-5 text-center">{g.stage_order}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{g.stage_name}</p>
                    {g.gate_date && <p className="text-xs text-gray-400">Gate date: {g.gate_date}</p>}
                  </div>
                  {g.sign_off_by && <span className="text-xs text-gray-500">Sign-off: {g.sign_off_by}</span>}
                  <select value={g.status}
                    onChange={(e) => handleGateStatusChange(g.id, e.target.value)}
                    className="text-xs border rounded px-2 py-1">
                    {['pending','in_progress','passed','failed','skipped'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Health Scoring */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Project Health Scoring (RAG)</SectionTitle>
              <button onClick={() => setShowHealthModal(true)}
                className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium">
                + Cập nhật
              </button>
            </div>
            {latestHealth ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: 'Overall', val: latestHealth.overall_rag },
                  { label: 'Schedule', val: latestHealth.schedule_rag },
                  { label: 'Budget', val: latestHealth.budget_rag },
                  { label: 'Scope', val: latestHealth.scope_rag },
                  { label: 'Team', val: latestHealth.team_rag },
                  { label: 'Risk', val: latestHealth.risk_rag },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <RagBadge rag={val as RagStatus | undefined} />
                  </div>
                ))}
                <div className="col-span-3 md:col-span-6 text-right">
                  <span className="text-xs text-gray-400">
                    Assessed: {latestHealth.assessed_date}
                    {latestHealth.assessed_by && ` by ${latestHealth.assessed_by}`}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Chưa có health score nào</p>
            )}
          </div>

          {/* Stakeholder Mapping */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Stakeholder Mapping</SectionTitle>
              <button onClick={() => setShowStakeholderModal(true)}
                className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium">
                + Thêm
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stakeholders.length === 0 && <p className="text-sm text-gray-400 col-span-3">Chưa có stakeholder</p>}
              {stakeholders.map((s) => (
                <div key={s.id} className="border border-gray-100 rounded-lg p-3">
                  <p className="font-medium text-sm">{s.name}</p>
                  {s.role && <p className="text-xs text-gray-500">{s.role}</p>}
                  {s.organization && <p className="text-xs text-gray-400">{s.organization}</p>}
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
                      Interest: {s.interest_level}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                      Influence: {s.influence_level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Model */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionTitle>Priority Model (WSJF)</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Business Value', key: 'business_value' as keyof PriorityUpsert },
                { label: 'Time Criticality', key: 'time_criticality' as keyof PriorityUpsert },
                { label: 'Risk Reduction', key: 'risk_reduction' as keyof PriorityUpsert },
                { label: 'Job Size', key: 'job_size' as keyof PriorityUpsert },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label} (1–10)</label>
                  <input
                    type="number" min={1} max={10} step={0.5}
                    value={(priorityForm[key] as number) ?? 1}
                    onChange={(e) => setPriorityForm({ ...priorityForm, [key]: parseFloat(e.target.value) || 1 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
            {priority && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg flex gap-4 text-sm">
                <span className="font-semibold text-blue-800">
                  WSJF Score: {priority.wsjf_score.toFixed(2)}
                </span>
                {priority.priority_rank && (
                  <span className="text-blue-600">Rank: #{priority.priority_rank}</span>
                )}
                {priority.assessed_by && (
                  <span className="text-blue-400 text-xs">by {priority.assessed_by}</span>
                )}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <input placeholder="Assessed by"
                value={priorityForm.assessed_by ?? ''}
                onChange={(e) => setPriorityForm({ ...priorityForm, assessed_by: e.target.value })}
                className="border rounded px-2 py-1 text-xs flex-1" />
              <button onClick={handleSavePriority}
                className="bg-vib-blue text-white px-4 py-1.5 rounded text-xs font-medium">
                Lưu WSJF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCTS ─────────────────────────────────────────────────────── */}
      {tab === 'products' && (
        <div className="flex gap-4">
          {/* Product list */}
          <div className="w-72 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Danh sách sản phẩm</p>
              <button onClick={() => setShowProductModal(true)}
                className="bg-vib-blue text-white px-2 py-1 rounded text-xs">+ Thêm</button>
            </div>
            <div className="space-y-1">
              {products.length === 0 && <p className="text-xs text-gray-400">Chưa có sản phẩm</p>}
              {products.map((p) => (
                <button key={p.id} onClick={() => handleSelectProduct(p)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedProduct?.id === p.id
                      ? 'border-vib-blue bg-blue-50 text-vib-blue'
                      : 'border-gray-100 hover:border-gray-200 text-gray-700'
                  }`}>
                  <p className="font-medium">{p.product_name}</p>
                  <p className="text-xs text-gray-400">{p.product_type} · {p.status}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Product detail */}
          <div className="flex-1 space-y-4">
            {!selectedProduct ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                Chọn sản phẩm để xem chi tiết
              </div>
            ) : (
              <>
                {/* Product overview */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <SectionTitle>Product Overview</SectionTitle>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-gray-400">Type</p><p>{selectedProduct.product_type}</p></div>
                    <div><p className="text-xs text-gray-400">Status</p><StatusBadge status={selectedProduct.status} /></div>
                    <div><p className="text-xs text-gray-400">Business Owner</p><p>{selectedProduct.business_owner || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Technical Owner</p><p>{selectedProduct.technical_owner || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Owner Team</p><p>{selectedProduct.owner_team || '—'}</p></div>
                    {selectedProduct.system_mappings.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400 mb-1">System Mappings</p>
                        <div className="flex gap-2 flex-wrap">
                          {selectedProduct.system_mappings.map((m, i) => (
                            <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {m.system_name} ({m.relation_type})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* App Detail */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <SectionTitle>App Architecture & Tech Stack</SectionTitle>
                    <button onClick={() => {
                      setAppDetailForm({
                        architecture_description: appDetail?.architecture_description,
                        tech_stack: appDetail?.tech_stack ?? [],
                        source_repo_url: appDetail?.source_repo_url,
                        current_version: appDetail?.current_version,
                        dependencies: appDetail?.dependencies ?? [],
                      })
                      setShowAppDetailModal(true)
                    }} className="text-xs text-vib-blue hover:underline">Chỉnh sửa</button>
                  </div>
                  {appDetail ? (
                    <div className="space-y-2 text-sm">
                      {appDetail.architecture_description && (
                        <p className="text-gray-600 text-xs">{appDetail.architecture_description}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {appDetail.tech_stack.map((t, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                            {t.name}{t.version ? ` ${t.version}` : ''}
                          </span>
                        ))}
                      </div>
                      {appDetail.source_repo_url && (
                        <p className="text-xs">
                          Repo: <a href={appDetail.source_repo_url} target="_blank" rel="noreferrer"
                            className="text-vib-blue hover:underline">{appDetail.source_repo_url}</a>
                        </p>
                      )}
                      {appDetail.current_version && (
                        <p className="text-xs text-gray-500">Version: {appDetail.current_version}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Chưa có thông tin</p>
                  )}
                </div>

                {/* Environments */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <SectionTitle>Môi trường (Environments)</SectionTitle>
                  <div className="grid grid-cols-5 gap-2">
                    {ENV_NAMES.map((env) => {
                      const e = environments.find((x) => x.env_name === env)
                      return (
                        <div key={env} className="border border-gray-100 rounded-lg p-3 text-center">
                          <p className="text-xs font-bold text-gray-700 mb-1">{env}</p>
                          {e ? (
                            <>
                              {Object.keys(e.access_info).length > 0 && (
                                <p className="text-xs text-green-600">Configured</p>
                              )}
                              <button onClick={() => {
                                setEnvForm({
                                  infra_info: e.infra_info,
                                  access_info: e.access_info,
                                  deployment_info: e.deployment_info,
                                  monitoring_setup: e.monitoring_setup,
                                })
                                setShowEnvModal(env)
                              }} className="text-xs text-vib-blue hover:underline mt-1 block">Chỉnh sửa</button>
                            </>
                          ) : (
                            <button onClick={() => { setEnvForm({}); setShowEnvModal(env) }}
                              className="text-xs text-gray-400 hover:text-vib-blue mt-1">+ Thêm</button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Batch Jobs (only for batch_job type) */}
                {(selectedProduct.product_type === 'batch_job') && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <SectionTitle>Batch Jobs</SectionTitle>
                      <button onClick={() => setShowJobModal(true)}
                        className="text-xs bg-vib-blue text-white px-2 py-1 rounded">+ Thêm</button>
                    </div>
                    <div className="space-y-2">
                      {batchJobs.length === 0 && <p className="text-xs text-gray-400">Chưa có job</p>}
                      {batchJobs.map((j) => (
                        <div key={j.id} className="border border-gray-100 rounded p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{j.job_name}</p>
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{j.trigger_type}</span>
                          </div>
                          {j.schedule && <p className="text-xs text-gray-500 mt-0.5">Schedule: {j.schedule}</p>}
                          {j.failure_handling && <p className="text-xs text-orange-500 mt-0.5">Failure: {j.failure_handling}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* App Standard Info (application / api / service) */}
                {(['application', 'api', 'service'] as const).includes(selectedProduct.product_type as 'application' | 'api' | 'service') && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <SectionTitle>Thông tin chuẩn ứng dụng</SectionTitle>
                      <button onClick={() => {
                        setAppStandardForm({
                          app_code: appStandard?.app_code,
                          app_full_name: appStandard?.app_full_name,
                          app_type: appStandard?.app_type,
                          criticality_level: appStandard?.criticality_level ?? 'medium',
                          platform: appStandard?.platform,
                          primary_language: appStandard?.primary_language,
                          framework: appStandard?.framework,
                          ui_framework: appStandard?.ui_framework,
                          database_tech: appStandard?.database_tech ?? [],
                          message_queue: appStandard?.message_queue,
                          api_style: appStandard?.api_style,
                          architecture_style: appStandard?.architecture_style,
                          hosting_type: appStandard?.hosting_type,
                          server_os: appStandard?.server_os,
                          network_zone: appStandard?.network_zone,
                          container_platform: appStandard?.container_platform,
                          source_repo_url: appStandard?.source_repo_url,
                          source_repo_type: appStandard?.source_repo_type,
                          current_version: appStandard?.current_version,
                          sla_uptime_pct: appStandard?.sla_uptime_pct,
                          rto_hours: appStandard?.rto_hours,
                          rpo_hours: appStandard?.rpo_hours,
                          maintenance_window: appStandard?.maintenance_window,
                          integration_list: appStandard?.integration_list ?? [],
                          data_classification: appStandard?.data_classification ?? 'internal',
                          compliance_standards: appStandard?.compliance_standards ?? [],
                          monitoring_tool: appStandard?.monitoring_tool,
                          log_management: appStandard?.log_management,
                          deployment_tool: appStandard?.deployment_tool,
                          backup_policy: appStandard?.backup_policy,
                          business_function: appStandard?.business_function,
                          target_users: appStandard?.target_users,
                          notes: appStandard?.notes,
                        })
                        setShowAppStandardModal(true)
                      }} className="text-xs text-vib-blue hover:underline">
                        {appStandard ? 'Chỉnh sửa' : '+ Thêm'}
                      </button>
                    </div>
                    {appStandard ? (
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div><p className="text-xs text-gray-400">App Code</p><p className="font-mono text-xs font-medium">{appStandard.app_code || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Criticality</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              appStandard.criticality_level === 'critical' ? 'bg-red-100 text-red-700' :
                              appStandard.criticality_level === 'high' ? 'bg-orange-100 text-orange-700' :
                              appStandard.criticality_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{appStandard.criticality_level}</span>
                          </div>
                          <div><p className="text-xs text-gray-400">Platform</p><p className="text-xs">{appStandard.platform || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Framework</p><p className="text-xs">{appStandard.framework || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Architecture</p><p className="text-xs">{appStandard.architecture_style || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Hosting</p><p className="text-xs">{appStandard.hosting_type || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Network Zone</p><p className="text-xs">{appStandard.network_zone || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">API Style</p><p className="text-xs">{appStandard.api_style || '—'}</p></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">SLA Uptime</p>
                            <p className="font-bold text-blue-800">{appStandard.sla_uptime_pct != null ? `${appStandard.sla_uptime_pct}%` : '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">RTO</p>
                            <p className="font-bold text-blue-800">{appStandard.rto_hours != null ? `${appStandard.rto_hours}h` : '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">RPO</p>
                            <p className="font-bold text-blue-800">{appStandard.rpo_hours != null ? `${appStandard.rpo_hours}h` : '—'}</p>
                          </div>
                        </div>
                        {appStandard.database_tech.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Database</p>
                            <div className="flex gap-2 flex-wrap">
                              {appStandard.database_tech.map((db, i) => (
                                <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {db.name}{db.version ? ` ${db.version}` : ''}{db.role ? ` (${db.role})` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {appStandard.compliance_standards.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Compliance Standards</p>
                            <div className="flex gap-2 flex-wrap">
                              {appStandard.compliance_standards.map((s, i) => (
                                <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {appStandard.integration_list.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Integrations ({appStandard.integration_list.length})</p>
                            <div className="space-y-1">
                              {appStandard.integration_list.map((intg, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="font-medium text-gray-700">{intg.system}</span>
                                  {intg.direction && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{intg.direction}</span>}
                                  {intg.protocol && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{intg.protocol}</span>}
                                  {intg.description && <span className="text-gray-400">{intg.description}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-3">
                          <div><p className="text-xs text-gray-400">Monitoring</p><p className="text-xs">{appStandard.monitoring_tool || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Log Mgmt</p><p className="text-xs">{appStandard.log_management || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Deployment</p><p className="text-xs">{appStandard.deployment_tool || '—'}</p></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Chưa có thông tin chuẩn. Nhấn "+ Thêm" để điền.</p>
                    )}
                  </div>
                )}

                {/* Job Standard Info (batch_job) */}
                {selectedProduct.product_type === 'batch_job' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <SectionTitle>Thông tin chuẩn Job</SectionTitle>
                      <button onClick={() => {
                        setJobStandardForm({
                          job_code: jobStandard?.job_code,
                          job_full_name: jobStandard?.job_full_name,
                          job_type: jobStandard?.job_type,
                          criticality_level: jobStandard?.criticality_level ?? 'medium',
                          run_platform: jobStandard?.run_platform,
                          run_language: jobStandard?.run_language,
                          run_framework: jobStandard?.run_framework,
                          run_server: jobStandard?.run_server,
                          frequency: jobStandard?.frequency,
                          schedule_cron: jobStandard?.schedule_cron,
                          schedule_description: jobStandard?.schedule_description,
                          expected_start_time: jobStandard?.expected_start_time,
                          deadline_time: jobStandard?.deadline_time,
                          expected_runtime_min: jobStandard?.expected_runtime_min,
                          max_runtime_min: jobStandard?.max_runtime_min,
                          data_volume_estimate: jobStandard?.data_volume_estimate,
                          failure_action: jobStandard?.failure_action,
                          success_criteria: jobStandard?.success_criteria,
                          reconciliation_check: jobStandard?.reconciliation_check,
                          data_classification: jobStandard?.data_classification ?? 'internal',
                          runbook_url: jobStandard?.runbook_url,
                          on_call_contact: jobStandard?.on_call_contact,
                          notes: jobStandard?.notes,
                        })
                        setShowJobStandardModal(true)
                      }} className="text-xs text-vib-blue hover:underline">
                        {jobStandard ? 'Chỉnh sửa' : '+ Thêm'}
                      </button>
                    </div>
                    {jobStandard ? (
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div><p className="text-xs text-gray-400">Job Code</p><p className="font-mono text-xs font-medium">{jobStandard.job_code || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Criticality</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              jobStandard.criticality_level === 'critical' ? 'bg-red-100 text-red-700' :
                              jobStandard.criticality_level === 'high' ? 'bg-orange-100 text-orange-700' :
                              jobStandard.criticality_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{jobStandard.criticality_level}</span>
                          </div>
                          <div><p className="text-xs text-gray-400">Job Type</p><p className="text-xs">{jobStandard.job_type || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Platform</p><p className="text-xs">{jobStandard.run_platform || '—'}</p></div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Lịch chạy</p>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <span><span className="text-gray-500">Tần suất:</span> <strong>{jobStandard.frequency || '—'}</strong></span>
                            {jobStandard.schedule_cron && <span className="font-mono bg-white px-2 py-0.5 rounded border">{jobStandard.schedule_cron}</span>}
                            {jobStandard.expected_start_time && <span><span className="text-gray-500">Bắt đầu:</span> {jobStandard.expected_start_time}</span>}
                            {jobStandard.deadline_time && <span><span className="text-gray-500">Deadline:</span> <strong className="text-red-600">{jobStandard.deadline_time}</strong></span>}
                            {jobStandard.expected_runtime_min != null && <span><span className="text-gray-500">Runtime:</span> ~{jobStandard.expected_runtime_min}m</span>}
                            {jobStandard.max_runtime_min != null && <span><span className="text-gray-500">Max:</span> {jobStandard.max_runtime_min}m</span>}
                          </div>
                          {jobStandard.schedule_description && (
                            <p className="text-xs text-gray-500 mt-1">{jobStandard.schedule_description}</p>
                          )}
                        </div>
                        {jobStandard.failure_action && (
                          <div>
                            <p className="text-xs text-gray-400">Xử lý lỗi</p>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{jobStandard.failure_action}</span>
                          </div>
                        )}
                        {jobStandard.success_criteria && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Tiêu chí thành công</p>
                            <p className="text-xs text-gray-600">{jobStandard.success_criteria}</p>
                          </div>
                        )}
                        {jobStandard.data_volume_estimate && (
                          <div>
                            <p className="text-xs text-gray-400">Khối lượng dữ liệu</p>
                            <p className="text-xs font-mono">{jobStandard.data_volume_estimate}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-3">
                          <div><p className="text-xs text-gray-400">Language</p><p className="text-xs">{jobStandard.run_language || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Framework</p><p className="text-xs">{jobStandard.run_framework || '—'}</p></div>
                          <div><p className="text-xs text-gray-400">Server</p><p className="text-xs">{jobStandard.run_server || '—'}</p></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Chưa có thông tin chuẩn. Nhấn "+ Thêm" để điền.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LICENSES ─────────────────────────────────────────────────────── */}
      {tab === 'licenses' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowLicenseModal(true)}
              className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium">
              + Thêm license
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Phần mềm', 'Loại', 'Vendor', 'Hết hạn', 'Chi phí', 'Compliance', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {licenses.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-6 text-sm">Chưa có license</td></tr>
                )}
                {licenses.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{l.software_name}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">{l.license_type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{l.vendor || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {l.expiry_date ? (
                        <span className={new Date(l.expiry_date) < new Date() ? 'text-red-500 font-medium' : ''}>
                          {l.expiry_date}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {l.cost_amount != null
                        ? `${l.cost_amount.toLocaleString('vi-VN')} ${l.cost_currency}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        l.compliance_status === 'compliant' ? 'bg-green-100 text-green-700' :
                        l.compliance_status === 'expired' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{l.compliance_status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => deleteLicense(id, l.id).then(() => setLicenses(ls => ls.filter(x => x.id !== l.id)))}
                        className="text-xs text-red-400 hover:text-red-600">Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CONTRACTS ────────────────────────────────────────────────────── */}
      {tab === 'contracts' && (
        <div className="flex gap-4">
          {/* Contract list */}
          <div className="w-72 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Danh sách hợp đồng</p>
              <button onClick={() => setShowContractModal(true)}
                className="bg-vib-blue text-white px-2 py-1 rounded text-xs">+ Thêm</button>
            </div>
            <div className="space-y-1">
              {contracts.length === 0 && <p className="text-xs text-gray-400">Chưa có hợp đồng</p>}
              {contracts.map((c) => (
                <button key={c.id} onClick={() => handleSelectContract(c)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedContract?.id === c.id
                      ? 'border-vib-blue bg-blue-50 text-vib-blue'
                      : 'border-gray-100 hover:border-gray-200 text-gray-700'
                  }`}>
                  <p className="font-medium truncate">{c.vendor_name}</p>
                  <p className="text-xs text-gray-400">
                    {c.contract_number ? `#${c.contract_number} · ` : ''}{c.status}
                  </p>
                  {c.contract_value != null && (
                    <p className="text-xs font-mono text-gray-500">
                      {c.contract_value.toLocaleString('vi-VN')} {c.currency}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Contract detail */}
          <div className="flex-1 space-y-4">
            {!selectedContract ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                Chọn hợp đồng để xem điều khoản và lịch thanh toán
              </div>
            ) : (
              <>
                {/* Contract header */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-base">{selectedContract.vendor_name}</p>
                      {selectedContract.contract_number && (
                        <p className="text-xs text-gray-400">Số HĐ: {selectedContract.contract_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={selectedContract.status} />
                      <button
                        onClick={() => deleteContract(id, selectedContract.id).then(() => {
                          setContracts((cs) => cs.filter((x) => x.id !== selectedContract.id))
                          setSelectedContract(null)
                        })}
                        className="text-xs text-red-400 hover:text-red-600">Xóa</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-gray-500">
                    <div>
                      <p className="text-gray-400">Loại HĐ</p>
                      <p>{selectedContract.contract_type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Hiệu lực</p>
                      <p>{selectedContract.start_date || '—'} → {selectedContract.expiry_date || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Giá trị HĐ</p>
                      <p className="font-mono font-medium text-gray-700">
                        {selectedContract.contract_value != null
                          ? `${selectedContract.contract_value.toLocaleString('vi-VN')} ${selectedContract.currency}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-0.5 border-b border-gray-200">
                  {(['terms', 'payments'] as const).map((st) => (
                    <button key={st} onClick={() => setContractSubTab(st)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        contractSubTab === st
                          ? 'border-vib-blue text-vib-blue'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}>
                      {st === 'terms' ? `Điều khoản (${contractTerms.length})` : `Thanh toán (${contractPayments.length})`}
                    </button>
                  ))}
                </div>

                {/* Terms sub-tab */}
                {contractSubTab === 'terms' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => { setTermForm({ title: '', content: '' }); setShowTermModal(true) }}
                        className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium">
                        + Thêm điều khoản
                      </button>
                    </div>
                    {contractTerms.length === 0 && (
                      <div className="bg-white rounded-xl border p-6 text-center text-gray-400 text-sm">
                        Chưa có điều khoản
                      </div>
                    )}
                    {/* Group by term_type */}
                    {Object.entries(
                      contractTerms.reduce((acc, t) => {
                        if (!acc[t.term_type]) acc[t.term_type] = []
                        acc[t.term_type].push(t)
                        return acc
                      }, {} as Record<string, ContractTerm[]>)
                    ).map(([termType, terms]) => (
                      <div key={termType} className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-3 pb-1 border-b border-gray-100">
                          {termType.replace('_', ' ')}
                        </p>
                        <div className="space-y-3">
                          {terms.map((t) => (
                            <div key={t.id} className={`p-3 rounded-lg border ${
                              t.is_key_term ? 'border-amber-300 bg-amber-50' : 'border-gray-100'
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium text-gray-800">{t.title}</p>
                                    {t.is_key_term && (
                                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                        Điều khoản quan trọng
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{t.content}</p>
                                  {(t.effective_date || t.expiry_date) && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      {t.effective_date && `Hiệu lực: ${t.effective_date}`}
                                      {t.expiry_date && ` → ${t.expiry_date}`}
                                    </p>
                                  )}
                                </div>
                                <button onClick={() => handleDeleteTerm(t.id)}
                                  className="text-xs text-red-400 hover:text-red-600 shrink-0">Xóa</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payments sub-tab */}
                {contractSubTab === 'payments' && (
                  <div className="space-y-3">
                    {/* Payment summary */}
                    {paymentSummary && (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {[
                          { label: 'Tổng HĐ', val: paymentSummary.total_scheduled, color: 'text-gray-700' },
                          { label: 'Đã TT', val: paymentSummary.total_paid, color: 'text-green-700' },
                          { label: 'Còn lại', val: paymentSummary.total_remaining, color: 'text-blue-700' },
                          { label: 'Đã xuất HĐ', val: paymentSummary.total_invoiced, color: 'text-purple-700' },
                          { label: 'Chờ TT', val: paymentSummary.total_pending, color: 'text-yellow-700' },
                          { label: 'Quá hạn', val: paymentSummary.total_overdue, color: 'text-red-700' },
                        ].map(({ label, val, color }) => (
                          <div key={label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className={`text-xs font-mono font-bold mt-1 ${color}`}>
                              {val.toLocaleString('vi-VN')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button onClick={() => { setPaymentForm({ milestone_name: '', amount: 0 }); setShowPaymentModal(true) }}
                        className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium">
                        + Thêm khoản TT
                      </button>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            {['#', 'Mốc thanh toán', 'Loại', 'Số tiền', 'Hạn TT', 'Trạng thái', ''].map((h) => (
                              <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {contractPayments.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center text-gray-400 py-6 text-sm">
                                Chưa có khoản thanh toán
                              </td>
                            </tr>
                          )}
                          {contractPayments.map((p) => {
                            const statusColor: Record<string, string> = {
                              paid: 'bg-green-100 text-green-700',
                              pending: 'bg-gray-100 text-gray-600',
                              invoiced: 'bg-purple-100 text-purple-700',
                              overdue: 'bg-red-100 text-red-700',
                              disputed: 'bg-orange-100 text-orange-700',
                              cancelled: 'bg-gray-100 text-gray-400 line-through',
                            }
                            return (
                              <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2.5 text-xs text-gray-400">{p.payment_order}</td>
                                <td className="px-3 py-2.5">
                                  <p className="font-medium text-sm">{p.milestone_name}</p>
                                  {p.percentage_of_total != null && (
                                    <p className="text-xs text-gray-400">{p.percentage_of_total}% tổng HĐ</p>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.payment_type}</span>
                                </td>
                                <td className="px-3 py-2.5 font-mono text-xs font-medium">
                                  {p.amount.toLocaleString('vi-VN')} {p.currency}
                                  {p.paid_amount != null && p.paid_amount !== p.amount && (
                                    <p className="text-green-600">TT: {p.paid_amount.toLocaleString('vi-VN')}</p>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-gray-500">
                                  {p.due_date ? (
                                    <span className={p.status === 'overdue' ? 'text-red-500 font-medium' : ''}>
                                      {p.due_date}
                                    </span>
                                  ) : '—'}
                                  {p.paid_date && <p className="text-green-600">TT: {p.paid_date}</p>}
                                </td>
                                <td className="px-3 py-2.5">
                                  <select value={p.status}
                                    onChange={(e) => handleUpdatePaymentStatus(p.id, e.target.value)}
                                    className={`text-xs px-1.5 py-0.5 rounded border-0 font-medium cursor-pointer ${statusColor[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {['pending','invoiced','paid','overdue','disputed','cancelled'].map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2.5">
                                  <button onClick={() => handleDeletePayment(p.id)}
                                    className="text-xs text-red-400 hover:text-red-600">Xóa</button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HANDOVER ─────────────────────────────────────────────────────── */}
      {tab === 'handover' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => {
              setHandoverForm({
                checklist_items: handover?.checklist_items ?? [],
                go_live_date: handover?.go_live_date,
                acceptance_sign_off_by: handover?.acceptance_sign_off_by,
                status: handover?.status ?? 'pending',
              })
              setShowHandoverModal(true)
            }} className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium">
              {handover ? 'Chỉnh sửa' : 'Tạo Handover'}
            </button>
          </div>
          {handover ? (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <SectionTitle>Handover Status</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <StatusBadge status={handover.status} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Go-live Date</p>
                    <p className="font-medium">{handover.go_live_date || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Sign-off By</p>
                    <p className="font-medium">{handover.acceptance_sign_off_by || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Sign-off Date</p>
                    <p className="font-medium">{handover.acceptance_sign_off_date || '—'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <SectionTitle>Handover Checklist</SectionTitle>
                <div className="space-y-2">
                  {handover.checklist_items.length === 0 && (
                    <p className="text-sm text-gray-400">Chưa có checklist item</p>
                  )}
                  {handover.checklist_items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-gray-100">
                      <span className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                        item.is_done ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {item.is_done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      <p className={`text-sm flex-1 ${item.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.item}
                      </p>
                      {item.done_by && <span className="text-xs text-gray-400">by {item.done_by}</span>}
                    </div>
                  ))}
                </div>
              </div>
              {handover.post_go_live_review_notes && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <SectionTitle>Post Go-live Review</SectionTitle>
                  <p className="text-sm text-gray-600">{handover.post_go_live_review_notes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              Chưa có thông tin handover
            </div>
          )}
        </div>
      )}

      {/* ── INTEGRATION LINKS ────────────────────────────────────────────── */}
      {tab === 'integrations' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowLinkModal(true)}
              className="bg-vib-blue text-white px-3 py-1.5 rounded text-xs font-medium">
              + Thêm link
            </button>
          </div>
          <div className="space-y-2">
            {integrationLinks.length === 0 && (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
                Chưa có integration link
              </div>
            )}
            {LINK_TYPES.map((lt) => {
              const group = integrationLinks.filter((l) => l.link_type === lt)
              if (group.length === 0) return null
              return (
                <div key={lt} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{lt.replace('_', ' ')}</p>
                  <div className="space-y-1">
                    {group.map((l) => (
                      <div key={l.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{l.title}</p>
                          {l.url && (
                            <a href={l.url} target="_blank" rel="noreferrer"
                              className="text-xs text-vib-blue hover:underline truncate block max-w-xs">
                              {l.url}
                            </a>
                          )}
                        </div>
                        {l.system_name && (
                          <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                            {l.system_name}
                          </span>
                        )}
                        <button
                          onClick={() => deleteIntegrationLink(id, l.id).then(() =>
                            setIntegrationLinks((ls) => ls.filter((x) => x.id !== l.id))
                          )}
                          className="text-xs text-red-400 hover:text-red-600">Xóa</button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── PCR (Project Change Request) ─────────────────────────────────── */}
      {tab === 'requests' && id && (
        <ProjectPCRTab
          projectId={id}
          projectLabel={`${project.code} — ${project.name}`}
        />
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────── */}

      {showMemberModal && (
        <Modal title="Thêm thành viên" onClose={() => setShowMemberModal(false)}>
          <form onSubmit={handleCreateMember} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Họ tên *</label>
              <input required value={memberForm.full_name}
                onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Email</label>
                <input type="email" value={memberForm.email ?? ''}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Role *</label>
                <select value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {MEMBER_ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Alias</label>
              <input value={memberForm.alias ?? ''}
                onChange={(e) => setMemberForm({ ...memberForm, alias: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="VD: john" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowMemberModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Thêm</button>
            </div>
          </form>
        </Modal>
      )}

      {showFileModal && (
        <Modal title="Thêm file" onClose={() => setShowFileModal(false)}>
          <form onSubmit={handleCreateFile} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tên file *</label>
              <input required value={fileForm.name}
                onChange={(e) => setFileForm({ ...fileForm, name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Loại</label>
              <select value={fileForm.file_type}
                onChange={(e) => setFileForm({ ...fileForm, file_type: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="uploaded">Uploaded</option>
                <option value="external_url">External URL</option>
                <option value="template">Template</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">URL</label>
              <input value={fileForm.external_url ?? ''}
                onChange={(e) => setFileForm({ ...fileForm, external_url: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowFileModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Tạo</button>
            </div>
          </form>
        </Modal>
      )}

      {uploadTargetFile && (
        <Modal title={`Upload version mới — ${uploadTargetFile.name}`} onClose={() => setUploadTargetFile(null)}>
          <form onSubmit={handleUploadNewVersion} className="space-y-3">
            <p className="text-xs text-gray-500">Current: {uploadTargetFile.current_version} → New: {bumpVersion(uploadTargetFile.current_version)}</p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">URL mới</label>
              <input value={copyUrlInput}
                onChange={(e) => setCopyUrlInput(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setUploadTargetFile(null)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Upload</button>
            </div>
          </form>
        </Modal>
      )}

      {showMeetingModal && (
        <Modal title="Parse Meeting Notes" onClose={() => setShowMeetingModal(false)} width="max-w-2xl">
          <form onSubmit={handleGenerateMeeting} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tiêu đề *</label>
                <input required value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ngày họp</label>
                <input type="date" value={meetingForm.meeting_date ?? ''}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ghi chú thô</label>
              <textarea rows={6} value={meetingForm.raw_notes}
                onChange={(e) => setMeetingForm({ ...meetingForm, raw_notes: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm font-mono" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowMeetingModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Parse & Lưu</button>
            </div>
          </form>
        </Modal>
      )}

      {showMeetingDetail && (
        <Modal title={showMeetingDetail.title} onClose={() => setShowMeetingDetail(null)} width="max-w-2xl">
          <div className="space-y-4 text-sm">
            {showMeetingDetail.generated_content?.decisions?.length > 0 && (
              <div>
                <p className="font-semibold mb-1">✅ Decisions</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {showMeetingDetail.generated_content.decisions.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
            {showMeetingDetail.generated_content?.action_items?.length > 0 && (
              <div>
                <p className="font-semibold mb-1">📋 Action Items</p>
                <div className="space-y-1">
                  {showMeetingDetail.generated_content.action_items.map((a, i) => (
                    <div key={i} className="flex gap-2 text-gray-600">
                      <span className="font-medium text-vib-blue">@{a.assignee}</span>
                      <span>{a.action}</span>
                      {a.due_date && <span className="text-gray-400">({a.due_date})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showRegistryModal && (
        <Modal title="Thêm object vào App Registry" onClose={() => setShowRegistryModal(false)}>
          <form onSubmit={handleCreateRegistry} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Loại *</label>
                <select value={regForm.object_type}
                  onChange={(e) => setRegForm({ ...regForm, object_type: e.target.value as typeof regForm.object_type })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {OBJ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Code *</label>
                <input required value={regForm.code}
                  onChange={(e) => setRegForm({ ...regForm, code: e.target.value.toUpperCase() })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tên *</label>
              <input required value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowRegistryModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Tạo</button>
            </div>
          </form>
        </Modal>
      )}

      {showGateModal && (
        <Modal title="Tạo Stage Gate" onClose={() => setShowGateModal(false)}>
          <form onSubmit={handleCreateGate} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tên stage *</label>
              <input required value={gateForm.stage_name}
                onChange={(e) => setGateForm({ ...gateForm, stage_name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="VD: Gate 1 - Requirements Approved" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Order</label>
                <input type="number" value={gateForm.stage_order ?? 0}
                  onChange={(e) => setGateForm({ ...gateForm, stage_order: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Gate Date</label>
                <input type="date" value={gateForm.gate_date ?? ''}
                  onChange={(e) => setGateForm({ ...gateForm, gate_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sign-off By</label>
              <input value={gateForm.sign_off_by ?? ''}
                onChange={(e) => setGateForm({ ...gateForm, sign_off_by: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowGateModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Tạo</button>
            </div>
          </form>
        </Modal>
      )}

      {showHealthModal && (
        <Modal title="Cập nhật Health Score" onClose={() => setShowHealthModal(false)}>
          <form onSubmit={handleCreateHealth} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Overall *', key: 'overall_rag' as keyof HealthScoreCreate, required: true },
                { label: 'Schedule', key: 'schedule_rag' as keyof HealthScoreCreate },
                { label: 'Budget', key: 'budget_rag' as keyof HealthScoreCreate },
                { label: 'Scope', key: 'scope_rag' as keyof HealthScoreCreate },
                { label: 'Team', key: 'team_rag' as keyof HealthScoreCreate },
                { label: 'Risk', key: 'risk_rag' as keyof HealthScoreCreate },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 mb-1">{label}</label>
                  <select
                    value={(healthForm[key] as string) ?? ''}
                    onChange={(e) => setHealthForm({ ...healthForm, [key]: e.target.value || undefined })}
                    className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="">—</option>
                    {ragOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Date</label>
                <input type="date" value={healthForm.assessed_date ?? ''}
                  onChange={(e) => setHealthForm({ ...healthForm, assessed_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Assessed By</label>
                <input value={healthForm.assessed_by ?? ''}
                  onChange={(e) => setHealthForm({ ...healthForm, assessed_by: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowHealthModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Lưu</button>
            </div>
          </form>
        </Modal>
      )}

      {showStakeholderModal && (
        <Modal title="Thêm Stakeholder" onClose={() => setShowStakeholderModal(false)}>
          <form onSubmit={handleCreateStakeholder} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tên *</label>
              <input required value={stakeholderForm.name}
                onChange={(e) => setStakeholderForm({ ...stakeholderForm, name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Role</label>
                <input value={stakeholderForm.role ?? ''}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, role: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Organization</label>
                <input value={stakeholderForm.organization ?? ''}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, organization: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Interest</label>
                <select value={stakeholderForm.interest_level ?? 'medium'}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, interest_level: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['low','medium','high'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Influence</label>
                <select value={stakeholderForm.influence_level ?? 'medium'}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, influence_level: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['low','medium','high'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowStakeholderModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Thêm</button>
            </div>
          </form>
        </Modal>
      )}

      {showProductModal && (
        <Modal title="Thêm sản phẩm" onClose={() => setShowProductModal(false)}>
          <form onSubmit={handleCreateProduct} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tên sản phẩm *</label>
              <input required value={productForm.product_name}
                onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Loại *</label>
              <select value={productForm.product_type}
                onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value as typeof productForm.product_type })}
                className="w-full border rounded px-3 py-2 text-sm">
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Business Owner</label>
                <input value={productForm.business_owner ?? ''}
                  onChange={(e) => setProductForm({ ...productForm, business_owner: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Technical Owner</label>
                <input value={productForm.technical_owner ?? ''}
                  onChange={(e) => setProductForm({ ...productForm, technical_owner: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Owner Team</label>
              <input value={productForm.owner_team ?? ''}
                onChange={(e) => setProductForm({ ...productForm, owner_team: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowProductModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Tạo</button>
            </div>
          </form>
        </Modal>
      )}

      {showEnvModal && (
        <Modal title={`Môi trường: ${showEnvModal}`} onClose={() => setShowEnvModal(null)} width="max-w-2xl">
          <form onSubmit={handleUpsertEnv} className="space-y-4">
            {[
              { label: 'Infrastructure Info', key: 'infra_info', placeholder: '{"server_type":"K8s","provider":"Azure","spec":"4vCPU/8GB"}' },
              { label: 'Access Info', key: 'access_info', placeholder: '{"url":"https://app.dev.vib.vn","port":443,"vpn_required":true}' },
              { label: 'Deployment Info', key: 'deployment_info', placeholder: '{"ci_cd_tool":"ADO","pipeline_url":"...","deploy_branch":"main"}' },
              { label: 'Monitoring Setup', key: 'monitoring_setup', placeholder: '{"tool":"Grafana","dashboard_url":"..."}' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-600 mb-1">{label} (JSON)</label>
                <textarea rows={2}
                  value={JSON.stringify((envForm as Record<string, unknown>)[key] ?? {})}
                  onChange={(e) => {
                    try { setEnvForm({ ...envForm, [key]: JSON.parse(e.target.value) }) } catch { /* ignore */ }
                  }}
                  className="w-full border rounded px-3 py-2 text-xs font-mono"
                  placeholder={placeholder} />
              </div>
            ))}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowEnvModal(null)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Lưu</button>
            </div>
          </form>
        </Modal>
      )}

      {showAppDetailModal && (
        <Modal title="App Architecture & Tech Stack" onClose={() => setShowAppDetailModal(false)} width="max-w-2xl">
          <form onSubmit={handleSaveAppDetail} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Architecture Description</label>
              <textarea rows={3} value={appDetailForm.architecture_description ?? ''}
                onChange={(e) => setAppDetailForm({ ...appDetailForm, architecture_description: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Source Repo URL</label>
                <input value={appDetailForm.source_repo_url ?? ''}
                  onChange={(e) => setAppDetailForm({ ...appDetailForm, source_repo_url: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="https://dev.azure.com/..." />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Current Version</label>
                <input value={appDetailForm.current_version ?? ''}
                  onChange={(e) => setAppDetailForm({ ...appDetailForm, current_version: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="v2.4.1" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tech Stack (JSON array)</label>
              <textarea rows={2}
                value={JSON.stringify(appDetailForm.tech_stack ?? [])}
                onChange={(e) => {
                  try { setAppDetailForm({ ...appDetailForm, tech_stack: JSON.parse(e.target.value) }) } catch { /* ignore */ }
                }}
                className="w-full border rounded px-3 py-2 text-xs font-mono"
                placeholder='[{"name":"Python","version":"3.11","category":"backend"},{"name":"FastAPI","version":"0.115","category":"backend"}]' />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Dependencies (JSON array)</label>
              <textarea rows={2}
                value={JSON.stringify(appDetailForm.dependencies ?? [])}
                onChange={(e) => {
                  try { setAppDetailForm({ ...appDetailForm, dependencies: JSON.parse(e.target.value) }) } catch { /* ignore */ }
                }}
                className="w-full border rounded px-3 py-2 text-xs font-mono"
                placeholder='[{"system_name":"Oracle DB","dep_type":"upstream","criticality":"critical"}]' />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowAppDetailModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Lưu</button>
            </div>
          </form>
        </Modal>
      )}

      {showJobModal && (
        <Modal title="Thêm Batch Job" onClose={() => setShowJobModal(false)}>
          <form onSubmit={handleCreateJob} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tên job *</label>
              <input required value={jobForm.job_name}
                onChange={(e) => setJobForm({ ...jobForm, job_name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Schedule (cron)</label>
                <input value={jobForm.schedule ?? ''}
                  onChange={(e) => setJobForm({ ...jobForm, schedule: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="0 2 * * *" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Trigger Type</label>
                <select value={jobForm.trigger_type ?? 'scheduled'}
                  onChange={(e) => setJobForm({ ...jobForm, trigger_type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['scheduled','event','manual','api_call'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Failure Handling</label>
              <input value={jobForm.failure_handling ?? ''}
                onChange={(e) => setJobForm({ ...jobForm, failure_handling: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="Retry 3x, then alert to #ops-channel" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowJobModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Tạo</button>
            </div>
          </form>
        </Modal>
      )}

      {showLicenseModal && (
        <Modal title="Thêm License" onClose={() => setShowLicenseModal(false)}>
          <form onSubmit={handleCreateLicense} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Phần mềm *</label>
              <input required value={licenseForm.software_name}
                onChange={(e) => setLicenseForm({ ...licenseForm, software_name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Loại *</label>
                <select value={licenseForm.license_type}
                  onChange={(e) => setLicenseForm({ ...licenseForm, license_type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['commercial','open_source','freeware','proprietary','subscription'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Vendor</label>
                <input value={licenseForm.vendor ?? ''}
                  onChange={(e) => setLicenseForm({ ...licenseForm, vendor: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ngày hết hạn</label>
                <input type="date" value={licenseForm.expiry_date ?? ''}
                  onChange={(e) => setLicenseForm({ ...licenseForm, expiry_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Chi phí (VND)</label>
                <input type="number" value={licenseForm.cost_amount ?? ''}
                  onChange={(e) => setLicenseForm({ ...licenseForm, cost_amount: parseFloat(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowLicenseModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Thêm</button>
            </div>
          </form>
        </Modal>
      )}

      {showContractModal && (
        <Modal title="Thêm Hợp đồng" onClose={() => setShowContractModal(false)}>
          <form onSubmit={handleCreateContract} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Vendor *</label>
              <input required value={contractForm.vendor_name}
                onChange={(e) => setContractForm({ ...contractForm, vendor_name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Số hợp đồng</label>
                <input value={contractForm.contract_number ?? ''}
                  onChange={(e) => setContractForm({ ...contractForm, contract_number: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Loại HĐ</label>
                <input value={contractForm.contract_type ?? ''}
                  onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="maintenance/SaaS/support" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ngày hết hạn</label>
                <input type="date" value={contractForm.expiry_date ?? ''}
                  onChange={(e) => setContractForm({ ...contractForm, expiry_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Giá trị (VND)</label>
                <input type="number" value={contractForm.contract_value ?? ''}
                  onChange={(e) => setContractForm({ ...contractForm, contract_value: parseFloat(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowContractModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Thêm</button>
            </div>
          </form>
        </Modal>
      )}

      {showTermModal && (
        <Modal title="Thêm điều khoản hợp đồng" onClose={() => setShowTermModal(false)} width="max-w-2xl">
          <form onSubmit={handleCreateTerm} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tiêu đề *</label>
                <input required value={termForm.title}
                  onChange={(e) => setTermForm({ ...termForm, title: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Loại điều khoản</label>
                <select value={termForm.term_type ?? 'general'}
                  onChange={(e) => setTermForm({ ...termForm, term_type: e.target.value as typeof termForm.term_type })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['general','sla','warranty','penalty','liability','confidential','termination','ip_ownership','payment_term','acceptance','other'].map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nội dung *</label>
              <textarea required rows={5} value={termForm.content}
                onChange={(e) => setTermForm({ ...termForm, content: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ngày hiệu lực</label>
                <input type="date" value={termForm.effective_date ?? ''}
                  onChange={(e) => setTermForm({ ...termForm, effective_date: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ngày hết hạn</label>
                <input type="date" value={termForm.expiry_date ?? ''}
                  onChange={(e) => setTermForm({ ...termForm, expiry_date: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={termForm.is_key_term ?? false}
                onChange={(e) => setTermForm({ ...termForm, is_key_term: e.target.checked })}
                className="rounded" />
              Điều khoản quan trọng (key term)
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowTermModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Thêm</button>
            </div>
          </form>
        </Modal>
      )}

      {showPaymentModal && (
        <Modal title="Thêm khoản thanh toán" onClose={() => setShowPaymentModal(false)} width="max-w-2xl">
          <form onSubmit={handleCreatePayment} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Mốc thanh toán *</label>
                <input required value={paymentForm.milestone_name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, milestone_name: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="VD: Tạm ứng 30%" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Loại thanh toán</label>
                <select value={paymentForm.payment_type ?? 'progress'}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value as typeof paymentForm.payment_type })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['advance','progress','acceptance','warranty','maintenance','final','penalty','refund'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Số tiền *</label>
                <input required type="number" min={0} value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">% tổng HĐ</label>
                <input type="number" min={0} max={100} step={0.1} value={paymentForm.percentage_of_total ?? ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, percentage_of_total: parseFloat(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="30" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hạn thanh toán</label>
                <input type="date" value={paymentForm.due_date ?? ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Số thứ tự</label>
                <input type="number" min={0} value={paymentForm.payment_order ?? ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_order: parseInt(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Căn cứ thanh toán</label>
              <textarea rows={2} value={paymentForm.payment_basis ?? ''}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_basis: e.target.value || undefined })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="VD: Sau khi ký hợp đồng, nghiệm thu giai đoạn 1..." />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Thêm</button>
            </div>
          </form>
        </Modal>
      )}

      {showAppStandardModal && (
        <Modal title="Thông tin chuẩn ứng dụng" onClose={() => setShowAppStandardModal(false)} width="max-w-3xl">
          <form onSubmit={handleSaveAppStandard} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">App Code</label>
                <input value={appStandardForm.app_code ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, app_code: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="CBS_CORE_APP" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">App Full Name</label>
                <input value={appStandardForm.app_full_name ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, app_full_name: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">App Type</label>
                <select value={appStandardForm.app_type ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, app_type: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">-- Chọn --</option>
                  {['web_app','mobile_ios','mobile_android','mobile_hybrid','desktop','api','microservice','integration','reporting'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Criticality</label>
                <select value={appStandardForm.criticality_level ?? 'medium'}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, criticality_level: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['critical','high','medium','low'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase border-b pb-1">Công nghệ</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Platform', key: 'platform', ph: '.NET / Java / Python / NodeJS' },
                { label: 'Primary Language', key: 'primary_language', ph: 'C# / Java / Python / TypeScript' },
                { label: 'Framework', key: 'framework', ph: 'FastAPI / Spring Boot / Next.js' },
                { label: 'UI Framework', key: 'ui_framework', ph: 'React / Angular / Vue / Blazor' },
                { label: 'Message Queue', key: 'message_queue', ph: 'Kafka / RabbitMQ / Azure SB' },
                { label: 'API Style', key: 'api_style', ph: 'REST / GraphQL / SOAP / gRPC' },
              ].map(({ label, key, ph }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 mb-1">{label}</label>
                  <input value={(appStandardForm as Record<string, unknown>)[key] as string ?? ''}
                    onChange={(e) => setAppStandardForm({ ...appStandardForm, [key]: e.target.value || undefined })}
                    className="w-full border rounded px-3 py-2 text-sm" placeholder={ph} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Database Tech (JSON)</label>
              <textarea rows={2}
                value={JSON.stringify(appStandardForm.database_tech ?? [])}
                onChange={(e) => { try { setAppStandardForm({ ...appStandardForm, database_tech: JSON.parse(e.target.value) }) } catch { /* ignore */ } }}
                className="w-full border rounded px-3 py-2 text-xs font-mono"
                placeholder='[{"name":"Oracle","version":"19c","role":"primary"},{"name":"Redis","version":"7","role":"cache"}]' />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase border-b pb-1">Kiến trúc & Hạ tầng</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Architecture Style</label>
                <select value={appStandardForm.architecture_style ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, architecture_style: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">-- Chọn --</option>
                  {['monolith','microservice','serverless','event_driven','soa','layered','hexagonal'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hosting Type</label>
                <select value={appStandardForm.hosting_type ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, hosting_type: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">-- Chọn --</option>
                  {['on_premise','cloud_azure','cloud_aws','cloud_gcp','hybrid','saas','paas'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Network Zone</label>
                <select value={appStandardForm.network_zone ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, network_zone: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">-- Chọn --</option>
                  {['internet','dmz','intranet','closed'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Container Platform</label>
                <input value={appStandardForm.container_platform ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, container_platform: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="Docker / Kubernetes / OpenShift" />
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase border-b pb-1">SLA & Khả dụng</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">SLA Uptime (%)</label>
                <input type="number" step={0.01} min={0} max={100} value={appStandardForm.sla_uptime_pct ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, sla_uptime_pct: parseFloat(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="99.9" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">RTO (giờ)</label>
                <input type="number" min={0} value={appStandardForm.rto_hours ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, rto_hours: parseInt(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="4" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">RPO (giờ)</label>
                <input type="number" min={0} value={appStandardForm.rpo_hours ?? ''}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, rpo_hours: parseInt(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="1" />
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase border-b pb-1">Tuân thủ & Bảo mật</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Classification</label>
                <select value={appStandardForm.data_classification ?? 'internal'}
                  onChange={(e) => setAppStandardForm({ ...appStandardForm, data_classification: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['public','internal','confidential','restricted','secret'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Compliance Standards (JSON array)</label>
                <input value={JSON.stringify(appStandardForm.compliance_standards ?? [])}
                  onChange={(e) => { try { setAppStandardForm({ ...appStandardForm, compliance_standards: JSON.parse(e.target.value) }) } catch { /* ignore */ } }}
                  className="w-full border rounded px-3 py-2 text-xs font-mono" placeholder='["PCI-DSS","ISO27001"]' />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Integration List (JSON)</label>
              <textarea rows={2}
                value={JSON.stringify(appStandardForm.integration_list ?? [])}
                onChange={(e) => { try { setAppStandardForm({ ...appStandardForm, integration_list: JSON.parse(e.target.value) }) } catch { /* ignore */ } }}
                className="w-full border rounded px-3 py-2 text-xs font-mono"
                placeholder='[{"system":"CBS","direction":"upstream","protocol":"REST","description":"Lấy thông tin tài khoản"}]' />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase border-b pb-1">Vận hành</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Monitoring Tool', key: 'monitoring_tool', ph: 'Grafana / Datadog / Zabbix' },
                { label: 'Log Management', key: 'log_management', ph: 'ELK / Splunk / Azure Monitor' },
                { label: 'Deployment Tool', key: 'deployment_tool', ph: 'ADO Pipeline / Jenkins / ArgoCD' },
              ].map(({ label, key, ph }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 mb-1">{label}</label>
                  <input value={(appStandardForm as Record<string, unknown>)[key] as string ?? ''}
                    onChange={(e) => setAppStandardForm({ ...appStandardForm, [key]: e.target.value || undefined })}
                    className="w-full border rounded px-3 py-2 text-sm" placeholder={ph} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white pb-1">
              <button type="button" onClick={() => setShowAppStandardModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Lưu</button>
            </div>
          </form>
        </Modal>
      )}

      {showJobStandardModal && (
        <Modal title="Thông tin chuẩn Job" onClose={() => setShowJobStandardModal(false)} width="max-w-3xl">
          <form onSubmit={handleSaveJobStandard} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Job Code</label>
                <input value={jobStandardForm.job_code ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, job_code: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="CBS_SETTLEMENT_JOB" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Job Full Name</label>
                <input value={jobStandardForm.job_full_name ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, job_full_name: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Job Type</label>
                <select value={jobStandardForm.job_type ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, job_type: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">-- Chọn --</option>
                  {['etl','report','sync','cleanup','notification','interface','calculation','validation','archive','other'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Criticality</label>
                <select value={jobStandardForm.criticality_level ?? 'medium'}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, criticality_level: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['critical','high','medium','low'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase border-b pb-1">Nền tảng & Công nghệ</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Run Platform</label>
                <select value={jobStandardForm.run_platform ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, run_platform: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">-- Chọn --</option>
                  {['windows_task','linux_cron','k8s_cronjob','cloud_function','ado_pipeline','airflow','spring_batch','quartz','other'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Language</label>
                <input value={jobStandardForm.run_language ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, run_language: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="Python / Java / Shell / SSIS" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Framework</label>
                <input value={jobStandardForm.run_framework ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, run_framework: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="Spring Batch / Apache Spark / Pandas" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Run Server</label>
                <input value={jobStandardForm.run_server ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, run_server: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="batch-server-01.vib.local" />
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase border-b pb-1">Lịch chạy</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tần suất</label>
                <select value={jobStandardForm.frequency ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, frequency: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">-- Chọn --</option>
                  {['real_time','hourly','daily','weekly','monthly','quarterly','yearly','on_demand','event_driven'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Cron Expression</label>
                <input value={jobStandardForm.schedule_cron ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, schedule_cron: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="0 2 * * *" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Giờ bắt đầu</label>
                <input value={jobStandardForm.expected_start_time ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, expected_start_time: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="02:00 ICT" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Deadline (phải xong trước)</label>
                <input value={jobStandardForm.deadline_time ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, deadline_time: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="04:00 ICT" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Runtime dự kiến (phút)</label>
                <input type="number" min={0} value={jobStandardForm.expected_runtime_min ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, expected_runtime_min: parseInt(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">SLA runtime tối đa (phút)</label>
                <input type="number" min={0} value={jobStandardForm.max_runtime_min ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, max_runtime_min: parseInt(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase border-b pb-1">Xử lý lỗi</p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Failure Action</label>
              <select value={jobStandardForm.failure_action ?? ''}
                onChange={(e) => setJobStandardForm({ ...jobStandardForm, failure_action: e.target.value || undefined })}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">-- Chọn --</option>
                {['alert_only','stop_pipeline','rollback','skip_and_continue','manual_intervention'].map((t) => <option key={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tiêu chí thành công</label>
              <textarea rows={2} value={jobStandardForm.success_criteria ?? ''}
                onChange={(e) => setJobStandardForm({ ...jobStandardForm, success_criteria: e.target.value || undefined })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="VD: Số records processed = số records nguồn, không có lỗi, đối soát báo cáo khớp" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Data Volume Estimate</label>
              <input value={jobStandardForm.data_volume_estimate ?? ''}
                onChange={(e) => setJobStandardForm({ ...jobStandardForm, data_volume_estimate: e.target.value || undefined })}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="~500K records / 200MB per run" />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase border-b pb-1">Tuân thủ & Vận hành</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Classification</label>
                <select value={jobStandardForm.data_classification ?? 'internal'}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, data_classification: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['public','internal','confidential','restricted','secret'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">On-call Contact</label>
                <input value={jobStandardForm.on_call_contact ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, on_call_contact: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="ops@vib.com.vn / #ops-channel" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Runbook URL</label>
                <input value={jobStandardForm.runbook_url ?? ''}
                  onChange={(e) => setJobStandardForm({ ...jobStandardForm, runbook_url: e.target.value || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="https://confluence.vib.vn/..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white pb-1">
              <button type="button" onClick={() => setShowJobStandardModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Lưu</button>
            </div>
          </form>
        </Modal>
      )}

      {showHandoverModal && (
        <Modal title="Handover" onClose={() => setShowHandoverModal(false)} width="max-w-2xl">
          <form onSubmit={handleSaveHandover} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Go-live Date</label>
                <input type="date" value={handoverForm.go_live_date ?? ''}
                  onChange={(e) => setHandoverForm({ ...handoverForm, go_live_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Status</label>
                <select value={handoverForm.status ?? 'pending'}
                  onChange={(e) => setHandoverForm({ ...handoverForm, status: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {['pending','in_progress','completed'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sign-off By</label>
                <input value={handoverForm.acceptance_sign_off_by ?? ''}
                  onChange={(e) => setHandoverForm({ ...handoverForm, acceptance_sign_off_by: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sign-off Date</label>
                <input type="date" value={handoverForm.acceptance_sign_off_date ?? ''}
                  onChange={(e) => setHandoverForm({ ...handoverForm, acceptance_sign_off_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Checklist Items (JSON)</label>
              <textarea rows={3}
                value={JSON.stringify(handoverForm.checklist_items ?? [])}
                onChange={(e) => {
                  try { setHandoverForm({ ...handoverForm, checklist_items: JSON.parse(e.target.value) }) } catch { /* ignore */ }
                }}
                className="w-full border rounded px-3 py-2 text-xs font-mono"
                placeholder='[{"item":"Deploy to PROD","is_done":false},{"item":"UAT sign-off","is_done":true,"done_by":"PM"}]' />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowHandoverModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Lưu</button>
            </div>
          </form>
        </Modal>
      )}

      {showLinkModal && (
        <Modal title="Thêm Integration Link" onClose={() => setShowLinkModal(false)}>
          <form onSubmit={handleCreateLink} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Loại *</label>
                <select value={linkForm.link_type}
                  onChange={(e) => setLinkForm({ ...linkForm, link_type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {LINK_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">System</label>
                <input value={linkForm.system_name ?? ''}
                  onChange={(e) => setLinkForm({ ...linkForm, system_name: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="ADO / Confluence / Jira" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tiêu đề *</label>
              <input required value={linkForm.title}
                onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">URL</label>
              <input value={linkForm.url ?? ''}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-sm border rounded text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-vib-blue text-white rounded">Thêm</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  )
}
