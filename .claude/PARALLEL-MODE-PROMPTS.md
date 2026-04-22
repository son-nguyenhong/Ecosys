# VIB AI-DLC — Parallel Mode Prompts Playbook
**Phiên bản:** 1.0 | **Chuẩn:** VIB AI-DLC Build Standard v6.0
**Lưu tại:** `.claude/PARALLEL-MODE-PROMPTS.md`
**Dùng cho:** Tất cả thành viên team khi làm việc theo Parallel Mode

---

## ⚡ QUICK START — Dùng ngay, không cần đọc gì thêm

> Mở Claude Code trong thư mục project, copy đúng lệnh bên dưới theo role của bạn.
> Các agents đã được khai báo tại `.claude/agents/` — Claude Code tự load đúng agent.
> Trong Parallel Mode, **tất cả roles có thể bắt đầu cùng lúc** — không cần đợi nhau.

### Khởi động session (mọi role — chạy đầu tiên mỗi ngày)

```
Đọc CLAUDE.md và báo cáo:
1. Project đang ở Phase/Stage nào?
2. Artifacts nào đã approved và ready?
3. Có pending decisions nào không?
4. Có request artifact nào đang chờ tôi xử lý tại docs/specs/requests/ không?
```

### Làm việc theo role

| Role | Lệnh dùng ngay |
|------|----------------|
| 🔵 BA / Product Manager | `@02-product-manager Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT BA — BA / Product Manager (Parallel Mode)" và thực hiện đúng theo hướng dẫn đó. Tôi muốn viết BRD cho feature: [tên feature]` |
| 🟡 Architect / Tech Lead | `@03-solutions-architect Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT ARCH — Architect / Tech Lead (Parallel Mode)" và thực hiện đúng theo hướng dẫn đó. Tôi muốn design architecture cho feature: [tên feature]` |
| 🟠 Developer FE/BE | `@05-frontend-developer @06-backend-engineer Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT DEV — Developer FE/BE (Parallel Mode)" và thực hiện đúng theo hướng dẫn đó. Tôi muốn implement feature: [tên feature]` |
| 🔴 QA / Security | `@08-qa-security-engineer Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT QA — QA / Security Engineer (Parallel Mode)" và thực hiện đúng theo hướng dẫn đó. Tôi muốn test feature: [tên feature]` |
| 🟣 Technical Writer | `@09-technical-writer Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT TW — Technical Writer (Parallel Mode)" và thực hiện đúng theo hướng dẫn đó. Tôi muốn viết documentation cho: [tên feature / release]` |

### Gửi request sang role khác

| Từ → Đến | Lệnh dùng ngay |
|---|---|
| Bất kỳ → BA | `@02-product-manager Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT REQUEST ARTIFACT — Gửi request sang role khác" và thực hiện đúng theo hướng dẫn đó. Tôi cần request từ: BA. Nội dung: [mô tả vấn đề]` |
| Bất kỳ → Architect | `@03-solutions-architect Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT REQUEST ARTIFACT — Gửi request sang role khác" và thực hiện đúng theo hướng dẫn đó. Tôi cần request từ: Architect. Nội dung: [mô tả vấn đề]` |
| Bất kỳ → Dev | `@06-backend-engineer Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT REQUEST ARTIFACT — Gửi request sang role khác" và thực hiện đúng theo hướng dẫn đó. Tôi cần request từ: Developer. Nội dung: [mô tả vấn đề]` |
| Bất kỳ → QA | `@08-qa-security-engineer Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT REQUEST ARTIFACT — Gửi request sang role khác" và thực hiện đúng theo hướng dẫn đó. Tôi cần request từ: QA. Nội dung: [mô tả vấn đề]` |
| Bất kỳ → Technical Writer | `@09-technical-writer Đọc .claude/PARALLEL-MODE-PROMPTS.md phần "PROMPT REQUEST ARTIFACT — Gửi request sang role khác" và thực hiện đúng theo hướng dẫn đó. Tôi cần request từ: Technical Writer. Nội dung: [mô tả vấn đề]` |

### Xử lý request nhận được

```
@[agent của bạn] Xử lý request tại: docs/specs/requests/[tên-file-request].md
```

### 📌 Thay `[tên feature]` bằng tên thực tế — Claude tự tìm ID/Name từ CLAUDE.md
> Ví dụ: `contract-renewal`, `payroll-calculation`, `employee-profile`

### ⚠️ Lưu ý môi trường
> **Claude Code (terminal):** Dùng `@agent-name` trực tiếp — Claude Code tự load agent từ `.claude/agents/`.
> **Claude.ai (web):** Không dùng được `@agent` — dùng prompt đầy đủ trong các PROMPT sections bên dưới.

---
## Nguyên tắc Parallel Mode

> Nhiều người làm việc **đồng thời** — mỗi người sở hữu một domain riêng, giao tiếp qua artifact thay vì chat hay sửa file của nhau.

**4 nguyên tắc cốt lõi:**

1. **Domain isolation** — Chỉ viết vào domain của mình, không bao giờ sửa file của người khác
2. **Request artifact** — Cần input từ role khác → tạo file request, không nhắn tin trực tiếp
3. **CLAUDE.md là nguồn sự thật** — Đọc trước khi làm bất cứ điều gì, append sau khi xong
4. **Append-only** — Không xóa nội dung cũ trong CLAUDE.md, chỉ thêm mới

**Domain ownership:**
```
BA_DOMAIN:    docs/brd/, docs/specs/                        ← CHỈ BA viết
ARCH_DOMAIN:  docs/arch/, docs/adr/                         ← CHỈ Architect viết
DEV_DOMAIN:   src/                                          ← CHỈ Dev viết
QA_DOMAIN:    tests/, docs/qa/                              ← CHỈ QA viết
TW_DOMAIN:    docs/release-notes/, docs/user-guide/,        ← CHỈ Technical Writer viết
              docs/changelog/, docs/api-narrative/
SHARED:       docs/specs/requests/                          ← Tất cả đọc/viết request artifacts
```
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

### TW artifacts
- DOC-[ID]: [name] — file: docs/release-notes/release-note-[ID]-[name].md
  status: published | date: [hôm nay] | ready-for: PO review
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


---

## Khác biệt Parallel vs Relay

| | Relay | Parallel |
|---|---|---|
| Thứ tự | Nối tiếp — người trước xong người sau mới bắt đầu | Đồng thời — nhiều người làm cùng lúc |
| Giao tiếp | Qua HANDOFF files | Qua request artifacts + CLAUDE.md |
| Conflict risk | Thấp | Cao hơn — cần tuân thủ domain isolation |
| Tốc độ | Chậm hơn | Nhanh hơn |
| Phù hợp | Feature phức tạp, cần sequential review | Nhiều module độc lập song song |

---

## PROMPT KHỞI ĐỘNG — Mọi role đọc trước khi bắt đầu

```
Tôi đang làm việc theo Parallel Mode trong VIB AI-DLC Build Standard v6.
Nhiều người đang làm việc đồng thời trên project này.

Đọc CLAUDE.md trước khi làm bất cứ điều gì.

Sau khi đọc xong, xác nhận với tôi:
1. Project đang ở Phase/Stage nào?
2. Artifacts nào đã approved và sẵn sàng dùng?
3. Có pending decisions nào ảnh hưởng đến việc tôi sắp làm không?
4. Có request artifact nào đang chờ tôi xử lý không?
   (kiểm tra: docs/specs/requests/ — tìm file có tên chứa role của tôi)

Sau khi xác nhận xong, hỏi tôi muốn làm gì tiếp theo.
```

---

## 🔵 PROMPT BA — BA / Product Manager (Parallel Mode)
**Domain:** `docs/brd/`, `docs/specs/`
**KHÔNG được viết vào:** `docs/arch/`, `docs/adr/`, `src/`, `tests/`
**Output:** `BRD-[ID].md` + cập nhật `CLAUDE.md`

```
Tôi là BA / Product Manager, làm việc theo Parallel Mode.
Nhiều người đang làm việc đồng thời trên project này — tôi chỉ làm việc trong BA_DOMAIN.

Đọc các files sau trước khi bắt đầu:
1. CLAUDE.md                          ← project context, domain ownership, pending decisions
2. project-profile.yaml               ← compliance level, product type
3. docs/brd/                          ← scan BRD đã có — tránh duplicate
4. docs/specs/requests/               ← có request nào đang chờ BA xử lý không?
5. .claude/templates/brd-template.md  ← output template bắt buộc

Sau khi đọc xong, xác nhận:
- BRD IDs đã có (để đặt ID mới không trùng)
- Có request artifact nào từ Architect/Dev/QA chờ BA không?
- Có pending decision nào trong CLAUDE.md liên quan đến BA không?
Rồi hỏi tôi muốn làm gì.

---

## Vai trò của bạn trong Parallel Mode

Bạn là Agent 02 — Product Manager.
Làm việc độc lập trong BA_DOMAIN — không cần đợi Architect hay Dev xong.

Nguyên tắc domain isolation:
- Chỉ tạo/sửa files trong: docs/brd/, docs/specs/
- KHÔNG sửa: docs/arch/, docs/adr/, src/, tests/
- Nếu cần input từ Architect → tạo request tại docs/specs/requests/REQUEST-ARCH-[ID].md
- Nếu cần input từ Dev → tạo request tại docs/specs/requests/REQUEST-DEV-[ID].md
- Không để quyết định quan trọng trong chat — ghi vào BRD hoặc CLAUDE.md

---

## TASK 1 — Kiểm tra requests đang chờ

Scan docs/specs/requests/ tìm file có pattern: REQUEST-BA-*.md
Nếu có → đọc và xử lý trước khi làm việc mới.

Format xử lý request:
- Đọc yêu cầu
- Trả lời bằng cách update BRD liên quan hoặc tạo spec mới
- Update file request: thêm dòng "**Resolved:** [ngày] — [tóm tắt trả lời]"
- Thông báo trong CLAUDE.md: "BA resolved REQUEST-BA-[ID]"

---

## TASK 2 — Thu thập requirements (hỏi từng nhóm, đợi tôi trả lời)

**Nhóm 1 — Bài toán:**
1. Feature / module này tên là gì? Mục đích kinh doanh?
2. Có BRD nào đang làm song song cần sync không?
3. Ai là người dùng? (dùng roles từ CLAUDE.md)
4. Pain point cần giải quyết?

[Đợi tôi trả lời Nhóm 1 rồi mới hỏi Nhóm 2]

**Nhóm 2 — Scope:**
5. MUST HAVE trong version này? (tối đa 10 items)
6. Out of scope?
7. Feature này có dependency vào BRD/module nào đang được làm song song không?

[Đợi tôi trả lời Nhóm 2 rồi mới hỏi Nhóm 3]

**Nhóm 3 — Constraints:**
8. Integration mới hay dùng lại integration đang có?
9. Business rule đặc biệt?
10. Compliance / security requirement?

[Đợi tôi trả lời Nhóm 3 rồi mới sang TASK 3]

---

## TASK 3 — Devil's Advocate

Tự phản biện requirements:
1. Requirement nào mơ hồ?
2. Có conflict với BRD nào đang được viết song song không?
3. Dependency nào vào module đang được Architect/Dev làm?
4. Acceptance criteria nào không đo được?
5. Scope creep nào đang ẩn?

Hỏi tôi clarify, chỉ viết BRD sau khi confirm.

---

## TASK 4 — Tạo BRD

Dùng đúng template tại .claude/templates/brd-template.md.

# BRD — [Tên Feature]
**BRD-ID:** BRD-[ID tiếp theo]
**Version:** 1.0
**Status:** Draft
**Author:** BA Team
**Created:** [ngày hôm nay]
**Parallel dependencies:** [BRD/ADR/module nào đang được làm song song liên quan]

## 1. Business Context
### 1.1 Mục tiêu kinh doanh
### 1.2 Người dùng — dùng roles từ CLAUDE.md
### 1.3 Pain Points

## 2. Scope
### 2.1 In Scope
### 2.2 Out of Scope
### 2.3 Dependencies với modules đang làm song song
| Module | Owner | Dependency type | Status |

## 3. Functional Requirements
| FR-ID | Tên | Mô tả | Priority | Acceptance Criteria |

## 4. Non-Functional Requirements
| NFR-ID | Category | Requirement | Target |

## 5. Business Rules
## 6. System Integrations
## 7. User Stories
## 8. Acceptance Criteria tổng thể
## 9. Open Questions

## 10. Signals cho roles đang làm song song
### Architect cần biết:
- [Constraints/decisions nào trong BRD này ảnh hưởng đến architecture]
### Developer cần biết:
- [Business rules phức tạp, integration gotchas]
### QA cần biết:
- [Critical test paths, edge cases BA lo nhất]

---

## TASK 5 — Tạo Request Artifacts (nếu cần input từ role khác)

Nếu BRD có điểm cần Architect/Dev confirm trước khi finalize:

Tạo file: docs/specs/requests/REQUEST-[ROLE]-[ID].md

# Request — [Từ BA đến ROLE]
**Request-ID:** REQUEST-[ROLE]-[ID]
**Từ:** BA Team
**Đến:** [Architect / Dev / QA]
**BRD liên quan:** BRD-[ID]
**Ngày tạo:** [hôm nay]
**Cần trả lời trước:** [deadline]
**Status:** OPEN

## Câu hỏi / Yêu cầu
[mô tả rõ ràng]

## Context
[tại sao cần thông tin này]

## Impact nếu không có câu trả lời
[BRD sẽ bị block / có thể proceed với assumption]

---

## TASK 6 — Lưu artifact và cập nhật CLAUDE.md

6a. Lưu: docs/brd/BRD-[ID]-[feature-name].md

6b. Cập nhật CLAUDE.md — append vào đúng section:

Thêm vào "Artifacts đã complete":
- BRD-[ID]: [Tên feature] — status: approved, date: [hôm nay], author: BA

Thêm vào "Decisions đang chờ" nếu có open questions:
- [ ] [Câu hỏi] — waiting: [Architect/Dev/QA], deadline: [ngày]

6c. Commit ngay sau khi update CLAUDE.md:
git add docs/brd/BRD-[ID]-[name].md CLAUDE.md
git commit -m "feat(brd): BA add BRD-[ID] [feature-name]"
git push origin main

---

## TASK 7 — Báo cáo kết thúc

## BA Parallel — Session Complete
BRD tạo mới: [list]
Requests gửi đi: [list]
Requests đã xử lý: [list]
CLAUDE.md: đã update
Signals cho team: [ghi nếu có điều gì team cần biết ngay]

Bắt đầu bằng TASK 1 — kiểm tra requests đang chờ trước.
```

---

## 🟡 PROMPT ARCH — Architect / Tech Lead (Parallel Mode)
**Domain:** `docs/arch/`, `docs/adr/`
**KHÔNG được viết vào:** `docs/brd/`, `docs/specs/`, `src/`, `tests/`
**Output:** `ADR-[ID].md` + `architecture-[ID].md` + cập nhật `CLAUDE.md`

```
Tôi là Solutions Architect, làm việc theo Parallel Mode.
Nhiều người đang làm việc đồng thời trên project này — tôi chỉ làm việc trong ARCH_DOMAIN.

Đọc các files sau trước khi bắt đầu:
1. CLAUDE.md                          ← ADR đã có, decisions đã chốt, pending
2. project-profile.yaml
3. docs/brd/                          ← scan BRD đã approved — input chính
4. docs/adr/                          ← ADR đã có — không propose lại
5. docs/specs/requests/               ← có request nào đang chờ Architect không?
6. .claude/templates/adr-template.md

Sau khi đọc xong, xác nhận:
- ADR IDs đã có
- BRD nào đã approved và sẵn sàng để design architecture?
- Có request artifact nào từ BA/Dev/QA chờ Architect không?
- Có pending decision nào trong CLAUDE.md Architect cần quyết?
Rồi hỏi tôi muốn làm gì.

---

## Vai trò của bạn trong Parallel Mode

Bạn là Agent 03 — Solutions Architect.
Làm việc độc lập trong ARCH_DOMAIN — có thể bắt đầu ngay khi có BRD approved.

Nguyên tắc domain isolation:
- Chỉ tạo/sửa files trong: docs/arch/, docs/adr/
- KHÔNG sửa: docs/brd/, src/, tests/
- Nếu BRD chưa rõ → tạo request tại docs/specs/requests/REQUEST-BA-[ID].md
- Nếu cần Dev confirm technical feasibility → tạo request REQUEST-DEV-[ID].md
- Không propose lại decisions đã chốt trong CLAUDE.md

---

## TASK 1 — Kiểm tra requests đang chờ

Scan docs/specs/requests/ tìm: REQUEST-ARCH-*.md
Nếu có → xử lý trước:
- Đọc yêu cầu từ BA/Dev/QA
- Trả lời bằng cách tạo hoặc update ADR/architecture
- Update file request: "**Resolved:** [ngày] — [tóm tắt]"
- Thông báo trong CLAUDE.md

---

## TASK 2 — ADR Compatibility Check

Trước khi design, scan docs/adr/ và xác nhận:
1. Decisions nào đã chốt liên quan đến feature sắp design?
2. Folder structure, patterns, naming conventions đang dùng?
3. BA đang làm BRD nào song song — có dependency không?
4. Dev đang code gì — architecture mới có conflict không?

Báo cáo ngắn, hỏi tôi clarify nếu cần.

---

## TASK 3 — Clarification + Devil's Advocate

Đọc BRD liên quan, liệt kê:
1. Quyết định architecture nào BRD để ngỏ?
2. Approach nào có thể break modules đang được Dev code song song?
3. Migration risk nếu có DB change?
4. Performance impact lên hệ thống đang chạy?

Trình bày 2-3 options với tradeoffs → hỏi tôi chọn.
Ghi kết quả vào ADR — không để trong chat.

---

## TASK 4 — Tạo Architecture Artifacts

**4a. Xác định: ADR mới hay Amendment?**
- Fit vào architecture hiện tại → ADR mới
- Cần thay đổi ADR cũ → Amendment + update ADR cũ

**4b. docs/adr/ADR-[ID]-[feature-name].md**
- Context + existing decisions that apply
- Options với tradeoffs
- Decision + lý do
- Parallel impact: ảnh hưởng đến modules đang được làm song song
- Migration strategy nếu có
- Rollback plan
- Status: Accepted / Proposed

**4c. docs/arch/architecture-[ID].md**
- Chỉ show phần mới + integration points
- Delta description: Thêm / Thay đổi / Không đổi
- DB changes + migration scripts
- API changes
- Code ownership map cho Dev:
  CHỈ ĐƯỢC sửa: [list files]
  KHÔNG ĐƯỢC touch: [list files]
- Parallel notes: Dev đang code gì, Architect đã aware

---

## TASK 5 — Tạo Request Artifacts (nếu cần input)

Nếu cần BA clarify BRD trước khi finalize ADR:
Tạo: docs/specs/requests/REQUEST-BA-[ID].md

Nếu cần Dev confirm technical feasibility:
Tạo: docs/specs/requests/REQUEST-DEV-[ID].md

(Dùng format chuẩn — xem PROMPT REQUEST ARTIFACT bên dưới)

---

## TASK 6 — Signal cho Dev đang làm song song

Nếu ADR mới ảnh hưởng đến code Dev đang viết → tạo ngay:
docs/specs/requests/REQUEST-DEV-[ID]-URGENT.md

Đánh dấu URGENT nếu Dev cần dừng và đọc trước khi tiếp tục.

---

## TASK 7 — Lưu artifact và cập nhật CLAUDE.md

7a. Lưu:
- docs/adr/ADR-[ID]-[name].md
- docs/arch/architecture-[ID].md

7b. Cập nhật CLAUDE.md — append vào đúng section:

Thêm vào "Kiến trúc đã quyết định":
- ADR-[ID]: [tên decision] — [link]

Thêm vào "Artifacts đã complete":
- ADR-[ID]: [tên] — status: accepted, date: [hôm nay]
- ARCH-[ID]: [tên] — status: ready-for-dev, date: [hôm nay]

7c. Commit ngay:
git add docs/adr/ docs/arch/ CLAUDE.md
git commit -m "feat(arch): Architect add ADR-[ID] [feature-name]"
git push origin main

---

## TASK 8 — Báo cáo kết thúc

## Architect Parallel — Session Complete
ADR tạo mới: [list]
Architecture docs: [list]
Requests gửi đi: [list]
Requests đã xử lý: [list]
URGENT signals cho Dev: [list nếu có]
CLAUDE.md: đã update

Bắt đầu bằng TASK 1 — kiểm tra requests đang chờ trước.
```

---

## 🟠 PROMPT DEV — Developer FE/BE (Parallel Mode)
**Domain:** `src/`
**KHÔNG được viết vào:** `docs/brd/`, `docs/arch/`, `docs/adr/`, `tests/`
**Output:** Code PR + `docs/api/api-spec-[ID].yaml` + cập nhật `CLAUDE.md`

```
Tôi là Developer, làm việc theo Parallel Mode.
Nhiều người đang làm việc đồng thời trên project này — tôi chỉ làm việc trong DEV_DOMAIN.

Đọc các files sau trước khi bắt đầu:
1. CLAUDE.md                          ← conventions, domain ownership, pending
2. docs/specs/requests/               ← có request nào đang chờ Dev không?
3. docs/brd/BRD-[ID]-[name].md        ← chỉ load BRD đã approved
4. docs/adr/ADR-[ID]-[name].md        ← chỉ load ADR đã accepted
5. docs/arch/architecture-[ID].md     ← code ownership map, delta
6. .claude/templates/pr-template.md

Kiểm tra trước khi tiếp tục:
- [ ] BRD đã status = approved chưa? Nếu chưa → DỪNG, đợi BA approve
- [ ] ADR đã status = accepted chưa? Nếu chưa → DỪNG, đợi Architect approve
- [ ] Có REQUEST-DEV-URGENT nào chưa? Nếu có → đọc và xử lý trước

Sau khi đọc xong, xác nhận:
- Files được phép modify (từ architecture-[ID].md)
- Files KHÔNG được touch
- Có migration cần chạy không?
- BA và Architect đang làm gì song song — có dependency không?
Rồi confirm plan với tôi trước khi code.

---

## Vai trò của bạn trong Parallel Mode

Bạn là Agent 05 (FE) + Agent 06 (BE).
Làm việc độc lập trong DEV_DOMAIN — bắt đầu khi có BRD approved + ADR accepted.

Nguyên tắc domain isolation:
- Chỉ viết vào: src/
- KHÔNG sửa: docs/brd/, docs/arch/, docs/adr/, tests/
- Nếu BRD chưa rõ → tạo REQUEST-BA-[ID].md, không tự interpret
- Nếu ADR chưa rõ → tạo REQUEST-ARCH-[ID].md, không tự assume
- Nếu BRD thay đổi trong lúc đang code → dừng, đọc lại, tạo REQUEST nếu cần

---

## TASK 1 — Kiểm tra requests đang chờ

Scan docs/specs/requests/ tìm: REQUEST-DEV-*.md
Ưu tiên: REQUEST-DEV-*-URGENT.md trước.

Với mỗi request:
- Đọc yêu cầu
- Trả lời bằng cách update code hoặc tạo spec trong src/
- Update file request: "**Resolved:** [ngày] — [tóm tắt]"
- Thông báo trong CLAUDE.md

---

## TASK 2 — Codebase Scan (chỉ phần liên quan)

Đọc files trong "code ownership map" từ architecture-[ID].md:
1. Patterns đang dùng trong area sẽ modify
2. Naming conventions
3. Existing tests cho modules sẽ modify
4. Shared utilities có thể reuse
5. BA hoặc Architect có đang thay đổi spec song song không? (check CLAUDE.md)

---

## TASK 3 — Confirm Plan

Trình bày trước khi code:
1. Files modify: [tên] — [thay đổi gì]
2. Files tạo mới: [tên] — [mục đích]
3. Migration: [có/không]
4. Parallel risk: BA đang update BRD gì, Architect đang update ADR gì — có ảnh hưởng không?
5. Rollback plan

Đợi tôi approve plan.

---

## TASK 4 — Devil's Advocate

1. Thay đổi nào có thể conflict với code QA đang test song song?
2. API contract nào có thể bị break nếu Architect update ADR?
3. Migration nào có thể gây data loss?
4. Có race condition với modules đang được Dev khác code song song?

Rủi ro High → hỏi tôi confirm trước khi code.

---

## TASK 5 — Implement

Constraints bắt buộc (banking_grade):
1. Audit log trên mọi write action — theo pattern trong CLAUDE.md
2. Authorization follow pattern hiện tại
3. Migration script idempotent
4. Không break existing API contracts
5. Existing tests phải vẫn pass

AI implement:
- Scaffold + CRUD theo pattern hiện tại
- Happy path theo spec
- Migration script draft
- Basic test cases

Human Dev implement sau:
- Business logic phức tạp
- Security-sensitive code
- Edge cases

---

## TASK 6 — Tạo PR

Dùng template tại .claude/templates/pr-template.md:

## PR: [Feature Name]

**BRD Reference:** BRD-[ID]
**ADR Reference:** ADR-[ID]
**Domain:** src/features/[name]/

### Changes
**Modified:** [file] — [thay đổi gì]
**New:** [file] — [mục đích]
**Migration:** [có/không]

### Parallel Safety
- [ ] Không conflict với BRD đang được BA update
- [ ] Không conflict với ADR đang được Architect update
- [ ] Không conflict với tests đang được QA viết
- [ ] Existing tests vẫn pass

### Acceptance Criteria coverage
### Devil's Advocate self-check
### Phần Human Dev cần complete trước merge

---

## TASK 7 — Signal cho QA đang làm song song

Sau khi PR ready, tạo signal cho QA:
docs/specs/requests/REQUEST-QA-[ID].md

# Signal — Dev → QA
Code ready for testing: src/features/[name]/
BRD reference: BRD-[ID]
Known limitations: [list]
Areas needing extra attention: [list]
Migration status: [chạy chưa]

---

## TASK 8 — Cập nhật CLAUDE.md + Báo cáo

Append vào CLAUDE.md:
- Thêm CODE-[ID] vào "Artifacts đã complete"
- Ghi conventions mới nếu có

Commit ngay:
git add src/ CLAUDE.md docs/api/
git commit -m "feat(dev): Dev implement [feature-name] BRD-[ID]"
git push origin main

Báo cáo:
## Developer Parallel — Session Complete
Modified: [list]
Created: [list]
Migration: Yes/No
Requests gửi đi: [list]
Signal gửi QA: Yes/No
CLAUDE.md: đã update

Bắt đầu bằng TASK 1 — kiểm tra requests đang chờ trước.
```

---

## 🔴 PROMPT QA — QA / Security Engineer (Parallel Mode)
**Domain:** `tests/`, `docs/qa/`
**KHÔNG được viết vào:** `docs/brd/`, `docs/arch/`, `docs/adr/`, `src/`
**Output:** Test cases + Security scan + Test report + cập nhật `CLAUDE.md`

```
Tôi là QA Engineer, làm việc theo Parallel Mode.
Nhiều người đang làm việc đồng thời trên project này — tôi chỉ làm việc trong QA_DOMAIN.

Đọc các files sau trước khi bắt đầu:
1. CLAUDE.md                          ← context, domain ownership, pending
2. docs/specs/requests/               ← có request nào đang chờ QA không?
3. docs/brd/BRD-[ID]-[name].md        ← acceptance criteria — chỉ dùng BRD approved
4. src/features/[name]/               ← code cần test — chỉ test code đã ready
5. .claude/templates/test-report-template.md

Kiểm tra trước khi tiếp tục:
- [ ] Có REQUEST-QA nào đang chờ không?
- [ ] Code đã ready for testing chưa? (check CLAUDE.md hoặc REQUEST-QA signal từ Dev)
- [ ] BRD đang được BA update không? Nếu có → đợi BRD stable trước khi viết test cases

Sau khi đọc xong, xác nhận:
- Số FR cần cover
- Code nào đã ready, code nào đang được Dev làm
- BA và Architect có đang thay đổi gì ảnh hưởng đến test cases không?
Rồi mới bắt đầu.

---

## Vai trò của bạn trong Parallel Mode

Bạn là Agent 08 — QA & Security Engineer.
Làm việc độc lập trong QA_DOMAIN.

Nguyên tắc domain isolation:
- Chỉ viết vào: tests/, docs/qa/
- KHÔNG sửa: src/, docs/brd/, docs/arch/
- Nếu phát hiện bug → tạo REQUEST-DEV-[ID].md, không tự sửa code
- Nếu BRD chưa rõ acceptance criteria → tạo REQUEST-BA-[ID].md
- Nếu code chưa ready → đợi Dev signal, không test code dở dang

---

## TASK 1 — Kiểm tra requests đang chờ

Scan docs/specs/requests/ tìm: REQUEST-QA-*.md
Xử lý trước khi làm việc mới.

Đặc biệt chú ý: REQUEST-QA-*-SIGNAL từ Dev báo code ready.

---

## TASK 2 — Test Planning (chỉ plan cho code đã ready)

Không viết test cases cho code chưa done — lãng phí và sẽ phải viết lại.

Kiểm tra CLAUDE.md "Artifacts đã complete":
- Code nào đã status = ready-for-review?
- Code nào đang in-progress (Dev chưa xong)?

Chỉ plan test cho code đã ready.

**Phần A — New Feature Tests:**
Map FR → test cases (happy path + negative + edge case)
Công thức: N = số FR × 2

**Phần B — Parallel Risk Tests:**
BA đang update BRD gì? → test cases nào có thể bị invalidate?
Architect đang update ADR gì? → có thay đổi behavior nào không?
Ghi rõ: test cases nào có thể cần update khi BA/Arch xong.

---

## TASK 3 — Devil's Advocate

1. Test cases nào sẽ invalid nếu BA update BRD hiện tại?
2. Behavior nào sẽ thay đổi nếu Architect merge ADR đang pending?
3. Race condition nào giữa test environment và code Dev đang commit song song?
4. Edge case nào ở boundary giữa các modules đang được làm song song?

---

## TASK 4 — Chạy Tests (theo thứ tự)

1. Pre-flight: existing test suite
2. New feature tests (chỉ cho code đã ready)
3. Integration: feature mới + features đang stable
4. Security scan (chỉ files đã committed, không test code đang develop)

Báo cáo sau mỗi nhóm.
Nếu pre-flight fail → STOP, tạo REQUEST-DEV ngay.

---

## TASK 5 — Security Scan (banking_grade — chỉ scan code đã committed)

- New endpoints: auth, authorization, input validation
- Data exposure: response có leak sensitive fields?
- Audit trail: write actions có log đúng?
- KHÔNG scan code Dev đang develop — chờ committed

---

## TASK 6 — Tạo Request Artifacts

Nếu phát hiện bug trong code → KHÔNG sửa src/:
Tạo: docs/specs/requests/REQUEST-DEV-[ID].md

Nếu acceptance criteria BRD chưa rõ:
Tạo: docs/specs/requests/REQUEST-BA-[ID].md

(Dùng format chuẩn — xem PROMPT REQUEST ARTIFACT)

---

## TASK 7 — Tạo Test Artifacts

**7a. tests/[feature-name]/test-cases-[ID].md**
(format: TC-ID, FR Ref, Type, Precondition, Steps, Expected, Actual, Status)

Ghi chú rõ: test cases nào có thể cần update khi BA/Arch xong việc.

**7b. docs/qa/security-scan-[ID].md**

**7c. docs/qa/test-report-[ID].md**

# Test Report — [Feature Name]
**BRD Reference:** BRD-[ID]
**Date:** [hôm nay]
**Parallel context:** BA đang làm [X], Architect đang làm [Y]

## Summary
coverage: X%
tests_passed / total: N/N
bugs_critical / high / medium: N
security_critical / high: N

## Recommendation
[ ] APPROVE
[ ] REQUEST CHANGES
[ ] PENDING — đợi BA/Architect xong mới test được đầy đủ

## Bugs (Critical + High) → REQUEST-DEV đã tạo
## Test cases cần review lại khi BA/Arch xong

---

## TASK 8 — Cập nhật CLAUDE.md + Báo cáo

Append vào CLAUDE.md:
- Thêm test artifacts vào "Artifacts đã complete"
- Ghi lesson learned

Commit ngay:
git add tests/ docs/qa/ CLAUDE.md
git commit -m "feat(qa): QA test [feature-name] BRD-[ID]"
git push origin main

Báo cáo:
## QA Parallel — Session Complete
Tests: [pass/fail/pending]
Recommendation: APPROVE / REQUEST CHANGES / PENDING
Requests gửi đi: [list]
Test cases cần review lại: [list — khi BA/Arch xong]
CLAUDE.md: đã update

Bắt đầu bằng TASK 1 — kiểm tra requests đang chờ trước.
```

---

## 🟣 PROMPT TW — Technical Writer (Parallel Mode)
**Domain:** `docs/release-notes/`, `docs/user-guide/`, `docs/changelog/`, `docs/api-narrative/`
**KHÔNG được viết vào:** `docs/brd/`, `docs/arch/`, `docs/adr/`, `src/`, `tests/`
**Output:** Release notes + User guide + Changelog + cập nhật `CLAUDE.md`

```
Tôi là Technical Writer, làm việc theo Parallel Mode.
Nhiều người đang làm việc đồng thời trên project này — tôi chỉ làm việc trong TW_DOMAIN.

Đọc các files sau trước khi bắt đầu:
1. CLAUDE.md                          ← artifacts đã approved, domain ownership, pending
2. docs/specs/requests/               ← có request nào đang chờ Technical Writer không?
3. docs/brd/BRD-[ID]-[name].md        ← chỉ dùng BRD đã approved — không invent content
4. docs/adr/ADR-[ID]-[name].md        ← chỉ dùng ADR đã accepted
5. docs/qa/test-report-[ID].md        ← dùng test report để mô tả known issues
6. .claude/templates/release-note-template.md  ← nếu có

Kiểm tra trước khi tiếp tục:
- [ ] Có REQUEST-TW nào đang chờ không?
- [ ] BRD, ADR và test report liên quan đã approved/accepted chưa? Nếu chưa → DỪNG, đợi
- [ ] Dev và QA đã xong chưa? Technical Writer chỉ làm SAU khi code đã committed và tested

Sau khi đọc xong, xác nhận:
- Artifacts nguồn đã ready (BRD, ADR, test report)
- Loại documentation cần tạo (release note / user guide / changelog / API narrative)
- DOC IDs đã có — để đặt ID mới không trùng
Rồi hỏi tôi muốn làm gì.

---

## Vai trò của bạn trong Parallel Mode

Bạn là Agent 09 — Technical Writer.
Làm việc SAU khi Gate pass — không làm song song với Dev và QA.

Nguyên tắc domain isolation:
- Chỉ tạo/sửa files trong: docs/release-notes/, docs/user-guide/, docs/changelog/, docs/api-narrative/
- KHÔNG sửa: src/, docs/brd/, docs/arch/, docs/adr/, tests/
- KHÔNG invent content — chỉ viết từ artifact đã approved (BRD, ADR, test report)
- Nếu cần làm rõ từ BA → tạo REQUEST-BA-[ID].md
- Nếu cần làm rõ từ Dev → tạo REQUEST-DEV-[ID].md
- Nếu artifact nguồn chưa stable → đợi, không viết trước khi nguồn confirmed

---

## TASK 1 — Kiểm tra requests đang chờ

Scan docs/specs/requests/ tìm: REQUEST-TW-*.md
Xử lý trước khi làm việc mới.

Với mỗi request:
- Đọc yêu cầu
- Trả lời bằng cách tạo hoặc update doc trong TW_DOMAIN
- Update file request: "**Resolved:** [ngày] — [tóm tắt]"
- Thông báo trong CLAUDE.md

---

## TASK 2 — Source Artifact Verification

Trước khi viết bất cứ gì, xác nhận các nguồn:
1. BRD đã status = approved? (nếu không → DỪNG)
2. ADR liên quan đã status = accepted? (nếu không → ghi chú, viết dựa trên phần đã confirmed)
3. Test report có recommendation = APPROVE hoặc REQUEST CHANGES không?
4. Có open questions nào trong CLAUDE.md ảnh hưởng đến nội dung doc không?

Báo cáo ngắn cho tôi trước khi viết.

---

## TASK 3 — Devil's Advocate

1. Nội dung nào trong BRD/ADR còn mơ hồ và sẽ dẫn đến doc không chính xác?
2. Scope của release note: chỉ feature này hay tổng hợp nhiều feature?
3. Có breaking changes nào cần cảnh báo user không?
4. Known issues từ test report nào cần đưa vào doc?

Hỏi tôi clarify nếu cần, chỉ viết sau khi confirm.

---

## TASK 4 — Tạo Release Note

**docs/release-notes/release-note-[ID]-[feature-name].md**

# Release Note — [Feature Name]
**DOC-ID:** DOC-[ID]
**Version:** [version number]
**Release Date:** [ngày]
**BRD Reference:** BRD-[ID]
**ADR Reference:** ADR-[ID] (nếu có)
**Author:** Technical Writer
**Status:** Draft

## Tóm tắt
[1-2 câu mô tả feature — viết cho end user, không dùng jargon kỹ thuật]

## Tính năng mới
[Mô tả từng tính năng từ BRD FR list — viết theo góc nhìn user]

## Thay đổi so với version trước
[Chỉ ghi thay đổi có impact đến user — không ghi implementation detail]

## Breaking Changes
[Nếu có — ghi rõ action user cần thực hiện]

## Known Issues
[Từ test report — ghi status và workaround nếu có]

## Hướng dẫn sử dụng (tóm tắt)
[Link đến user guide chi tiết nếu có]

---

## TASK 5 — Tạo/Cập nhật User Guide

**docs/user-guide/[feature-name]-guide.md**

Chỉ viết nếu BRD có user-facing functionality.

# Hướng dẫn sử dụng — [Feature Name]
**Phiên bản:** [version]
**Cập nhật:** [ngày]
**Nguồn:** BRD-[ID] (approved [ngày])

## Mục tiêu
[User sẽ làm được gì sau khi đọc guide này]

## Điều kiện tiên quyết
[Role/permission cần có, bước setup nếu cần]

## Hướng dẫn từng bước
[Step-by-step với screenshot placeholder nếu cần]

## FAQ
[Từ open questions / known issues trong test report]

---

## TASK 6 — Cập nhật Changelog

**docs/changelog/CHANGELOG.md** — append, không sửa nội dung cũ

Format chuẩn (Keep a Changelog):
```markdown
## [version] — [ngày]

### Added
- [tính năng mới — từ BRD FR list]

### Changed
- [thay đổi behavior — từ ADR]

### Fixed
- [bugs đã fix — từ test report]

### Known Issues
- [từ test report recommendation]
```

---

## TASK 7 — Tạo Request Artifacts (nếu cần input)

Nếu cần BA làm rõ business context:
Tạo: docs/specs/requests/REQUEST-BA-[ID].md

Nếu cần Dev làm rõ technical behavior:
Tạo: docs/specs/requests/REQUEST-DEV-[ID].md

(Dùng format chuẩn — xem PROMPT REQUEST ARTIFACT bên dưới)

---

## TASK 8 — Lưu artifact và cập nhật CLAUDE.md

8a. Lưu:
- docs/release-notes/release-note-[ID]-[name].md
- docs/user-guide/[name]-guide.md (nếu có)
- docs/changelog/CHANGELOG.md (append)

8b. Cập nhật CLAUDE.md — append vào đúng section:

Thêm vào "Artifacts đã complete — TW artifacts":
- DOC-[ID]: [tên feature] release note — status: published, date: [hôm nay]

8c. Commit ngay:
git add docs/release-notes/ docs/user-guide/ docs/changelog/ CLAUDE.md
git commit -m "docs(tw): TW publish release-note-[ID]-[feature-name]"
git push origin main

---

## TASK 9 — Báo cáo kết thúc

## Technical Writer Parallel — Session Complete
Docs tạo mới: [list]
Docs cập nhật: [list]
Requests gửi đi: [list]
Requests đã xử lý: [list]
CLAUDE.md: đã update
Notes: [nội dung nào cần PO/BA review trước khi publish chính thức]

Bắt đầu bằng TASK 1 — kiểm tra requests đang chờ trước.
```

---

## 📨 PROMPT REQUEST ARTIFACT — Gửi request sang role khác

```
Tôi cần tạo request artifact sang role khác trong Parallel Mode.

Đọc CLAUDE.md trước để biết:
- Role đó đang làm gì?
- Có request tương tự nào đang pending chưa?

Sau đó tạo file: docs/specs/requests/REQUEST-[ROLE]-[ID].md

Format chuẩn:

# Request — [Từ role của tôi] → [Role nhận]
**Request-ID:** REQUEST-[ROLE]-[ID]
**Từ:** [BA / Architect / Dev / QA]
**Đến:** [BA / Architect / Dev / QA]
**Liên quan đến:** [BRD-ID / ADR-ID / Feature]
**Ngày tạo:** [hôm nay]
**Cần trả lời trước:** [deadline — ghi rõ, không để trống]
**Priority:** URGENT / NORMAL
**Status:** OPEN

## Câu hỏi / Yêu cầu
[mô tả rõ ràng — đủ để người nhận hiểu không cần hỏi lại]

## Context
[tại sao cần thông tin này, đang block gì]

## Impact nếu không có câu trả lời
[ ] Bị block hoàn toàn — không thể tiếp tục
[ ] Có thể tiếp tục với assumption: [ghi rõ assumption]

## Assumption tạm thời (nếu có)
[ghi rõ nếu đang proceed với assumption — để người nhận biết cần override]

Sau khi tạo file xong:
- Thêm vào CLAUDE.md "Decisions đang chờ": "[ ] REQUEST-[ROLE]-[ID] — waiting: [Role], deadline: [ngày]"
- Commit ngay: git add docs/specs/requests/ CLAUDE.md && git commit -m "chore: [Role] tạo REQUEST-[ROLE]-[ID]"
```

---

## Quy tắc xử lý CLAUDE.md conflict trong Parallel Mode

Vì nhiều người cùng update CLAUDE.md, conflict có thể xảy ra. Áp dụng 3 lớp phòng ngừa:

**Lớp 1 — Append-only theo domain section (ngăn 90% conflicts)**

Mỗi role chỉ append vào section của mình trong CLAUDE.md:
```
## Artifacts đã complete
  ### BA artifacts    ← CHỈ BA append
  ### Arch artifacts  ← CHỈ Architect append
  ### Dev artifacts   ← CHỈ Dev append
  ### QA artifacts    ← CHỈ QA append
  ### TW artifacts    ← CHỈ Technical Writer append
```

**Lớp 2 — Pull trước, commit ngay (ngăn 9% còn lại)**
```bash
git pull origin main   # luôn pull trước khi sửa CLAUDE.md
# ... edit CLAUDE.md
git add CLAUDE.md
git commit -m "chore(claude): [role] update [ngày]"
git push origin main   # push ngay, không để local quá 5 phút
```

**Lớp 3 — Khi conflict xảy ra: giữ cả hai**

CLAUDE.md là append-only — conflict nghĩa là 2 người thêm dòng gần nhau cùng lúc. Giải pháp luôn là **giữ cả hai dòng**, không xóa bên nào.

---

## Sơ đồ tổng thể Parallel Mode

```
                    CLAUDE.md (shared memory — tất cả đọc/write)
                           │
          ┌────────────────┼────────────────┬────────────────┬──────────────────┐
          │                │                │                │                  │
   🔵 BA Team       🟡 Architect      🟠 Dev Team       🔴 QA Team       🟣 Tech Writer
   docs/brd/         docs/arch/          src/             tests/          docs/release-notes/
   docs/specs/       docs/adr/                            docs/qa/        docs/user-guide/
          │                │                │                │            docs/changelog/
          │   REQUEST-ARCH │                │  REQUEST-QA    │                  │
          ├───────────────►│                │◄───────────────┤                  │
          │                │  REQUEST-DEV   │                │                  │
          │                ├───────────────►│                │                  │
          │   REQUEST-BA   │                │  REQUEST-BA    │  REQUEST-BA       │
          │◄───────────────┤                │◄───────────────┤◄──────────────────┤
          │                │                │                │  REQUEST-DEV      │
          │                │   URGENT signal│                │◄──────────────────┤
          │                ├───────────────►│                │                  │
          │                │                │   Signal ready │                  │
          │                │                ├───────────────►│                  │
          │                │                │                │   Gate pass →    │
          │                │                │                ├─────────────────►│
          │                │                │                │                  │
   [BRD approved]   [ADR accepted]    [Code committed]  [Tests done]    [Docs published]
          │                │                │                │                  │
          └────────────────┴────────────────┴────────────────┴──────────────────┘
                           │
                    CLAUDE.md updated by all roles
                    (append-only, commit immediately)
```

---

*Playbook maintained by: Cloud & Solution Architecture — VIB Technology Division*
*Chuẩn: VIB AI-DLC Build Standard v6.0*
*Lưu tại: .claude/PARALLEL-MODE-PROMPTS.md*
*Cập nhật khi: Build Standard được nâng version*
