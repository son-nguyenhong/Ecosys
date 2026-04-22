import { StatusBadge } from './StatusBadge'

const STATUS_ORDER = ['todo', 'in_progress', 'done', 'blocked']
const STATUS_LABEL: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', done: 'Done', blocked: 'Blocked',
}

interface Task {
  id: string; title: string; status: string; assignee?: string; due_date?: string
}

interface TaskBoardProps {
  tasks: Task[]
  onStatusChange: (id: string, status: string) => void
}

export function TaskBoard({ tasks, onStatusChange }: TaskBoardProps) {
  const byStatus = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-4 gap-3">
      {STATUS_ORDER.map((status) => (
        <div key={status} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">{STATUS_LABEL[status]}</span>
            <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-1.5">{byStatus[status].length}</span>
          </div>
          <div className="space-y-2">
            {byStatus[status].map((task) => (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <p className="text-xs font-medium text-gray-800 leading-snug">{task.title}</p>
                {task.assignee && (
                  <p className="text-xs text-gray-400 mt-1">@{task.assignee}</p>
                )}
                {task.due_date && (
                  <p className="text-xs text-gray-400">{task.due_date}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {STATUS_ORDER.filter((s) => s !== task.status).map((s) => (
                    <button key={s} onClick={() => onStatusChange(task.id, s)}
                      className="text-xs text-gray-500 hover:text-vib-blue underline">
                      → {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {byStatus[status].length === 0 && (
              <p className="text-xs text-gray-300 text-center py-3">Empty</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
