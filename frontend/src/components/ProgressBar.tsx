interface ProgressBarProps {
  value: number   // 0–100
  label?: string
  color?: string
}

export function ProgressBar({ value, label, color = 'bg-blue-500' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span>
          <span>{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
