import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const cls = {
    success: 'bg-green-600',
    error:   'bg-red-600',
    info:    'bg-blue-600',
  }[type]

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${cls} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm`}>
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-auto text-white/80 hover:text-white text-lg leading-none">×</button>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const show = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type })
  const hide = () => setToast(null)
  return { toast, show, hide }
}
