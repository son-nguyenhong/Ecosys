/**
 * UserSelect — searchable dropdown backed by catalog users.
 * value / onChange store full_name (string), consistent with existing VARCHAR fields.
 */
import React, { useEffect, useRef, useState } from 'react'
import { getCatalogUsers, type CatalogUser } from '../api/catalog'

interface Props {
  value:       string
  onChange:    (fullName: string) => void
  placeholder?: string
  className?:  string
  style?:      React.CSSProperties
  disabled?:   boolean
  inputSize?:  'sm' | 'md'
}

let _cache: CatalogUser[] | null = null

export function UserSelect({
  value, onChange,
  placeholder = 'Chọn nhân sự...',
  className, style, disabled = false,
  inputSize = 'md',
}: Props) {
  const [users,  setUsers]  = useState<CatalogUser[]>(_cache ?? [])
  const [query,  setQuery]  = useState('')
  const [open,   setOpen]   = useState(false)
  const [loading, setLoading] = useState(!_cache)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (_cache) { setUsers(_cache); setLoading(false); return }
    getCatalogUsers({ status: 'active' })
      .then(data => { _cache = data; setUsers(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? users.filter(u =>
        u.full_name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()) ||
        (u.department ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (u.position ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : users

  const pad    = inputSize === 'sm' ? '2px 8px' : '6px 10px'
  const fsize  = inputSize === 'sm' ? 12 : 13

  return (
    <div ref={ref} style={{ position: 'relative', ...style }} className={className}>
      <div
        className="input"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? 'var(--vib-neutral-100)' : undefined,
          padding: pad, minHeight: inputSize === 'sm' ? 28 : 36,
        }}
        onClick={() => { if (!disabled) setOpen(o => !o) }}
      >
        {value ? (
          <span style={{ flex: 1, fontSize: fsize, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value}
          </span>
        ) : (
          <span style={{ flex: 1, fontSize: fsize, color: 'var(--vib-neutral-400)' }}>
            {loading ? 'Đang tải...' : placeholder}
          </span>
        )}
        {value && !disabled && (
          <span
            onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ color: 'var(--vib-neutral-400)', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}
          >✕</span>
        )}
        <span style={{ color: 'var(--vib-neutral-400)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200,
          background: '#fff', border: '1px solid var(--vib-neutral-300)',
          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxHeight: 280, display: 'flex', flexDirection: 'column', minWidth: 220,
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--vib-neutral-200)' }}>
            <input
              autoFocus
              className="input input-sm"
              style={{ width: '100%', fontSize: 12 }}
              placeholder="Tìm tên, email, phòng ban..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {value && (
              <div
                style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--vib-neutral-500)', borderBottom: '1px solid var(--vib-neutral-100)' }}
                onClick={() => { onChange(''); setOpen(false); setQuery('') }}
              >
                — Bỏ chọn —
              </div>
            )}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', color: 'var(--vib-neutral-400)', fontSize: 12 }}>
                Không tìm thấy
              </div>
            )}
            {filtered.map(u => (
              <div
                key={u.id}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 12,
                  background: u.full_name === value ? 'var(--vib-primary-50,#e6f0fa)' : undefined,
                  borderBottom: '1px solid var(--vib-neutral-100)',
                }}
                onMouseEnter={e => { if (u.full_name !== value) (e.currentTarget as HTMLDivElement).style.background = 'var(--vib-neutral-50,#f5f5f5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = u.full_name === value ? 'var(--vib-primary-50,#e6f0fa)' : '' }}
                onClick={() => { onChange(u.full_name); setOpen(false); setQuery('') }}
              >
                <div style={{ fontWeight: u.full_name === value ? 600 : 400, color: 'var(--vib-neutral-800)' }}>
                  {u.full_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--vib-neutral-500)', marginTop: 1 }}>
                  {u.email}{u.department ? ` · ${u.department}` : ''}{u.position ? ` · ${u.position}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
