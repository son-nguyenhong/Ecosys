# CLAUDE.md — ADO Integration Agent

## Project context
- **Org**: vib-lz-devops
- **Project**: B05-BTS-CTS (Azure DevOps)
- **MCP Server**: `ecosys-mcpado` (running via stdio)

---

## Automatic ADO sync rules

**Always follow these rules when working on tasks:**

### 1. Session start
When a new session begins:
1. Call `ado_get_my_tasks` to load open tasks for this role.
2. Summarize what is in progress before starting any work.

### 2. Before working on a task
- Call `ado_get_work_item { id }` to read the full description and acceptance criteria.
- Do NOT proceed if state is `Done` or `Closed`.

### 3. After completing work on a task
Always call `ado_complete_task` with:
- `id`: the work item ID
- `output`: a summary of what was done (2–5 sentences, include file names/changes if relevant)

This automatically: sets state → Done + posts Claude's output as a comment.

### 4. When creating sub-tasks
Use `ado_create_work_item` with:
- `type`: "Task"
- `parentId`: the parent User Story ID
- `tags`: include `agent:dev` (or role) so it appears in future `ado_get_my_tasks` calls

### 5. Progress updates (long tasks)
For tasks taking multiple steps, call `ado_add_comment` after each major milestone rather than waiting until the end.

---

## Role → Agent mapping

| ADO User / Tag | Agent role | Scope |
|---|---|---|
| tag: `agent:pm` | PM Agent | Epics, Features, Sprint planning |
| tag: `agent:dev` | Dev Agent | Tasks, PRs, implementation |
| tag: `agent:qa` | QA Agent | Bugs, test cases, validation |
| tag: `agent:ba` | BA Agent | User Stories, acceptance criteria |

To assign a task to an agent: add the appropriate tag when creating/updating work items.

---

## Available ADO tools

| Tool | When to use |
|---|---|
| `ado_get_my_tasks` | Session start — load my open tasks |
| `ado_get_work_item` | Read task details before starting |
| `ado_search_work_items` | Find related tasks by keyword/state/type |
| `ado_update_work_item` | Update title/state/description/assignee mid-task |
| `ado_add_comment` | Post progress notes or partial output |
| `ado_complete_task` | Mark Done + attach final output |
| `ado_create_work_item` | Create sub-tasks or bugs discovered during work |
| `ado_list_sprints` | Check current sprint scope |

---

## Example workflow

```
User: "Work on my dev tasks for today"

Claude:
1. ado_get_my_tasks { role: "dev" }
   → finds Task #1042 "Build payroll export API endpoint"

2. ado_get_work_item { id: 1042 }
   → reads description, acceptance criteria

3. [Claude implements the feature]

4. ado_add_comment { id: 1042, text: "Implemented POST /api/payroll/export — returns CSV stream. Tests passing." }

5. ado_complete_task { id: 1042, output: "Created FastAPI endpoint /api/payroll/export with streaming CSV response. Unit tests in test_payroll_export.py cover happy path + empty period edge case." }
   → Task #1042 state = Done, comment posted
```
