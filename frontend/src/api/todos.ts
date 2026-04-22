/**
 * To-do List API client — proxy via /api/ppg → :8001
 * Prefix: /api/v1/todos
 */

const BASE = '/api/ppg/api/v1/todos'

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) { sessionStorage.removeItem('access_token'); window.location.href = '/login' }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail))
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TodoStatus   = 'todo' | 'in_progress' | 'pending' | 'done' | 'cancelled'
export type TodoPriority = 'critical' | 'high' | 'medium' | 'low'
export type TodoType     = 'feature' | 'bug' | 'review' | 'meeting' | 'documentation' | 'deployment' | 'other'

export interface Todo {
  id:            string
  project_id:    string | null
  project_name?: string
  title:         string
  description:   string | null
  task_type:     TodoType
  status:        TodoStatus
  priority:      TodoPriority
  assignee_id:   string | null
  created_by:    string | null
  due_date:      string | null
  milestone_id:  string | null
  parent_id:     string | null
  ref_type:      string | null
  ref_id:        string | null
  tags:          string[]
  sort_order:    number
  recurrence:    TodoRecurrence | null
  completed_at:  string | null
  created_at:    string
  updated_at:    string
  subtask_count?: number
  comment_count?: number
  subtasks?:     Todo[]
  watchers?:     TodoWatcher[]
  activity?:     TodoActivity[]
}

export interface TodoRecurrence {
  pattern:     'daily' | 'weekly' | 'monthly' | 'custom'
  interval?:   number
  day_of_week?: number   // 0=Mon … 6=Sun
  day_of_month?: number
  end_date?:   string
}

export interface TodoWatcher {
  user_id:  string
  added_at: string
}

export interface TodoActivity {
  id:         string
  todo_id:    string
  actor:      string
  action:     string
  old_value:  string | null
  new_value:  string | null
  created_at: string
}

export interface TodoComment {
  id:         string
  todo_id:    string
  author:     string
  content:    string
  created_at: string
  updated_at: string
}

export interface TodoCreate {
  title:        string
  description?: string
  project_id?:  string
  task_type?:   TodoType
  priority?:    TodoPriority
  assignee_id?: string
  due_date?:    string
  milestone_id?: string
  parent_id?:   string
  ref_type?:    string
  ref_id?:      string
  tags?:        string[]
  sort_order?:  number
  recurrence?:  TodoRecurrence
}

export interface TodoUpdate {
  title?:        string
  description?:  string
  task_type?:    TodoType
  priority?:     TodoPriority
  assignee_id?:  string | null
  due_date?:     string | null
  milestone_id?: string | null
  ref_type?:     string | null
  ref_id?:       string | null
  tags?:         string[]
  sort_order?:   number
  recurrence?:   TodoRecurrence | null
}

export interface TodoListFilter {
  project_id?:   string
  assignee_id?:  string
  status?:       string            // single or comma-separated
  priority?:     TodoPriority
  task_type?:    TodoType
  milestone_id?: string
  parent_id?:    string            // 'root' for top-level only
  overdue?:      boolean
  due_from?:     string
  due_to?:       string
  search?:       string
  page?:         number
  size?:         number
}

export interface ListMeta { total: number; page: number; size: number }
export interface ListResp<T> { data: T[]; meta: ListMeta }
export interface SingleResp<T> { data: T }

export interface TodoStats {
  by_status:     Record<TodoStatus, number>
  by_priority:   Record<TodoPriority, number>
  overdue_count: number
  due_today:     number
  total_open:    number
  workload: { assignee_id: string; open_count: number; done_count: number; overdue_count: number }[]
}

// ── API functions ─────────────────────────────────────────────────────────────

export function listTodos(filter?: TodoListFilter): Promise<ListResp<Todo>> {
  const p = new URLSearchParams()
  if (filter?.project_id)   p.set('project_id',   filter.project_id)
  if (filter?.assignee_id)  p.set('assignee_id',  filter.assignee_id)
  if (filter?.status)       p.set('status',        filter.status)
  if (filter?.priority)     p.set('priority',      filter.priority)
  if (filter?.task_type)    p.set('task_type',     filter.task_type)
  if (filter?.milestone_id) p.set('milestone_id',  filter.milestone_id)
  if (filter?.parent_id)    p.set('parent_id',     filter.parent_id)
  if (filter?.overdue)      p.set('overdue',       'true')
  if (filter?.due_from)     p.set('due_from',      filter.due_from)
  if (filter?.due_to)       p.set('due_to',        filter.due_to)
  if (filter?.search)       p.set('search',        filter.search)
  if (filter?.page)         p.set('page',          String(filter.page))
  if (filter?.size)         p.set('size',          String(filter.size))
  const qs = p.toString()
  return req<ListResp<Todo>>('GET', qs ? `?${qs}` : '')
}

export function getTodo(id: string): Promise<SingleResp<Todo>> {
  return req<SingleResp<Todo>>('GET', `/${id}`)
}

export function createTodo(data: TodoCreate): Promise<SingleResp<Todo>> {
  return req<SingleResp<Todo>>('POST', '', data)
}

export function updateTodo(id: string, data: TodoUpdate): Promise<SingleResp<Todo>> {
  return req<SingleResp<Todo>>('PUT', `/${id}`, data)
}

export function deleteTodo(id: string): Promise<void> {
  return req<void>('DELETE', `/${id}`)
}

export function setTodoStatus(id: string, status: TodoStatus, notes?: string): Promise<SingleResp<Todo>> {
  return req<SingleResp<Todo>>('POST', `/${id}/status`, { status, notes })
}

export function getTodoStats(filter?: { project_id?: string; assignee_id?: string }): Promise<SingleResp<TodoStats>> {
  const p = new URLSearchParams()
  if (filter?.project_id)  p.set('project_id',  filter.project_id)
  if (filter?.assignee_id) p.set('assignee_id', filter.assignee_id)
  const qs = p.toString()
  return req<SingleResp<TodoStats>>('GET', `/stats${qs ? `?${qs}` : ''}`)
}

export function bulkCreateTodos(todos: TodoCreate[]): Promise<{ data: Todo[]; created: number }> {
  return req<{ data: Todo[]; created: number }>('POST', '/bulk', { todos })
}

export function listComments(todoId: string): Promise<ListResp<TodoComment>> {
  return req<ListResp<TodoComment>>('GET', `/${todoId}/comments`)
}

export function addComment(todoId: string, content: string): Promise<SingleResp<TodoComment>> {
  return req<SingleResp<TodoComment>>('POST', `/${todoId}/comments`, { content })
}

export function deleteComment(todoId: string, commentId: string): Promise<void> {
  return req<void>('DELETE', `/${todoId}/comments/${commentId}`)
}

export function addWatcher(todoId: string, userId: string): Promise<{ data: { todo_id: string; user_id: string } }> {
  return req('POST', `/${todoId}/watchers`, { user_id: userId })
}

export function removeWatcher(todoId: string, userId: string): Promise<void> {
  return req<void>('DELETE', `/${todoId}/watchers/${userId}`)
}
