"""
Milestone auto-generator — produces standard IT project milestones
proportionally distributed across a project's start/end date range.
"""
from datetime import date, timedelta
from typing import List, Dict

# ── Template — 9 standard milestones ───────────────────────────
_TEMPLATES = [
    {
        "name": "Kickoff",
        "type": "kickoff",
        "pct_start": 0.00, "pct_end": 0.03,
        "order": 1,
        "done_criteria": "Project Charter signed, team assembled, kickoff meeting held",
        "preconditions": [],
        "ba_tasks": [
            ("Chuẩn bị tài liệu Kickoff", "requirements"),
            ("Danh sách stakeholder & RACI Matrix", "requirements"),
        ],
        "test_tasks": [
            ("Review project scope", "test_plan"),
            ("Phác thảo Test Strategy", "test_plan"),
        ],
    },
    {
        "name": "Requirements Gathering",
        "type": "requirements",
        "pct_start": 0.03, "pct_end": 0.18,
        "order": 2,
        "done_criteria": "BRD approved by business owner, all requirements signed off",
        "preconditions": ["Kickoff completed"],
        "ba_tasks": [
            ("Elicitation yêu cầu nghiệp vụ", "requirements"),
            ("Phân tích As-Is / To-Be Process", "requirements"),
            ("Draft BRD v0.1", "brd"),
            ("Review BRD với stakeholder", "review"),
            ("BRD sign-off", "sign_off"),
        ],
        "test_tasks": [
            ("Review requirements (BRD)", "test_plan"),
            ("Test Impact Analysis", "test_plan"),
            ("Lập Test Estimation", "test_plan"),
        ],
    },
    {
        "name": "Solution Design",
        "type": "design",
        "pct_start": 0.18, "pct_end": 0.30,
        "order": 3,
        "done_criteria": "FRS approved, architecture signed off, UI/UX approved by PO",
        "preconditions": ["Requirements Gathering completed"],
        "ba_tasks": [
            ("Draft FRS / Functional Spec", "frd"),
            ("Thiết kế Use Cases & User Stories", "frd"),
            ("API Specification draft", "frd"),
            ("Data Model & Data Dictionary", "frd"),
            ("FRS review với Dev & QA", "review"),
            ("FRS sign-off", "sign_off"),
        ],
        "test_tasks": [
            ("Draft Test Plan", "test_plan"),
            ("Thiết kế Test Scenarios từ FRS", "test_case"),
            ("Thiết kế Test Cases chi tiết", "test_case"),
            ("Xây dựng RTM (Traceability Matrix)", "test_case"),
        ],
    },
    {
        "name": "Development",
        "type": "development",
        "pct_start": 0.30, "pct_end": 0.65,
        "order": 4,
        "done_criteria": "All stories developed, unit tests pass >= 80%, code review complete",
        "preconditions": ["Solution Design completed"],
        "ba_tasks": [
            ("Hỗ trợ làm rõ requirements cho Dev", "support"),
            ("Sprint grooming & backlog refinement", "support"),
            ("Ghi nhận Clarification Log", "support"),
        ],
        "test_tasks": [
            ("Hoàn thiện Test Cases", "test_case"),
            ("Chuẩn bị Test Data", "test_case"),
            ("Phát triển Automation Scripts", "automation"),
            ("Review test cases với BA", "test_case"),
        ],
    },
    {
        "name": "SIT",
        "type": "sit",
        "pct_start": 0.65, "pct_end": 0.78,
        "order": 5,
        "done_criteria": "SIT pass rate >= 95%, 0 Critical/High open bugs, SIT report approved",
        "preconditions": ["Development completed", "SIT environment ready"],
        "ba_tasks": [
            ("Hỗ trợ SIT — clarify defects", "support"),
            ("Triage defect với business & Dev", "review"),
        ],
        "test_tasks": [
            ("SIT Execution Cycle 1", "execution"),
            ("Defect logging & tracking", "execution"),
            ("Regression test sau fix", "execution"),
            ("SIT Summary Report", "sign_off"),
        ],
    },
    {
        "name": "UAT",
        "type": "uat",
        "pct_start": 0.78, "pct_end": 0.90,
        "order": 6,
        "done_criteria": "UAT sign-off obtained, 0 Critical/High open bugs, business acceptance signed",
        "preconditions": ["SIT completed with sign-off"],
        "ba_tasks": [
            ("Tổ chức UAT — hỗ trợ business user", "support"),
            ("Triage defect UAT", "review"),
            ("Thu thập UAT sign-off", "sign_off"),
        ],
        "test_tasks": [
            ("Chuẩn bị UAT Test Cases & Plan", "uat"),
            ("Hỗ trợ thực thi UAT", "uat"),
            ("UAT Defect Log & retesting", "uat"),
            ("UAT Sign-off Document", "sign_off"),
        ],
    },
    {
        "name": "Go-Live",
        "type": "golive",
        "pct_start": 0.90, "pct_end": 0.93,
        "order": 7,
        "done_criteria": "System live in production, smoke test passed, no critical incidents",
        "preconditions": ["UAT sign-off obtained", "Release checklist complete"],
        "ba_tasks": [
            ("Truyền thông Go-Live tới người dùng", "support"),
            ("Hỗ trợ training end-user", "support"),
        ],
        "test_tasks": [
            ("Production Smoke Test", "execution"),
            ("Go-Live Checklist validation", "sign_off"),
        ],
    },
    {
        "name": "Hypercare",
        "type": "hypercare",
        "pct_start": 0.93, "pct_end": 0.97,
        "order": 8,
        "done_criteria": "No critical incidents in 2 weeks post go-live, support team fully briefed",
        "preconditions": ["Go-Live completed"],
        "ba_tasks": [
            ("Giám sát post-launch issues", "support"),
            ("Hỗ trợ triage incident", "support"),
        ],
        "test_tasks": [
            ("Production monitoring & incident response", "execution"),
            ("Post-launch bug triage", "execution"),
        ],
    },
    {
        "name": "Project Closure",
        "type": "closure",
        "pct_start": 0.97, "pct_end": 1.00,
        "order": 9,
        "done_criteria": "Closure report approved, lessons learned documented, all handover complete",
        "preconditions": ["Hypercare completed"],
        "ba_tasks": [
            ("BA Lessons Learned", "review"),
            ("Review & archive BA documentation", "review"),
        ],
        "test_tasks": [
            ("QA Closure Report & Metrics Summary", "sign_off"),
            ("Archive test artifacts", "sign_off"),
        ],
    },
]

# ── Template files suggested per milestone type ─────────────────
MILESTONE_TEMPLATES: Dict[str, List] = {
    "kickoff": [
        ("Project_Charter.md",        "Charter"),
        ("RACI_Matrix.md",             "Governance"),
        ("Stakeholder_Register.md",    "Governance"),
        ("Meeting_Minutes_Kickoff.md", "MeetingMinutes"),
    ],
    "requirements": [
        ("BRD.md",                   "BRD"),
        ("High_Level_Scope.md",      "Scope"),
        ("Business_Case.md",         "BusinessCase"),
        ("Stakeholder_Discussions.md","Discussion"),
    ],
    "design": [
        ("FRS.md",              "FRS"),
        ("API_Spec.md",         "APISpec"),
        ("Data_Dictionary.md",  "DataModel"),
        ("Use_Case_Detail.md",  "UseCase"),
    ],
    "development": [
        ("Sprint_Plan.md",      "SprintPlan"),
        ("Clarification_Log.md","Log"),
    ],
    "sit": [
        ("Test_Plan_SIT.md",      "TestPlan"),
        ("Test_Case_Detail.md",   "TestCase"),
        ("Defect_Log.md",         "DefectLog"),
        ("SIT_Summary_Report.md", "TestReport"),
    ],
    "uat": [
        ("UAT_Plan.md",       "UATplan"),
        ("UAT_Test_Cases.md", "TestCase"),
        ("UAT_Signoff.md",    "Signoff"),
    ],
    "golive": [
        ("Release_Checklist.md", "Checklist"),
        ("Deployment_Plan.md",   "Deployment"),
        ("Rollback_Plan.md",     "Deployment"),
    ],
    "closure": [
        ("Project_Closure_Report.md", "Closure"),
        ("Lessons_Learned.md",        "Closure"),
        ("Handover_Document.md",      "Handover"),
    ],
}


_DEFAULT_DURATION_DAYS = 180  # 6 months fallback when end_date is not provided


def _build_milestones(project_id: str, start, end, templates: List[Dict], track: str) -> List[Dict]:
    """Internal helper — distribute templates proportionally across start→end.

    If start is None, defaults to today.
    If end is None, defaults to start + 180 days.
    """
    from datetime import date as _date
    today = _date.today()
    if start is None:
        start = today
    elif isinstance(start, str):
        start = _date.fromisoformat(start)
    if end is None:
        end = start + timedelta(days=_DEFAULT_DURATION_DAYS)
    elif isinstance(end, str):
        end = _date.fromisoformat(end)
    duration = (end - start).days or _DEFAULT_DURATION_DAYS
    result = []
    for tmpl in templates:
        ms_start = start + timedelta(days=int(duration * tmpl["pct_start"]))
        ms_end   = start + timedelta(days=max(1, int(duration * tmpl["pct_end"])))
        result.append({
            "project_id":     project_id,
            "name":           tmpl["name"],
            "milestone_type": tmpl["type"],
            "description":    None,
            "start_date":     ms_start,
            "end_date":       ms_end,
            "status":         "planned",
            "sort_order":     tmpl["order"],
            "preconditions":  tmpl.get("preconditions", []),
            "done_criteria":  tmpl.get("done_criteria", ""),
            "track":          track,
            "_ba_tasks":      tmpl.get("ba_tasks", []),
            "_test_tasks":    tmpl.get("test_tasks", []),
        })
    return result


def generate_milestones(project_id: str, start: str, end: str) -> List[Dict]:
    """Return 9 main project-track milestone dicts (not yet saved to DB)."""
    return _build_milestones(project_id, start, end, _TEMPLATES, "project")


# ── BA Track Templates ──────────────────────────────────────────
_BA_TEMPLATES = [
    {
        "name": "BA Kickoff & Scope Definition",
        "type": "ba_kickoff",
        "pct_start": 0.00, "pct_end": 0.05,
        "order": 1,
        "done_criteria": "Scope statement approved, stakeholder list confirmed, interview schedule ready",
        "preconditions": [],
        "ba_tasks": [
            ("Chuẩn bị BA Kickoff Checklist", "requirements"),
            ("Xác định Scope Statement ban đầu", "requirements"),
            ("Lập danh sách stakeholder cần phỏng vấn", "requirements"),
            ("Lên lịch phỏng vấn & workshop", "requirements"),
        ],
    },
    {
        "name": "Requirements Elicitation",
        "type": "ba_elicitation",
        "pct_start": 0.03, "pct_end": 0.22,
        "order": 2,
        "done_criteria": "All requirements collected, interview notes consolidated, as-is process mapped",
        "preconditions": ["BA Kickoff completed"],
        "ba_tasks": [
            ("Phỏng vấn stakeholder (business user, PM, IT)", "requirements"),
            ("Tổ chức workshop requirements", "requirements"),
            ("Ghi nhận biên bản & tổng hợp yêu cầu", "requirements"),
            ("Lập As-Is Process Map", "requirements"),
            ("Kiểm tra lại tính đầy đủ requirements", "review"),
        ],
    },
    {
        "name": "As-Is / To-Be Analysis",
        "type": "ba_analysis",
        "pct_start": 0.15, "pct_end": 0.32,
        "order": 3,
        "done_criteria": "Gap analysis complete, To-Be process approved, RTM v0.1 created",
        "preconditions": ["Requirements Elicitation in progress"],
        "ba_tasks": [
            ("Phân tích Gap (As-Is vs To-Be)", "requirements"),
            ("Vẽ To-Be Process Map", "requirements"),
            ("Xây dựng Requirements Traceability Matrix (RTM) v0.1", "requirements"),
            ("Review To-Be với business stakeholders", "review"),
        ],
    },
    {
        "name": "BRD Drafting & Sign-off",
        "type": "ba_brd",
        "pct_start": 0.20, "pct_end": 0.40,
        "order": 4,
        "done_criteria": "BRD v1.0 signed off by business owner and project sponsor",
        "preconditions": ["Requirements Elicitation completed"],
        "ba_tasks": [
            ("Draft BRD v0.1", "brd"),
            ("Review BRD nội bộ BA team", "review"),
            ("Review BRD với business stakeholders", "review"),
            ("Ghi nhận comments & cập nhật BRD v1.0", "brd"),
            ("BRD sign-off chính thức", "sign_off"),
        ],
    },
    {
        "name": "FRS & Solution Specification",
        "type": "ba_frs",
        "pct_start": 0.35, "pct_end": 0.62,
        "order": 5,
        "done_criteria": "FRS v1.0 signed off, Use Cases complete, Data Dictionary finalized",
        "preconditions": ["BRD Sign-off completed"],
        "ba_tasks": [
            ("Draft FRS / Functional Specification", "frd"),
            ("Thiết kế Use Cases & User Stories chi tiết", "frd"),
            ("Xác định API Requirements cùng Dev", "frd"),
            ("Xây dựng Data Dictionary & Data Model", "frd"),
            ("Review FRS với Dev & QA team", "review"),
            ("FRS sign-off", "sign_off"),
        ],
    },
    {
        "name": "Dev Support & Clarification",
        "type": "ba_dev_support",
        "pct_start": 0.55, "pct_end": 0.78,
        "order": 6,
        "done_criteria": "All dev queries resolved, clarification log up to date, change requests tracked",
        "preconditions": ["FRS Sign-off completed"],
        "ba_tasks": [
            ("Hỗ trợ làm rõ requirements cho Dev team", "support"),
            ("Duy trì Clarification Log", "support"),
            ("Xử lý Change Requests phát sinh", "support"),
            ("Tham dự sprint grooming / backlog refinement", "support"),
            ("Ghi nhận BA-Dev Meeting Notes", "support"),
        ],
    },
    {
        "name": "UAT Support & Sign-off",
        "type": "ba_uat_support",
        "pct_start": 0.75, "pct_end": 0.92,
        "order": 7,
        "done_criteria": "UAT sign-off obtained, all UAT defects triaged and resolved or accepted",
        "preconditions": ["Dev Support phase completed"],
        "ba_tasks": [
            ("Chuẩn bị UAT Test Scenarios từ BRD/FRS", "uat"),
            ("Hỗ trợ business user thực thi UAT", "support"),
            ("Triage defect UAT — phân loại business vs technical", "review"),
            ("Thu thập UAT sign-off từ business owner", "sign_off"),
        ],
    },
    {
        "name": "BA Closure & Knowledge Transfer",
        "type": "ba_closure",
        "pct_start": 0.90, "pct_end": 1.00,
        "order": 8,
        "done_criteria": "BA closure report approved, all documents archived, knowledge transfer completed",
        "preconditions": ["UAT Sign-off completed"],
        "ba_tasks": [
            ("Viết BA Closure Report", "review"),
            ("Tổng hợp Lessons Learned BA", "review"),
            ("Finalize & archive toàn bộ BA documents", "review"),
            ("Knowledge transfer cho O&M / support team", "support"),
        ],
    },
]

BA_MILESTONE_TEMPLATES: Dict[str, List] = {
    "ba_kickoff": [
        ("BA_Kickoff_Checklist.md",         "Checklist"),
        ("Scope_Statement.md",              "Scope"),
        ("Stakeholder_Interview_Plan.md",   "Plan"),
    ],
    "ba_elicitation": [
        ("Interview_Guide.md",              "Guide"),
        ("Workshop_Agenda.md",              "Agenda"),
        ("Requirements_Gathering_Notes.md", "Notes"),
        ("As_Is_Process_Map.md",            "ProcessMap"),
    ],
    "ba_analysis": [
        ("To_Be_Process_Map.md",              "ProcessMap"),
        ("Gap_Analysis.md",                   "Analysis"),
        ("Requirements_Traceability_Matrix.md","RTM"),
    ],
    "ba_brd": [
        ("BRD.md",                 "BRD"),
        ("BRD_Review_Log.md",      "ReviewLog"),
        ("BRD_Signoff_Record.md",  "Signoff"),
    ],
    "ba_frs": [
        ("FRS.md",                    "FRS"),
        ("Use_Case_Specifications.md","UseCase"),
        ("UI_UX_Requirements.md",     "UISpec"),
        ("Data_Dictionary.md",        "DataModel"),
        ("API_Requirements.md",       "APISpec"),
    ],
    "ba_dev_support": [
        ("Clarification_Log.md",       "Log"),
        ("Change_Request_Log.md",      "Log"),
        ("BA_Dev_Meeting_Notes.md",    "MeetingMinutes"),
    ],
    "ba_uat_support": [
        ("UAT_Test_Scenarios.md",      "TestScenario"),
        ("UAT_Defect_Support_Log.md",  "DefectLog"),
        ("UAT_Signoff_Checklist.md",   "Signoff"),
    ],
    "ba_closure": [
        ("BA_Closure_Report.md",          "Closure"),
        ("Lessons_Learned_BA.md",         "Closure"),
        ("Process_Documentation_Final.md","Documentation"),
    ],
}


def generate_ba_milestones(project_id: str, start: str, end: str) -> List[Dict]:
    """Return 8 BA-track milestone dicts (not yet saved to DB)."""
    return _build_milestones(project_id, start, end, _BA_TEMPLATES, "ba")


# ── Test Track Templates ────────────────────────────────────────
_TEST_TEMPLATES = [
    {
        "name": "Test Strategy & Planning",
        "type": "test_planning",
        "pct_start": 0.15, "pct_end": 0.35,
        "order": 1,
        "done_criteria": "Test Strategy approved, Test Plan v1.0 signed off, estimation complete",
        "preconditions": ["Solution Design in progress"],
        "test_tasks": [
            ("Draft Test Strategy", "test_plan"),
            ("Draft Test Plan (scope, approach, environment)", "test_plan"),
            ("Lập Test Estimation (effort, timeline, resources)", "test_plan"),
            ("Risk-Based Testing Analysis", "test_plan"),
            ("Test Plan sign-off", "sign_off"),
        ],
    },
    {
        "name": "Test Case Design",
        "type": "test_design",
        "pct_start": 0.28, "pct_end": 0.65,
        "order": 2,
        "done_criteria": "All test cases designed, reviewed and mapped to RTM, test data ready",
        "preconditions": ["Test Planning completed"],
        "test_tasks": [
            ("Thiết kế Test Cases SIT từ FRS", "test_case"),
            ("Thiết kế Test Cases UAT từ BRD", "test_case"),
            ("Chuẩn bị Test Data theo từng scenario", "test_case"),
            ("Lập RTM Test Coverage (requirement vs test case)", "test_case"),
            ("Xây dựng Automation Test Scripts (nếu có)", "automation"),
            ("Peer review test cases với BA", "test_case"),
        ],
    },
    {
        "name": "Test Environment Preparation",
        "type": "test_env_setup",
        "pct_start": 0.60, "pct_end": 0.68,
        "order": 3,
        "done_criteria": "SIT environment ready, test data loaded, smoke test passed",
        "preconditions": ["Test Case Design completed"],
        "test_tasks": [
            ("Verify SIT environment setup checklist", "test_plan"),
            ("Load / refresh Test Data vào SIT", "test_plan"),
            ("Chạy Smoke Test xác nhận môi trường", "execution"),
        ],
    },
    {
        "name": "SIT Execution",
        "type": "test_sit_exec",
        "pct_start": 0.65, "pct_end": 0.78,
        "order": 4,
        "done_criteria": "SIT pass rate >= 95%, 0 Critical/High open, SIT Summary Report approved",
        "preconditions": ["Test Environment ready"],
        "test_tasks": [
            ("SIT Execution Cycle 1 — chạy toàn bộ test cases", "execution"),
            ("Defect logging & tracking trong JIRA/ADO", "execution"),
            ("Regression testing sau khi dev fix defects", "execution"),
            ("SIT Cycle 2 (nếu cần)", "execution"),
            ("Lập SIT Daily Status Report", "execution"),
            ("Viết SIT Summary Report", "sign_off"),
        ],
    },
    {
        "name": "UAT Execution & Support",
        "type": "test_uat_exec",
        "pct_start": 0.78, "pct_end": 0.92,
        "order": 5,
        "done_criteria": "UAT pass, 0 Critical/High open, UAT sign-off obtained",
        "preconditions": ["SIT completed with sign-off"],
        "test_tasks": [
            ("Hướng dẫn business users thực thi UAT", "uat"),
            ("Hỗ trợ UAT execution & defect triage", "uat"),
            ("UAT Defect Retesting", "uat"),
            ("Viết UAT Summary Report", "sign_off"),
            ("Thu thập UAT Sign-off Document", "sign_off"),
        ],
    },
    {
        "name": "Go-Live Testing",
        "type": "test_golive",
        "pct_start": 0.90, "pct_end": 0.95,
        "order": 6,
        "done_criteria": "Production smoke test passed, Go/No-Go decision documented",
        "preconditions": ["UAT Sign-off obtained"],
        "test_tasks": [
            ("Chạy Production Smoke Test post-deployment", "execution"),
            ("Lập Go/No-Go Decision Matrix", "sign_off"),
            ("Xác nhận Production Verification", "execution"),
        ],
    },
    {
        "name": "Test Closure",
        "type": "test_closure",
        "pct_start": 0.95, "pct_end": 1.00,
        "order": 7,
        "done_criteria": "Test Closure Report approved, all artifacts archived, metrics reported",
        "preconditions": ["Go-Live completed"],
        "test_tasks": [
            ("Viết Test Closure Report", "sign_off"),
            ("Tổng hợp Defect Summary & Metrics", "sign_off"),
            ("Lessons Learned QA", "sign_off"),
            ("Archive toàn bộ test artifacts", "sign_off"),
        ],
    },
]

TEST_MILESTONE_TEMPLATES: Dict[str, List] = {
    "test_planning": [
        ("Test_Strategy.md",             "TestStrategy"),
        ("Test_Plan.md",                 "TestPlan"),
        ("Test_Estimation.md",           "Estimation"),
        ("Risk_Based_Testing_Analysis.md","Analysis"),
    ],
    "test_design": [
        ("Test_Case_SIT.md",          "TestCase"),
        ("Test_Case_UAT.md",          "TestCase"),
        ("Test_Data_Preparation.md",  "TestData"),
        ("RTM_Test_Coverage.md",      "RTM"),
        ("Automation_Test_Plan.md",   "AutoTest"),
    ],
    "test_env_setup": [
        ("Environment_Setup_Checklist.md", "Checklist"),
        ("Test_Data_Setup.md",             "TestData"),
    ],
    "test_sit_exec": [
        ("SIT_Execution_Report_Cycle1.md","TestReport"),
        ("SIT_Defect_Log.md",            "DefectLog"),
        ("SIT_Daily_Status_Report.md",   "StatusReport"),
        ("SIT_Summary_Report.md",        "TestReport"),
    ],
    "test_uat_exec": [
        ("UAT_Execution_Guide.md",  "Guide"),
        ("UAT_Defect_Log.md",       "DefectLog"),
        ("UAT_Summary_Report.md",   "TestReport"),
        ("UAT_Signoff_Document.md", "Signoff"),
    ],
    "test_golive": [
        ("Smoke_Test_Checklist.md",          "Checklist"),
        ("Go_No_Go_Decision_Matrix.md",      "Decision"),
        ("Production_Verification_Report.md","Report"),
    ],
    "test_closure": [
        ("Test_Closure_Report.md",   "Closure"),
        ("Defect_Summary_Final.md",  "Summary"),
        ("Test_Metrics_Report.md",   "Metrics"),
        ("Lessons_Learned_Test.md",  "Closure"),
    ],
}


def generate_test_milestones(project_id: str, start: str, end: str) -> List[Dict]:
    """Return 7 Test-track milestone dicts (not yet saved to DB)."""
    return _build_milestones(project_id, start, end, _TEST_TEMPLATES, "test")


# ── Activity Task Templates (5 governance domains) ──────────────
# These 38 tasks are auto-created for every project, covering the
# full governance lifecycle across Business, Architecture, Infra,
# Security, and Compliance dimensions.

_ACTIVITY_TASK_TEMPLATES: List[Dict] = [
    # ── 1. Business Requirements & Product ────────────────────────
    {"domain": "business_requirements", "order": 1,
     "title": "Define core pillars, archetype rules, workflow/process logic (BRD)"},
    {"domain": "business_requirements", "order": 2,
     "title": "Define Domain model, Decision logic, Usecase, System Behavior"},
    {"domain": "business_requirements", "order": 3,
     "title": "Phê duyệt BRD trước khi bắt đầu viết tài liệu phân tích chi tiết"},
    {"domain": "business_requirements", "order": 4,
     "title": "Write Application Design Spec / BRS"},
    {"domain": "business_requirements", "order": 5,
     "title": "Phê duyệt BRS trước khi dev bắt đầu"},
    {"domain": "business_requirements", "order": 6,
     "title": "UAT — thực hiện test cases nghiệp vụ"},
    {"domain": "business_requirements", "order": 7,
     "title": "UAT sign-off (go/no-go từ nghiệp vụ)"},
    {"domain": "business_requirements", "order": 8,
     "title": "Cập nhật business logic sau go-live"},

    # ── 2. Architecture & Code ─────────────────────────────────────
    {"domain": "architecture_code", "order": 1,
     "title": "Thiết kế application architecture"},
    {"domain": "architecture_code", "order": 2,
     "title": "Viết production code (API + Frontend)"},
    {"domain": "architecture_code", "order": 3,
     "title": "Security code review (SQL injection, IDOR, data exposure)"},
    {"domain": "architecture_code", "order": 4,
     "title": "RBAC enforcement tại API layer (không phải UI)"},
    {"domain": "architecture_code", "order": 5,
     "title": "Simulation audit log — append-only, không xóa được"},
    {"domain": "architecture_code", "order": 6,
     "title": "Peer code review (maker-checker cho AI-generated code)"},
    {"domain": "architecture_code", "order": 7,
     "title": "Deploy lên Dev / Staging environment"},
    {"domain": "architecture_code", "order": 8,
     "title": "Deploy lên Production environment"},

    # ── 3. Infrastructure (AWS) ───────────────────────────────────
    {"domain": "infrastructure", "order": 1,
     "title": "Provisioning RDS PostgreSQL 16 (dev + prod)"},
    {"domain": "infrastructure", "order": 2,
     "title": "ECS Fargate clusters + ECR repositories"},
    {"domain": "infrastructure", "order": 3,
     "title": "Cung cấp domain và SSL certificate, cấu hình DNS"},
    {"domain": "infrastructure", "order": 4,
     "title": "ALB + routing + SSL certificate (ACM)"},
    {"domain": "infrastructure", "order": 5,
     "title": "Secrets Manager — DB passwords + Entra client secret"},
    {"domain": "infrastructure", "order": 6,
     "title": "CI/CD pipelines (3 services, dev auto / prod gate)"},
    {"domain": "infrastructure", "order": 7,
     "title": "CloudWatch monitoring, alerts, dashboards"},
    {"domain": "infrastructure", "order": 8,
     "title": "Incident response — triage và remediation"},

    # ── 4. Security & IAM ─────────────────────────────────────────
    {"domain": "security_iam", "order": 1,
     "title": "Entra ID app registration + redirect URIs"},
    {"domain": "security_iam", "order": 2,
     "title": "Tạo AD groups + role-to-group mapping"},
    {"domain": "security_iam", "order": 3,
     "title": "MFA policy qua Conditional Access (Entra ID)"},
    {"domain": "security_iam", "order": 4,
     "title": "Security Group rules — specification và approval"},
    {"domain": "security_iam", "order": 5,
     "title": "Security final review sign-off trước go-live"},
    {"domain": "security_iam", "order": 6,
     "title": "Annual penetration test"},
    {"domain": "security_iam", "order": 7,
     "title": "Quản lý user access (add/remove theo AD)"},

    # ── 5. Compliance & Governance ────────────────────────────────
    {"domain": "compliance_governance", "order": 1,
     "title": "DPIA — Data Protection Impact Assessment (salary data)"},
    {"domain": "compliance_governance", "order": 2,
     "title": "Audit trail policy (5-year retention, append-only log)"},
    {"domain": "compliance_governance", "order": 3,
     "title": "Compliance sign-off trước production go-live"},
    {"domain": "compliance_governance", "order": 4,
     "title": "Export control — ai được phép export gì"},
    {"domain": "compliance_governance", "order": 5,
     "title": "Báo cáo Project Sponsor về app performance & incidents"},
    {"domain": "compliance_governance", "order": 6,
     "title": "Policy: AI coding governance tại VIB (Tier model)"},
    {"domain": "compliance_governance", "order": 7,
     "title": "Final production go-live approval"},
]


def generate_activity_tasks(project_id: str) -> List[Dict]:
    """Return 38 project activity task dicts across 5 governance domains.

    These are project-scoped (no milestone linkage) and auto-created
    when a new project is initialised.
    """
    return [
        {
            "project_id":       project_id,
            "activity_domain":  t["domain"],
            "title":            t["title"],
            "status":           "pending",
            "sort_order":       t["order"],
        }
        for t in _ACTIVITY_TASK_TEMPLATES
    ]
