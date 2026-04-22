"""
Project Compliance & Operations Router
Covers: License, Contract, Security, Operations, Handover, Integration Links
Prefix: /projects/{project_id}
"""
from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import asyncpg, json

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/projects", tags=["project-compliance"])


# ── Pydantic Models ───────────────────────────────────────────────────────────

# License
class LicenseCreate(BaseModel):
    software_name: str = Field(..., max_length=255)
    license_type: str = Field(..., pattern=r'^(commercial|open_source|freeware|proprietary|subscription)$')
    vendor: Optional[str] = None
    version_covered: Optional[str] = None
    expiry_date: Optional[str] = None
    cost_amount: Optional[float] = None
    cost_currency: str = "VND"
    cost_period: Optional[str] = None
    seat_count: Optional[int] = None
    compliance_status: str = "compliant"
    notes: Optional[str] = None


class LicenseUpdate(BaseModel):
    software_name: Optional[str] = None
    license_type: Optional[str] = None
    vendor: Optional[str] = None
    version_covered: Optional[str] = None
    expiry_date: Optional[str] = None
    cost_amount: Optional[float] = None
    cost_currency: Optional[str] = None
    cost_period: Optional[str] = None
    seat_count: Optional[int] = None
    compliance_status: Optional[str] = None
    notes: Optional[str] = None


# Contract
class ContractCreate(BaseModel):
    vendor_name: str = Field(..., max_length=255)
    vendor_contact: dict = {}
    contract_number: Optional[str] = None
    contract_type: Optional[str] = None
    contract_description: Optional[str] = None
    sla_details: dict = {}
    support_contact: dict = {}
    start_date: Optional[str] = None
    expiry_date: Optional[str] = None
    auto_renewal: bool = False
    contract_value: Optional[float] = None
    currency: str = "VND"
    status: str = "active"
    documents_url: Optional[str] = None
    notes: Optional[str] = None


class ContractUpdate(BaseModel):
    vendor_name: Optional[str] = None
    vendor_contact: Optional[dict] = None
    contract_number: Optional[str] = None
    contract_type: Optional[str] = None
    contract_description: Optional[str] = None
    sla_details: Optional[dict] = None
    support_contact: Optional[dict] = None
    start_date: Optional[str] = None
    expiry_date: Optional[str] = None
    auto_renewal: Optional[bool] = None
    contract_value: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    documents_url: Optional[str] = None
    notes: Optional[str] = None


# Security
class SecurityUpsert(BaseModel):
    data_classification: str = "internal"
    data_categories: List[str] = []
    access_control: List[dict] = []
    last_security_scan: Optional[str] = None
    vulnerabilities: List[dict] = []
    pen_test_date: Optional[str] = None
    pen_test_result: Optional[str] = None
    notes: Optional[str] = None


# Operations
class OperationsUpsert(BaseModel):
    runbook_url: Optional[str] = None
    runbook_content: Optional[str] = None
    incident_guide_url: Optional[str] = None
    incident_guide_content: Optional[str] = None
    backup_schedule: Optional[str] = None
    recovery_rto_hours: Optional[int] = None
    recovery_rpo_hours: Optional[int] = None
    backup_details: Optional[str] = None
    dr_plan_url: Optional[str] = None
    monitoring_dashboard_url: Optional[str] = None
    on_call_info: dict = {}
    notes: Optional[str] = None


# Handover
class ChecklistItem(BaseModel):
    item: str
    is_done: bool = False
    done_by: Optional[str] = None
    done_date: Optional[str] = None


class HandoverUpsert(BaseModel):
    checklist_items: List[ChecklistItem] = []
    acceptance_sign_off_by: Optional[str] = None
    acceptance_sign_off_date: Optional[str] = None
    acceptance_notes: Optional[str] = None
    go_live_date: Optional[str] = None
    post_go_live_review_date: Optional[str] = None
    post_go_live_review_notes: Optional[str] = None
    status: str = "pending"


# Integration Links
class IntegrationLinkCreate(BaseModel):
    link_type: str = Field(..., pattern=r'^(ba_doc|qa_doc|backlog|feedback|monitoring|other)$')
    title: str = Field(..., max_length=255)
    url: Optional[str] = None
    system_name: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class IntegrationLinkUpdate(BaseModel):
    link_type: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    system_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ── License Endpoints ─────────────────────────────────────────────────────────

@router.get("/{project_id}/licenses")
async def list_licenses(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    rows = await db.fetch(
        "SELECT * FROM project_licenses WHERE project_id=$1 ORDER BY software_name",
        project_id,
    )
    return [dict(r) for r in rows]


@router.post("/{project_id}/licenses", status_code=201)
async def create_license(
    user: CurrentUser,
    project_id: str,
    body: LicenseCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    row = await db.fetchrow("""
        INSERT INTO project_licenses
            (id, project_id, software_name, license_type, vendor, version_covered,
             expiry_date, cost_amount, cost_currency, cost_period, seat_count,
             compliance_status, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,$11,$12,$13) RETURNING *
    """, str(uuid4()), project_id, body.software_name, body.license_type,
        body.vendor, body.version_covered, body.expiry_date, body.cost_amount,
        body.cost_currency, body.cost_period, body.seat_count,
        body.compliance_status, body.notes)
    return dict(row)


@router.put("/{project_id}/licenses/{license_id}")
async def update_license(
    user: CurrentUser,
    project_id: str,
    license_id: str,
    body: LicenseUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        UPDATE project_licenses SET
            software_name     = COALESCE($3, software_name),
            license_type      = COALESCE($4, license_type),
            vendor            = COALESCE($5, vendor),
            version_covered   = COALESCE($6, version_covered),
            expiry_date       = COALESCE($7::date, expiry_date),
            cost_amount       = COALESCE($8, cost_amount),
            cost_currency     = COALESCE($9, cost_currency),
            cost_period       = COALESCE($10, cost_period),
            seat_count        = COALESCE($11, seat_count),
            compliance_status = COALESCE($12, compliance_status),
            notes             = COALESCE($13, notes),
            updated_at        = NOW()
        WHERE id=$1 AND project_id=$2 RETURNING *
    """, license_id, project_id, body.software_name, body.license_type,
        body.vendor, body.version_covered, body.expiry_date, body.cost_amount,
        body.cost_currency, body.cost_period, body.seat_count,
        body.compliance_status, body.notes)
    if not row:
        raise HTTPException(404, "License not found")
    return dict(row)


@router.delete("/{project_id}/licenses/{license_id}", status_code=204)
async def delete_license(
    user: CurrentUser,
    project_id: str,
    license_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_licenses WHERE id=$1 AND project_id=$2",
        license_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "License not found")


# ── Contract Endpoints ────────────────────────────────────────────────────────

@router.get("/{project_id}/contracts")
async def list_contracts(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    rows = await db.fetch(
        "SELECT * FROM project_contracts WHERE project_id=$1 ORDER BY vendor_name",
        project_id,
    )
    return [dict(r) for r in rows]


@router.post("/{project_id}/contracts", status_code=201)
async def create_contract(
    user: CurrentUser,
    project_id: str,
    body: ContractCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    row = await db.fetchrow("""
        INSERT INTO project_contracts
            (id, project_id, vendor_name, vendor_contact, contract_number,
             contract_type, contract_description, sla_details, support_contact,
             start_date, expiry_date, auto_renewal, contract_value, currency,
             status, documents_url, notes)
        VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9::jsonb,
                $10::date,$11::date,$12,$13,$14,$15,$16,$17) RETURNING *
    """, str(uuid4()), project_id, body.vendor_name,
        json.dumps(body.vendor_contact), body.contract_number, body.contract_type,
        body.contract_description, json.dumps(body.sla_details),
        json.dumps(body.support_contact), body.start_date, body.expiry_date,
        body.auto_renewal, body.contract_value, body.currency,
        body.status, body.documents_url, body.notes)
    return dict(row)


@router.put("/{project_id}/contracts/{contract_id}")
async def update_contract(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    body: ContractUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    vendor_json = json.dumps(body.vendor_contact) if body.vendor_contact is not None else None
    sla_json = json.dumps(body.sla_details) if body.sla_details is not None else None
    support_json = json.dumps(body.support_contact) if body.support_contact is not None else None
    row = await db.fetchrow("""
        UPDATE project_contracts SET
            vendor_name          = COALESCE($3, vendor_name),
            vendor_contact       = COALESCE($4::jsonb, vendor_contact),
            contract_number      = COALESCE($5, contract_number),
            contract_type        = COALESCE($6, contract_type),
            contract_description = COALESCE($7, contract_description),
            sla_details          = COALESCE($8::jsonb, sla_details),
            support_contact      = COALESCE($9::jsonb, support_contact),
            start_date           = COALESCE($10::date, start_date),
            expiry_date          = COALESCE($11::date, expiry_date),
            auto_renewal         = COALESCE($12, auto_renewal),
            contract_value       = COALESCE($13, contract_value),
            currency             = COALESCE($14, currency),
            status               = COALESCE($15, status),
            documents_url        = COALESCE($16, documents_url),
            notes                = COALESCE($17, notes),
            updated_at           = NOW()
        WHERE id=$1 AND project_id=$2 RETURNING *
    """, contract_id, project_id, body.vendor_name, vendor_json,
        body.contract_number, body.contract_type, body.contract_description,
        sla_json, support_json, body.start_date, body.expiry_date,
        body.auto_renewal, body.contract_value, body.currency,
        body.status, body.documents_url, body.notes)
    if not row:
        raise HTTPException(404, "Contract not found")
    return dict(row)


@router.delete("/{project_id}/contracts/{contract_id}", status_code=204)
async def delete_contract(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_contracts WHERE id=$1 AND project_id=$2",
        contract_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Contract not found")


# ── Contract Terms (Điều khoản hợp đồng) ─────────────────────────────────────

class ContractTermCreate(BaseModel):
    term_order: int = 0
    term_type: str = "general"
    title: str = Field(..., max_length=255)
    content: str
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    is_key_term: bool = False
    notes: Optional[str] = None


class ContractTermUpdate(BaseModel):
    term_order: Optional[int] = None
    term_type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    is_key_term: Optional[bool] = None
    notes: Optional[str] = None


@router.get("/{project_id}/contracts/{contract_id}/terms")
async def list_contract_terms(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    term_type: Optional[str] = None,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_contract(contract_id, project_id, db)
    if term_type:
        rows = await db.fetch("""
            SELECT * FROM project_contract_terms
            WHERE contract_id=$1 AND term_type=$2
            ORDER BY term_order, created_at
        """, contract_id, term_type)
    else:
        rows = await db.fetch("""
            SELECT * FROM project_contract_terms
            WHERE contract_id=$1
            ORDER BY term_order, created_at
        """, contract_id)
    return [dict(r) for r in rows]


@router.post("/{project_id}/contracts/{contract_id}/terms", status_code=201)
async def create_contract_term(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    body: ContractTermCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_contract(contract_id, project_id, db)
    row = await db.fetchrow("""
        INSERT INTO project_contract_terms
            (id, contract_id, project_id, term_order, term_type, title, content,
             effective_date, expiry_date, is_key_term, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::date,$9::date,$10,$11) RETURNING *
    """, str(uuid4()), contract_id, project_id, body.term_order, body.term_type,
        body.title, body.content, body.effective_date, body.expiry_date,
        body.is_key_term, body.notes)
    return dict(row)


@router.put("/{project_id}/contracts/{contract_id}/terms/{term_id}")
async def update_contract_term(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    term_id: str,
    body: ContractTermUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        UPDATE project_contract_terms SET
            term_order     = COALESCE($4, term_order),
            term_type      = COALESCE($5, term_type),
            title          = COALESCE($6, title),
            content        = COALESCE($7, content),
            effective_date = COALESCE($8::date, effective_date),
            expiry_date    = COALESCE($9::date, expiry_date),
            is_key_term    = COALESCE($10, is_key_term),
            notes          = COALESCE($11, notes),
            updated_at     = NOW()
        WHERE id=$1 AND contract_id=$2 AND project_id=$3 RETURNING *
    """, term_id, contract_id, project_id, body.term_order, body.term_type,
        body.title, body.content, body.effective_date, body.expiry_date,
        body.is_key_term, body.notes)
    if not row:
        raise HTTPException(404, "Term not found")
    return dict(row)


@router.delete("/{project_id}/contracts/{contract_id}/terms/{term_id}", status_code=204)
async def delete_contract_term(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    term_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_contract_terms WHERE id=$1 AND contract_id=$2 AND project_id=$3",
        term_id, contract_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Term not found")


# ── Contract Payment Obligations (Nghĩa vụ thanh toán) ───────────────────────

class ContractPaymentCreate(BaseModel):
    payment_order: int = 0
    milestone_name: str = Field(..., max_length=255)
    payment_type: str = "progress"
    payment_basis: Optional[str] = None
    amount: float = Field(..., gt=0)
    currency: str = "VND"
    percentage_of_total: Optional[float] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None


class ContractPaymentUpdate(BaseModel):
    payment_order: Optional[int] = None
    milestone_name: Optional[str] = None
    payment_type: Optional[str] = None
    payment_basis: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    percentage_of_total: Optional[float] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    paid_date: Optional[str] = None
    paid_amount: Optional[float] = None
    bank_reference: Optional[str] = None
    approved_by: Optional[str] = None
    notes: Optional[str] = None


@router.get("/{project_id}/contracts/{contract_id}/payments")
async def list_contract_payments(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_contract(contract_id, project_id, db)
    rows = await db.fetch("""
        SELECT * FROM project_contract_payments
        WHERE contract_id=$1
        ORDER BY payment_order, due_date NULLS LAST
    """, contract_id)
    return [dict(r) for r in rows]


@router.get("/{project_id}/contracts/{contract_id}/payments/summary")
async def get_payment_summary(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    """Payment summary: total scheduled, paid, remaining, overdue"""
    await _assert_contract(contract_id, project_id, db)
    contract = await db.fetchrow(
        "SELECT contract_value, currency FROM project_contracts WHERE id=$1", contract_id
    )
    rows = await db.fetch(
        "SELECT * FROM project_contract_payments WHERE contract_id=$1", contract_id
    )
    payments = [dict(r) for r in rows]
    total_scheduled = sum(p["amount"] for p in payments)
    total_paid = sum((p["paid_amount"] or p["amount"]) for p in payments if p["status"] == "paid")
    total_pending = sum(p["amount"] for p in payments if p["status"] == "pending")
    total_overdue = sum(p["amount"] for p in payments if p["status"] == "overdue")
    total_invoiced = sum(p["amount"] for p in payments if p["status"] == "invoiced")
    return {
        "contract_value": float(contract["contract_value"]) if contract["contract_value"] else None,
        "currency": contract["currency"],
        "total_scheduled": total_scheduled,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "total_invoiced": total_invoiced,
        "total_overdue": total_overdue,
        "total_remaining": total_scheduled - total_paid,
        "count_total": len(payments),
        "count_paid": sum(1 for p in payments if p["status"] == "paid"),
        "count_pending": sum(1 for p in payments if p["status"] == "pending"),
        "count_invoiced": sum(1 for p in payments if p["status"] == "invoiced"),
        "count_overdue": sum(1 for p in payments if p["status"] == "overdue"),
    }


@router.post("/{project_id}/contracts/{contract_id}/payments", status_code=201)
async def create_contract_payment(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    body: ContractPaymentCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_contract(contract_id, project_id, db)
    row = await db.fetchrow("""
        INSERT INTO project_contract_payments
            (id, contract_id, project_id, payment_order, milestone_name,
             payment_type, payment_basis, amount, currency,
             percentage_of_total, due_date, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12) RETURNING *
    """, str(uuid4()), contract_id, project_id, body.payment_order,
        body.milestone_name, body.payment_type, body.payment_basis,
        body.amount, body.currency, body.percentage_of_total,
        body.due_date, body.notes)
    return dict(row)


@router.put("/{project_id}/contracts/{contract_id}/payments/{payment_id}")
async def update_contract_payment(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    payment_id: str,
    body: ContractPaymentUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        UPDATE project_contract_payments SET
            payment_order       = COALESCE($4, payment_order),
            milestone_name      = COALESCE($5, milestone_name),
            payment_type        = COALESCE($6, payment_type),
            payment_basis       = COALESCE($7, payment_basis),
            amount              = COALESCE($8, amount),
            currency            = COALESCE($9, currency),
            percentage_of_total = COALESCE($10, percentage_of_total),
            due_date            = COALESCE($11::date, due_date),
            status              = COALESCE($12, status),
            invoice_number      = COALESCE($13, invoice_number),
            invoice_date        = COALESCE($14::date, invoice_date),
            paid_date           = COALESCE($15::date, paid_date),
            paid_amount         = COALESCE($16, paid_amount),
            bank_reference      = COALESCE($17, bank_reference),
            approved_by         = COALESCE($18, approved_by),
            notes               = COALESCE($19, notes),
            updated_at          = NOW()
        WHERE id=$1 AND contract_id=$2 AND project_id=$3 RETURNING *
    """, payment_id, contract_id, project_id,
        body.payment_order, body.milestone_name, body.payment_type,
        body.payment_basis, body.amount, body.currency,
        body.percentage_of_total, body.due_date, body.status,
        body.invoice_number, body.invoice_date, body.paid_date,
        body.paid_amount, body.bank_reference, body.approved_by, body.notes)
    if not row:
        raise HTTPException(404, "Payment not found")
    return dict(row)


@router.delete("/{project_id}/contracts/{contract_id}/payments/{payment_id}", status_code=204)
async def delete_contract_payment(
    user: CurrentUser,
    project_id: str,
    contract_id: str,
    payment_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_contract_payments WHERE id=$1 AND contract_id=$2 AND project_id=$3",
        payment_id, contract_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Payment not found")


# ── Security Info Endpoints (per product) ────────────────────────────────────

@router.get("/{project_id}/products/{product_id}/security")
async def get_security_info(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT * FROM project_security_info WHERE product_id=$1 AND project_id=$2",
        product_id, project_id,
    )
    return dict(row) if row else {}


@router.put("/{project_id}/products/{product_id}/security")
async def upsert_security_info(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    body: SecurityUpsert,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    existing = await db.fetchrow(
        "SELECT id FROM project_security_info WHERE product_id=$1", product_id
    )
    if existing:
        row = await db.fetchrow("""
            UPDATE project_security_info SET
                data_classification = $3,
                data_categories     = $4::jsonb,
                access_control      = $5::jsonb,
                last_security_scan  = $6::date,
                vulnerabilities     = $7::jsonb,
                pen_test_date       = $8::date,
                pen_test_result     = COALESCE($9, pen_test_result),
                notes               = COALESCE($10, notes),
                updated_at          = NOW()
            WHERE product_id=$1 AND project_id=$2 RETURNING *
        """, product_id, project_id, body.data_classification,
            json.dumps(body.data_categories), json.dumps(body.access_control),
            body.last_security_scan, json.dumps(body.vulnerabilities),
            body.pen_test_date, body.pen_test_result, body.notes)
    else:
        row = await db.fetchrow("""
            INSERT INTO project_security_info
                (id, project_id, product_id, data_classification, data_categories,
                 access_control, last_security_scan, vulnerabilities,
                 pen_test_date, pen_test_result, notes)
            VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::date,$8::jsonb,$9::date,$10,$11) RETURNING *
        """, str(uuid4()), project_id, product_id, body.data_classification,
            json.dumps(body.data_categories), json.dumps(body.access_control),
            body.last_security_scan, json.dumps(body.vulnerabilities),
            body.pen_test_date, body.pen_test_result, body.notes)
    return dict(row)


# ── Operations Endpoints (per product) ───────────────────────────────────────

@router.get("/{project_id}/products/{product_id}/operations")
async def get_operations(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT * FROM project_operations WHERE product_id=$1 AND project_id=$2",
        product_id, project_id,
    )
    return dict(row) if row else {}


@router.put("/{project_id}/products/{product_id}/operations")
async def upsert_operations(
    user: CurrentUser,
    project_id: str,
    product_id: str,
    body: OperationsUpsert,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_product(product_id, project_id, db)
    existing = await db.fetchrow(
        "SELECT id FROM project_operations WHERE product_id=$1", product_id
    )
    on_call_json = json.dumps(body.on_call_info)
    if existing:
        row = await db.fetchrow("""
            UPDATE project_operations SET
                runbook_url               = COALESCE($3, runbook_url),
                runbook_content           = COALESCE($4, runbook_content),
                incident_guide_url        = COALESCE($5, incident_guide_url),
                incident_guide_content    = COALESCE($6, incident_guide_content),
                backup_schedule           = COALESCE($7, backup_schedule),
                recovery_rto_hours        = COALESCE($8, recovery_rto_hours),
                recovery_rpo_hours        = COALESCE($9, recovery_rpo_hours),
                backup_details            = COALESCE($10, backup_details),
                dr_plan_url               = COALESCE($11, dr_plan_url),
                monitoring_dashboard_url  = COALESCE($12, monitoring_dashboard_url),
                on_call_info              = $13::jsonb,
                notes                     = COALESCE($14, notes),
                updated_at                = NOW()
            WHERE product_id=$1 AND project_id=$2 RETURNING *
        """, product_id, project_id, body.runbook_url, body.runbook_content,
            body.incident_guide_url, body.incident_guide_content,
            body.backup_schedule, body.recovery_rto_hours, body.recovery_rpo_hours,
            body.backup_details, body.dr_plan_url, body.monitoring_dashboard_url,
            on_call_json, body.notes)
    else:
        row = await db.fetchrow("""
            INSERT INTO project_operations
                (id, project_id, product_id, runbook_url, runbook_content,
                 incident_guide_url, incident_guide_content, backup_schedule,
                 recovery_rto_hours, recovery_rpo_hours, backup_details,
                 dr_plan_url, monitoring_dashboard_url, on_call_info, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15) RETURNING *
        """, str(uuid4()), project_id, product_id, body.runbook_url,
            body.runbook_content, body.incident_guide_url, body.incident_guide_content,
            body.backup_schedule, body.recovery_rto_hours, body.recovery_rpo_hours,
            body.backup_details, body.dr_plan_url, body.monitoring_dashboard_url,
            on_call_json, body.notes)
    return dict(row)


# ── Handover Endpoints ────────────────────────────────────────────────────────

@router.get("/{project_id}/handover")
async def get_handover(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    row = await db.fetchrow(
        "SELECT * FROM project_handover WHERE project_id=$1", project_id
    )
    return dict(row) if row else {}


@router.put("/{project_id}/handover")
async def upsert_handover(
    user: CurrentUser,
    project_id: str,
    body: HandoverUpsert,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    checklist_json = json.dumps([c.model_dump() for c in body.checklist_items])
    existing = await db.fetchrow(
        "SELECT id FROM project_handover WHERE project_id=$1", project_id
    )
    if existing:
        row = await db.fetchrow("""
            UPDATE project_handover SET
                checklist_items             = $2::jsonb,
                acceptance_sign_off_by      = COALESCE($3, acceptance_sign_off_by),
                acceptance_sign_off_date    = COALESCE($4::date, acceptance_sign_off_date),
                acceptance_notes            = COALESCE($5, acceptance_notes),
                go_live_date                = COALESCE($6::date, go_live_date),
                post_go_live_review_date    = COALESCE($7::date, post_go_live_review_date),
                post_go_live_review_notes   = COALESCE($8, post_go_live_review_notes),
                status                      = $9,
                updated_at                  = NOW()
            WHERE project_id=$1 RETURNING *
        """, project_id, checklist_json, body.acceptance_sign_off_by,
            body.acceptance_sign_off_date, body.acceptance_notes,
            body.go_live_date, body.post_go_live_review_date,
            body.post_go_live_review_notes, body.status)
    else:
        row = await db.fetchrow("""
            INSERT INTO project_handover
                (id, project_id, checklist_items, acceptance_sign_off_by,
                 acceptance_sign_off_date, acceptance_notes, go_live_date,
                 post_go_live_review_date, post_go_live_review_notes, status)
            VALUES ($1,$2,$3::jsonb,$4,$5::date,$6,$7::date,$8::date,$9,$10) RETURNING *
        """, str(uuid4()), project_id, checklist_json,
            body.acceptance_sign_off_by, body.acceptance_sign_off_date,
            body.acceptance_notes, body.go_live_date,
            body.post_go_live_review_date, body.post_go_live_review_notes,
            body.status)
    return dict(row)


# ── Integration Links Endpoints ───────────────────────────────────────────────

@router.get("/{project_id}/integrations")
async def list_integration_links(
    user: CurrentUser,
    project_id: str,
    link_type: Optional[str] = None,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    if link_type:
        rows = await db.fetch(
            "SELECT * FROM project_integration_links WHERE project_id=$1 AND link_type=$2 ORDER BY title",
            project_id, link_type,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM project_integration_links WHERE project_id=$1 ORDER BY link_type, title",
            project_id,
        )
    return [dict(r) for r in rows]


@router.post("/{project_id}/integrations", status_code=201)
async def create_integration_link(
    user: CurrentUser,
    project_id: str,
    body: IntegrationLinkCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    row = await db.fetchrow("""
        INSERT INTO project_integration_links
            (id, project_id, link_type, title, url, system_name, description, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    """, str(uuid4()), project_id, body.link_type, body.title, body.url,
        body.system_name, body.description, body.is_active)
    return dict(row)


@router.put("/{project_id}/integrations/{link_id}")
async def update_integration_link(
    user: CurrentUser,
    project_id: str,
    link_id: str,
    body: IntegrationLinkUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        UPDATE project_integration_links SET
            link_type   = COALESCE($3, link_type),
            title       = COALESCE($4, title),
            url         = COALESCE($5, url),
            system_name = COALESCE($6, system_name),
            description = COALESCE($7, description),
            is_active   = COALESCE($8, is_active),
            updated_at  = NOW()
        WHERE id=$1 AND project_id=$2 RETURNING *
    """, link_id, project_id, body.link_type, body.title, body.url,
        body.system_name, body.description, body.is_active)
    if not row:
        raise HTTPException(404, "Integration link not found")
    return dict(row)


@router.delete("/{project_id}/integrations/{link_id}", status_code=204)
async def delete_integration_link(
    user: CurrentUser,
    project_id: str,
    link_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_integration_links WHERE id=$1 AND project_id=$2",
        link_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Integration link not found")


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _assert_project(project_id: str, db: asyncpg.Connection) -> None:
    row = await db.fetchrow("SELECT id FROM projects WHERE id=$1", project_id)
    if not row:
        raise HTTPException(404, "Project not found")


async def _assert_product(product_id: str, project_id: str, db: asyncpg.Connection) -> None:
    row = await db.fetchrow(
        "SELECT id FROM project_product_registry WHERE id=$1 AND project_id=$2",
        product_id, project_id,
    )
    if not row:
        raise HTTPException(404, "Product not found")


async def _assert_contract(contract_id: str, project_id: str, db: asyncpg.Connection) -> None:
    row = await db.fetchrow(
        "SELECT id FROM project_contracts WHERE id=$1 AND project_id=$2",
        contract_id, project_id,
    )
    if not row:
        raise HTTPException(404, "Contract not found")
