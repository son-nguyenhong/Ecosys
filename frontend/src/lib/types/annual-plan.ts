/**
 * Types for Annual Plan module (FR-019 – FR-022)
 * BRD Reference: BRD-001 v1.1
 */

export type AnnualPlanStatus = 'draft' | 'active' | 'closed'

export interface AnnualPlan {
  id: string
  name: string
  year: number
  description?: string
  domain?: string
  start_date?: string
  end_date?: string
  related_systems?: string[]
  status: AnnualPlanStatus
  objectives_count: number
  dod_completion_pct: number
  projects_count: number
  created_at: string
  created_by: string
}

export interface AnnualPlanDetail extends AnnualPlan {
  objectives: Objective[]
  dod_items: DodItem[]
  projects: LinkedProject[]
}

export interface Objective {
  id: string
  plan_id: string
  title: string
  description?: string
  sort_order: number
  created_at: string
}

export interface ObjectiveCreate {
  title: string
  description?: string
  sort_order?: number
}

export interface DodItem {
  id: string
  plan_id: string
  criterion: string
  weight: number
  is_achieved: boolean
  notes?: string
  updated_at?: string
}

export interface DodItemCreate {
  criterion: string
  weight: number
}

export interface DodItemUpdate {
  is_achieved: boolean
  notes?: string
}

export interface LinkedProject {
  project_id: string
  name: string
  status: string
  linked_at: string
}

export interface AnnualPlanCreate {
  name: string
  year: number
  description?: string
  domain?: string
  start_date?: string
  end_date?: string
  related_systems?: string[]
  objectives: ObjectiveCreate[]
  dod_items: DodItemCreate[]
}

export interface AnnualPlanUpdate {
  name?: string
  year?: number
  description?: string
  domain?: string
  start_date?: string
  end_date?: string
  related_systems?: string[]
}

export type AnnualPlanAction = 'activate' | 'close'

export interface AnnualPlanStatusRequest {
  action: AnnualPlanAction
}

/** Dashboard summary for a plan (FR-022) */
export interface AnnualPlanSummary {
  plan: Pick<AnnualPlan, 'id' | 'name' | 'year' | 'status'>
  dod_completion_pct: number
  projects_by_status: {
    active: number
    on_hold: number
    completed: number
    archived: number
  }
  projects: AnnualPlanProjectSummary[]
}

export interface AnnualPlanProjectSummary {
  id: string
  name: string
  status: string
  milestone_progress: string
  ba_docs_approved: number
  test_coverage_pct: number
}

// ── Extended modules (V018) ────────────────────────────────────

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type InitiativeStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'
export type KpiStatus = 'on_track' | 'at_risk' | 'off_track' | 'achieved'
export type RiskStatus = 'open' | 'mitigated' | 'closed' | 'occurred'
export type BudgetType = 'capex' | 'opex'

export interface Initiative {
  id: string; plan_id: string; title: string; description?: string
  quarter?: Quarter; priority: number; status: InitiativeStatus
  sort_order: number; created_by?: string; created_at: string; updated_at: string
}
export interface InitiativeCreate {
  title: string; description?: string; quarter?: Quarter
  priority?: number; status?: InitiativeStatus; sort_order?: number
}
export interface InitiativeUpdate extends Partial<InitiativeCreate> {}

export interface BizObjective {
  id: string; plan_id: string; title: string; description?: string
  biz_owner?: string; category?: string; sort_order: number
  initiative_ids: string[]; created_at: string; updated_at: string
}
export interface BizObjectiveCreate {
  title: string; description?: string; biz_owner?: string
  category?: string; sort_order?: number
}
export interface BizObjectiveUpdate extends Partial<BizObjectiveCreate> {}

export interface BudgetEntry {
  id: string; plan_id: string; initiative_id?: string; project_id?: string
  label: string; budget_type: BudgetType; quarter?: Quarter
  amount_planned: number; amount_actual: number; currency: string
  notes?: string; created_at: string; updated_at: string
}
export interface BudgetCreate {
  label: string; budget_type: BudgetType; quarter?: Quarter
  initiative_id?: string; project_id?: string
  amount_planned?: number; amount_actual?: number
  currency?: string; notes?: string
}
export interface BudgetUpdate extends Partial<Omit<BudgetCreate, 'budget_type'>> {}

export interface ResourceAlloc {
  id: string; plan_id: string; initiative_id?: string; project_id?: string
  member_name: string; role?: string; team?: string
  allocation_pct: number; quarter?: Quarter; notes?: string
  created_at: string; updated_at: string
}
export interface ResourceCreate {
  member_name: string; role?: string; team?: string
  allocation_pct?: number; quarter?: Quarter
  initiative_id?: string; project_id?: string; notes?: string
}
export interface ResourceUpdate extends Partial<ResourceCreate> {}

export interface PlanKpi {
  id: string; plan_id: string; initiative_id?: string; biz_obj_id?: string
  metric_name: string; unit?: string
  target_value?: number; actual_value?: number
  quarter?: Quarter; status: KpiStatus; notes?: string
  created_at: string; updated_at: string
}
export interface KpiCreate {
  metric_name: string; unit?: string
  target_value?: number; actual_value?: number
  quarter?: Quarter; initiative_id?: string; biz_obj_id?: string
  status?: KpiStatus; notes?: string
}
export interface KpiUpdate extends Partial<KpiCreate> {}

export interface Dependency {
  id: string; plan_id: string
  from_project_id?: string; to_project_id?: string
  from_label: string; to_label: string
  dep_type: string; description?: string; status: string
  created_at: string; updated_at: string
}
export interface DependencyCreate {
  from_label: string; to_label: string
  from_project_id?: string; to_project_id?: string
  dep_type?: string; description?: string; status?: string
}
export interface DependencyUpdate extends Partial<DependencyCreate> {}

export interface PlanRisk {
  id: string; plan_id: string; title: string; description?: string
  category?: string; probability: number; impact: number; risk_score: number
  mitigation?: string; contingency?: string; owner?: string
  quarter?: Quarter; status: RiskStatus
  created_at: string; updated_at: string
}
export interface RiskCreate {
  title: string; description?: string; category?: string
  probability?: number; impact?: number
  mitigation?: string; contingency?: string; owner?: string
  quarter?: Quarter; status?: RiskStatus
}
export interface RiskUpdate extends Partial<RiskCreate> {}

export interface ListResponse<T> {
  data: T[]
  meta: { total: number; page: number; size: number }
}

export interface SingleResponse<T> {
  data: T
}
