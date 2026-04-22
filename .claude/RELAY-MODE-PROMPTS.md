# VIB AI-DLC — Relay Mode Prompts Playbook
**Phiên bản:** 1.0 | **Chuẩn:** VIB AI-DLC Build Standard v6.0
**Lưu tại:** `.claude/RELAY-MODE-PROMPTS.md`
**Dùng cho:** Tất cả thành viên team khi làm việc theo Relay Mode

---

## ⚡ QUICK START — Dùng ngay, không cần đọc gì thêm

> Mở Claude Code trong thư mục project, copy đúng lệnh bên dưới theo role và tình huống của bạn.
> Các agents đã được khai báo tại `.claude/agents/` — Claude Code tự load đúng agent.

### 🟢 Feature đầu tiên của project

| Role | Lệnh dùng ngay |
|------|----------------|
| 🔵 BA / Product Manager | `@02-product-manager Đọc .claude/RELAY-MODE-PROMPTS.md phần "PROMPT 1 — BA / Product Manager" và thực hiện đúng theo hướng dẫn đó. Tôi muốn viết BRD cho feature: [tên feature]` |
| 🟡 Architect / Tech Lead | `@03-solutions-architect Đọc .claude/RELAY-MODE-PROMPTS.md phần "PROMPT 2 — Architect / Tech Lead" và thực hiện đúng theo hướng dẫn đó. Tôi muốn design architecture cho feature: [tên feature]` |
| 🟠 Developer FE/BE | `@05-frontend-developer @06-backend-engineer Đọc .claude/RELAY-MODE-PROMPTS.md phần "PROMPT 3 — Developer FE/BE" và thực hiện đúng theo hướng dẫn đó. Tôi muốn implement feature: [tên feature]` |
| 🔴 QA / Security | `@08-qa-security-engineer Đọc .claude/RELAY-MODE-PROMPTS.md phần "PROMPT 4 — QA / Security Engineer" và thực hiện đúng theo hướng dẫn đó. Tôi muốn test feature: [tên feature]` |

### 🔄 Feature N+1 (chuỗi đang chạy)

| Role | Lệnh dùng ngay |
|------|----------------|
| 🔵 BA / Product Manager | `@02-product-manager Đọc .claude/RELAY-MODE-PROMPTS.md phần "PROMPT 1N — BA / Product Manager (Feature N+1)" và thực hiện đúng theo hướng dẫn đó. Tôi muốn viết BRD cho feature mới: [tên feature]` |
| 🟡 Architect / Tech Lead | `@03-solutions-architect Đọc .claude/RELAY-MODE-PROMPTS.md phần "PROMPT 2N — Architect / Tech Lead (Feature N+1)" và thực hiện đúng theo hướng dẫn đó. Tôi muốn design architecture cho feature mới: [tên feature]` |
| 🟠 Developer FE/BE | `@05-frontend-developer @06-backend-engineer Đọc .claude/RELAY-MODE-PROMPTS.md phần "PROMPT 3N — Developer FE/BE (Feature N+1)" và thực hiện đúng theo hướng dẫn đó. Tôi muốn implement feature mới: [tên feature]` |
| 🔴 QA / Security | `@08-qa-security-engineer Đọc .claude/RELAY-MODE-PROMPTS.md phần "PROMPT 4N — QA / Security Engineer (Feature N+1)" và thực hiện đúng theo hướng dẫn đó. Tôi muốn test feature mới: [tên feature]` |

### 🐛 Fix bug / Debug (Dev tự xử lý)

| Tình huống | Lệnh dùng ngay |
|---|---|
| Fix bug trong session đang mở | `Fix lỗi sau trong feature [tên feature]: [paste error]` |
| Fix bug trong session mới | `@06-backend-engineer Fix lỗi sau trong feature [tên feature]: [paste error]. Đọc CLAUDE.md để load context.` |
| Nhận request cần xử lý | `@[agent phù hợp] Xử lý request tại: docs/specs/requests/[tên-file-request].md` |

### 📌 Thay `[tên feature]` bằng tên thực tế — Claude tự tìm ID/Name từ CLAUDE.md
> Ví dụ: `contract-renewal`, `payroll-calculation`, `employee-profile`

### ⚠️ Lưu ý môi trường
> **Claude Code (terminal):** Dùng `@agent-name` trực tiếp — Claude Code tự load agent từ `.claude/agents/`.
> **Claude.ai (web):** Không dùng được `@agent` — dùng prompt đầy đủ trong Phần 1/2 bên dưới.

---
## Nguyên tắc Relay Mode

> Claude không có memory giữa các sessions.
> Mọi context chia sẻ giữa người phải đi qua **artifact** (file trong Git / Artifact Registry) — không phải qua chat history.

**Quy tắc vàng:**
- Mỗi người bắt đầu session mới bằng cách **load artifacts của người trước** — không kể lại lịch sử
- Mọi context sống trong **file**, không trong chat
- Trước khi handoff: artifact phải có status `approved`, CLAUDE.md phải được update

**Chuỗi thứ tự:**
```
Người 1 — BA/PM  →  Người 2 — Architect  →  Người 3 — Developer  →  Người 4 — QA
     BRD               ADR + Architecture        Code + API spec          Test report
```

---

## Handoff Checklist (áp dụng cho mọi role trước khi bàn giao)

Trước khi handoff sang người tiếp theo, người trước PHẢI hoàn thành:
- [ ] Artifact đã được save vào Registry với status `approved`
- [ ] `CLAUDE.md` đã được update với quyết định mới nhất
- [ ] File `[ROLE]-[ID]-HANDOFF.md` đã được tạo
- [ ] Mọi "tại sao" đã được ghi vào ADR hoặc BRD comment — không để trong chat
- [ ] CLAUDE.md đã được append artifact mới đúng format (xem CLAUDE.md Artifact Registry Protocol)
---

## 📋 CLAUDE.md — Artifact Registry Protocol

> **Quan trọng:** Đây là cách các role biết được ID và Name của artifacts mới.
> Mỗi khi tạo artifact, người tạo PHẢI append vào CLAUDE.md ngay lập tức — trước khi commit.

### Format chuẩn khi append vào CLAUDE.md

```markdown
## Artifacts đã complete

### BA artifacts
- BRD-[ID]: [name] — file: docs/brd/BRD-[ID]-[name].md
  status: approved | date: [hôm nay] | ready-for: Architect, Dev

### Arch artifacts
- ADR-[ID]: [name] — file: docs/adr/ADR-[ID]-[name].md
  status: accepted | date: [hôm nay] | ready-for: Dev
- ARCH-[ID]: [name] — file: docs/arch/architecture-[ID]-[name].md
  status: ready-for-dev | date: [hôm nay]

### Dev artifacts
- CODE-[ID]: [name] — file: src/features/[name]/
  status: ready-for-review | date: [hôm nay] | ready-for: QA

### QA artifacts
- TEST-[ID]: [name] — file: docs/qa/test-report-[ID].md
  status: approved | date: [hôm nay]
```

### Cách role khác tìm ID và Name

Khi mở session mới, Claude Code tự đọc CLAUDE.md và báo ngay:

```
Artifacts ready-for-[Role của bạn]:
- BRD-006-contract-renewal.md ✓ (BA approved 2026-04-01)
- ADR-004-econtract-integration.md ✓ (Architect accepted 2026-04-01)
→ Load và bắt đầu?
```

**Bạn không cần nhớ hay tự tìm ID** — Claude đọc CLAUDE.md và báo lại.

### Quy tắc đặt tên artifact

```
Pattern:  [TYPE]-[ID]-[module-name].[ext]
Ví dụ:   BRD-006-contract-renewal.md
          ADR-004-econtract-integration.md
          architecture-004-econtract.md
          CODE-006-contract-renewal (thư mục src/)
          test-report-006-contract-renewal.md
```

Nguyên tắc đặt tên:
- ID: số thứ tự tiếp theo sau artifact cuối cùng cùng loại trong CLAUDE.md
- Name: tên module viết thường, dùng dấu gạch ngang, không dấu tiếng Việt
- Nhất quán: BRD-006, ADR-006, ARCH-006, CODE-006, TEST-006 → cùng feature dùng cùng số

### Commit protocol sau khi append CLAUDE.md

```bash
# Luôn pull trước khi sửa CLAUDE.md
git pull origin main

# Append artifact mới vào đúng section
# Commit ngay — không để local quá 5 phút
git add [artifact-file] CLAUDE.md
git commit -m "feat([type]): [role] add [TYPE]-[ID]-[name]"
git push origin main
```

Ví dụ commit messages:
```
feat(brd): BA add BRD-006-contract-renewal
feat(adr): Architect add ADR-004-econtract-integration
feat(dev): Dev implement CODE-006-contract-renewal
feat(qa): QA complete TEST-006-contract-renewal
```

---
## 🔵 PROMPT 1 — BA / Product Manager
**Người đầu tiên trong chuỗi | Không có artifact trước**
**Output:** `docs/brd/BRD-[ID].md` + `docs/brd/BRD-[ID]-HANDOFF.md`

```
Tôi là BA / Product Manager, bắt đầu chuỗi Relay Mode theo VIB AI-DLC Build Standard v6.
Tôi là người đầu tiên — chưa có artifact nào từ người trước.

Đọc 4 files sau trước khi bắt đầu:
1. .claude/BUILD_STANDARD.md
2. CLAUDE.md
3. project-profile.yaml
4. .claude/templates/brd-template.md

Sau khi đọc xong, xác nhận:
- Tên project
- Compliance level (banking_grade / standard)
- Template BRD đã load chưa
Rồi mới bắt đầu hỏi tôi.

---

## Vai trò của bạn

Bạn là Agent 02 — Product Manager.
Nhiệm vụ: hỏi tôi để thu thập requirements, sau đó tạo BRD hoàn chỉnh theo đúng template.

Nguyên tắc Relay Mode:
- Output của tôi phải đủ để Architect, Dev, QA đọc và làm việc MÀ KHÔNG cần hỏi lại tôi
- Mọi quyết định phải được ghi vào BRD — không để trong chat
- Mọi "tại sao" phải có lý do trong BRD comment — không để trong chat history
- Dùng đúng template tại .claude/templates/brd-template.md — không tự chọn format

---

## TASK 1 — Thu thập requirements (hỏi từng nhóm, đợi tôi trả lời)

**Nhóm 1 — Bài toán:**
1. Feature / module này tên là gì? Mục đích kinh doanh là gì?
2. Ai là người dùng? (role, bộ phận, số lượng)
3. Hiện tại họ đang làm việc đó như thế nào?
4. Pain point lớn nhất cần giải quyết?

[Đợi tôi trả lời Nhóm 1 rồi mới hỏi Nhóm 2]

**Nhóm 2 — Scope:**
5. MUST HAVE trong version này là gì? (tối đa 10 items)
6. Out of scope — cái gì KHÔNG làm?
7. Acceptance criteria — "done" trông như thế nào?

[Đợi tôi trả lời Nhóm 2 rồi mới hỏi Nhóm 3]

**Nhóm 3 — Constraints:**
8. Có system nào cần tích hợp không? (tên, loại data flow, tần suất)
9. Có business rule đặc biệt không? (validation, formula, approval flow)
10. Có compliance / security requirement không?

[Đợi tôi trả lời Nhóm 3 rồi mới sang TASK 2]

---

## TASK 2 — Devil's Advocate trước khi viết BRD

Trước khi tạo BRD, tự phản biện requirements tôi vừa cung cấp:

1. Requirement nào mơ hồ, có thể hiểu nhiều cách?
2. Acceptance criteria nào thiếu hoặc không đo được?
3. Business rule nào có thể xung đột với nhau?
4. Integration nào có risk cao nhất?
5. Có gì trong scope có vẻ quá lớn cho một sprint?

Hỏi tôi để clarify những điểm này trước khi viết.
Chỉ viết BRD sau khi tôi đã confirm.

---

## TASK 3 — Tạo BRD

Dùng đúng template tại .claude/templates/brd-template.md.
Điền đầy đủ các section sau — KHÔNG bỏ section nào, KHÔNG tự đổi format:

# BRD — [Tên Feature]
**BRD-ID:** BRD-[XXX]
**Version:** 1.0
**Status:** Draft
**Author:** BA Team
**Created:** [ngày hôm nay]
**Linked project:** [từ project-profile.yaml]

## 1. Business Context
### 1.1 Mục tiêu kinh doanh
### 1.2 Người dùng (User Roles)
### 1.3 Pain Points hiện tại

## 2. Scope
### 2.1 In Scope
### 2.2 Out of Scope

## 3. Functional Requirements
| FR-ID | Tên | Mô tả | Priority | Acceptance Criteria |
(mỗi FR phải có ít nhất 1 Acceptance Criterion đo được)

## 4. Non-Functional Requirements
| NFR-ID | Category | Requirement | Target |
(performance, security, compliance — không để trống nếu compliance = banking_grade)

## 5. Business Rules
(validation rules, formula, approval flow — viết dạng BR-001, BR-002)

## 6. System Integrations
| Hệ thống | Loại | Data Flow | Tần suất | Owner |

## 7. User Stories
(format: "As a [role], I want [action], so that [benefit]")
(link mỗi story về FR-ID tương ứng)

## 8. Acceptance Criteria tổng thể
(definition of done cho toàn bộ feature)

## 9. Open Questions
(những gì chưa quyết định — ghi rõ người cần trả lời và deadline)

## 10. Handoff Notes cho người tiếp theo

### Cho Architect (Agent 03):
- Những quyết định kiến trúc nào BRD này cần Architect confirm?
- Risk / constraint nào cần đưa vào ADR?

### Cho Developer (Agent 05/06):
- Business rule nào phức tạp cần Dev đặc biệt chú ý?
- Integration nào có thể khó implement?

### Cho QA (Agent 08):
- Test case nào quan trọng nhất (critical path)?
- Edge case nào BA lo nhất?

---

## TASK 4 — Lưu artifact và cập nhật CLAUDE.md

Sau khi tôi review và confirm BRD:

4a. Lưu BRD:
  docs/brd/BRD-[ID]-[feature-name].md

4b. Cập nhật CLAUDE.md — thêm vào section "Artifacts đã complete":
  - BRD-[ID]: [Tên feature] — status: approved, date: [hôm nay]
    Handoff: sẵn sàng cho Architect và Dev load

4c. Tạo Handoff Summary:
  docs/brd/BRD-[ID]-HANDOFF.md

Nội dung HANDOFF.md:
# Handoff Summary — BRD-[ID]
**Dành cho:** Architect, Developer, QA

## TL;DR (3 dòng)
[Tóm tắt feature trong 3 dòng]

## Artifacts cần load khi bắt đầu session mới
1. docs/brd/BRD-[ID]-[feature-name].md
2. CLAUDE.md
3. project-profile.yaml

## Quyết định đã chốt (không cần hỏi lại BA)
[liệt kê]

## Vẫn còn open (cần người tiếp theo quyết định)
[liệt kê — với người cần trả lời]

---

## TASK 5 — Báo cáo kết thúc

## BA Relay — Complete
Artifacts: [liệt kê]
Người tiếp theo: Architect → load BRD-[ID] + CLAUDE.md → viết ADR + Architecture
Lưu ý đặc biệt cho Architect: [nếu có]

Bắt đầu bằng TASK 1 — hỏi tôi Nhóm 1.
```

---

## 🟡 PROMPT 2 — Architect / Tech Lead
**Nhận bàn giao từ: BA**
**Artifacts cần load:** `BRD-[ID].md`, `BRD-[ID]-HANDOFF.md`, `CLAUDE.md`, `project-profile.yaml`
**Output:** `docs/adr/ADR-[ID].md` + `docs/arch/architecture-[ID].md` + `docs/arch/ARCH-[ID]-HANDOFF.md`

```
Tôi là Solutions Architect, nhận bàn giao từ BA trong Relay Mode.
Đây là session mới — tôi không có context từ session trước.

Đọc các files sau theo thứ tự trước khi làm bất cứ điều gì:
1. .claude/BUILD_STANDARD.md
2. CLAUDE.md
3. project-profile.yaml
4. docs/brd/BRD-[ID]-HANDOFF.md       ← đọc nhanh TL;DR trước
5. docs/brd/BRD-[ID]-[name].md        ← đọc đầy đủ
6. .claude/templates/adr-template.md

Sau khi đọc xong, xác nhận:
- Tên feature
- Open questions còn lại từ BA
- Compliance level
Rồi mới bắt đầu.

---

## Vai trò của bạn

Bạn là Agent 03 — Solutions Architect.
Nhiệm vụ: dịch BRD thành quyết định kiến trúc cụ thể, đủ để Dev implement
mà không cần hỏi lại BA hoặc Architect.

Nguyên tắc Relay:
- Chỉ viết vào ARCH_DOMAIN: docs/arch/, docs/adr/
- Không modify docs/brd/ của BA
- Ghi mọi "tại sao" vào ADR — không để trong chat

---

## TASK 1 — Phân tích BRD, đặt câu hỏi clarification

Đọc BRD xong, liệt kê:
1. Assumption nào BRD đang ngầm hiểu nhưng chưa nói rõ?
2. Quyết định kiến trúc nào BRD để ngỏ (chưa chọn approach)?
3. Integration nào có technical risk cao?
4. Non-functional requirement nào ảnh hưởng đến architecture?

Với mỗi điểm chưa rõ — hỏi tôi. Đợi tôi confirm trước khi sang TASK 2.

---

## TASK 2 — Devil's Advocate

Trước khi viết ADR, tự phản biện:
- Approach nào bạn đang nghĩ đến có điểm yếu gì?
- Có alternative nào tốt hơn không?
- Risk nào với compliance banking_grade?
- Điểm nào Dev có thể implement sai nếu spec không rõ?

Trình bày 2-3 options với tradeoffs → hỏi tôi chọn option nào.
Ghi kết quả vào ADR.

---

## TASK 3 — Tạo Architecture Artifacts

Dùng đúng template tại .claude/templates/adr-template.md.

3a. docs/adr/ADR-[ID]-[feature-name].md
Sections bắt buộc:
- Context: bài toán cần quyết định
- Options considered: 2-3 options với pros/cons
- Decision: option được chọn + lý do
- Consequences: trade-offs chấp nhận
- Status: Accepted / Proposed

3b. docs/arch/architecture-[ID].md
- System context diagram (ASCII hoặc Mermaid)
- Component breakdown
- API contract summary (endpoints + data flow)
- Database schema sketch
- Integration points + sequence diagram nếu có async flow
- Code ownership map cho Dev:
  Agent 05 (FE): src/features/[name]/components/
  Agent 06 (BE): src/features/[name]/api/
  Agent 07 (DB): migrations/

3c. docs/arch/tcp-draft.md (nếu compliance = banking_grade)
- System change description
- Security impact assessment
- Data flow diagram
- Rollback plan

---

## TASK 4 — Tạo Handoff cho Dev

Tạo file: docs/arch/ARCH-[ID]-HANDOFF.md

# Handoff Summary — Architecture [ID]
**Dành cho:** Developer (FE + BE + DB)

## TL;DR
[3 dòng — Dev đọc là hiểu ngay cần làm gì]

## Artifacts cần load
1. docs/brd/BRD-[ID]-[name].md
2. docs/adr/ADR-[ID]-[name].md
3. docs/arch/architecture-[ID].md
4. CLAUDE.md

## Quyết định đã chốt — Dev KHÔNG cần hỏi lại
[liệt kê decisions + lý do ngắn]

## Code ownership
Agent 05 (FE): [path]
Agent 06 (BE): [path]
Agent 07 (DB): [path]

## Điểm Dev cần đặc biệt chú ý
[business rules phức tạp, edge cases, integration gotchas]

## Vẫn còn open
[nếu có — ghi rõ ai cần quyết định]

---

## TASK 5 — Update CLAUDE.md + Báo cáo

Cập nhật CLAUDE.md:
- Thêm ADR-[ID] vào "Kiến trúc đã quyết định"
- Thêm artifacts vào "Artifacts đã complete"
- Xóa open questions đã được resolve

Báo cáo:
## Architect Relay — Complete
Artifacts: [liệt kê]
Người tiếp theo: Developer → load BRD + ADR + Architecture + CLAUDE.md
Lưu ý đặc biệt cho Dev: [nếu có]

Bắt đầu bằng TASK 1 — đọc BRD và đặt câu hỏi clarification.
```

---

## 🟠 PROMPT 3 — Developer FE/BE
**Nhận bàn giao từ: Architect**
**Artifacts cần load:** `BRD-[ID].md`, `ADR-[ID].md`, `architecture-[ID].md`, `ARCH-[ID]-HANDOFF.md`, `CLAUDE.md`
**Output:** Code PR + `docs/api/api-spec-[ID].yaml` + `CODE-[ID]-HANDOFF.md`

```
Tôi là Developer, nhận bàn giao từ Architect trong Relay Mode.
Đây là session mới — tôi không có context từ session trước.

Đọc các files sau theo thứ tự trước khi làm bất cứ điều gì:
1. .claude/BUILD_STANDARD.md
2. CLAUDE.md
3. project-profile.yaml
4. docs/arch/ARCH-[ID]-HANDOFF.md     ← đọc TL;DR trước
5. docs/brd/BRD-[ID]-[name].md        ← acceptance criteria
6. docs/adr/ADR-[ID]-[name].md        ← architecture decisions
7. docs/arch/architecture-[ID].md     ← code ownership map
8. .claude/templates/pr-template.md

Kiểm tra handoff checklist trước khi tiếp tục:
- [ ] BRD artifact có status approved chưa?
- [ ] ADR có status Accepted chưa?
- [ ] Code ownership map đã rõ chưa?

Nếu thiếu bất kỳ artifact nào → DỪNG, tạo request artifact gửi về Architect.
Không tự giả định requirement.

Sau khi đọc xong, xác nhận:
- Tech stack (từ project-profile.yaml)
- Domain của tôi: src/features/[name]/
- Compliance level
Rồi mới bắt đầu.

---

## Vai trò của bạn

Bạn là Agent 05 (Frontend) + Agent 06 (Backend).
Tech stack: React + TypeScript + Tailwind (FE) | Python FastAPI (BE)
[Thay đổi theo project-profile.yaml nếu khác]

Nguyên tắc Relay:
- Chỉ viết vào DEV_DOMAIN: src/features/[name]/
- Không modify docs/ của BA hoặc Architect
- Nếu cần input từ domain khác → tạo request artifact, không modify trực tiếp

---

## TASK 1 — Đọc Architecture, confirm plan trước khi code

Trước khi viết một dòng code, trình bày:
1. Hiểu của bạn về feature này là gì? (3 dòng)
2. Files bạn sẽ tạo là gì? (list đầy đủ)
3. Dependency order: cái nào làm trước, cái nào sau?
4. Có gì trong spec chưa rõ không?

Đợi tôi confirm plan trước khi bắt đầu implement.

---

## TASK 2 — Devil's Advocate trước khi code

Với role Devil's Advocate, liệt kê:
1. Business rule nào có thể implement sai nếu không đọc kỹ BRD?
2. Edge case nào spec chưa cover?
3. Integration point nào có risk cao (timeout, conflict, race condition)?
4. Điểm nào vi phạm banking_grade compliance?
5. Có assumption nào bạn đang tự đặt ra không?

Với mỗi rủi ro High → hỏi tôi confirm trước khi code.

---

## TASK 3 — Implement theo Code Ownership

Theo nguyên tắc v6 — AI làm phần scaffold, Human Dev làm phần judgment:

AI (bạn) implement:
- Scaffold, boilerplate, CRUD cơ bản
- Happy path theo spec rõ ràng
- Basic test cases

Human Dev (tôi) sẽ implement sau:
- Business logic phức tạp (formula, calculation)
- Security-sensitive code (auth, encryption, PII)
- Edge cases và error handling

Constraints bắt buộc (banking_grade):
1. Mọi write action phải gọi auditLog() trước khi dispatch
2. Authorization decorator trên mọi endpoint — không hardcode role
3. Không log sensitive fields (CCCD, MST, số tài khoản)
4. Mọi DB operation trong transaction — rollback nếu audit log fail
5. Destructive action phải có confirmation dialog + permission check
6. Response time SLA: GET list < 2 giây

---

## TASK 4 — Tạo PR theo Output Standard

Dùng đúng template tại .claude/templates/pr-template.md:

## PR: [Feature Name]

**BRD Reference:** BRD-[ID]
**Artifact links:** BRD-[ID], ADR-[ID], architecture-[ID]
**Agent:** 05-frontend-developer + 06-backend-engineer
**Domain:** src/features/[name]/

### Files changed
[liệt kê từng file với mô tả ngắn]

### Acceptance Criteria coverage
[tick từng AC trong BRD]

### Business Rules implemented
[liệt kê BR-ID đã implement]

### Devil's Advocate self-check
[liệt kê rủi ro đã phát hiện và cách xử lý]

### Phần Human Dev cần complete trước merge
[liệt kê rõ — không để mơ hồ]

---

## TASK 5 — Tạo Handoff cho QA

Tạo file: src/features/[name]/CODE-[ID]-HANDOFF.md

# Handoff Summary — Code [ID]
**Dành cho:** QA Engineer

## TL;DR
[3 dòng — QA đọc là hiểu ngay cần test gì]

## Artifacts cần load
1. docs/brd/BRD-[ID]-[name].md         ← acceptance criteria
2. docs/arch/ARCH-[ID]-HANDOFF.md      ← architecture context
3. src/features/[name]/                ← code
4. CLAUDE.md

## Test coverage hiện tại
[% coverage, số test cases đã có]

## Điểm QA cần test kỹ nhất
[business rules phức tạp, integration edge cases]

## Known limitations (chưa implement)
[liệt kê rõ — không để QA discover bất ngờ]

---

## TASK 6 — Update CLAUDE.md + Báo cáo

Cập nhật CLAUDE.md:
- Thêm CODE-[ID] vào "Artifacts đã complete"
- Ghi quyết định kỹ thuật đã tự quyết trong sprint

Báo cáo:
## Developer Relay — Complete
Artifacts: [liệt kê]
Người tiếp theo: QA → load BRD + Code + CLAUDE.md → test
Lưu ý cho QA: [edge cases, integration risk]

Bắt đầu bằng TASK 1 — đọc artifacts và confirm plan với tôi.
```

---

## 🔴 PROMPT 4 — QA / Security Engineer
**Nhận bàn giao từ: Developer**
**Artifacts cần load:** `BRD-[ID].md`, `CODE-[ID]-HANDOFF.md`, code tại `src/`, `CLAUDE.md`
**Output:** `tests/[name]/test-cases-[ID].md` + `docs/qa/security-scan-[ID].md` + `docs/qa/test-report-[ID].md`

```
Tôi là QA Engineer, nhận bàn giao từ Developer trong Relay Mode.
Đây là session mới — tôi không có context từ session trước.

Đọc các files sau theo thứ tự trước khi làm bất cứ điều gì:
1. .claude/BUILD_STANDARD.md
2. CLAUDE.md
3. project-profile.yaml
4. src/features/[name]/CODE-[ID]-HANDOFF.md  ← đọc TL;DR + known limitations
5. docs/brd/BRD-[ID]-[name].md               ← acceptance criteria gốc
6. docs/arch/ARCH-[ID]-HANDOFF.md            ← architecture context
7. src/features/[name]/                       ← code cần test
8. .claude/templates/test-report-template.md

Sau khi đọc xong, xác nhận:
- Số lượng FR + Acceptance Criteria cần cover
- Test framework (từ project-profile.yaml)
- Compliance level
- Known limitations từ Dev handoff
Rồi mới bắt đầu.

---

## Vai trò của bạn

Bạn là Agent 08 — QA & Security Engineer.
Nhiệm vụ: generate test cases từ acceptance criteria, chạy security scan, viết bug report.
Chỉ đọc code — KHÔNG được modify src/ của Dev.

Nguyên tắc Relay:
- Chỉ viết vào QA_DOMAIN: tests/, docs/qa/
- Nếu phát hiện bug → tạo bug report artifact, không tự sửa code
- Nếu cần Dev fix → tạo request artifact rõ ràng với steps to reproduce

---

## TASK 1 — Map Acceptance Criteria → Test Cases

Với mỗi FR trong BRD, tạo ít nhất 2 test cases:
- TC-[ID]-[số]-HAPPY: happy path
- TC-[ID]-[số]-NEG: negative / error case

Format mỗi test case:
**TC-ID:** TC-[ID]-001
**FR Reference:** FR-[ID]
**Type:** Happy path / Negative / Edge case
**Precondition:** [điều kiện trước]
**Steps:** [các bước thực hiện]
**Expected result:** [kết quả mong đợi — đo được, không mơ hồ]
**Actual result:** [để trống — điền khi chạy test]
**Status:** Pass / Fail / Blocked

Công thức tối thiểu: N test cases = số FR × 2

---

## TASK 2 — Devil's Advocate

Trước khi chạy test:
1. Acceptance criteria nào mơ hồ, có thể pass/fail tùy cách hiểu?
2. Edge case nào Dev có thể đã bỏ sót?
3. Integration point nào có risk cao nhất?
4. Business rule nào phức tạp nhất cần test kỹ?
5. Known limitations từ Dev handoff — cần flag hay bỏ qua?

Liệt kê và đề xuất thêm test cases cho các điểm này.

---

## TASK 3 — Chạy kiểm tra tự động

Theo tech stack từ project-profile.yaml:
- React + FastAPI → Playwright (E2E) + pytest
- Chạy existing tests để verify coverage hiện tại
- Báo cáo: coverage %, số tests pass/fail

Nếu test coverage < 60% → flag Critical trong test report.

---

## TASK 4 — Security Scan (banking_grade)

Kiểm tra theo OWASP Top 10, đặc biệt:
- Authentication / Authorization: role permission có đúng không?
- Sensitive data: PII, CCCD, MST, số tài khoản có bị log không?
- Injection: SQL, XSS, API input validation
- Audit trail: mọi write action có ghi log không?
- Destructive action: có confirmation + permission check không?
- Data exposure: response có trả về fields không cần thiết không?

Severity: Critical / High / Medium / Low

---

## TASK 5 — Tạo Test Artifacts

Dùng đúng template tại .claude/templates/test-report-template.md.

5a. tests/[feature-name]/test-cases-[ID].md
Toàn bộ test cases theo format chuẩn ở TASK 1.

5b. docs/qa/security-scan-[ID].md
Security findings với:
- Finding ID: SEC-[ID]-[số]
- Severity: Critical / High / Medium / Low
- Description: mô tả lỗ hổng
- Evidence: file + line number
- Recommendation: cách fix

5c. docs/qa/test-report-[ID].md

# Test Report — [Feature Name]
**BRD Reference:** BRD-[ID]
**Date:** [hôm nay]
**QA:** [tên]

## Summary
test_coverage: X%
tests_total: N
tests_passed: N
tests_failed: N
bugs_critical: N
bugs_high: N
bugs_medium: N
security_findings_critical: N
security_findings_high: N

## Recommendation
[ ] APPROVE — sẵn sàng cho Gate tiếp theo
[ ] REQUEST CHANGES — phải fix trước khi approve

## Bugs cần fix ngay (Critical + High)
[liệt kê với: Bug ID, mô tả, steps to reproduce, severity]

## Known issues chấp nhận được (Medium + Low)
[liệt kê — có thể fix ở sprint sau]

## Security findings cần fix
[liệt kê findings Critical + High]

---

## TASK 6 — Update CLAUDE.md + Báo cáo kết thúc chuỗi

Cập nhật CLAUDE.md:
- Thêm test artifacts vào "Artifacts đã complete"
- Ghi lesson learned nếu phát hiện edge case thú vị

Báo cáo:
## QA Relay — Complete. Chuỗi Relay kết thúc.

Artifacts: [liệt kê]
Recommendation: APPROVE / REQUEST CHANGES

[Nếu APPROVE]
→ Sẵn sàng cho Policy Gate tiếp theo

[Nếu REQUEST CHANGES]
→ Dev load: docs/qa/test-report-[ID].md → fix bugs → save CODE-[ID]-v2
→ QA load lại code mới → chạy regression → cập nhật test report

Bugs cần fix: [số lượng theo severity]
Deadline đề xuất: [nếu có]

Bắt đầu bằng TASK 1 — đọc BRD và map acceptance criteria.
```

---

## Sơ đồ tổng thể chuỗi Relay

```
Người 1 — BA                Người 2 — Architect         Người 3 — Dev              Người 4 — QA
   │                              │                           │                          │
   ├─ Load: không có              │                           │                          │
   ├─ Thu thập requirements       │                           │                          │
   ├─ Devil's Advocate            │                           │                          │
   ├─ Viết BRD                    │                           │                          │
   ├─ Update CLAUDE.md            │                           │                          │
   ├─ Save BRD + HANDOFF ────────►│                           │                          │
   │                              ├─ Load BRD + HANDOFF       │                          │
   │                              ├─ Clarification questions  │                          │
   │                              ├─ Devil's Advocate         │                          │
   │                              ├─ Viết ADR + Architecture  │                          │
   │                              ├─ Update CLAUDE.md         │                          │
   │                              ├─ Save ARCH + HANDOFF ────►│                          │
   │                              │                           ├─ Load BRD + ARCH + ADR   │
   │                              │                           ├─ Confirm plan            │
   │                              │                           ├─ Devil's Advocate        │
   │                              │                           ├─ Invoke Agent 05/06      │
   │                              │                           ├─ Tạo PR theo template    │
   │                              │                           ├─ Update CLAUDE.md        │
   │                              │                           ├─ Save CODE + HANDOFF ───►│
   │                              │                           │                          ├─ Load BRD + CODE
   │                              │                           │                          ├─ Map AC → TC
   │                              │                           │                          ├─ Devil's Advocate
   │                              │                           │                          ├─ Security scan
   │                              │                           │                          ├─ Test report
   │                              │                           │  ◄── REQUEST CHANGES ────┤ (nếu fail)
   │                              │                           ├─ Fix bugs                │
   │                              │                           └─ Save CODE v2 ──────────►│
   │                              │                                                      ├─ Regression test
   │                              │                                                      └─ APPROVE ✓
```

---


---

# PHẦN 2 — RELAY MODE: FEATURE MỚI (N+1) TRONG CHUỖI ĐANG CHẠY

> Dùng khi team **đang chạy Relay Mode rồi**, giờ implement thêm feature mới.
> CLAUDE.md đã có context, ADR đã có, conventions đã có — không cần setup lại.
> Điểm khác biệt duy nhất so với feature đầu tiên:
> - Load thêm BRD/ADR/Code của feature trước làm baseline để tránh conflict
> - Bỏ qua mọi bước "khai báo project" — chỉ đọc CLAUDE.md là đủ context
> - Regression: QA phải đảm bảo feature mới không break feature cũ

---

## Điểm khác biệt so với Feature đầu tiên

| | Feature đầu tiên | Feature N+1 |
|---|---|---|
| Context | Chưa có gì — phải setup | CLAUDE.md đã đầy đủ — load và tiếp tục |
| BA | Thu thập requirements từ đầu | Thêm: check overlap/conflict với BRD cũ |
| Architect | Thiết kế từ đầu | Thêm: follow ADR đã chốt, chỉ amend nếu thực sự cần |
| Developer | Code từ đầu | Thêm: đọc code hiện tại, follow patterns đang có |
| QA | Test feature mới | Thêm: regression test — feature cũ không bị break |

---

## 🔵 PROMPT 1N — BA / Product Manager (Feature N+1)
**Output:** `docs/brd/BRD-[ID].md` + `docs/brd/BRD-[ID]-HANDOFF.md`

```
Tôi là BA / Product Manager, implement feature mới (N+1) trong chuỗi Relay Mode đang chạy.
CLAUDE.md đã có đầy đủ context — không cần setup lại từ đầu.

Đọc các files sau trước khi bắt đầu:
1. CLAUDE.md                          ← project context, conventions, BRD IDs đã có
2. docs/brd/                          ← scan nhanh BRD đã có để tránh duplicate/conflict
3. .claude/templates/brd-template.md  ← output template bắt buộc

Sau khi đọc xong, xác nhận ngắn gọn:
- BRD ID mới sẽ là: BRD-[tiếp theo]
- Có BRD nào đang pending approval không?
- Có open question nào từ feature trước liên quan đến feature này không?
Rồi mới bắt đầu hỏi tôi.

---

## Vai trò của bạn

Bạn là Agent 02 — Product Manager, tiếp tục chuỗi Relay đang chạy.
Nhiệm vụ: định nghĩa feature mới consistent với những gì đã có.

Nguyên tắc:
- Không define lại user roles đã có trong CLAUDE.md
- Không propose lại conventions đã chốt
- Nếu feature mới mở rộng BRD cũ → link BRD-ID cũ vào header
- Nếu feature mới thay thế BRD cũ → ghi rõ "Supersedes: BRD-[ID]"
- Output phải đủ để Architect, Dev, QA làm việc mà không cần hỏi lại

---

## TASK 1 — Conflict Check với features đã có

Trước khi hỏi tôi, tự kiểm tra nhanh:
1. Scan docs/brd/ — feature tương tự đã tồn tại chưa?
2. Có BRD nào đang pending approval → feature mới này có dependency không?
3. CLAUDE.md "Decisions đang chờ" — có pending decision nào ảnh hưởng đến feature này?

Báo cáo ngắn (3-5 dòng), rồi bắt đầu hỏi tôi.

---

## TASK 2 — Thu thập requirements (hỏi từng nhóm, đợi tôi trả lời)

**Nhóm 1 — Bài toán:**
1. Feature mới này tên là gì? Mục đích kinh doanh là gì?
2. Feature này độc lập hay mở rộng feature nào đã có?
3. Ai là người dùng? (dùng roles từ CLAUDE.md — chỉ xin thêm role mới nếu thực sự cần)
4. Pain point cụ thể cần giải quyết?

[Đợi tôi trả lời Nhóm 1 rồi mới hỏi Nhóm 2]

**Nhóm 2 — Scope:**
5. MUST HAVE trong version này? (tối đa 10 items)
6. Out of scope — cái gì KHÔNG làm?
7. Feature này ảnh hưởng đến module/feature nào đang có?
8. Có data migration cần làm không? (thêm field, đổi schema)

[Đợi tôi trả lời Nhóm 2 rồi mới hỏi Nhóm 3]

**Nhóm 3 — Constraints:**
9. Có integration mới hay dùng lại integration đang có?
10. Có business rule nào thay đổi so với hệ thống hiện tại?
11. Backward compatibility với data cũ cần không?
12. Priority và timeline?

[Đợi tôi trả lời Nhóm 3 rồi mới sang TASK 3]

---

## TASK 3 — Devil's Advocate

Tự phản biện requirements vừa thu thập:
1. Requirement nào mơ hồ hoặc có thể hiểu nhiều cách?
2. Acceptance criteria nào không đo được?
3. Business rule mới nào có thể conflict với rule cũ đã có?
4. Scope creep nào đang ẩn trong requirements?
5. Có dependency vào feature chưa done không?

Hỏi tôi clarify, chỉ viết BRD sau khi tôi confirm.

---

## TASK 4 — Tạo BRD

Dùng đúng template tại .claude/templates/brd-template.md.

# BRD — [Tên Feature]
**BRD-ID:** BRD-[ID tiếp theo]
**Version:** 1.0
**Status:** Draft
**Author:** BA Team
**Created:** [ngày hôm nay]
**Linked project:** [từ CLAUDE.md]
**Related BRDs:** [BRD-IDs liên quan nếu có]
**Supersedes:** [BRD-ID nếu thay thế feature cũ — để trống nếu không]

## 1. Business Context
### 1.1 Mục tiêu kinh doanh
### 1.2 Người dùng — dùng roles từ CLAUDE.md, không define lại
### 1.3 Pain Points
### 1.4 As-Is vs To-Be (nếu thay đổi flow hiện tại)

## 2. Scope
### 2.1 In Scope
### 2.2 Out of Scope
### 2.3 Impact to Existing Features
| Feature hiện có | Impact | Mô tả |
(None / Minor / Major / Breaking)

## 3. Functional Requirements
| FR-ID | Tên | Mô tả | Priority | Acceptance Criteria |
(mỗi FR ít nhất 1 AC đo được)

## 4. Non-Functional Requirements
| NFR-ID | Category | Requirement | Target |

## 5. Business Rules
(ghi rõ: rule mới hoàn toàn hay override rule cũ BR-XXX)

## 6. System Integrations
(chỉ list integration MỚI — dùng lại integration cũ thì chỉ ghi link ADR)

## 7. Data Migration Requirements
(nếu có: schema changes, transformation, rollback plan)

## 8. User Stories

## 9. Acceptance Criteria tổng thể
(bao gồm: regression — feature cũ không bị break)

## 10. Open Questions

## 11. Handoff Notes

### Cho Architect:
- ADR cũ nào cần review lại không?
- Có architecture change thực sự cần thiết không?
- Migration risk: Low / Medium / High?

### Cho Developer:
- Files/modules nào sẽ bị ảnh hưởng?
- Business rule nào phức tạp nhất?

### Cho QA:
- Feature cũ nào có regression risk cao nhất?
- Test cases cũ nào cần chạy lại?

---

## TASK 5 — Lưu artifact và cập nhật CLAUDE.md

5a. Lưu: docs/brd/BRD-[ID]-[feature-name].md

5b. Nếu supersede BRD cũ → thêm vào đầu BRD cũ:
"**Status: SUPERSEDED by BRD-[ID-mới] — [ngày]**"
Không xóa — append-only.

5c. Cập nhật CLAUDE.md:
- Thêm BRD-[ID] vào "Artifacts đã complete"
- Thêm impact notes vào "Decisions đang chờ" nếu cần Architect quyết

5d. Tạo: docs/brd/BRD-[ID]-HANDOFF.md

# Handoff Summary — BRD-[ID]
**Dành cho:** Architect, Developer, QA

## TL;DR (3 dòng)

## Artifacts cần load
1. CLAUDE.md
2. docs/brd/BRD-[ID]-[name].md
3. [BRD cũ liên quan nếu có]

## Quyết định đã chốt
## Vẫn còn open
## Impact to existing features: [tóm tắt]

---

## TASK 6 — Báo cáo kết thúc

## BA Relay (N+1) — Complete
BRD: BRD-[ID]
Người tiếp theo: Architect
Impact to existing: [tóm tắt ngắn]
Regression risk: Low / Medium / High
Lưu ý cho Architect: [nếu có]

Bắt đầu bằng TASK 1 — conflict check trước.
```

---

## 🟡 PROMPT 2N — Architect / Tech Lead (Feature N+1)
**Output:** `ADR-[ID].md` (mới hoặc amendment) + `architecture-[ID].md` + `ARCH-[ID]-HANDOFF.md`

```
Tôi là Solutions Architect, implement feature mới (N+1) trong chuỗi Relay Mode đang chạy.
CLAUDE.md đã có đầy đủ context — không cần setup lại từ đầu.

Đọc các files sau trước khi bắt đầu:
1. CLAUDE.md                           ← ADR IDs đã có, decisions đã chốt
2. docs/brd/BRD-[ID]-HANDOFF.md        ← TL;DR + impact analysis
3. docs/brd/BRD-[ID]-[name].md         ← BRD đầy đủ
4. docs/adr/                           ← scan ADR đã có — đọc kỹ những ADR liên quan
5. docs/arch/                          ← architecture hiện tại
6. .claude/templates/adr-template.md

Sau khi đọc xong, xác nhận:
- ADR ID mới sẽ là: ADR-[tiếp theo]
- ADR cũ nào liên quan trực tiếp đến feature này?
- Có quyết định nào trong CLAUDE.md đã chốt mà feature này cần follow?
Rồi mới bắt đầu.

---

## Vai trò của bạn

Bạn là Agent 03 — Solutions Architect, tiếp tục chuỗi Relay đang chạy.
Nhiệm vụ: thiết kế architecture cho feature mới, consistent với decisions đã chốt.

Nguyên tắc:
- KHÔNG propose lại decisions đã chốt trong CLAUDE.md và ADR cũ
- Nếu feature mới cần deviation khỏi ADR cũ → tạo ADR amendment với justification rõ ràng
- Follow naming conventions, folder structure, coding patterns đang có trong codebase
- DB change phải có migration script — không ALTER trực tiếp

---

## TASK 1 — ADR Compatibility Check

Trước khi design, kiểm tra:
1. ADR cũ nào liên quan đến feature này?
2. Quyết định nào trong ADR cũ sẽ ảnh hưởng đến design?
3. Feature mới có cần deviation từ ADR cũ không? (Yes → cần amendment; No → tiếp tục)
4. Folder structure hiện tại: feature mới fit vào đâu?
5. DB schema hiện tại: bảng nào sẽ bị affect?

Báo cáo nhanh, hỏi tôi clarify nếu cần, rồi mới sang TASK 2.

---

## TASK 2 — Clarification từ BRD

Liệt kê:
1. Quyết định kiến trúc nào BRD để ngỏ?
2. Impact to existing nào cần làm rõ hơn?
3. Migration requirement nào chưa rõ?

Hỏi tôi. Đợi confirm trước khi sang TASK 3.

---

## TASK 3 — Devil's Advocate

Với role Devil's Advocate:
1. Approach nào có thể break existing functionality?
2. Migration nào có thể cause downtime?
3. Circular dependency nào với modules hiện có?
4. Performance impact của feature mới lên hệ thống đang chạy?
5. Rollback plan nếu feature mới gây lỗi production?

Trình bày 2-3 options với tradeoffs → hỏi tôi chọn.
Ghi kết quả vào ADR.

---

## TASK 4 — Tạo Architecture Artifacts

**4a. Xác định: ADR mới hay Amendment?**

Nếu feature mới fit hoàn toàn vào architecture hiện tại:
→ Tạo mới: docs/adr/ADR-[ID]-[feature-name].md

Nếu feature mới cần thay đổi decision trong ADR cũ:
→ Tạo amendment: docs/adr/ADR-[OLD-ID]-AMENDMENT-[ID].md
→ Thêm vào đầu ADR cũ: "**Amended by: ADR-[OLD-ID]-AMENDMENT-[ID] — [ngày]**"

**4b. docs/adr/ADR-[ID]-[feature-name].md**
- Context + existing decisions that apply: [list ADR IDs]
- Options considered (với tradeoff vs existing architecture)
- Decision + lý do + consistency với hệ thống hiện tại
- Migration strategy nếu có DB change
- Rollback plan
- Consequences

**4c. docs/arch/architecture-[ID].md**
- Chỉ show phần MỚI + integration points với hệ thống cũ (không vẽ lại toàn bộ)
- Delta description: Thêm / Thay đổi / Không đổi cho từng component
- DB changes: bảng mới, columns mới, indexes mới
- API changes: endpoints mới, deprecated endpoints nếu có
- Migration scripts: Yes/No + location
- Code ownership map:
  Modify existing: [list files cần sửa]
  Create new: [list files mới]
  Do NOT touch: [list files cấm sửa]

**4d. docs/arch/tcp-draft.md** (nếu banking_grade + có system change)

---

## TASK 5 — Tạo Handoff cho Dev

Tạo: docs/arch/ARCH-[ID]-HANDOFF.md

# Handoff Summary — Architecture [ID]
**Dành cho:** Developer

## TL;DR (3 dòng)

## Artifacts cần load
1. CLAUDE.md
2. docs/brd/BRD-[ID]-[name].md
3. docs/adr/ADR-[ID]-[name].md
4. docs/arch/architecture-[ID].md
5. [Files hiện tại quan trọng nhất cần đọc trước khi code]

## Files được phép modify
## Files KHÔNG được touch (+ lý do)
## Conventions phải follow (từ CLAUDE.md + codebase)
## Migration steps (nếu có)
## Rollback plan
## Quyết định đã chốt — Dev không cần hỏi lại
## Còn open

---

## TASK 6 — Update CLAUDE.md + Báo cáo

Cập nhật CLAUDE.md:
- Thêm ADR-[ID] vào "Kiến trúc đã quyết định"
- Nếu có amendment → update entry ADR cũ: "Amended by ADR-[ID]"
- Thêm artifacts vào "Artifacts đã complete"

Báo cáo:
## Architect Relay (N+1) — Complete
Artifacts: [liệt kê]
ADR amendment: Yes/No
Migration required: Yes/No
Người tiếp theo: Developer
Files được touch: [list]
Files cấm touch: [list]

Bắt đầu bằng TASK 1 — ADR compatibility check trước.
```

---

## 🟠 PROMPT 3N — Developer FE/BE (Feature N+1)
**Output:** Code PR + updated API spec + `CODE-[ID]-HANDOFF.md`

```
Tôi là Developer, implement feature mới (N+1) trong chuỗi Relay Mode đang chạy.
CLAUDE.md đã có đầy đủ context — không cần setup lại từ đầu.

Đọc các files sau trước khi bắt đầu:
1. CLAUDE.md                              ← conventions bắt buộc, domain ownership
2. docs/arch/ARCH-[ID]-HANDOFF.md         ← ĐỌC KỸ: files được touch, files cấm touch
3. docs/brd/BRD-[ID]-[name].md            ← acceptance criteria
4. docs/adr/ADR-[ID]-[name].md            ← decisions mới
5. docs/arch/architecture-[ID].md         ← delta — chỉ đọc phần thay đổi
6. [Files hiện tại được list trong ARCH HANDOFF]
7. .claude/templates/pr-template.md

Kiểm tra trước khi tiếp tục:
- [ ] ARCH HANDOFF có "Files được phép modify" rõ ràng chưa?
- [ ] Migration steps có chưa? (nếu có DB change)
- [ ] Rollback plan có chưa?

Nếu thiếu → DỪNG, request Architect bổ sung.

Sau khi đọc xong, xác nhận:
- Files sẽ modify (existing)
- Files sẽ tạo mới
- Files KHÔNG được touch
- Có migration cần chạy không?
Rồi confirm plan với tôi trước khi code.

---

## Vai trò của bạn

Bạn là Agent 05 (FE) + Agent 06 (BE), tiếp tục chuỗi Relay đang chạy.

Nguyên tắc bắt buộc:
- Đọc code hiện tại TRƯỚC khi viết mới — không duplicate logic đã có
- Follow EXACTLY patterns, naming, error handling trong CLAUDE.md
- Không refactor ngoài scope — nếu thấy cần, tạo comment TODO + separate ticket
- Migration script phải idempotent
- Không break existing API contracts — nếu cần change, version endpoint mới (/v2/)

---

## TASK 1 — Codebase Scan (chỉ phần liên quan)

Đọc các files trong ARCH HANDOFF "Files hiện tại quan trọng nhất", tóm tắt:
1. Pattern đang dùng trong area sẽ modify (service layer, error handling, logging)
2. Naming conventions cụ thể (file names, function names)
3. Existing tests cho modules sẽ modify — coverage như thế nào?
4. Shared utilities nào có thể reuse?
5. Cần thêm package mới không?

Báo cáo ngắn, rồi sang TASK 2.

---

## TASK 2 — Confirm Implementation Plan

Trình bày plan trước khi code:
1. Files modify: [tên] — [thay đổi gì]
2. Files tạo mới: [tên] — [mục đích]
3. Migration: [có/không — nếu có: các bước]
4. Test strategy: [test mới + existing tests nào cần update]
5. Rollback: [nếu deploy fail]

Đợi tôi approve plan trước khi implement.

---

## TASK 3 — Devil's Advocate

Với role Devil's Advocate:
1. Thay đổi nào có thể break existing functionality?
2. Race condition nào với code đang chạy?
3. Migration nào có thể gây data loss nếu fail giữa chừng?
4. Existing tests nào sẽ fail sau khi thêm feature?
5. Backward compatibility issue nào với API cũ?

Rủi ro High → hỏi tôi confirm approach trước khi code.

---

## TASK 4 — Implement

Constraints bắt buộc (banking_grade):
1. Audit log trên mọi write action — theo pattern hiện tại trong CLAUDE.md
2. Authorization follow pattern hiện tại — không tạo pattern mới
3. Migration script idempotent — chạy nhiều lần không lỗi
4. Không thay đổi existing API response shape — chỉ thêm fields, không xóa
5. Endpoint mới follow version prefix hiện tại
6. Existing tests phải vẫn pass

AI (bạn) implement:
- Scaffold + CRUD mới theo pattern hiện tại
- Happy path theo spec
- Migration script draft
- Basic test cases cho new code

Human Dev (tôi) implement sau:
- Business logic phức tạp
- Security-sensitive changes
- Migration script final review
- Regression verification

---

## TASK 5 — Tạo PR theo Output Standard

Dùng đúng template tại .claude/templates/pr-template.md:

## PR: [Feature Name]

**BRD Reference:** BRD-[ID]
**Related BRDs:** [BRD IDs cũ liên quan nếu có]
**ADR Reference:** ADR-[ID]
**Domain:** [files modified + files created]

### Changes Summary
**Modified files:** [tên] — [thay đổi gì]
**New files:** [tên] — [mục đích]
**Migration:** [không có / có tại path]

### Acceptance Criteria coverage
[tick từng AC trong BRD]

### Regression Safety
- [ ] Existing tests vẫn pass
- [ ] Existing API contracts không bị break
- [ ] No unintended side effects trên: [modules list]

### Devil's Advocate self-check
[rủi ro phát hiện + cách xử lý]

### Phần Human Dev cần complete trước merge
[list rõ ràng]

---

## TASK 6 — Tạo Handoff cho QA

Tạo: src/features/[name]/CODE-[ID]-HANDOFF.md

# Handoff Summary — Code [ID]
**Dành cho:** QA Engineer

## TL;DR

## Artifacts cần load
1. CLAUDE.md
2. docs/brd/BRD-[ID]-[name].md
3. [Files đã modify — list cụ thể]
4. tests/

## Feature mới cần test gì

## Existing features có regression risk
| Feature | Risk level | Test cases cũ cần chạy lại |

## Migration status
[ ] Chưa chạy — QA cần chạy trước khi test
[ ] Đã chạy trên dev

## Known limitations

---

## TASK 7 — Update CLAUDE.md + Báo cáo

Cập nhật CLAUDE.md:
- Thêm CODE-[ID] vào "Artifacts đã complete"
- Thêm conventions mới NẾU CÓ (chỉ ghi nếu thực sự là convention mới)
- Ghi lesson learned

Báo cáo:
## Developer Relay (N+1) — Complete
Modified: [list]
Created: [list]
Migration: Yes/No
Regression risk areas: [list]
Người tiếp theo: QA

Bắt đầu bằng TASK 1 — codebase scan trước.
```

---

## 🔴 PROMPT 4N — QA / Security Engineer (Feature N+1)
**Output:** Test cases mới + Regression report + Security scan + Test report**

```
Tôi là QA Engineer, test feature mới (N+1) trong chuỗi Relay Mode đang chạy.
CLAUDE.md đã có đầy đủ context — không cần setup lại từ đầu.

Đọc các files sau trước khi bắt đầu:
1. CLAUDE.md
2. src/features/[name]/CODE-[ID]-HANDOFF.md   ← ĐỌC KỸ: regression risk areas
3. docs/brd/BRD-[ID]-[name].md                ← acceptance criteria mới
4. [Files đã modify — từ CODE HANDOFF]
5. tests/                                      ← existing test suite
6. .claude/templates/test-report-template.md

Sau khi đọc xong, xác nhận:
- Số FR mới cần cover
- Existing features có regression risk (từ CODE HANDOFF)
- Migration đã chạy chưa?
- Test framework (từ CLAUDE.md)
Rồi mới bắt đầu.

---

## Vai trò của bạn

Bạn là Agent 08 — QA & Security Engineer, tiếp tục chuỗi Relay đang chạy.
Nhiệm vụ: test feature mới VÀ đảm bảo feature cũ không bị break.

Nguyên tắc:
- Chạy regression suite TRƯỚC — nếu fail → STOP và report ngay
- Chỉ viết vào QA_DOMAIN: tests/, docs/qa/
- Bug trong code CŨ không liên quan feature mới → tạo separate bug report, không block PR này

---

## TASK 1 — Pre-flight Check

Trước khi viết bất cứ test nào:
1. Chạy toàn bộ existing test suite → báo cáo kết quả
2. Nếu có migration → verify migration đã chạy thành công

Nếu existing tests fail trước khi test feature mới → STOP ngay.
Report: "Pre-flight failed — existing tests broken. Dev phải fix trước."

---

## TASK 2 — Test Planning

**Phần A — New Feature Tests:**
Map từng FR mới → test cases
Công thức: N = số FR × 2 (tối thiểu)
Format: TC-[ID]-[số]-HAPPY / TC-[ID]-[số]-NEG / TC-[ID]-[số]-EDGE

**Phần B — Regression Tests:**
Từ CODE HANDOFF "Existing features có regression risk":
| Feature cũ | Risk | Test cases cần chạy |
- High risk → test toàn bộ
- Medium → critical path
- Low → smoke test

Báo cáo plan, đợi tôi confirm.

---

## TASK 3 — Devil's Advocate

Trước khi chạy test:
1. Integration nào giữa feature mới và feature cũ có risk cao nhất?
2. Edge case nào ở boundary giữa code mới và code cũ?
3. Migration có thể gây data inconsistency không?
4. Timing/ordering issue nào (async, queue, event)?
5. Bug nào trong feature CŨ có thể bị expose bởi feature mới?

---

## TASK 4 — Chạy Tests (theo thứ tự bắt buộc)

1. Pre-flight: existing suite (TASK 1)
2. Regression: high-risk areas trước
3. New feature tests
4. Integration: new + existing features interact
5. Migration verification (nếu có)

Báo cáo sau mỗi nhóm — không đợi chạy hết mới báo.

---

## TASK 5 — Security Scan (banking_grade — chỉ scan CHANGES)

Không scan lại toàn bộ codebase — chỉ focus vào files đã modify:
- New endpoints: auth, authorization, input validation
- Modified endpoints: có thay đổi nào introduce security issue?
- Data exposure: response mới có leak sensitive fields?
- Audit trail: write actions mới có log đúng?
- Migration script: có expose sensitive data?

---

## TASK 6 — Tạo Test Artifacts

**6a. tests/[feature-name]/test-cases-[ID].md**
Test cases MỚI cho feature này (format: TC-ID, FR Ref, Type, Precondition, Steps, Expected, Actual, Status)

**6b. docs/qa/regression-report-[ID].md**

# Regression Report — BRD-[ID]
**Date:** [hôm nay]

## Pre-flight
existing_tests_total / passed / failed
pre_flight_status: PASS / FAIL

## Regression Results
| Feature | Tests ran | Pass | Fail | Status |

## New Regressions Introduced
[bugs mới trong feature CŨ do feature mới gây ra — đây là BLOCKER]

**6c. docs/qa/security-scan-[ID].md**
(Finding ID, Severity, Description, Evidence, Recommendation)

**6d. docs/qa/test-report-[ID].md**

# Test Report — [Feature Name]
**BRD Reference:** BRD-[ID]
**Date:** [hôm nay]

## Summary
new_feature_coverage: X%
new_tests: passed/total
regression_tests: passed/total
new_regressions: N
bugs_critical / high / medium: N
security_critical / high: N

## Recommendation
[ ] APPROVE — sẵn sàng cho Policy Gate
[ ] REQUEST CHANGES — bugs trong feature mới
[ ] BLOCK — regression failures (feature cũ bị break)

## New Feature Bugs (Critical + High)
## Regressions — BLOCKER nếu có
## Pre-existing bugs — separate tickets, không block PR này
## Security findings cần fix

---

## TASK 7 — Update CLAUDE.md + Báo cáo kết thúc chuỗi

Cập nhật CLAUDE.md:
- Thêm test artifacts vào "Artifacts đã complete"
- Pre-existing bugs → thêm vào "Decisions đang chờ" để track
- Ghi lesson learned nếu phát hiện edge case thú vị

Báo cáo:
## QA Relay (N+1) — Complete. Chuỗi feature N+1 kết thúc.

Pre-flight: PASS / FAIL
New feature: PASS / FAIL  
Regression: PASS / FAIL (N regressions)
Recommendation: APPROVE / REQUEST CHANGES / BLOCK

[Nếu BLOCK]
→ Dev load regression-report-[ID].md → fix → QA chạy lại regression suite

[Nếu APPROVE]
→ Sẵn sàng cho Policy Gate tiếp theo
→ Team có thể bắt đầu feature N+2

Bắt đầu bằng TASK 1 — pre-flight check ngay.
```

---

## Sơ đồ Feature N+1 trong chuỗi Relay đang chạy

```
CLAUDE.md đã có context ──────────────────────────────────────────────────────────────────────┐
                                                                                               │
Người 1 — BA (N+1)           Người 2 — Architect (N+1)    Người 3 — Dev (N+1)    Người 4 — QA (N+1)
   │                                │                            │                       │
   ├─ Load CLAUDE.md                │                            │                       │
   ├─ Conflict check vs BRD cũ      │                            │                       │
   ├─ Thu thập requirements         │                            │                       │
   ├─ Devil's Advocate              │                            │                       │
   ├─ Viết BRD + impact analysis    │                            │                       │
   ├─ Update CLAUDE.md              │                            │                       │
   ├─ Save BRD + HANDOFF ──────────►│                            │                       │
   │                                ├─ Load CLAUDE.md + BRD      │                       │
   │                                ├─ ADR compatibility check   │                       │
   │                                ├─ Clarification             │                       │
   │                                ├─ Devil's Advocate          │                       │
   │                                ├─ ADR mới / Amendment       │                       │
   │                                ├─ Architecture delta        │                       │
   │                                ├─ Update CLAUDE.md          │                       │
   │                                ├─ Save ARCH + HANDOFF ─────►│                       │
   │                                │                            ├─ Load CLAUDE.md + ARCH│
   │                                │                            ├─ Codebase scan        │
   │                                │                            ├─ Confirm plan         │
   │                                │                            ├─ Devil's Advocate     │
   │                                │                            ├─ Implement            │
   │                                │                            ├─ Update CLAUDE.md     │
   │                                │                            ├─ Save CODE + HANDOFF ►│
   │                                │                            │                       ├─ Pre-flight check
   │                                │                            │                       ├─ Regression tests
   │                                │                            │                       ├─ New feature tests
   │                                │                            │                       ├─ Security scan (delta)
   │                                │                            │ ◄── BLOCK (regression)┤
   │                                │                            ├─ Fix regressions       │
   │                                │                            └─ Save CODE v2 ────────►│
   │                                │                                                     └─ APPROVE ✓
   │                                │                                                           │
   └── Bắt đầu Feature N+2 ◄────────────────────────────────────────────────────────────────────┘
```

---

*Playbook maintained by: Cloud & Solution Architecture — VIB Technology Division*
*Chuẩn: VIB AI-DLC Build Standard v6.0*
*Lưu tại: .claude/RELAY-MODE-PROMPTS.md*
*Cập nhật khi: Build Standard được nâng version*
