interface KpiCardProps {
  label: string
  value: string | number | null | undefined
  sub?: string
}

export function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {value !== null && value !== undefined ? value : '—'}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
