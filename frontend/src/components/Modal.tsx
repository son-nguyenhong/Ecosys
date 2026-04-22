import { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: string
}

export function Modal({ title, onClose, children, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`bg-white rounded-xl shadow-xl w-full ${width} mx-4 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
      </div>
    </div>
  )
}
