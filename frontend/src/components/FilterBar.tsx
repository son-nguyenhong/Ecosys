/**
 * FilterBar — inline filter row for list/table views.
 * Place directly below table <thead> or section header.
 * Supports: text search, LOV selects, date-range.
 */
import React from 'react'

export interface FilterSelectOption { value: string; label: string }

export interface FilterBarProps {
  text?: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
  }
  selects?: {
    key: string
    value: string
    onChange: (v: string) => void
    placeholder: string
    options: FilterSelectOption[]
    minWidth?: number
  }[]
  dateFrom?: { value: string; onChange: (v: string) => void; label?: string }
  dateTo?:   { value: string; onChange: (v: string) => void; label?: string }
  onClear?: () => void
  right?: React.ReactNode
}

const S: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    padding: '8px 12px',
    background: 'var(--vib-neutral-50, #f8f9fa)',
    borderBottom: '1px solid var(--vib-neutral-200, #e5e7eb)',
    borderTop: '1px solid var(--vib-neutral-200, #e5e7eb)',
  },
  input: {
    height: 30, padding: '0 10px', fontSize: 12,
    border: '1px solid var(--vib-neutral-300, #d1d5db)',
    borderRadius: 6, outline: 'none', background: '#fff',
    color: 'var(--vib-neutral-800, #1f2937)',
    minWidth: 160,
  },
  select: {
    height: 30, padding: '0 8px', fontSize: 12,
    border: '1px solid var(--vib-neutral-300, #d1d5db)',
    borderRadius: 6, outline: 'none', background: '#fff',
    color: 'var(--vib-neutral-800, #1f2937)',
    cursor: 'pointer',
  },
  dateInput: {
    height: 30, padding: '0 8px', fontSize: 12,
    border: '1px solid var(--vib-neutral-300, #d1d5db)',
    borderRadius: 6, outline: 'none', background: '#fff',
    color: 'var(--vib-neutral-800, #1f2937)',
  },
  label: {
    fontSize: 11, color: 'var(--vib-neutral-500, #6b7280)',
    whiteSpace: 'nowrap' as const,
  },
  clearBtn: {
    height: 28, padding: '0 10px', fontSize: 11, fontWeight: 600,
    border: '1px solid var(--vib-neutral-300, #d1d5db)',
    borderRadius: 6, cursor: 'pointer', background: '#fff',
    color: 'var(--vib-neutral-500, #6b7280)',
    display: 'flex', alignItems: 'center', gap: 4,
  },
}

export function FilterBar({
  text, selects = [], dateFrom, dateTo, onClear, right,
}: FilterBarProps) {
  const hasActive =
    (text?.value ?? '') !== '' ||
    selects.some(s => s.value !== '') ||
    (dateFrom?.value ?? '') !== '' ||
    (dateTo?.value ?? '') !== ''

  return (
    <div style={S.bar}>
      {/* Text search */}
      {text && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{
            position: 'absolute', left: 8,
            color: 'var(--vib-neutral-400)', fontSize: 12, pointerEvents: 'none',
          }}>
            🔍
          </span>
          <input
            style={{ ...S.input, paddingLeft: 26, minWidth: 200 }}
            placeholder={text.placeholder ?? 'Tìm kiếm...'}
            value={text.value}
            onChange={e => text.onChange(e.target.value)}
          />
          {text.value && (
            <button
              type="button"
              onClick={() => text.onChange('')}
              style={{
                position: 'absolute', right: 6, background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--vib-neutral-400)', fontSize: 12, padding: 2,
              }}
            >✕</button>
          )}
        </div>
      )}

      {/* LOV selects */}
      {selects.map(sel => (
        <select
          key={sel.key}
          style={{ ...S.select, minWidth: sel.minWidth ?? 140, fontWeight: sel.value ? 600 : 400 }}
          value={sel.value}
          onChange={e => sel.onChange(e.target.value)}
        >
          <option value="">{sel.placeholder}</option>
          {sel.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      {/* Date range */}
      {(dateFrom || dateTo) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={S.label}>{dateFrom?.label ?? 'Từ'}</span>
          {dateFrom && (
            <input
              type="date"
              style={S.dateInput}
              value={dateFrom.value}
              onChange={e => dateFrom.onChange(e.target.value)}
            />
          )}
          <span style={S.label}>{dateTo?.label ?? '→'}</span>
          {dateTo && (
            <input
              type="date"
              style={S.dateInput}
              value={dateTo.value}
              onChange={e => dateTo.onChange(e.target.value)}
            />
          )}
        </div>
      )}

      {/* Clear */}
      {hasActive && onClear && (
        <button type="button" style={S.clearBtn} onClick={onClear}>
          ✕ Xóa filter
        </button>
      )}

      {/* Right slot */}
      {right && (
        <>
          <div style={{ flex: 1 }} />
          {right}
        </>
      )}
    </div>
  )
}

/** Client-side text filter across multiple string fields. */
export function applyTextFilter<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  fields: (keyof T)[],
): T[] {
  if (!query.trim()) return rows
  const q = query.toLowerCase()
  return rows.filter(r =>
    fields.some(f => String(r[f] ?? '').toLowerCase().includes(q))
  )
}

/**
 * Client-side date-range filter on an ISO date/datetime field.
 * Rows with null/empty field values always pass through (not excluded by range).
 */
export function applyDateFilter<T>(
  rows: T[],
  field: keyof T,
  from: string,
  to: string,
): T[] {
  if (!from && !to) return rows
  return rows.filter(r => {
    const raw = String(r[field] ?? '').slice(0, 10)
    if (!raw) return true          // null dates are not filtered out
    if (from && raw < from) return false
    if (to   && raw > to)   return false
    return true
  })
}
