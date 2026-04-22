"""
Shared test fixtures and sample data for backend unit tests.
Import from this module to get consistent example data across test files.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Annual Plans
# ---------------------------------------------------------------------------

SAMPLE_ANNUAL_PLAN = {
    "year": 2026,
    "code": "KH-2026",
    "name": "Kế hoạch chuyển đổi số 2026",
    "status": "draft",
    "description": "Kế hoạch chuyển đổi số toàn diện năm 2026",
}

SAMPLE_OBJECTIVE = {
    "title": "Triển khai 5 ứng dụng số mới",
    "description": "Phát triển và go-live 5 ứng dụng số phục vụ khách hàng",
    "sort_order": 1,
}

SAMPLE_DOD_ITEM = {
    "criterion": "Test coverage ≥ 80% cho tất cả ứng dụng core",
    "weight": 100.0,
}

# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

SAMPLE_PROJECT = {
    "code": "PRJ-001",
    "name": "Customer Portal",
    "status": "active",
    "owner": "PM Nguyen Van A",
    "description": "Cổng thông tin khách hàng cá nhân",
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
}

# ---------------------------------------------------------------------------
# Project Objects — all 4 types
# ---------------------------------------------------------------------------

SAMPLE_WEB_APP = {
    "name": "Customer Portal FE",
    "code": "CUSTOMER_PORTAL_FE",
    "object_type": "web_app",
    "owner": "Frontend Team",
    "description": "Frontend portal for retail customers",
    "standard_info": {
        "tech_stack": "React+TS",
        "version": "2.0.0",
        "url_prod": "https://portal.vib.com.vn",
        "url_uat": "https://uat-portal.vib.com.vn",
        "deployment_type": "on-premise",
        "sso_enabled": True,
    },
}

SAMPLE_MOBILE_APP = {
    "name": "VIB Online Banking App",
    "code": "VIB_MOBILE_APP",
    "object_type": "mobile_app",
    "owner": "Mobile Team",
    "description": "Mobile banking application",
    "standard_info": {
        "platform": "cross-platform",
        "version": "5.1.0",
        "tech_stack": "Flutter",
        "store_link_ios": "https://apps.apple.com/vn/app/vib",
        "store_link_android": "https://play.google.com/store/apps/vib",
        "min_os_version": "iOS 14 / Android 10",
    },
}

SAMPLE_API = {
    "name": "Auth API",
    "code": "AUTH_API",
    "object_type": "api",
    "owner": "Platform Team",
    "description": "Authentication and authorization API",
    "standard_info": {
        "base_url": "/api/v1/auth",
        "auth_method": "JWT",
        "version": "v1",
        "protocol": "REST",
        "url_dev": "https://dev-api.vib.com.vn/auth",
        "url_uat": "https://uat-api.vib.com.vn/auth",
        "swagger_url": "https://dev-api.vib.com.vn/auth/docs",
    },
}

SAMPLE_ELT = {
    "name": "Customer ETL",
    "code": "CUSTOMER_ETL",
    "object_type": "elt",
    "owner": "Data Team",
    "description": "Extracts customer data from Oracle to DWH",
    "standard_info": {
        "source_system": "Oracle DB — Core Banking",
        "target_system": "Data Warehouse (Hive)",
        "schedule": "0 2 * * *",
        "technology": "Apache Spark",
        "data_format": "Parquet",
        "volume_estimate": "5M records/day",
        "sla_minutes": 120,
    },
}

# ---------------------------------------------------------------------------
# BA Documents
# ---------------------------------------------------------------------------

SAMPLE_BRD = {
    "doc_type": "BRD",
    "title": "BRD Customer Portal v1.0",
    "status": "draft",
    "milestone_id": None,
    "content": "# BRD\n\n## Tổng quan...",
    "version": "v1.0",
    "metadata": {},
}

SAMPLE_BRS = {
    "doc_type": "BRS",
    "title": "BRS Auth Module v1.0",
    "status": "draft",
    "milestone_id": None,
    "content": "# BRS\n\n## Functional Requirements...",
    "version": "v1.0",
    "metadata": {},
}

SAMPLE_FSD = {
    "doc_type": "FSD",
    "title": "FSD Customer Profile v1.0",
    "status": "draft",
    "milestone_id": None,
    "content": "# FSD\n\n## Screen Specifications...",
    "version": "v1.0",
    "metadata": {},
}

# ---------------------------------------------------------------------------
# Test Documents
# ---------------------------------------------------------------------------

SAMPLE_TEST_PLAN = {
    "doc_type": "TEST_PLAN",
    "title": "Test Plan Customer Portal Sprint 5",
    "status": "draft",
    "metadata": {
        "scope": "Login, Profile, Settings",
        "environment": "UAT",
    },
}

SAMPLE_BUG = {
    "doc_type": "BUG_REPORT",
    "title": "Login fails on mobile Safari",
    "status": "open",
    "metadata": {
        "severity": "high",
        "component": "Auth",
        "steps_to_reproduce": "1. Open Safari\n2. Login with valid credentials\n3. Observe 401 error",
        "environment": "UAT",
    },
}

SAMPLE_UAT_SIGNOFF = {
    "doc_type": "UAT_SIGNOFF",
    "title": "UAT Sign-off Customer Portal v2.0",
    "status": "draft",
    "metadata": {
        "scope": "Full regression + UAT test cases",
        "approver": "Nguyen Van A",
        "sign_date": "2026-06-30",
    },
}

# ---------------------------------------------------------------------------
# Connections
# ---------------------------------------------------------------------------

SAMPLE_CONNECTION = {
    "connection_type": "api_call",
    "protocol": "REST",
    "frequency": "real-time",
    "description": "Customer Portal calls Auth API for JWT token validation",
}
