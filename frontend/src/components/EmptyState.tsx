interface EmptyStateProps {
  title?: string
  message?: string
  icon?: string
}

export function EmptyState({ title = 'No data', message, icon = '📭' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {message && <p className="text-xs text-gray-400 mt-1">{message}</p>}
    </div>
  )
}
