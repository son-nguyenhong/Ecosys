import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../stores/auth'

// ── Badge ────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
const badgeClasses: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger:  'badge-danger',
  info:    'badge-info',
  neutral: 'badge-neutral',
  primary: 'badge-primary',
}
export function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return <span className={`badge ${badgeClasses[variant]}`}>{children}</span>
}

// ── Status badge helper ─────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    active: 'success', completed: 'info', on_hold: 'warning', archived: 'neutral',
    draft: 'neutral', review: 'warning', approved: 'success',
    generated: 'neutral', reviewed: 'warning', executed: 'info',
    planned: 'neutral', in_progress: 'primary', delayed: 'danger',
    done: 'success', blocked: 'danger', open: 'warning', resolved: 'success',
    final: 'success',
  }
  return <Badge variant={map[status] || 'neutral'}>{status}</Badge>
}

// ── Button ───────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
  size?: 'sm' | 'md'
  loading?: boolean
}
export function Btn({ variant = 'primary', size, loading, children, className = '', ...props }: BtnProps) {
  const cls = `btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''}${loading ? ' opacity-60 cursor-not-allowed' : ''} ${className}`
  return (
    <button className={cls} disabled={loading || props.disabled} {...props}>
      {loading ? '⟳ ' : ''}{children}
    </button>
  )
}

// ── Card ─────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card card-pad ${className}`}>{children}</div>
}

// ── Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  width?: string
}
export function Modal({ title, open, onClose, children, width = '560px' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="txt_s_xxs">{title}</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

// ── Form Field ───────────────────────────────────────────────────
interface FieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}
export function Field({ label, required, error, children }: FieldProps) {
  return (
    <div className="vib-field">
      <label className="vib-label">{label}{required && <span style={{ color: 'var(--vib-danger)', marginLeft: 2 }}>*</span>}</label>
      {children}
      {error && <div className="vib-error">{error}</div>}
    </div>
  )
}

export function VibInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`vib-input ${className}`} {...props} />
}

export function VibTextarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`vib-input ${className}`} style={{ resize: 'vertical', paddingTop: 8 }} {...props} />
}

export function VibSelect({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select className={`vib-input ${className}`} {...props}>{children}</select>
  )
}

// ── Toast Container ──────────────────────────────────────────────
export function ToastContainer() {
  const { toasts, removeToast } = useStore()

  useEffect(() => {
    toasts.forEach((t) => {
      const timer = setTimeout(() => removeToast(t.id), 4000)
      return () => clearTimeout(timer)
    })
  }, [toasts, removeToast])

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.type === 'success' ? ' toast-success' : t.type === 'warn' ? ' toast-warning' : t.type === 'error' ? ' toast-danger' : ''}`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'warn' ? '⚠' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────
export function EmptyState({ icon, title, desc, action }: { icon?: string; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <div className="empty-state__title">{title}</div>
      {desc && <div className="empty-state__desc">{desc}</div>}
      {action}
    </div>
  )
}

// ── Progress Bar ─────────────────────────────────────────────────
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="process-progress" style={{ width: '100%' }}>
      <div
        className="process-progress__fill"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color || 'var(--vib-primary)' }}
      />
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────
export function KpiCard({ label, value, change, changePositive }: {
  label: string; value: string | number; change?: string; changePositive?: boolean
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
      {change && (
        <div className={`kpi-card__change ${changePositive !== false ? 'kpi-change-pos' : 'kpi-change-neg'}`}>
          {change}
        </div>
      )}
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────
export function Confirm({ open, message, onConfirm, onCancel }: {
  open: boolean; message: string; onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="txt_s_xxs" style={{ color: 'var(--vib-danger)' }}>Xác nhận</span>
          <button className="btn-icon" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="state-banner state-banner-warn mb-4">{message}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="danger" style={{ flex: 1, justifyContent: 'center' }} onClick={onConfirm}>Xác nhận</Btn>
            <Btn variant="ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>Hủy</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
