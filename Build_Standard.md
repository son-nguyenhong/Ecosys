# VIB AI-DLC Build Standard
## Tiêu chuẩn Xây dựng Thống nhất cho AI-Driven Development Lifecycle

**Version:** 7.0 (Agent 09 Technical Writer, Highlight Log, Workflow Advisory, Best Practice Workflow)
**Status:** Draft for Engineering Review
**Owner:** Cloud & Solution Architecture — Technology Division
**Last updated:** 2026-04-09
**Audience:** Engineering Team (tất cả product types: Web App, API Service, Mobile App, Data Pipeline, Internal Tool)

> Tài liệu này là build standard chung cho mọi loại product được xây dựng trên VIB AI-DLC Platform.
> Không hardcode theo bất kỳ technology stack hay product type cụ thể nào.
> Team khai báo **Project Profile** khi khởi tạo project — platform tự map agents, tools, và launch target phù hợp.
> **v6.0 adds:** Multi-human collaboration model, Shared context/memory (CLAUDE.md spec), Code ownership boundary, Output standardization, Devil's Advocate pattern.

---

## 1. Tổng quan

### 1.1 Mục tiêu

VIB AI-DLC Platform là nền tảng thống nhất cho toàn bộ vòng đời phát triển phần mềm tích hợp AI tại VIB. Ba mục tiêu cốt lõi:

1. **Unified** — Một platform duy nhất cho tất cả quy trình AI-DLC, tất cả teams
2. **Traceable** — Mọi artifact được linked: Requirement → Spec → Code → Test → Deploy → Audit
3. **Governed** — Policy-as-code nhúng sẵn trong pipeline, không phải checklist cuối sprint

### 1.2 Dual-Mode Design

Platform hỗ trợ hai chế độ vận hành song song — team chọn mode phù hợp với AI maturity hiện tại:

| Mode | Tên | Mô tả | Phù hợp khi |
|------|-----|-------|-------------|
| **Mode H** | Human-led | Human thực hiện toàn bộ, AI là assistant tùy chọn | Team mới, project nhạy cảm, AI maturity L1 |
| **Mode A** | Agent-led | AI Agents thực hiện, human review & approve | Team đã quen AI, AI maturity L2–L4 |

Cùng một workflow, cùng một Artifact Registry, cùng Policy Gates — chỉ khác người/agent thực thi.

### 1.3 AI Autonomy Levels

```
L1 — Assistive        AI suggest → Human thực hiện toàn bộ
L2 — Partial          AI thực hiện subtask → Human review từng bước
L3 — Conditional      AI tự chạy flow → Human intervene khi cần
L4 — Supervised       AI chạy overnight → Human review kết quả sáng hôm sau
```

Default: L1. Nâng level cần approval của Tech Lead (L2), Architect (L3), CTO (L4).

---

### 1.4 Multi-Human Collaboration Model

Khi nhiều người cùng làm việc trong một AI-DLC project, cần phân biệt rõ **3 chế độ**:

| Chế độ | Mô tả | Cách vận hành |
|--------|-------|--------------|
| **Solo** | 1 người dùng Claude trực tiếp | Mỗi người có session riêng, context riêng |
| **Relay** | Nhiều người làm nối tiếp nhau | Người trước → save output vào Artifact Registry → người sau đọc từ Registry và tiếp tục |
| **Parallel** | Nhiều người/roles làm đồng thời | Mỗi người có role domain riêng, giao tiếp qua Artifact Registry + shared CLAUDE.md |

**Nguyên tắc cốt lõi:** Claude không có memory giữa các sessions. Mọi context chia sẻ giữa người phải đi qua **artifact** (file trong Git / Artifact Registry) — không phải qua chat history.

#### Relay Mode — nối tiếp

```
BA Role                     Dev Role                    QA Role
  │                            │                           │
  ├─ Viết BRD                  │                           │
  ├─ Save → Artifact Registry  │                           │
  │   BRD-001 (approved)       │                           │
  │                            ├─ Load BRD-001             │
  │                            ├─ Generate code            │
  │                            ├─ Save → CODE-001          │
  │                            │                           │
  │                            │                           ├─ Load BRD-001 + CODE-001
  │                            │                           ├─ Generate test cases
  │                            │                           └─ Save → TEST-001
```

Mỗi người bắt đầu session mới bằng cách load artifacts của người trước — không cần "kể lại lịch sử".

#### Parallel Mode — đồng thời (Role-domain isolation)

```
Mỗi người sở hữu một domain riêng trong CLAUDE.md:

BA_DOMAIN:       docs/brd/, docs/specs/          (BA Team)
ARCH_DOMAIN:     docs/arch/, docs/adr/           (Architect)
DEV_DOMAIN:      src/                            (Dev Team)
QA_DOMAIN:       tests/, docs/qa/               (QA Team)
WRI_DOMAIN:       docs/releasedoc/               (Technical writer Team)
```

**Rule:** Không ai viết vào domain của người khác. Nếu cần input từ domain khác, tạo request artifact thay vì modify trực tiếp.

#### Handoff checklist giữa người và người

Trước khi handoff, người trước phải:
- [ ] Artifact đã được save vào Registry với status `approved`
- [ ] `CLAUDE.md` đã được update với quyết định mới nhất
- [ ] Mọi "tại sao" đã được ghi vào ADR hoặc BRD comment — không để trong chat

---

### 1.5 Output Standardization

**Quyết định:** Output của mỗi agent là **fixed template**, không phải AI tự chọn format.

| Agent | Output format | Template file |
|-------|--------------|---------------|
| 02 Product Manager | BRD Markdown theo VIB template | `.claude/templates/brd-template.md` |
| 03 Solutions Architect | ADR Markdown (RFC-style) | `.claude/templates/adr-template.md` |
| 04 UX/UI Designer | Screen list + User journey Markdown | `.claude/templates/uiux-template.md` |
| 05 Frontend Developer | Code theo style guide + PR description | `.claude/templates/pr-template.md` |
| 06 Backend Engineer | Code + OpenAPI spec + PR description | `.claude/templates/pr-template.md` |
| 07 Database Architect | Schema SQL + Migration plan | `.claude/templates/db-migration-template.md` |
| 08 QA & Security | Test report + Bug report | `.claude/templates/test-report-template.md` |
| 09 Technical writer | Release note | `.claude/templates/release note-template.md` |

**AI không được tự chọn format.** Trong mỗi agent `.md` file, system prompt phải include: `"Always use the template at .claude/templates/[template-name]. Do not invent your own format."`

**Technique — AI options hay định sẵn?**

Quy tắc: **AI đưa option cho decisions chưa được quyết định. AI follow template cho decisions đã được quyết định.**

- Chưa quyết định (architecture, approach): AI suggest 2–3 options với tradeoffs → Human chọn → Ghi vào ADR
- Đã quyết định (format, naming convention, tech stack): AI follow template, không suggest alternatives

---

## 2. Project Profile — Khai báo khi khởi tạo project

Trước khi chạy bất kỳ stage nào, team khai báo Project Profile. Platform dùng Profile này để tự động map agents, tools, và launch target phù hợp — không hardcode.

```yaml
# project-profile.yaml — lưu trong Git root, đăng ký vào Artifact Registry
project_id:    "PRJ-001"
name:          "VIB Customer Portal"
product_type:  web_app          # web_app | mobile_app | api_service | data_pipeline | internal_tool | hybrid
tech_stack:
  frontend:    react            # react | vue | angular | ios_swift | android_kotlin | flutter | none
  backend:     python_fastapi   # python_fastapi | node_express | java_spring | dotnet | none
  database:    postgresql       # postgresql | mysql | mongodb | redis | none
  infra:       aws_eks          # aws_eks | aws_lambda | on_premise | none
launch_target: staging_web      # staging_web | testflight | google_play | internal_only | api_endpoint
has_ui:        true             # determines if Agent 04 (UIUX) is active
has_mobile:    false            # determines if mobile-specific tooling is activated
compliance:    banking_grade    # banking_grade | standard | none
```

**Platform tự động resolve:**
- `has_ui: false` → skip Agent 04, skip Stage 1.3 UIUX
- `has_mobile: true` → activate mobile build tools, TestFlight/Play Store gate
- `product_type: api_service` → skip UIUX, skip Stage 1.3, Stage 1.4 chỉ dùng Agent 06+07
- `compliance: banking_grade` → Gate 5 bắt buộc TCP + SBV audit trail

---

## 3. Agent Registry (08 Agents Chuẩn)

Đây là 8 agents chuẩn của platform. Mỗi project dùng **subset** phù hợp dựa trên Project Profile.
Agent numbering là cố định — không đổi số khi thêm agent mới (append-only, không re-number).

| ID | Agent | Domain | Input | Output artifact | Active khi |
|----|-------|--------|-------|----------------|------------|
| `01` | **Lead Orchestrator** | Cross-cutting | Project Profile, task queue | Execution plan, delegation log | Luôn active (Mode A) |
| `02` | **Product Manager** | Requirements | Business need, raw notes | BRD, User Stories, Acceptance Criteria | Luôn active |
| `03` | **Solutions Architect** | Architecture | BRD, constraints | ADR, Architecture Diagram, TCP draft | Luôn active |
| `04` | **UX/UI Designer** | Design | BRD, user journey | Screen list, Wireframes, Microcopy, Prototype | `has_ui: true` |
| `05` | **Frontend Developer** | Client-side | Wireframes, API spec, tech_stack.frontend | Frontend code, PR | `has_ui: true` |
| `06` | **Backend Engineer** | API / Services | ADR, API spec, tech_stack.backend | API code, PR | `has_backend: true` |
| `07` | **Database Architect** | Data | ADR, data model, tech_stack.database | Schema migration, DB scripts | `has_database: true` |
| `08` | **QA & Security Engineer** | Quality | Acceptance criteria, code, compliance level | Test cases, Bug report, Security scan | Luôn active |
| `09` | **Technical Writer** | Documentation | BRD, ADR, API spec, code, test results | README, API docs, User Guide, Release Notes, Changelog | Luôn active |

### Agent 05 — Frontend Developer (chi tiết)

Agent 05 là **Frontend Developer** — không phải iOS Developer. Behavior của agent phụ thuộc vào `tech_stack.frontend` trong Project Profile:

| `tech_stack.frontend` | Agent 05 generates | Test tool |
|----------------------|-------------------|-----------|
| `react` / `vue` / `angular` | TypeScript/JSX components, Tailwind CSS | Playwright, Vitest |
| `ios_swift` | Swift/SwiftUI code, Xcode project | XCTest, TestFlight |
| `android_kotlin` | Kotlin/Jetpack Compose | Espresso, Play Console |
| `flutter` | Dart widgets, Flutter project | Flutter test, both stores |
| `none` | — (agent skipped) | — |

Agent 05 prompt template tự động inject đúng language/framework từ Profile — không cần tạo agent riêng cho mỗi platform.

### Agent subset theo product type

| Product type | Agents active | Agents skipped |
|-------------|--------------|---------------|
| `web_app` | 01, 02, 03, 04, 05 (react), 06, 07, 08, 09 | — |
| `mobile_app` | 01, 02, 03, 04, 05 (ios/android/flutter), 06, 07, 08, 09 | — |
| `api_service` | 01, 02, 03, 06, 07, 08, 09 | 04, 05 |
| `data_pipeline` | 01, 02, 03, 06, 07, 08, 09 | 04, 05 |
| `internal_tool` | 01, 02, 03, 04, 05 (react), 06, 07, 08, 09 | — |
| `hybrid` | Tất cả 09 | Theo từng sub-system |

**Nguyên tắc cố định (không phụ thuộc Profile):**
- Agent `01` (Orchestrator) luôn active trong Mode A — không optional
- Agent `04` (UIUX) thuộc Stage Design, không thuộc Stage Development
- Agent `05`, `06`, `07` chạy **song song** trong Development stage
- Agent `08` chạy **sau** Development, **trước** Deploy
- Agent `09` chạy **sau** mỗi milestone (Gate 0, 1, 2, 3, 4) — tổng hợp docs từ artifacts đã approve

### Implementation: Sub-Agents vs Agent Teams

Hai features của Claude Code thực thi Agent Registry theo hai pattern khác nhau:

| Pattern | Claude Code feature | Khi nào dùng | Production-ready? |
|---------|-------------------|-------------|-------------------|
| **Sub-Agent** | `.claude/agents/*.md` files | Task độc lập, report về orchestrator, cần reusable config | Stable ✓ |
| **Agent Teams** | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Agents cần coordinate trực tiếp với nhau (05+06+07 parallel) | Experimental ⚠ |

#### Sub-Agent file format (`.claude/agents/`)

Mỗi agent trong registry được implement dưới dạng một `.md` file — versioned trong Git, reusable across projects:

```
.claude/agents/
├── 01-lead-orchestrator.md
├── 02-product-manager.md
├── 03-solutions-architect.md
├── 04-ux-ui-designer.md          ← active khi has_ui: true
├── 05-frontend-developer.md      ← behavior resolved từ project-profile.yaml
├── 06-backend-engineer.md
├── 07-database-architect.md
└── 08-qa-security-engineer.md
└── 09-technical-writer.md
```

**Template chuẩn cho mỗi agent file:**

```markdown
---
name: 08-qa-security-engineer
description: >
  INVOKE khi cần: generate test cases từ acceptance criteria, chạy security scan,
  viết bug report, hoặc validate test coverage. Luôn invoke SAU khi code done,
  TRƯỚC khi tạo PR. Không invoke song song với dev agents.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Bạn là QA & Security Engineer với expertise về banking-grade software quality.

## Context Discovery
Khi được invoke, đọc trước:
- `project-profile.yaml` — compliance level, tech stack
- Artifact Registry: linked BRD acceptance criteria
- Code changes: diff của PR đang review

## Workflow
1. Read acceptance criteria từ BRD artifacts
2. Generate test cases: N = len(acceptance_criteria) × 2
3. Execute automated tests theo tech_stack từ Project Profile
4. Generate security scan (OWASP top 10)
5. Write bug report với severity: Critical / High / Medium / Low
6. Upload results lên Artifact Registry với commit_ref

## Output format
Luôn trả về structured report:
- test_coverage: float
- bugs: {critical, high, medium, low}
- security_findings: {critical, high}
- recommendation: approve | request_changes
```

**Tool restrictions theo role:**

| Agent | Tools | Lý do |
|-------|-------|-------|
| 01 Lead Orchestrator | Read, Grep, Glob, Bash, Task | Cần spawn sub-agents và đọc toàn bộ project |
| 02 Product Manager | Read, Write, Edit, Grep | Viết BRD/spec nhưng không execute code |
| 03 Solutions Architect | Read, Write, Edit, Grep, WebFetch | Cần research + viết ADR |
| 04 UX/UI Designer | Read, Write, Edit, Glob | Viết wireframes/prototype, không execute |
| 05 Frontend Developer | Read, Write, Edit, Bash, Glob, Grep | Implement + run build |
| 06 Backend Engineer | Read, Write, Edit, Bash, Glob, Grep | Implement + run server |
| 07 Database Architect | Read, Write, Edit, Bash | Schema migration — Bash để run migration |
| 08 QA & Security | Read, Grep, Glob, Bash | Chạy tests, không được modify code |
| 09 Technical Writer | Read, Write, Edit, Grep, Glob | Viết docs từ artifacts — không execute code, không modify source |

### Agent 09 — Technical Writer (chi tiết)

Agent 09 là **Technical Writer** — biên soạn tài liệu từ artifacts đã được approve, không tạo nội dung mới từ ý kiến cá nhân. Mọi output đều có thể truy nguyên về artifact nguồn.

**Input (theo thứ tự ưu tiên):**
1. Artifact Registry entries (BRD, ADR, API spec, Test Result, Deploy Record)
2. Approved code (đọc qua Read/Grep — không modify)
3. CLAUDE.md — project decisions và conventions

**Output theo trigger:**

| Trigger | Output | Template |
|---------|--------|----------|
| Gate 0 pass | `docs/README.md` — Project overview, setup guide | `.claude/templates/readme-template.md` |
| Gate 1 pass (BRD approved) | `docs/user-guide/feature-{id}.md` — User-facing feature doc | `.claude/templates/user-guide-template.md` |
| Gate 3 pass (PR merged) | `docs/api/` — API reference từ OpenAPI spec | `.claude/templates/api-doc-template.md` |
| Gate 4 pass (Test complete) | `docs/qa/test-summary.md` — Test coverage summary | `.claude/templates/test-summary-template.md` |
| Gate 5 pass (Deploy) | `CHANGELOG.md` append + `docs/release-notes/v{x}.md` | `.claude/templates/release-notes-template.md` |

**Agent file template:**

```markdown
---
name: 09-technical-writer
description: >
  INVOKE sau mỗi Gate pass để tạo/cập nhật documentation từ approved artifacts.
  Luôn đọc artifact nguồn trước khi viết — không invent content.
  Không invoke song song với dev agents.
tools: Read, Write, Edit, Grep, Glob
model: sonnet
---

Bạn là Technical Writer với expertise về developer documentation và user-facing guides.

## Context Discovery
Khi được invoke, đọc trước:
- `project-profile.yaml` — product_type, tech_stack, launch_target
- `CLAUDE.md` — conventions, decisions đã approve
- Artifact Registry: linked artifacts của gate vừa pass

## Rules
- KHÔNG viết nội dung mà không có artifact nguồn
- KHÔNG modify source code hay test files
- Mọi fact/số liệu phải cite artifact ID nguồn
- Dùng ngôn ngữ phù hợp với audience: kỹ thuật cho API docs, plain language cho User Guide
- Append CHANGELOG — không xóa entries cũ

## Workflow
1. Identify gate trigger và artifacts liên quan
2. Read toàn bộ artifacts nguồn
3. Generate doc theo template tương ứng
4. Cross-check: mọi claim trong doc đều có artifact backing
5. Upload doc artifact lên Registry với type `DOCUMENTATION`
```

**Output artifact type:**

```yaml
DOCUMENTATION:
  id: "DOC-{project}-{type}-{version}"
  type: readme | api_doc | user_guide | test_summary | release_notes | changelog
  gate_trigger: "Gate 0" | "Gate 1" | "Gate 3" | "Gate 4" | "Gate 5"
  source_artifacts: list[str]    # IDs của artifacts nguồn
  file_path: str
  generated_by: "09-technical-writer"
  reviewed_by: str | null        # Human reviewer (optional cho internal docs)
```

---

#### Agent Teams pattern — Stage 1.4 Development

Khi 05+06+07 cần coordinate trực tiếp (API contract, shared types, schema alignment), dùng Agent Teams:

```bash
# settings.json — enable Agent Teams
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Prompt template cho Stage 1.4 Development:**

```
Create an agent team to implement [FEATURE_NAME] based on BRD artifact [BRD-ID].

Spawn 3 teammates with these exact file ownerships:
- Teammate: 05-frontend — files: src/components/, src/hooks/, src/pages/
- Teammate: 06-backend  — files: src/api/, src/services/, src/middleware/
- Teammate: 07-database — files: prisma/migrations/, src/models/

Coordination rules:
1. 07-database starts first — define schema and types
2. 06-backend waits for 07 to message "schema ready: [artifact-id]"
3. 05-frontend waits for 06 to message "API contract ready: [spec-url]"
4. All teammates must reference BRD-ID [BRD-ID] in every commit message
5. No teammate merges PR without Agent 08 review pass

Require plan approval before any teammate makes changes.
```

**Nguyên tắc Agent Teams cho VIB:**
- Tối đa 3–4 teammates — nhiều hơn làm tăng coordination overhead và token cost
- Mỗi teammate sở hữu **file scope riêng** — không overlap để tránh edit conflict
- Teammate dùng model `sonnet` (không dùng `opus`) trừ khi task cực kỳ phức tạp
- Luôn chạy **Plan mode trước** (~10k tokens) trước khi spawn team (~500k+ tokens)

### Shared Context & Memory — CLAUDE.md

**CLAUDE.md** là file duy nhất chứa shared context cho toàn project — đây là "memory" của platform. Mọi agent, mọi session, mọi thành viên đều đọc file này trước khi làm việc.

#### Cấu trúc CLAUDE.md chuẩn VIB

```markdown
# [PROJECT_NAME] — CLAUDE.md
# Shared context cho tất cả agents và team members
# Cập nhật sau mỗi decision quan trọng. KHÔNG xóa history — chỉ append.

## Project Profile
project_id: PRJ-HISTAFF-001
product_type: internal_tool
compliance: banking_grade
pilot_phase: Phase 0 Stage 0.2

## Kiến trúc đã quyết định (ADRs)
- ADR-001: FastAPI backend, React frontend — [link]
- ADR-002: PostgreSQL trên Aurora, append-only Artifact Registry — [link]
- ADR-003: Azure DevOps Git, Azure Pipelines cho CI — [link]

## Conventions bắt buộc
- Mọi commit message phải chứa BRD reference: feat(HRM-002): ...
- PR không được merge nếu chưa có test file
- Không DROP/TRUNCATE ngoài môi trường dev/test

## Decisions đang chờ (pending)
- [ ] Confirm tech stack cho ESOP module (waiting: Architect)
- [ ] Xác nhận API contract với OMS team (waiting: Dev Lead)

## Domain ownership
- docs/brd/, docs/specs/ → BA Team
- docs/arch/, docs/adr/ → Architect
- src/ → Dev Team
- tests/ → QA Team

## Artifacts đã complete
- BRD-001: HiStaff Employee Profile Module — approved 2026-03-20
- ADR-001: Tech stack decision — approved 2026-03-22

## Lessons learned (append only)
- 2026-03-20: Agent 02 generate BRD tốt khi có pain point list làm input
- 2026-03-22: Agent 03 cần architecture constraints rõ trước, không để tự propose
```

#### CLAUDE.md update protocol

| Khi nào | Ai update | Nội dung update |
|---------|----------|----------------|
| Sau mỗi ADR được approve | Architect | Add vào "Kiến trúc đã quyết định" |
| Sau mỗi artifact approved | Owner của artifact | Add vào "Artifacts đã complete" |
| Sau mỗi session có insight mới | Bất kỳ ai | Append vào "Lessons learned" |
| Khi có pending decision | Người cần quyết định | Add vào "Decisions đang chờ" |

**Rule quan trọng:** Không xóa nội dung cũ — chỉ append. CLAUDE.md là audit trail của project decisions, không phải scratchpad.

---

```python
# Mỗi agent nhận vào: context + input artifacts + instructions + project profile
# Mỗi agent trả về: output artifact + confidence score + human_review_required flag

AgentInvocation {
  agent_id:               str         # "05-frontend-developer"
  project_id:             str         # linked vào Artifact Registry
  project_profile:        dict        # full project-profile.yaml content
  input_artifact_ids:     list[str]   # IDs từ Artifact Registry
  instructions:           str         # Task-specific prompt
  autonomy_level:         int         # 1–4
  human_review_required:  bool        # override nếu True → tạo review checkpoint
}
# Agent tự resolve: tech stack, test framework, build target từ project_profile
```

---

## 4. Human-in-the-Loop (HitL) Framework

Khi agents chạy parallel (đặc biệt Agent Teams trong Stage 1.4), human không phải idle — có **4 lớp kiểm soát** hoạt động đồng thời.

### Layer 1 — Pre-execution: Approve trước khi agents chạy

**Plan Mode (bắt buộc trước Agent Teams)**

Trước khi spawn bất kỳ team nào, human review execution plan. Plan mode chỉ read files (~10k tokens). Một team đi sai hướng tốn 500k+ tokens — plan mode là checkpoint rẻ nhất.

```
Human: "Plan the implementation for [BRD-ID]. Show me the task breakdown before spawning any agents."
Claude: [plan mode — reads codebase, produces step-by-step plan]
Human: [review, adjust scope nếu cần]
Human: "Approved. Now spawn the team."
```

**Team spawn approval**

Claude không tự spawn Agent Teams. Nếu Claude xác định task nên dùng team, nó propose → human confirm. Human luôn có quyền nói không.

**Devil's Advocate pattern — review plan bằng model khác**

Trước khi execute, thêm một agent chuyên phản biện plan:

```
Human: "Plan the implementation for HRM-007 (Payroll engine)."
Claude: [produces plan]
Human: "Now create a devil's advocate agent to critique this plan.
        Find assumptions, risks, and missing edge cases."
Claude: [spawns critic teammate]
Critic: "Assumption 1: batch job completes in <30 min — not validated for 4,000 employees.
         Risk: PIT calculation depends on OMS sync being complete — race condition possible.
         Missing: rollback strategy if payroll batch fails mid-run."
Human: [addresses critiques, updates plan]
Human: "Approved. Spawn execution team."
```

**Khi nào dùng Devil's Advocate:**
- Plans liên quan đến payroll, tax, data migration — sai là nguy hiểm
- Architecture decisions ảnh hưởng nhiều systems
- Bất cứ khi nào human không chắc chắn về plan

---

### Layer 2 — Mid-execution: Hooks tự động chặn tại checkpoint

Hooks là cơ chế **automated quality gate** chạy ngay tại runtime — không cần human ngồi canh màn hình.

#### Hook config chuẩn VIB (`.claude/settings.json`):

```json
{
  "hooks": {
    "TeammateIdle": [
      {
        "matcher": "*",
        "hooks": [{
          "type": "command",
          "command": "bash .claude/hooks/vib-teammate-idle-check.sh"
        }]
      }
    ],
    "TaskCompleted": [
      {
        "matcher": "*",
        "hooks": [{
          "type": "command",
          "command": "bash .claude/hooks/vib-task-quality-check.sh"
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "bash .claude/hooks/vib-bash-safety-check.sh"
        }]
      }
    ]
  }
}
```

#### `vib-teammate-idle-check.sh` — TeammateIdle hook

```bash
#!/bin/bash
# Chạy khi teammate sắp idle. exit 2 = gửi feedback + keep working. exit 0 = cho idle.
INPUT=$(cat)
AGENT=$(echo "$INPUT" | jq -r '.teammate_name // "unknown"')

# Kiểm tra artifact output tồn tại
case "$AGENT" in
  *frontend*) REQUIRED="src/components/" ;;
  *backend*)  REQUIRED="src/api/" ;;
  *database*) REQUIRED="prisma/migrations/" ;;
  *) exit 0 ;;
esac

if [ ! -d "$REQUIRED" ] || [ -z "$(ls -A $REQUIRED 2>/dev/null)" ]; then
  echo "Agent $AGENT: output directory $REQUIRED is empty. Complete your deliverable before going idle."
  exit 2
fi
exit 0
```

#### `vib-task-quality-check.sh` — TaskCompleted hook

```bash
#!/bin/bash
# Chạy khi task sắp mark complete. exit 2 = reject + send feedback. exit 0 = accept.
INPUT=$(cat)
TASK=$(echo "$INPUT" | jq -r '.task_description // ""')

# Block nếu không có BRD reference trong task output
if ! find . -name "*.md" -newer .claude/last-checkpoint -exec grep -l "FR-\|UC-\|BRD-" {} \; 2>/dev/null | grep -q .; then
  echo "Task must reference a BRD item (FR-XXX, UC-XXX). Add traceability before marking complete."
  exit 2
fi

# Block nếu không có test file
if ! find . \( -name "*.test.*" -o -name "*_test.*" -o -name "*spec.*" \) -newer .claude/last-checkpoint 2>/dev/null | grep -q .; then
  echo "No test file found. Create tests before marking complete."
  exit 2
fi
exit 0
```

#### `vib-bash-safety-check.sh` — PreToolUse hook (banking safety)

```bash
#!/bin/bash
# Block dangerous DB commands trên production. exit 2 = block. exit 0 = allow.
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
ENV=$(cat project-profile.yaml 2>/dev/null | grep "infra:" | head -1)

# Block DROP/TRUNCATE/ALTER nếu không phải test environment
if echo "$CMD" | grep -iE '\b(DROP|TRUNCATE|ALTER TABLE|DELETE FROM)\b' > /dev/null; then
  if ! echo "$CMD" | grep -i "test\|dev\|local" > /dev/null; then
    echo "BLOCKED: Destructive DB command requires manual approval outside test environments."
    exit 2
  fi
fi
exit 0
```

#### Hook behavior summary

| Hook | Trigger | `exit 0` | `exit 2` |
|------|---------|---------|---------|
| `TeammateIdle` | Agent sắp dừng | Cho idle | Gửi feedback, agent tiếp tục |
| `TaskCompleted` | Task sắp mark done | Accept completion | Reject, agent phải fix |
| `PreToolUse: Bash` | Trước mỗi Bash call | Allow | Block lệnh nguy hiểm |

---

### Layer 3 — Direct interaction: Human can thiệp từng agent đang chạy

**tmux split-pane mode** (Agent Teams):

```bash
# Xem tất cả agents cùng lúc trong split panes
# Shift+Down: cycle qua từng teammate
# Message trực tiếp teammate đang đi sai:
> "Agent 05: stop. The API contract changed. Read src/api/types.ts before continuing."
```

**Tab highlight on attention needed:**

```json
// .claude/settings.json — highlight terminal tab khi cần attention
{
  "hooks": {
    "TeammateIdle": [{
      "hooks": [{
        "type": "command",
        "command": "bash -c 'echo -ne \"\\033]0;⚠ AGENT NEEDS ATTENTION\\007\"'"
      }]
    }]
  }
}
```

Human không cần ngồi canh — terminal tab tự highlight khi hook cần input.

---

### Layer 4 — Post-execution: Review trước khi artifact ra ngoài

**Human literacy requirement:** Người approve không thể chỉ "click approve" mà không đọc. Mọi approval phải đi kèm với confirmation rằng người đó hiểu context.

Artifact Registry enforce điều này qua required field `approved_comment` — không phải chỉ `approved_by`:

```yaml
# Artifact approval schema — approved_comment là required, không phải optional
approval:
  approved_by:      "hr-manager@vib.com.vn"
  approved_at:      "2026-03-30T09:15:00+07:00"
  approved_comment: "Đã review BRD-001. Confirm FR-001 đến FR-005 đúng với yêu cầu BU.
                     Lưu ý: FR-004 (dependent tax) cần confirm thêm với C&B về kỳ giảm trừ."
  # Trống = reject tự động — không cho approve mà không có comment
```

| Checkpoint | Enforced by | Human action |
|-----------|-------------|-------------|
| PR review | Gate 3 (CI) | Human reviewer approve + comment — không phải author |
| Artifact sign-off | Artifact Registry | `approved_by` + `approved_comment` bắt buộc |
| Test Gate | Gate 4 (CI) | QA human exploratory sign-off + test summary |
| Deploy Gate | Gate 5 (OPA) | TCP approval + deploy window check |

### HitL map theo Stage

| Stage | Layer 1 | Layer 2 | Layer 3 | Layer 4 |
|-------|---------|---------|---------|---------|
| Phase 0 Stage 0.2 | PO review plan | — | — | PO/Architect approve artifacts |
| Stage 1.2 BRD | — | — | — | Gate 1: PO sign-off |
| Stage 1.3 UIUX | — | — | — | Gate 2: UIUX + PO approve |
| Stage 1.4 Dev | Plan approval → spawn | TeammateIdle + TaskCompleted hooks | tmux: redirect agent | Gate 3: human PR review |
| Stage 1.5 Testing | — | TaskCompleted: coverage check | — | Gate 4: QA sign-off |
| Production deploy | — | — | — | Gate 5: TCP + OPA |

---

### Sơ đồ tổng thể

```
PHASE 0 — FOUNDATION
├── Stage 1: Discover & Deconstruct  [Mode H — baseline]
│   └── Human-only, không có agent
│
└── Stage 2: Design & Construct      [Mode A — target]
    └── 8 agents với Orchestrator

        ↕ Policy Gate: Foundation Approval

PHASE 1 — EXECUTION
├── Stage 1: Market Research
├── Stage 2: BRD
├── Stage 3: UIUX Design
│
│   ↕ Policy Gate: Design Approval
│
├── Stage 4: Development  (agents 05, 06, 07 parallel)
│
│   ↕ Policy Gate: PR Gate
│
├── Stage 5: Testing
│
│   ↕ Policy Gate: Test Gate
│
└── Stage 6: Launch / Release
```

---

## 4b. Highlight Log — Ghi nhận Action Quan trọng

**Mục đích:** Capture các sự kiện có impact cao trong suốt vòng đời project — không phải audit log kỹ thuật (đã có S3/Athena), mà là **narrative log** giúp team và AI agents hiểu "điều gì đã xảy ra và tại sao" trong các session tiếp theo.

### Highlight Log là gì?

Artifact Registry lưu *what* (artifact nào được tạo ra). CLAUDE.md lưu *decisions*. **Highlight Log lưu *events* quan trọng xảy ra trong quá trình thực thi** — bao gồm cả sự kiện tốt, blockers, và các quyết định đột xuất không có trong BRD.

### Highlight types

| Type | Ký hiệu | Khi nào ghi | Ví dụ |
|------|---------|------------|-------|
| `MILESTONE` | 🏁 | Gate pass, phase transition, major artifact approved | "Gate 1 passed — BRD-001 approved by PO 2026-04-09" |
| `DECISION` | 🔵 | Quyết định kỹ thuật/business đột xuất không có trong BRD | "Chuyển từ REST sang gRPC cho OMS integration do latency requirement" |
| `BLOCKER` | 🔴 | Vấn đề block tiến độ | "Agent 06 blocked: OMS API spec chưa sẵn sàng — waiting Dev Lead" |
| `RISK` | 🟠 | Rủi ro phát sinh cần theo dõi | "PIT formula thay đổi theo TT80/2025 — cần verify lại HRM-008" |
| `ESCALATION` | ⚡ | Quyết định cần leo thang lên level cao hơn | "Autonomy level L2 request → waiting TechLead approval" |
| `INSIGHT` | 💡 | Lesson learned trong session — nên share toàn team | "Agent 02 generate BRD tốt hơn khi input là pain point list thay vì feature list" |
| `DEVIATION` | ⚠️ | Team/agent đi lệch khỏi standard — có lý do | "Bỏ qua Gate 2 UIUX approval — emergency hotfix, PO verbal approve, ghi nhận tại đây" |

### Highlight Log format

```yaml
# .highlight-log.yaml — lưu ở Git root, append-only
# Dùng `git log --follow .highlight-log.yaml` để xem history

- timestamp:  "2026-04-09T10:30:00+07:00"
  type:       MILESTONE
  actor:      "nguyen.thi.lan@vib.com.vn"   # human hoặc agent ID
  gate:       "Gate 1"
  artifact:   "BRD-HISTAFF-001"
  message:    "BRD approved. FR-001 đến FR-012 confirmed. FR-004 có note: confirm C&B về kỳ giảm trừ."

- timestamp:  "2026-04-09T14:15:00+07:00"
  type:       BLOCKER
  actor:      "06-backend-engineer"
  blocked_by: "OMS team"
  eta:        "2026-04-11"
  message:    "OMS API spec v2 chưa publish. Agent 06 tạm dừng HRM-005. Dev Lead escalate sang OMS team."

- timestamp:  "2026-04-09T16:00:00+07:00"
  type:       DECISION
  actor:      "tran.van.duc@vib.com.vn"     # Architect
  adr_ref:    "ADR-002"
  message:    "Chuyển Oracle → PostgreSQL Aurora cho Phase 1 (không phải Phase 2 như plan ban đầu). Lý do: Oracle license cost vượt budget. Ghi vào ADR-002."

- timestamp:  "2026-04-10T09:00:00+07:00"
  type:       INSIGHT
  actor:      "le.thi.mai@vib.com.vn"
  message:    "Agent 03 đề xuất event-sourcing cho Payroll engine — tốt nhưng over-engineered cho phase 1. Reject và ghi vào ADR để tránh propose lại."
```

### Ai ghi Highlight Log?

| Actor | Ghi khi nào | Tool |
|-------|------------|------|
| Human (bất kỳ ai) | Sau mỗi decision đột xuất, blocker, milestone | Edit `.highlight-log.yaml` thủ công |
| Agent 01 (Orchestrator) | Tự động sau mỗi gate pass hoặc agent blocked | Append via `Write` tool |
| Agent 09 (Technical Writer) | Tổng hợp highlights thành `docs/release-notes/` sau Gate 5 | Read log → write release notes |
| `TaskCompleted` hook | Tự động append `MILESTONE` khi task mark complete với BRD ref | Bash script |

### Hook tự động ghi Highlight Log

```bash
# .claude/hooks/vib-highlight-logger.sh
# Gắn vào TaskCompleted hook — tự động ghi MILESTONE khi task có BRD ref
#!/bin/bash
INPUT=$(cat)
TASK=$(echo "$INPUT" | jq -r '.task_description // ""')
BRD_REF=$(echo "$TASK" | grep -oE '(FR|UC|BRD)-[0-9]+' | head -1)

if [ -n "$BRD_REF" ]; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S+07:00")
  AGENT=$(echo "$INPUT" | jq -r '.agent_id // "unknown"')
  cat >> .highlight-log.yaml << EOF

- timestamp:  "$TIMESTAMP"
  type:       MILESTONE
  actor:      "$AGENT"
  artifact:   "$BRD_REF"
  message:    "Task completed: $TASK"
EOF
fi
exit 0
```

**Cập nhật `.claude/settings.json`:**

```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/vib-task-quality-check.sh" },
          { "type": "command", "command": "bash .claude/hooks/vib-highlight-logger.sh" }
        ]
      }
    ]
  }
}
```

### Highlight Log trong CLAUDE.md

Agents đọc `.highlight-log.yaml` khi bắt đầu session để hiểu context hiện tại:

```markdown
## Highlight Log (recent — đọc trước khi làm việc)
[Agent 01 auto-inject 10 entries gần nhất từ .highlight-log.yaml vào đây mỗi session]
```

---

## 5. Phase 0 — Foundation

Mục tiêu Phase 0: thiết lập baseline hiểu biết về bài toán. Chạy **một lần** trước khi bắt đầu Phase 1.

---

### Stage 0.1 — Discover & Deconstruct (Mode H)

> Human-only. Không có agent. Đây là baseline để so sánh với Stage 0.2.
> Artifact từ Stage này là input cho Stage 0.2.

| Task | Owner | Output artifact | Lưu ở đâu |
|------|-------|----------------|-----------|
| Market research | PO | `market-research.md` | Git: `docs/research/` |
| BRD development | PO | `brd-v0.md` | Git: `docs/brd/` |
| UIUX development | UIUX Designer *(nếu has_ui)* | `wireframes-v0/` | Git: `docs/design/` |
| Software Architecture | Tech Lead | `architecture-v0.md` | Git: `docs/arch/` |
| API spec draft | Dev | `api-spec-v0.yaml` | Git: `docs/api/` |
| Client development | Dev *(nếu has_ui)* | Working prototype (optional) | Git: `prototype/` |
| Non-prod testing | QA | `test-report-v0.md` | Git: `docs/qa/` |
| Internal release | Dev | Build artifact (web staging / mobile beta / API sandbox) | CI/CD |

**Artifact Registry:** Tất cả output được đăng ký vào Artifact Registry với type `FOUNDATION_HUMAN` và linked thành một Foundation Bundle `FB-{project-id}`.

---

### Stage 0.2 — Design & Construct (Mode A)

> Agent-led. 8 agents thực hiện cùng tasks như Stage 0.1 nhưng nhanh hơn và có AI context.
> Output so sánh với Stage 0.1 để calibrate agent quality.

#### Agent execution map

| Task | Agent | Input artifacts | Output artifact | Human checkpoint |
|------|-------|----------------|----------------|-----------------|
| Market research | `01` → delegates to `02` | Brief từ PO | `market-research-ai.md` | PO review (30 phút) |
| BRD development | `02` Product Manager | `market-research-ai.md` | `brd-v1.md` | PO approve |
| UIUX development *(has_ui)* | `04` UX/UI Designer | `brd-v1.md` | `wireframes-v1/`, `microcopy.md` | UIUX Designer review |
| BRS (Business Requirements Spec) | `02` Product Manager | `brd-v1.md` | `brs-v1.md` | PO approve |
| Software Architecture | `03` Solutions Architect | `brd-v1.md`, `brs-v1.md` | `architecture-v1.md`, `adr-001.md`, `tcp-draft.md` | Architect approve |
| Frontend Development *(has_ui)* | `05` Frontend Developer | `wireframes-v1/`, `api-spec-v1.yaml`, `tech_stack.frontend` | Frontend code PR | Dev review |
| Backend / API Development | `06` Backend Engineer | `architecture-v1.md`, `api-spec-v0.yaml` | `api-spec-v1.yaml`, API code PR | Dev review |
| DB Design | `07` Database Architect | `architecture-v1.md` | `schema-v1.sql`, migration scripts | DBA review |
| Non-prod Testing | `08` QA & Security | Acceptance criteria, code | `test-cases-v1.md`, `security-scan.md` | QA sign-off |

#### Orchestrator responsibility (Agent 01)

```
01-lead-orchestrator:
  1. Nhận Project Context từ PO
  2. Parse BRD thành task list
  3. Assign tasks đến agents theo dependency graph
  4. Monitor tiến độ, handle blockers
  5. Tổng hợp output thành Project Summary Report
  6. Flag items cần human decision (confidence < threshold)
```

**Policy Gate 0 — Foundation Approval:**

Trước khi chuyển sang Phase 1, cần pass:
- [ ] BRD v1 được PO approve (signature trong Artifact Registry)
- [ ] Architecture v1 được Architect approve
- [ ] TCP draft được Architecture Board review (nếu có system change)
- [ ] UIUX wireframes được UIUX Designer approve

Gate result được logged. Nếu fail → block Phase 1, tạo remediation task.

---

## 6. Phase 1 — Execution

Mục tiêu Phase 1: build và launch sản phẩm dựa trên Foundation đã được approve.

---

### Stage 1.1 — Market Research

| Mode | Owner | Agent | Input | Output |
|------|-------|-------|-------|--------|
| H | PO | — | Brief | `competitive-analysis.md` |
| A | PO + `01`→`02` | researcher pattern | Brief | `competitive-analysis-ai.md`, gap matrix |

**Artifact:** `MARKET_RESEARCH` — linked vào BRD stage tiếp theo.

**Tasks:**
- Search competitors & key takeaways
- Synthesize comparison matrix
- Identify gaps & opportunities
- Recommend positioning

---

### Stage 1.2 — BRD Development

| Mode | Owner | Agent | Input | Output |
|------|-------|-------|-------|--------|
| H | PO | — | Market research | `brd-final.md` |
| A | PO + `02` | Product Manager | `competitive-analysis-ai.md`, `brd-v1.md` | `brd-final.md` |

**BRD phải bao gồm:**
- KPIs (measurable, time-bound)
- Functional Requirements (FR-001, FR-002, ...)
- Non-Functional Requirements
- Use cases (UC-001, UC-002, ...)
- Out of scope list
- Acceptance criteria cho từng FR

**Artifact:** `BRD` — required input cho Stage 1.3 và Stage 1.4.

**Policy Gate 1 — BRD Approval:**
- [ ] KPIs có measurement method rõ ràng
- [ ] Mỗi FR có ít nhất 1 acceptance criterion
- [ ] Out of scope list tồn tại và không empty
- [ ] PO approve (sign-off trong Artifact Registry)

---

### Stage 1.3 — UIUX Design

> **Chỉ chạy khi `has_ui: true` trong Project Profile.**
> Với `api_service` hoặc `data_pipeline`: skip stage này, chuyển thẳng sang Stage 1.4.

| Mode | Owner | Agent | Input | Output |
|------|-------|-------|-------|--------|
| H | UIUX Designer | — | BRD | Screens, user journey, microcopy |
| A | UIUX Designer + `04` | UX/UI Designer | `brd-final.md`, `wireframes-v1/` | Updated screens, interactive prototype |

**Tasks:**
- Screen list mapping từ use cases trong BRD
- User journey map (happy path + error states + empty states)
- Microcopy (button labels, error messages, tooltips)
- Interactive prototype — tooling theo Project Profile:

| `launch_target` | Prototype tool |
|----------------|----------------|
| `staging_web` / `internal_only` | HTML/CSS/JS (Claude Code) |
| `testflight` (iOS) | SwiftUI Preview hoặc HTML mockup |
| `google_play` (Android) | Jetpack Compose Preview hoặc HTML mockup |
| `api_endpoint` | Không cần prototype — skip |

```bash
# Claude Code generate prototype — tool tự động theo Profile
claude code "Build interactive prototype from wireframes-v1/
             Product type: ${PRODUCT_TYPE}, Frontend: ${TECH_STACK_FRONTEND}
             Cover all use cases from BRD: ${BRD_USE_CASES}"
```

**Artifact:** `UIUX_DESIGN` — linked vào BRD, required input cho Stage 1.4.

**Policy Gate 2 — Design Approval:**
- [ ] Tất cả use cases trong BRD có screen tương ứng
- [ ] Prototype render đúng trên target viewport (web: desktop+mobile / mobile: device-specific)
- [ ] UIUX Designer approve
- [ ] PO approve prototype

---

### Stage 1.4 — Development

> **Mode A only** — Stage này chạy agent-led. Nếu team chưa sẵn sàng Mode A, dùng Mode H với cùng cấu trúc tasks.

#### Step 0 — Plan approval (bắt buộc trước khi spawn agents)

```
Human → Claude: "Plan the development for [BRD-ID].
                 Show task breakdown for agents 05, 06, 07 before spawning."
Claude: [plan mode — reads BRD artifacts, architecture, wireframes]
        [produces: task list, file ownership map, dependency order]
Human: [review plan, adjust nếu cần]
Human: "Approved." → Claude spawns Agent Team
```

**Plan mode checkpoint prevents:** agents đi sai hướng, file conflict, wasted tokens (10k plan vs 500k+ execution).

#### Agent execution — parallel map (Agent Teams)

```
01-Lead-Orchestrator  [Team Lead]
    ├──> 02-Product-Manager      : Break BRD thành user stories + task tickets
    ├──> 03-Solutions-Architect  : Finalize architecture, create ADRs
    ├──> 04-UX/UI-Designer       : Component specs từ approved wireframes  [has_ui only]
    │
    │    [Parallel — sau khi Architect done + Plan approved]
    │    [Agent Teams: 05+06+07 coordinate trực tiếp qua Mailbox]
    ├──> 05-Frontend-Developer   : files: src/components/, src/hooks/   [has_ui only]
    ├──> 06-Backend-Engineer     : files: src/api/, src/services/
    └──> 07-Database-Architect   : files: prisma/migrations/, src/models/
```

**Coordination flow giữa 05+06+07:**
```
07 → [message] → 06: "Schema ready. Types exported at src/models/types.ts"
06 → [message] → 05: "API contract ready. Spec at src/api/openapi.yaml"
05 → starts implementation (unblocked)
```

**Code ownership boundary — AI làm đến đâu, Dev tiếp từ đâu**

**Quyết định rõ ràng:**

| Phần code | Owner | Lý do |
|-----------|-------|-------|
| Scaffold, boilerplate, CRUD cơ bản | AI (Agent 05/06/07) | Repetitive, pattern-driven, không cần judgment |
| Happy path implementation theo spec | AI | Nếu spec rõ → AI làm được, Dev review |
| Business logic phức tạp (ví dụ: PIT calculation, payroll formula) | Human Dev | Cần domain knowledge + accountability |
| Security-sensitive code (auth, encryption, PII handling) | Human Dev | AI có thể miss edge cases nguy hiểm |
| Edge cases & error handling | Human Dev | Cần judgment về what can go wrong |
| Code review toàn bộ | Human Dev | Luôn luôn — AI không review code của chính mình |

**Workflow thực tế:**

```
Agent generates: scaffold + happy path + basic tests
        ↓
Human Dev: đọc toàn bộ code được generate
        ↓
Human Dev: implement business logic + edge cases + security
        ↓
Human Dev: submit PR (với AI-generated code làm baseline)
        ↓
Gate 3: AI review lại toàn bộ PR diff (Agent 08)
        ↓
Human reviewer: final approve
```

**Rule:** Dev không được merge PR mà không đọc toàn bộ code — kể cả code do AI generate. "AI wrote it" không phải lý do để skip review.

**Human-in-the-loop trong parallel execution:**
- `TeammateIdle` hook: tự động kiểm tra output trước khi agent idle
- `TaskCompleted` hook: tự động reject nếu thiếu BRD ref hoặc test file
- `Shift+Down` (tmux): human cycle qua từng agent, redirect nếu cần
- Terminal tab highlight khi hook cần attention

**Agent 05 output theo Project Profile:**

| `tech_stack.frontend` | Agent 05 implements | PR contains |
|----------------------|--------------------|----|
| `react` | TypeScript + React components, Tailwind | `.tsx`, `.css`, storybook |
| `vue` | Vue 3 SFCs, Tailwind | `.vue`, `.ts` |
| `ios_swift` | SwiftUI views, UIKit controllers | `.swift`, Xcode project |
| `android_kotlin` | Jetpack Compose / XML layouts | `.kt`, `.xml` |
| `flutter` | Dart widgets | `.dart` |
| `none` / skipped | — | — |

#### Spec Gate (P13 — enforce trước mỗi PR)

Mỗi PR phải pass Spec Gate trước khi được tạo:

```yaml
# .github/workflows/spec-gate.yml
spec-gate:
  steps:
    - name: Check spec linkage
      run: |
        # PR title hoặc body phải chứa BRD item ID (FR-XXX hoặc UC-XXX)
        if ! grep -E "(FR|UC|BRD)-[0-9]+" <<< "$PR_BODY"; then
          echo "FAIL: Missing BRD/FR/UC reference in PR"
          exit 1
        fi
    - name: Check artifact registry
      run: |
        # Verify referenced ID tồn tại trong Artifact Registry
        curl -f "$REGISTRY_API/artifacts/$REF_ID" || exit 1
    - name: AI code review
      run: |
        # Agent 08 review PR diff
        # Returns: approved/changes-requested + review comments
```

#### PR Requirements

Mỗi PR phải có:
- [ ] Reference đến BRD item (FR-XXX, UC-XXX, hoặc BRD-XXX)
- [ ] AI-generated PR summary (từ Agent 06 hoặc 05)
- [ ] Test cases linked (từ Agent 08)
- [ ] No critical security findings từ security scan

**Policy Gate 3 — PR Gate:**
- [ ] Spec Gate pass (BRD item reference tồn tại)
- [ ] AI code review: no blocking comments
- [ ] Security scan: no critical/high findings
- [ ] Human reviewer approve (không phải author của PR)

**Artifact:** `CODE_COMMIT` — linked vào BRD item, linked vào UIUX artifact.

---

### Stage 1.5 — Testing

| Layer | Owner | Tool | Scope |
|-------|-------|------|-------|
| **Automated** | Agent `08` | Resolved từ Project Profile (xem bảng bên dưới) | Unit, integration, regression, security |
| **Human exploratory** | QA Human | Manual + target environment | UX flows, edge cases, environment-specific bugs |

**Test tools theo Project Profile:**

| `tech_stack` / `product_type` | Unit test | E2E / Integration | Security |
|-------------------------------|-----------|-------------------|---------|
| React / Vue / Angular | Vitest, Jest | Playwright | OWASP ZAP |
| iOS Swift | XCTest | XCUITest | Static analysis |
| Android Kotlin | JUnit + Espresso | UI Automator | MobSF |
| Flutter | flutter_test | integration_test | MobSF |
| Python FastAPI | pytest | httpx + pytest | Bandit, Safety |
| Node.js | Jest | Supertest | npm audit |
| Data pipeline | Great Expectations | End-to-end data quality | — |
| Generic / any | pytest / Jest | Agent 08 generates test plan | Snyk, SonarQube |

#### Agent 08 testing workflow

```
08-QA-Security-Engineer:
  1. Read acceptance criteria từ BRD (linked artifacts)
  2. Generate test cases: N = len(acceptance_criteria) × 2
  3. Execute automated tests trên CI
  4. Generate bug report: severity (Critical/High/Medium/Low)
  5. Generate security scan report (OWASP top 10 check)
  6. Upload kết quả lên Artifact Registry
```

#### Bug severity → action

| Severity | Action | Owner |
|----------|--------|-------|
| Critical | Block release, immediate fix | Dev |
| High | Block release, fix before launch | Dev |
| Medium | Fix in next sprint, document | Dev + PO |
| Low | Backlog, PO decides | PO |

**Policy Gate 4 — Test Gate:**
- [ ] Zero Critical bugs
- [ ] Zero High bugs (hoặc PO accept risk với documentation)
- [ ] Test coverage ≥ 60% (Phase 1), ≥ 70% (Phase 2+)
- [ ] Security scan: no Critical/High findings
- [ ] QA human sign-off

**Artifact:** `TEST_RESULT` — linked vào CODE_COMMIT, linked vào BRD items.

---

### Stage 1.6 — Launch / Release

Launch target được xác định hoàn toàn từ `launch_target` trong Project Profile — không hardcode.

**Launch target routing:**

| `launch_target` | Build tool | Distribution | Feedback collection |
|----------------|-----------|-------------|-------------------|
| `staging_web` | CI/CD build + Docker deploy | Internal URL / VPN | Google Form, Jira feedback |
| `internal_only` | CI/CD build | VIB internal network | Jira ticket, Slack |
| `testflight` | Xcode + Apple CI | TestFlight invite | TestFlight feedback |
| `google_play` | Gradle + Google CI | Internal Testing track | Play Console feedback |
| `api_endpoint` | Docker build + staging deploy | API sandbox URL | Postman collection, Slack |
| `data_pipeline` | Airflow / Glue deploy | Staging data environment | Data quality report |

**Tasks (chung cho mọi launch target):**

| Task | Owner | Notes |
|------|-------|-------|
| Build & package | Dev | Automated via CI — tool theo Project Profile |
| Deploy to target environment | DevOps | Staging / TestFlight / Play Console / API sandbox |
| Distribute to reviewers | PO | Invite list từ stakeholders |
| Collect structured feedback | PO + Stakeholders | Theo format chuẩn của từng channel |
| Bug triage | PO + Dev | Severity classification theo matrix |
| Go/No-Go decision | PO + Tech Lead | Dựa trên launch criteria bên dưới |

**Launch criteria (Go conditions — chung cho mọi product type):**
- [ ] Test Gate đã pass (Gate 4)
- [ ] Zero Critical / High bugs đang mở
- [ ] Build chạy ổn định trên target environment (không crash trong 30 phút)
- [ ] Performance: response time < 3s (web/API) hoặc app load < 3s (mobile)
- [ ] Stakeholder feedback score ≥ 3.5/5 (nếu có feedback round)

**Artifact:** `DEPLOY_RECORD` — linked vào TEST_RESULT, linked vào BRD.

---

## 7. Artifact Registry — Data Flow

Mỗi stage produce artifact được đăng ký và linked. Full lineage từ đầu đến cuối:

```
MARKET_RESEARCH ──links_to──> BRD
BRD             ──links_to──> UIUX_DESIGN
BRD             ──links_to──> ADR
BRD             ──links_to──> CODE_COMMIT (qua FR/UC reference)
UIUX_DESIGN     ──links_to──> CODE_COMMIT
ADR             ──links_to──> CODE_COMMIT
CODE_COMMIT     ──links_to──> TEST_RESULT
TEST_RESULT     ──links_to──> DEPLOY_RECORD
DEPLOY_RECORD   ──links_to──> AUDIT_LOG (auto)
```

### Artifact types và required fields

```yaml
MARKET_RESEARCH:
  id: "MR-{project}-{timestamp}"
  owner: str          # PO name
  mode: H | A
  file_path: str      # Git path

BRD:
  id: "BRD-{project}-{version}"
  items:              # list of FR-XXX, UC-XXX
    - id: "FR-001"
      title: str
      acceptance_criteria: list[str]
  approved_by: str
  approved_at: datetime

UIUX_DESIGN:
  id: "UIUX-{project}-{version}"
  screen_count: int
  brd_coverage: float  # % of use cases covered
  prototype_url: str

ADR:
  id: "ADR-{project}-{seq}"
  title: str
  status: proposed | accepted | superseded
  context: str
  decision: str
  consequences: str

CODE_COMMIT:
  id: "CC-{repo}-{sha}"
  sha: str
  brd_refs: list[str]   # ["FR-001", "UC-003"]
  agent_id: str | null  # null nếu human commit
  pr_number: int
  tech_stack: str       # from project profile (react / ios_swift / python_fastapi / etc.)

TEST_RESULT:
  id: "TR-{project}-{run_id}"
  commit_ref: str
  coverage: float
  bugs: {critical: int, high: int, medium: int, low: int}
  security_findings: {critical: int, high: int}
  agent_generated: bool

DEPLOY_RECORD:
  id: "DR-{env}-{timestamp}"
  environment: staging | production
  test_result_ref: str
  tcp_approved: bool    # required for production
  deployed_by: str
  deployed_at: datetime
```

---

## 8. Policy Gates Summary

| Gate | Trigger | Enforced by | HitL mechanism | Blocks |
|------|---------|-------------|----------------|--------|
| **Gate 0** Foundation Approval | Kết thúc Phase 0 | Manual checklist + Artifact Registry | Human sign-off required | Phase 1 start |
| **Gate 1** BRD Approval | Kết thúc Stage 1.2 | Artifact Registry (required fields) | PO approve in Portal | Stage 1.3 start |
| **Gate 2** Design Approval | Kết thúc Stage 1.3 | Manual checklist + Artifact Registry | UIUX + PO approve | Stage 1.4 start |
| **Gate 3** PR Gate | Mỗi PR creation | CI/CD + `TaskCompleted` hook | Human reviewer approve (not author) | PR merge |
| **Gate 4** Test Gate | Kết thúc Stage 1.5 | CI/CD + `TaskCompleted` hook | QA human sign-off | Stage 1.6 start |
| **Gate 5** Deploy Gate | Deploy lên production | CI/CD + Policy Engine (OPA) | TCP approval + deploy window | Production deploy |

### Gate 5 — Deploy Gate (Production only)

```yaml
deploy-gate:
  conditions:
    - test_gate_passed: true
    - tcp_approved: true           # Architecture Board sign-off
    - no_open_critical_bugs: true
    - deployer_has_permission: true
    - deploy_window: "Mon-Fri 09:00-17:00 ICT"  # No weekend deploys
```

---

## 9. Roles & Responsibilities

Kết hợp từ PRD (7 roles) và Flow (human owners + agents):

| Role | Mode H responsibility | Mode A responsibility |
|------|-----------------------|----------------------|
| **PO / Product Owner** | Drives tất cả stages, writes BRD, approves artifacts | Reviews & approves agent output; provides context to agents |
| **UIUX Designer** | Designs screens, user journey | Reviews agent-generated wireframes; approves prototype |
| **Tech Lead / Architect** | Designs architecture, writes ADR | Reviews Agent 03 output; approves ADR, TCP |
| **Developer** | Implements code, submits PR | Reviews Agent 05/06/07 output; merges PR |
| **QA Engineer** | Manual testing, device testing | Reviews Agent 08 output; exploratory testing |
| **DevOps / SRE** | Build, deploy, monitor | Configures CI gates; monitors agent pipeline |
| **AI Admin** | — | Manages agent configs, Claude licenses, RBAC |
| **Risk / Auditor** | Reviews compliance manually | Reads Artifact Registry; queries audit trail |

---

## 10. Technology Stack

| Component | Technology | Ghi chú |
|-----------|-----------|---------|
| AI Runtime | Claude Enterprise API | Existing VIB license |
| Agent Framework | **Claude Code Sub-Agents** (`.claude/agents/*.md`) | 8 agent files versioned trong Git |
| Parallel execution | **Claude Code Agent Teams** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) | Stage 1.4 Dev — experimental, Opus 4.6+ |
| HitL Hooks | **Claude Code Hooks** (`TeammateIdle`, `TaskCompleted`, `PreToolUse`) | Bash scripts trong `.claude/hooks/` |
| Portal UI | React + TypeScript | Web-based, no desktop client |
| Portal API | FastAPI (Python) | Existing VIB AI Portal stack |
| Artifact Registry | PostgreSQL (Aurora) | Append-only, shared Aurora cluster |
| Policy Engine | OPA (Open Policy Agent) | Hot-reload policies, testable rules |
| Audit Log | Amazon S3 + Athena | Long retention, cheap, queryable |
| CI/CD Gates | GitHub Actions / GitLab CI | YAML-based, inject vào existing pipelines |
| Auth | VIB SSO (OAuth2/OIDC) | Single login |
| **Frontend stack** | **Resolved từ `tech_stack.frontend`** | React / Vue / Swift / Kotlin / Flutter / none |
| **Test framework** | **Resolved từ Project Profile** | Vitest / XCTest / Espresso / pytest / Jest |
| **Build tool** | **Resolved từ `launch_target`** | Docker / Xcode / Gradle / Flutter build |
| Prototype tooling | HTML/CSS/JS (default) hoặc native preview | Fallback cho mọi product type |

---

## 11. Phased Roadmap

### Phase 0 — Foundation (Mode H first, Mode A target)

Đây là Phase 0 trong flow — không phải Phase 1 trong PRD. Chạy trước khi build platform.

**Mode H:** Team chạy Stage 0.1 thủ công, document mọi thứ vào Git.
**Mode A:** Team chạy Stage 0.2 với 8 agents, so sánh chất lượng output.
**Outcome:** Foundation Bundle approved, sẵn sàng cho Phase 1.

---

### Phase 1 — Execution Foundation (Q2 2026)

Build the platform infrastructure để Phase 1 flow hoạt động.

- [ ] Artifact Registry v1 (MARKET_RESEARCH, BRD, UIUX, CODE_COMMIT, TEST_RESULT, DEPLOY_RECORD)
- [ ] VIB AI Portal v1: navigation, SSO, role-based UI
- [ ] Policy Gates 1–4 (Gate 5 / Production deploy gate: Phase 2)
- [ ] Agent Registry: 8 agent configs có thể invoke từ Portal
- [ ] CI integration: PR Gate (Gate 3) cho GitHub Actions/GitLab CI
- [ ] Pilot: 3 teams chạy Phase 1 flow với Mode A

**Definition of Done:**
- Team chạy full Phase 1 flow (Stage 1.1 → 1.6) với Mode A
- Mọi artifact từ 6 stages đều tồn tại trong Artifact Registry
- Auditor có thể query full chain cho một feature

---

### Phase 2 — Traceability & Compliance (Q3 2026)

- [ ] Gate 5 (Production Deploy Gate) với OPA
- [ ] TCP workflow trong Artifact Registry
- [ ] Compliance Dashboard (Risk/Audit team)
- [ ] Audit export (PDF/CSV)
- [ ] SBV data retention policy enforcement (7 năm)
- [ ] 3 teams thêm onboard

---

### Phase 3 — Agentic Scale (Q4 2026)

- [ ] Agent `01–08` upgraded lên L3 (Conditional Autonomy)
- [ ] Overnight autonomous runs (L4)
- [ ] Self-service agent registration
- [ ] Cross-project knowledge graph
- [ ] AI maturity scoring per team

---

### Phase 4 — Autonomous Operations (2027)

- [ ] Predictive quality gates
- [ ] Auto SBV compliance reports
- [ ] VIB AI-DLC Center of Excellence

---

## 12. Success Metrics

| Metric | Baseline | Phase 1 | Phase 2 | Phase 3 |
|--------|----------|---------|---------|---------|
| Teams dùng Mode A | 0 | 3 | 8 | All |
| PRs có BRD reference | 0% | >80% pilot | >80% all | >95% |
| Artifact linkage completeness | 0% | >80% pilot | 100% | 100% |
| Test coverage (AI-generated) | ~20% | >60% | >70% | >80% |
| TCP review cycle time | 5–7 ngày | — | <1 ngày | <4 giờ |
| Time BRD→first PR | 3–5 ngày | <1 ngày | <4 giờ | <1 giờ |
| Audit query time | N/A | <5 phút | <1 phút | <10 giây |
| License utilization | 55% | >70% | >80% | >90% |

---

## 13. Architecture Decisions

Các quyết định kiến trúc đã được confirm — đây là decisions, không phải open questions.

| # | Decision | Kết quả | Ghi chú |
|---|----------|---------|---------|
| D1 | **Source control platform** | **Azure DevOps Git** | Primary SCM cho VIB. CI Gates implement qua Azure Pipelines YAML, không phải GitHub Actions / GitLab CI |
| D2 | **Data residency — Anthropic API** | **Accepted** | Không có yêu cầu data-on-shore đặc biệt. Claude Enterprise API calls được phép. Ghi nhận trong Risk register |
| D3 | **Pilot project** | **HiStaff Core HRM Rebuild (Phoenix Project)** | Hệ thống quản lý nhân sự VIB — ~4,000 nhân viên, 12 modules, 10 integrations |
| D4 | **VIB AI Portal inventory** | **Cần inventory sprint** | Chưa có danh sách feature hiện có. Action: AI Admin hoàn thành inventory trước Sprint 1 Week 1 |
| D5 | **Agent execution framework** | **Claude Code Sub-Agents** | `.claude/agents/*.md` files — stable, versioned trong Git, native với Agent Teams. MCP dành riêng cho external tool integration (AWS Cost, Jira, Azure DevOps API) |
| D6 | **Artifact Registry database** | **PostgreSQL (Aurora)** | Shared Aurora cluster hiện có — thêm schema mới, không tạo cluster riêng. Append-only tables |
| D7 | **Project Profile schema** | **6 types hiện tại đủ dùng** | `web_app`, `mobile_app`, `api_service`, `data_pipeline`, `internal_tool`, `hybrid`. Mở rộng khi có nhu cầu thực tế |
| D8 | **Project Profile của pilot** | **HiStaff — xem D3 chi tiết** | Khai báo đầy đủ trong D3 section bên dưới |

### D1 — Azure DevOps Git: thay đổi CI implementation

Do VIB dùng Azure DevOps, tất cả CI/CD gate references trong document được hiểu là **Azure Pipelines**, không phải GitHub Actions hay GitLab CI:

```yaml
# azure-pipelines.yml — PR Gate (Gate 3) cho Azure DevOps
trigger: none
pr:
  branches:
    include: ['*']

stages:
  - stage: SpecGate
    displayName: 'Gate 3 — Spec & BRD Reference Check'
    jobs:
      - job: CheckBRDRef
        steps:
          - script: |
              if ! echo "$(System.PullRequest.SourceBranch)" | grep -E "(FR|UC|BRD)-[0-9]+"; then
                if ! grep -rE "(FR|UC|BRD)-[0-9]+" $(Build.SourcesDirectory)/; then
                  echo "##vso[task.logissue type=error]Missing BRD reference. Link FR-XXX or UC-XXX before merging."
                  exit 1
                fi
              fi
            displayName: 'Check BRD/FR/UC reference in PR'

          - script: |
              curl -f "$REGISTRY_API/artifacts/$BRD_REF_ID" || exit 1
            displayName: 'Verify artifact exists in Registry'
            env:
              REGISTRY_API: $(ARTIFACT_REGISTRY_URL)

          - script: |
              # Agent 08 code review via Claude Enterprise API
              echo "Invoking 08-qa-security-engineer sub-agent..."
            displayName: 'AI code review — Agent 08'
```

### D3 — Pilot Project: HiStaff Core HRM (Phoenix Project)

#### Project Profile

```yaml
# project-profile.yaml — HiStaff Core HRM Rebuild
project_id:      "PRJ-HISTAFF-001"
name:            "HiStaff - Core Human Resource Management System"
alias:           "Phoenix Project"
product_type:    internal_tool
tech_stack:
  frontend:      react
  backend:       python_fastapi
  database:      postgresql
  infra:         aws_eks
launch_target:   internal_only
has_ui:          true
has_mobile:      false
compliance:      banking_grade
agents_active:   [01, 02, 03, 04, 05, 06, 07, 08, 09]
data_scope:      "~4,000 active employees"
stakeholders:
  - "HR Service Department"
  - "HR Data Management Team"
  - "Payroll Team / C&B Department"
  - "Finance Department"
  - "IT Operations"
  - "All Employees (via Portal)"
```

#### Scope

**In Scope:**
- Employee Profile Management (hồ sơ, địa chỉ, CCCD/CMND/Hộ chiếu, gia đình/người phụ thuộc)
- Work History & Decision Management (điều chuyển, điều chỉnh, tiếp nhận)
- Contract Management + eContract integration
- Attendance & Leave Management
- Payroll Calculation & Processing
- Bonus & Incentive Calculation (STI, CC Bonus)
- Personal Income Tax (PIT) — monthly withholding + annual finalization
- ESOP / Stock Award Tracking (KAFI)
- Employee Self-Service Portal
- User Administration, RBAC, Audit Logging
- Reporting & Analytics (HR, Payroll, Tax, Attendance)
- Utility Functions (bulk ops, notifications, alerts)

**Out of Scope:**
- Organizational Structure Management → OMS (hệ thống riêng)
- Job & Position Definition → OMS
- FTE Planning → OMS
- Recruitment & Talent Acquisition
- Performance Management & KPI
- Learning & Development

#### Functional Requirements — 12 BRS Items

| Req ID | Module | Requirement | Priority |
|--------|--------|-------------|---------|
| HRM-001 | System | Role-based Access Control — user groups, field-level permissions, department scope, audit trail | MUST |
| HRM-002 | Employee Profile | Complete Employee Lifecycle Record — auto Employee ID (ZZZZZ), personal info, OMS Position link, digital status | MUST |
| HRM-003 | Employee Profile | Multi-type Identity Document Management — CCCD, CMND, Hộ chiếu với format validation | MUST |
| HRM-004 | Employee Profile | Dependent Management for Tax — tên, quan hệ, MST NPT, kỳ giảm trừ | MUST |
| HRM-005 | Work History | Decision & Position Change Tracking — Điều chuyển, Điều chỉnh, Tiếp nhận, đồng bộ OMS | MUST |
| HRM-006 | Contract | eContract Integration — push/pull sync, user_updated_flag, 4 loại hợp đồng | MUST |
| HRM-007 | Payroll | Monthly Payroll Calculation Engine — gross, deductions, PIT, net pay, batch processing | MUST |
| HRM-008 | Tax | Annual PIT Finalization — 12-month aggregation, progressive tax brackets, ủy quyền quyết toán | MUST |
| HRM-009 | ESOP | Stock Award Management — custodian, shares, vesting date, hạn chế chuyển nhượng, KAFI sync | MUST |
| HRM-010 | Portal | Employee Self-Service — profile, work history, income, ESOP, tax summary, VIB Directory | MUST |
| HRM-011 | Attendance | Attendance & Leave Automation — device integration, leave balance, approval workflow, payroll feed | MUST |
| HRM-012 | Reporting | Comprehensive HR Reporting — headcount, payroll, tax, attendance, export Excel/PDF, ad-hoc | MUST |

#### Pain Points cần giải quyết

| # | Pain Point | Category | Solution Direction |
|---|-----------|----------|--------------------|
| 1 | Hệ thống chậm, treo khi load lớn | Performance | Optimize batch processing, async jobs |
| 2 | Resource consumption cao, ảnh hưởng client | Performance | Server-side processing, reduce client load |
| 3 | Workflow phức tạp, nhiều thao tác thủ công | UX/Workflow | Streamline flows, alternative permission |
| 4 | Giao diện không trực quan | UX | Redesign UI/UX theo modern HR SaaS standard |
| 5 | Không tổng hợp được batch toàn port một lần | Performance | Distributed batch processing architecture |
| 6 | Thiếu báo cáo phê duyệt công phép theo thẩm quyền | Workflow | Add approval audit report + expiry alerts |
| 7 | Thiết lập ca công phải thực hiện 2 bước tách biệt | Workflow | Merge shift setup & assignment thành 1 bước |
| 8 | HR Decision backdate theo OMS gây lỗi dữ liệu | Synchronization | Org Chart theo ngày hiệu lực, tách base/view |
| 9 | Lỗi tạo quyết định Tạm hoãn HĐLĐ | Bug | Fix + kiểm tra toàn bộ luồng tạo quyết định |
| 10 | Thiếu chức năng lưu Work History trước VIB | Enhancement | Thêm "Work History Before VIB" section |
| 11 | Thiếu cost allocation multi-dimension | Enhancement | Thêm cost allocation gắn vào employee record |
| 12 | Thiếu custom report templates | Enhancement | Custom report builder |

#### System Integrations (10 điểm tích hợp)

| Hệ thống | Loại | Data Flow | Tần suất |
|---------|------|----------|---------|
| OMS (Org Management) | Inbound | OMS → HiStaff: Org, Job, Position | Real-time / Event-driven |
| eContract HR | Bi-directional | Employee data sync, contract status, user_updated_flag | Real-time / Scheduled |
| Employee Portal | Bi-directional | Profile view/update requests | Real-time |
| KAFI Securities | Outbound | ESOP stock award data, employee accounts | Monthly / Ad-hoc |
| Banking / Salary | Outbound | Payroll transfer files | Monthly |
| Tax Authority (GDT) | Outbound | PIT declarations, annual finalization | Monthly / Annual |
| Social Insurance (BHXH) | Bi-directional | Insurance registration, contribution data | Monthly |
| Active Directory / SSO | Inbound | User authentication, employee account sync | Real-time |
| BI / Reporting System | Outbound | HR data for dashboards and analytics | Daily |
| Time & Attendance Device | Inbound | Clock-in/out raw data | Real-time |

#### User Roles (8 roles)

| Role | Access Level | Ghi chú |
|------|-------------|---------|
| HiStaff Administrator | Full Access | Full CRUD, system config, user management |
| HR Manager | Read/Write | Approve changes, generate reports, payroll oversight |
| HR Data Officer | Read/Write (Data) | Create/Edit employee profiles, maintain data quality |
| Payroll Officer | Read/Write (Payroll) | Run payroll, manage PIT, generate payroll reports |
| C&B Specialist | Read/Write (C&B) | Bonus schemes, ESOP, salary structures, benefits |
| Department Head | Limited Read/Approve | View team, approve leave/attendance |
| Employee (Portal) | Self-Service Read | View own data, submit update requests |
| System Auditor | Audit Access | View audit logs, compliance reports |

#### Key Business Workflows (8 luồng chính)

1. **New Employee Onboarding** — Recruitment → Employee record → Employee ID → OMS link → Contract → BHXH/Tax → System access
2. **Employee Profile Update** — Portal request → HR review → Manager approve → Sync eContract → Audit log
3. **Monthly Payroll Processing** — Attendance finalize → Adjustments → Batch calc → HR approve → Bank transfer → PIT → Payslip
4. **Contract Renewal** — 30/60/90-day alert → Prepare renewal → Dept Head confirm → HR approve → eContract sign → Update record
5. **Employee Transfer/Promotion** — Decision approved → Create decision record → Update position → OMS sync → Notify systems
6. **Annual Tax Finalization** — 12-month aggregate → Taxable income → Apply deductions → Compare withholding → Submit GDT
7. **Employee Offboarding** — Resignation approved → Final settlement → Final payroll → Terminate eContract → Deactivate → Archive
8. **ESOP Stock Award** — C&B allocation → Record in HiStaff → Set restriction period → KAFI sync → Employee Portal view

#### Success Metrics

| Category | KPI | Target |
|----------|-----|--------|
| Performance | System availability | ≥ 95% |
| Performance | Average response time | < 2 seconds |
| Data Quality | Employee data accuracy | 100% |
| Payroll | Calculation error rate | < 0.5% |
| Tax | PIT compliance | 100% |
| Adoption | Portal self-service usage | 80% |
| Business | Payroll processing time reduction | 50% |
| Reporting | Report generation time | < 5 minutes |
| Compliance | Labor law compliance | 100% |
| Compliance | Data privacy compliance | 100% |

---

## 14. Workflow Improvement Advisory

Phần này tổng hợp các điểm cải tiến được quan sát từ thực tế vận hành AI-DLC. Đây là **living advisory** — cập nhật sau mỗi phase retrospective.

### 14.1 Điểm yếu phổ biến và cách xử lý

| Triệu chứng | Root Cause | Giải pháp đề xuất |
|-------------|-----------|------------------|
| Agent generate output không liên quan đến yêu cầu | Input context thiếu — không load artifact nguồn | Enforce: mọi agent invocation phải include artifact ID trong prompt. Agent 01 kiểm tra trước khi delegate |
| Agent lặp lại công việc đã làm | Không đọc CLAUDE.md và Highlight Log đầu session | Thêm "Context Discovery" block vào mọi agent file — bắt buộc đọc trước khi thực hiện |
| PR không có test | Dev merge bypass hook | `TaskCompleted` hook từ chối nếu không có test file — hook không được disable nếu không có TechLead approval |
| BRD requirements không trace được vào code | Developer commit không có FR/UC reference | Gate 3 CI block PR nếu thiếu reference. Đào tạo convention cho toàn team trước sprint 1 |
| Agent Teams tốn token vô ích | Spawn team mà không plan trước | Bắt buộc Plan Mode (~10k tokens) trước khi spawn bất kỳ team nào. Agent 01 enforce điều này |
| Documentation lỗi thời | Docs viết 1 lần, không cập nhật theo code | Agent 09 trigger sau mỗi Gate — không phải cuối project. Docs là living artifact |
| Không ai nhớ quyết định tại sao | Decision để trong chat, không ghi vào ADR | Rule: "nếu không trong ADR, không có hiệu lực". Agent 03 kiểm tra ADR coverage sau mỗi architecture decision |
| Autonomy level bị nâng không chính thức | Không có enforcement — chỉ policy | Thêm `autonomy_level` vào hook check: nếu agent thực hiện action ngoài level hiện tại → log ESCALATION |

### 14.2 Anti-patterns cần tránh

**Anti-pattern 1 — "Just ask Claude" (bỏ qua Registry)**
```
❌ Sai:  "Claude ơi, feature X spec như thế nào?" → Claude trả lời từ memory
✓ Đúng: Load BRD artifact → đọc spec → làm việc
```
*Lý do:* Claude không có memory giữa sessions. Câu trả lời từ "memory" là hallucination.

**Anti-pattern 2 — Approve mà không đọc**
```
❌ Sai:  Click "Approve" PR vì "AI đã review rồi"
✓ Đúng: Đọc diff, hiểu context, viết approved_comment có nội dung thực
```
*Lý do:* Gate 4 enforce `approved_comment` bắt buộc — trống là reject tự động.

**Anti-pattern 3 — Over-spawn Agent Teams**
```
❌ Sai:  Spawn 6 teammates cho mọi task
✓ Đúng: Tối đa 3–4 teammates, chỉ khi cần coordination trực tiếp
```
*Lý do:* >4 teammates tăng coordination overhead và token cost phi tuyến.

**Anti-pattern 4 — Hardcode trong agent prompts**
```
❌ Sai:  Agent prompt: "dùng React TypeScript, PostgreSQL..."
✓ Đúng: Agent đọc project-profile.yaml và tự resolve tech stack
```
*Lý do:* Khi project đổi tech stack, phải update 1 chỗ (Profile) thay vì 8 agent files.

**Anti-pattern 5 — Documentation as afterthought**
```
❌ Sai:  Agent 09 chỉ chạy cuối project trước launch
✓ Đúng: Agent 09 chạy sau mỗi Gate — docs evolve cùng code
```

### 14.3 Cải tiến theo Autonomy Level

| Autonomy Level | Cải tiến được phép | Cần approval |
|---------------|-------------------|-------------|
| **L1** | Thêm templates mới, cải tiến agent prompts | Không (local change) |
| **L2** | Thêm hooks mới, thay đổi gate conditions | TechLead |
| **L3** | Thay đổi agent execution order, modify Policy Gates | Architect |
| **L4** | Thay đổi autonomy model, thêm overnight runs | CTO |

### 14.4 Workflow Health Metrics (tự động từ Highlight Log)

Agent 01 có thể query `.highlight-log.yaml` để tính health score:

```python
# Metrics tự động từ Highlight Log
health_metrics = {
  "blocker_rate":        count(type=BLOCKER) / total_tasks,        # target < 10%
  "deviation_rate":      count(type=DEVIATION) / total_gates,      # target < 5%
  "gate_pass_time":      avg(time_between MILESTONE gate events),   # trend down
  "escalation_rate":     count(type=ESCALATION) / total_decisions,  # target < 15%
  "insight_density":     count(type=INSIGHT) / total_sessions,      # trend up = team learning
}
```

---

## 15. Best Practice Workflow

Checklist thực hành tốt nhất — áp dụng cho cả Mode H và Mode A.

### 15.1 Session Startup Ritual (bắt buộc mỗi session mới)

```
Trước khi bắt đầu bất kỳ task nào — human hoặc agent — thực hiện 3 bước sau:

Step 1 — Load context:
  [ ] Đọc CLAUDE.md (project decisions, conventions, domain ownership)
  [ ] Đọc 10 entries gần nhất trong .highlight-log.yaml
  [ ] Identify stage hiện tại từ pilot_phase trong CLAUDE.md

Step 2 — Confirm scope:
  [ ] Xác định artifact input cần load (BRD-ID, ADR-ID, etc.)
  [ ] Verify artifact status là "approved" trước khi dùng
  [ ] Kiểm tra "Decisions đang chờ" — có blocker nào ảnh hưởng task không?

Step 3 — Set autonomy boundary:
  [ ] Xác nhận autonomy_level hiện tại từ project-profile.yaml
  [ ] Nếu task cần level cao hơn → tạo ESCALATION entry trước khi làm
```

### 15.2 Artifact-First Development

```
Mọi task bắt đầu từ artifact, kết thúc bằng artifact.

Input:  Artifact Registry ID → load trước khi làm bất cứ điều gì
Output: Artifact Registry entry → save ngay sau khi done, không để trong chat

Rule: "Nếu không có artifact, không có bằng chứng"
```

### 15.3 Gate-by-Gate Checklist

**Trước mỗi Gate:**
```
[ ] Tất cả artifacts của stage đã có status "approved"?
[ ] Highlight Log có BLOCKER nào chưa resolved?
[ ] CLAUDE.md đã được cập nhật với decisions mới nhất?
[ ] Agent 09 đã chạy và tạo docs tương ứng?
```

**Sau mỗi Gate pass:**
```
[ ] Ghi MILESTONE vào .highlight-log.yaml
[ ] Update pilot_phase trong CLAUDE.md
[ ] Invoke Agent 09 với gate trigger tương ứng
[ ] Notify team qua channel chuẩn (Slack/Teams) với artifact link
```

### 15.4 Code Review Best Practices

| Bước | Human | AI (Agent 08) |
|------|-------|---------------|
| Đọc toàn bộ diff | Bắt buộc — không exception | Automated scan |
| Verify BRD linkage | Check FR/UC ref có trong Registry | Gate 3 CI auto-check |
| Business logic review | Human bắt buộc — AI không thể verify domain intent | Flag suspicious patterns |
| Security review | Spot-check critical paths | OWASP top 10 automated scan |
| Approve comment | Viết nội dung thực — không để trống | N/A |

### 15.5 Multi-human Handoff Checklist

```
Người A → Người B (Relay mode) — trước khi handoff:

[ ] Artifacts đã save vào Registry với status "approved"
[ ] CLAUDE.md đã update với quyết định mới nhất của session này
[ ] Mọi "tại sao" đã ghi vào ADR hoặc BRD comment — không để trong chat
[ ] .highlight-log.yaml có entry MILESTONE cho milestone vừa hoàn thành
[ ] Blocker nào đang mở → ghi BLOCKER entry với ETA và owner
[ ] Người B đọc: CLAUDE.md + 10 entries Highlight Log + pending artifacts
```

### 15.6 Agent Invocation Best Practices

```bash
# Template chuẩn khi invoke agent thủ công:

"Invoke [agent-name] để [task cụ thể].

Context:
- Project Profile: project-profile.yaml
- Input artifacts: [BRD-ID], [ADR-ID]     ← luôn kèm artifact IDs
- Stage hiện tại: [Phase X Stage Y]
- Autonomy level: L[n]

Constraints:
- Không thay đổi [file/domain] vì thuộc domain của [team]
- Nếu cần input từ domain khác → tạo request artifact, không modify trực tiếp

Expected output:
- Artifact type: [type]
- Save to: [path]
- Upload to Registry với linked_to: [parent-artifact-ID]"
```

### 15.7 Retrospective Artifact (sau mỗi Phase)

Agent 09 tổng hợp Highlight Log thành Retrospective report sau mỗi phase end:

```yaml
RETROSPECTIVE:
  id: "RETRO-{project}-{phase}"
  phase: "Phase 0"
  period: "2026-04-01 → 2026-04-30"
  milestones_hit: 5
  blockers_total: 3
  blockers_resolved: 3
  deviations: 1
  insights: ["Agent 02 cần pain point list làm input", "Devil's Advocate pattern hiệu quả nhất cho payroll tasks"]
  action_items:
    - "Cập nhật Agent 02 template để prompt pain points trước"
    - "Thêm Devil's Advocate vào Stage 1.4 checklist bắt buộc"
  autonomy_recommendation: "Nâng L1 → L2 cho Agent 02, 03 — đủ evidence từ Phase 0"
```

---

### D5 — Agent Framework: Sub-Agents + MCP phân tầng

```
Claude Code Sub-Agents (.claude/agents/*.md)
  └── Agent execution: 01–08 agents cho AI-DLC workflow
  └── Stable, versioned trong Git, production-ready

MCP Servers (Model Context Protocol)
  └── External tool integration: Azure DevOps, AWS Cost, Jira
  └── KHÔNG dùng cho agent execution — dùng cho tool calls
  └── Mỗi agent có thể gọi MCP tools trong tool list của nó
```

---

*Document maintained by: Cloud & Solution Architecture — VIB Technology Division*
*v1.0: PRD Foundation | v2.0: Merged Flow + PRD | v3.0: Generalized | v4.0: HitL + Sub-Agents + Agent Teams | v4.1: Architecture Decisions | v5.0: Core HR BRS integrated | v6.0: Multi-human model, CLAUDE.md spec, Code boundary, Output standard, Devil's Advocate | v7.0: Agent 09 Technical Writer, Highlight Log (Section 4b), Workflow Improvement Advisory (Section 14), Best Practice Workflow (Section 15)*
*Review cycle: Sprint retrospective; major revision mỗi phase end*
*Next review: Phase 0 Stage 0.1 kickoff — HiStaff Phoenix Project*
