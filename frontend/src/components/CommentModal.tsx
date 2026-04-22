import React, { useState } from 'react'
import { X } from 'lucide-react'

export function CommentModal({
  title,
  subtitle,
  onConfirm,
  onClose,
  confirmLabel = 'Xác nhận',
}: {
  title: string
  subtitle?: string
  onConfirm: (comment: string) => void
  onClose: () => void
  confirmLabel?: string
}) {
  const [comment, setComment] = useState('')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: 440, maxWidth: '92vw',
          padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={17} />
          </button>
        </div>
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--vib-neutral-500)', margin: '0 0 14px', lineHeight: 1.5 }}>
            {subtitle}
          </p>
        )}
        <textarea
          autoFocus
          rows={4}
          style={{
            width: '100%', border: '1px solid var(--vib-neutral-300)', borderRadius: 8,
            padding: '8px 12px', fontSize: 13, resize: 'none', fontFamily: 'inherit',
            outline: 'none', boxSizing: 'border-box', marginBottom: 16,
            lineHeight: 1.5,
          }}
          placeholder="Nhập lý do / ghi chú..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px', border: '1px solid var(--vib-neutral-300)',
              borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13,
            }}
          >
            Hủy
          </button>
          <button
            onClick={() => { if (comment.trim()) onConfirm(comment.trim()) }}
            disabled={!comment.trim()}
            style={{
              padding: '7px 16px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: comment.trim() ? 'pointer' : 'not-allowed',
              background: comment.trim() ? 'var(--vib-primary, #1d4ed8)' : 'var(--vib-neutral-300)',
              color: '#fff',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
