interface StatusBadgeProps {
  status: string
}

const COLOR_MAP: Record<string, string> = {
  // Document / test states
  draft:     'bg-gray-100 text-gray-700',
  review:    'bg-yellow-100 text-yellow-800',
  approved:  'bg-green-100 text-green-800',
  archived:  'bg-gray-200 text-gray-500',
  generated: 'bg-blue-100 text-blue-800',
  reviewed:  'bg-yellow-100 text-yellow-800',
  executed:  'bg-green-100 text-green-800',
  // Project states
  active:    'bg-green-100 text-green-800',
  on_hold:   'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  // App registry states
  inactive:   'bg-gray-100 text-gray-500',
  deprecated: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = COLOR_MAP[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
