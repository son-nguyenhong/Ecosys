# ADO MCP Server — VIB Claude Code Integration

> **Tự động sync Claude Code output ↔ Azure DevOps Work Items**
> Dự án: `vib-lz-devops / B05-BTS-CTS`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Cài đặt](#3-cài-đặt)
4. [Cấu hình & Xác thực](#4-cấu-hình--xác-thực)
5. [Tích hợp với Claude Code](#5-tích-hợp-với-claude-code)
6. [Cấu trúc CLAUDE.md](#6-cấu-trúc-claudemd)
7. [Danh sách Tools](#7-danh-sách-tools)
8. [Role & Agent Mapping](#8-role--agent-mapping)
9. [Workflow mẫu](#9-workflow-mẫu)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Tổng quan

```
┌─────────────────┐        MCP (stdio)        ┌──────────────────┐
│   Claude Code   │ ◄─────────────────────── │  ADO MCP Server  │
│  (Claude agent) │ ─────────────────────── ► │   (index.js)     │
└─────────────────┘    tools: get/update/      └────────┬─────────┘
        │               create/comment                  │
        │                                               │ REST API
        ▼                                               ▼
  CLAUDE.md rules                            Azure DevOps
  (auto sync policy)                         B05-BTS-CTS
```

**Vấn đề giải quyết:** Khi team dùng Claude Code để implement task, output (code, phân tích, quyết định) bị mất sau session. MCP server này giúp Claude **tự động**:

- Đọc task từ ADO trước khi bắt đầu làm
- Post output/summary lên ADO comment khi hoàn thành
- Cập nhật trạng thái work item (Active → Done)
- Tạo sub-task, bug report trực tiếp từ conversation

---

## 2. Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| Node.js | ≥ 18.0 | Bắt buộc |
| npm | ≥ 8.0 | Bắt buộc |
| Claude Code | latest | Bắt buộc |
| Azure CLI (`az`) | ≥ 2.50 | Tuỳ chọn — dùng thay PAT |
| ADO PAT scope | Work Items: Read & Write | Tuỳ chọn — nếu không dùng Azure CLI |

---

## 3. Cài đặt

```bash
# 1. Clone hoặc copy thư mục ado-mcp về máy
cd ado-mcp

# 2. Cài dependencies
npm install

# 3. Tạo file .env từ template
cp .env.example .env
```

Sau bước 3, mở `.env` và điền thông tin:

**Dùng Azure CLI (không cần PAT):**
```env
ADO_ORG=vib-lz-devops
ADO_PROJECT=B05-BTS-CTS
ADO_EMAIL=ten.ho@vib.com.vn
ADO_AGENT_ROLE=dev
```

**Dùng PAT truyền thống:**
```env
ADO_ORG=vib-lz-devops
ADO_PROJECT=B05-BTS-CTS
ADO_PAT=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADO_EMAIL=ten.ho@vib.com.vn
ADO_AGENT_ROLE=dev
```

---

## 4. Cấu hình & Xác thực

Server hỗ trợ **2 phương thức xác thực**, ưu tiên theo thứ tự:

```
1. ADO_PAT (Personal Access Token)  →  nếu được cấu hình
2. Azure CLI Bearer Token           →  tự động, không cần PAT
```

---

### 4.1 Phương thức A — Azure CLI (Khuyến nghị)

Không cần tạo hay gia hạn PAT. Dùng session đăng nhập Azure hiện tại (cùng account với browser ADO).

```bash
# Cài Azure CLI (một lần)
winget install Microsoft.AzureCLI

# Đăng nhập (mở browser, đăng nhập bình thường)
az login

# Kiểm tra — lấy token thành công là xong
az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv
```

Sau khi `az login`, để `ADO_PAT` **trống hoặc không khai báo** — server tự lấy Bearer token mỗi phiên.

> Token Azure CLI có hiệu lực ~1 giờ. Server tự làm mới mỗi lần khởi động, không cần thao tác thủ công.

---

### 4.2 Phương thức B — Personal Access Token (PAT)

Dùng khi không cài Azure CLI hoặc môi trường không hỗ trợ browser login.

1. Đăng nhập `https://dev.azure.com/vib-lz-devops`
2. Click avatar (góc trên phải) → **Personal Access Tokens**
3. **New Token** → đặt tên `claude-mcp`
4. Expiration: 90 ngày (hoặc custom)
5. Scope — chọn **Custom defined**, tick:
   - ✅ Work Items → **Read & Write**
6. Copy token, dán vào `ADO_PAT` trong file `.env`

> ⚠️ Token chỉ hiển thị 1 lần. Lưu ngay vào `.env`.

---

### 4.3 Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `ADO_ORG` | ✅ | Tên Azure DevOps organization |
| `ADO_PROJECT` | ✅ | Tên project |
| `ADO_PAT` | Tuỳ chọn | Personal Access Token — bỏ trống nếu dùng Azure CLI |
| `ADO_EMAIL` | Khuyến nghị | Email ADO để lọc task theo assignee |
| `ADO_AGENT_ROLE` | Khuyến nghị | Role mặc định: `pm` \| `dev` \| `qa` \| `ba` |

---

## 5. Tích hợp với Claude Code

### 5.1 Add MCP server

**Cách 1 — Dùng CLI (đơn giản nhất):**

```bash
# Dùng Azure CLI (không cần PAT)
claude mcp add ado-mcp node /đường/dẫn/tuyệt/đối/ado-mcp/index.js \
  --env ADO_ORG=vib-lz-devops \
  --env ADO_PROJECT=B05-BTS-CTS \
  --env ADO_EMAIL=ten.ho@vib.com.vn \
  --env ADO_AGENT_ROLE=dev

# Dùng PAT
claude mcp add ado-mcp node /đường/dẫn/tuyệt/đối/ado-mcp/index.js \
  --env ADO_ORG=vib-lz-devops \
  --env ADO_PROJECT=B05-BTS-CTS \
  --env ADO_PAT=your_pat \
  --env ADO_EMAIL=ten.ho@vib.com.vn \
  --env ADO_AGENT_ROLE=dev
```

**Cách 2 — Edit config file thủ công:**

Mở (hoặc tạo) file `~/.claude.json`, thêm block `mcpServers`:

```json
{
  "mcpServers": {
    "ado-mcp": {
      "command": "node",
      "args": ["/đường/dẫn/tuyệt/đối/ado-mcp/index.js"],
      "env": {
        "ADO_ORG":        "vib-lz-devops",
        "ADO_PROJECT":    "B05-BTS-CTS",
        "ADO_EMAIL":      "ten.ho@vib.com.vn",
        "ADO_AGENT_ROLE": "dev"
      }
    }
  }
}
```

> 💡 Mỗi team member chỉ cần thay `ADO_EMAIL` và `ADO_AGENT_ROLE`. Nếu dùng PAT, thêm `"ADO_PAT": "pat_của_từng_người"`.

### 5.2 Kiểm tra kết nối

```bash
# Khởi động Claude Code trong thư mục project
claude

# Trong Claude Code, thử:
# "List my open tasks"
# → Claude sẽ tự gọi ado_get_my_tasks và hiển thị danh sách
```

### 5.3 Copy CLAUDE.md vào project

```bash
# Copy CLAUDE.md vào root của project repo
cp ado-mcp/CLAUDE.md /đường/dẫn/project-repo/CLAUDE.md
```

Claude Code tự động đọc `CLAUDE.md` khi start session trong thư mục đó.

---

## 6. Cấu trúc CLAUDE.md

`CLAUDE.md` là file hướng dẫn cho Claude Code — định nghĩa **khi nào** và **làm gì** với ADO.

```
CLAUDE.md
├── Session start rules     → tự động load tasks khi mở session
├── Before working rules    → đọc task details trước khi làm
├── After completing rules  → tự động complete task + post output
├── Sub-task creation rules → tạo task con với đúng tags
├── Progress update rules   → post comment sau mỗi milestone
└── Tool reference table    → danh sách tools và khi nào dùng
```

**Tuỳ chỉnh cho từng role:** Thêm hoặc bỏ rules trong CLAUDE.md theo nhu cầu team. Ví dụ, QA agent có thể thêm rule:

```markdown
### QA-specific rules
- After finding a bug: always call `ado_create_work_item` (type: Bug)
  with `parentId` = User Story ID being tested
- Set bug severity in tags: `severity:high` | `severity:medium` | `severity:low`
```

---

## 7. Danh sách Tools

Claude Code có thể gọi các tools sau tự động:

### `ado_get_my_tasks`
Lấy danh sách task đang mở của role hiện tại.

```
Input:  { role: "dev" }   // optional, mặc định dùng ADO_AGENT_ROLE
Output: Danh sách work items với title, state, URL
```

Lọc theo:
- `ADO_EMAIL` (nếu có) → task được assign cho email đó
- Tag `agent:dev` / `agent:pm` / `agent:qa` / `agent:ba` (nếu không có email)

---

### `ado_get_work_item`
Đọc chi tiết một work item.

```
Input:  { id: 1042 }
Output: Title, state, description, acceptance criteria, sprint, URL
```

---

### `ado_search_work_items`
Tìm kiếm work items theo keyword, state, hoặc type.

```
Input:  { keyword: "payroll export", state: "Active", type: "Task" }
Input:  { wiql: "SELECT ... FROM WorkItems WHERE ..." }   // WIQL nâng cao
Output: Tối đa 20 work items khớp
```

---

### `ado_update_work_item`
Cập nhật fields trên work item.

```
Input: {
  id: 1042,
  state: "Active",
  description: "...",
  assignedTo: "ten.ho@vib.com.vn",
  tags: "agent:dev;sprint3",
  storyPoints: 3
}
```

Fields hỗ trợ: `title`, `state`, `description`, `assignedTo`, `tags`, `iterationPath`, `storyPoints`, `priority`, `acceptanceCriteria`.

---

### `ado_add_comment`
Thêm comment vào work item (không thay đổi state).

```
Input: {
  id: 1042,
  text: "Đã implement endpoint /api/payroll/export. Cần review trước khi merge."
}
```

Dùng để: post progress update, đặt câu hỏi, ghi chú mid-task.

---

### `ado_complete_task`
Đánh dấu Done + post output của Claude làm comment. **Tool quan trọng nhất.**

```
Input: {
  id: 1042,
  output: "Tóm tắt những gì đã làm...",
  state: "Done"   // optional, mặc định "Done"
}
```

Thực hiện 2 bước nguyên tử: (1) update state → Done, (2) add comment với timestamp.

---

### `ado_create_work_item`
Tạo work item mới.

```
Input: {
  type: "Task",
  title: "Viết unit test cho PayrollExportService",
  parentId: 1040,
  tags: "agent:qa;sprint3",
  assignedTo: "qa.member@vib.com.vn",
  storyPoints: 2
}
```

Types: `Task` | `User Story` | `Bug` | `Feature` | `Epic`.

---

### `ado_list_sprints`
Liệt kê các sprint của project.

```
Input:  { teamName: "B05-BTS-CTS Team" }   // optional
Output: Tên sprint, ngày bắt đầu/kết thúc, sprint hiện tại được đánh dấu
```

---

## 8. Role & Agent Mapping

### Tag convention trên ADO

Khi tạo/cập nhật work item, thêm tag theo role để `ado_get_my_tasks` lọc đúng:

| Tag | Claude agent | Phụ trách |
|---|---|---|
| `agent:pm` | PM Agent | Epic, Feature, Sprint planning, roadmap |
| `agent:dev` | Dev Agent | Task, implementation, PR, branch |
| `agent:qa` | QA Agent | Bug, test case, validation report |
| `agent:ba` | BA Agent | User Story, acceptance criteria, analysis |

### Setup cho từng team member

**Dùng Azure CLI (khuyến nghị — không cần PAT):**
```json
"ADO_EMAIL":      "email_của_từng_người@vib.com.vn",
"ADO_AGENT_ROLE": "dev"
```
Mỗi người chạy `az login` một lần trên máy của mình — token tự động refresh.

**Dùng PAT:**
```json
"ADO_PAT":        "pat_của_từng_người",
"ADO_EMAIL":      "email_của_từng_người@vib.com.vn",
"ADO_AGENT_ROLE": "dev"
```

---

## 9. Workflow mẫu

### Dev Agent — Implement một Task

```
1. Mở Claude Code trong thư mục project
   → Claude đọc CLAUDE.md, tự gọi ado_get_my_tasks { role: "dev" }
   → Hiển thị: "Bạn có 3 task đang mở: #1042, #1055, #1061"

2. User: "Làm task #1042"
   → Claude gọi ado_get_work_item { id: 1042 }
   → Đọc description + acceptance criteria

3. Claude implement feature
   → Viết code, tạo file, chạy test...

4. Milestone giữa chừng (nếu task lớn):
   → Claude gọi ado_add_comment { id: 1042, text: "Đã xong phần API endpoint, đang viết test..." }

5. Hoàn thành:
   → Claude gọi ado_complete_task {
       id: 1042,
       output: "Implemented POST /api/payroll/export. Files: src/api/payroll.py, tests/test_payroll_export.py. Coverage: 87%."
     }
   → ADO: Task #1042 → Done, comment được post tự động
```

---

### PM Agent — Tạo Sprint tasks từ Feature

```
User: "Break down Feature #980 thành tasks cho sprint này"

→ Claude gọi ado_get_work_item { id: 980 }
→ Claude gọi ado_list_sprints để biết sprint hiện tại
→ Claude phân tích và tạo:
   ado_create_work_item { type: "Task", title: "Design API schema", parentId: 980, tags: "agent:ba;sprint5", storyPoints: 2 }
   ado_create_work_item { type: "Task", title: "Implement endpoints", parentId: 980, tags: "agent:dev;sprint5", storyPoints: 5 }
   ado_create_work_item { type: "Task", title: "Write test cases", parentId: 980, tags: "agent:qa;sprint5", storyPoints: 3 }
→ Tổng 3 tasks được tạo, linked vào Feature #980
```

---

### QA Agent — Report bug trong quá trình test

```
User: "Test User Story #1035"

→ Claude gọi ado_get_work_item { id: 1035 }
→ Claude chạy test, phát hiện bug

→ Claude gọi ado_create_work_item {
    type: "Bug",
    title: "Export CSV bị lỗi encoding với ký tự tiếng Việt",
    parentId: 1035,
    tags: "agent:dev;severity:high",
    description: "Steps to reproduce: ...\nExpected: ...\nActual: ..."
  }
→ Bug #1088 được tạo, assign về cho Dev agent
```

---

## 10. Troubleshooting

### ❌ `ADO API Error 401: Unauthorized`

**Nếu dùng Azure CLI:**
```bash
# Kiểm tra đã login chưa
az account show

# Đăng nhập lại nếu session hết hạn
az login

# Test lấy token trực tiếp
az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv
```

**Nếu dùng PAT:**
1. Kiểm tra `.env` → `ADO_PAT`
2. Tạo PAT mới trên ADO nếu hết hạn
3. Đảm bảo scope PAT có **Work Items: Read & Write**

---

### ❌ `[ADO-MCP] WARNING: No ADO_PAT and Azure CLI token unavailable`

**Nguyên nhân:** `ADO_PAT` trống và `az` chưa cài hoặc chưa login.

**Fix:**
```bash
# Cài Azure CLI
winget install Microsoft.AzureCLI

# Đăng nhập
az login
```

---

### ❌ `ADO API Error 404: Project not found`

**Nguyên nhân:** `ADO_ORG` hoặc `ADO_PROJECT` sai.

**Fix:**
- Kiểm tra URL ADO: `https://dev.azure.com/{ADO_ORG}/{ADO_PROJECT}`
- Tên project phân biệt hoa/thường: `B05-BTS-CTS` ≠ `b05-bts-cts`

---

### ❌ `ado_get_my_tasks` trả về rỗng

**Nguyên nhân:** Không có task nào match filter.

**Fix:**
1. Nếu dùng `ADO_EMAIL`: kiểm tra email có đúng với ADO user không
2. Nếu dùng tags: đảm bảo work items trên ADO có tag `agent:dev` (hoặc role tương ứng)
3. Thử search rộng hơn: `ado_search_work_items { type: "Task", state: "Active" }`

---

### ❌ MCP server không load trong Claude Code

**Fix:**
```bash
# Kiểm tra path trong config có đúng không
node /đường/dẫn/tuyệt/đối/ado-mcp/index.js
# → Phải thấy: "[ADO-MCP] Server running on stdio"

# Kiểm tra Claude Code nhận MCP
claude mcp list
# → phải thấy "ado-mcp" trong danh sách
```

---

### ❌ Comment post lên ADO bị lỗi HTML

**Nguyên nhân:** ADO API comment dùng HTML, không phải Markdown.

**Fix:** MCP server đã tự convert `\n` → `<br>`. Nếu vẫn lỗi, kiểm tra version API:
- Comment API cần `api-version: 7.1-preview.3`
- File `index.js` đã hardcode đúng version này.

---

## Cấu trúc thư mục

```
ado-mcp/
├── index.js                 # MCP Server chính
├── package.json             # Dependencies
├── .env.example             # Template cấu hình
├── .env                     # Cấu hình thực (KHÔNG commit lên git)
├── CLAUDE.md                # Rules cho Claude Code agent
├── claude_code_config.json  # Config mẫu cho Claude Code
└── README.md                # File này
```

> ⚠️ **Quan trọng:** Thêm `.env` vào `.gitignore`. Không bao giờ commit PAT lên repository.

```bash
echo ".env" >> .gitignore
```
