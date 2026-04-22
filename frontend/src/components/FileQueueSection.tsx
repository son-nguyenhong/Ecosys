import React, { useRef } from 'react'

export const FILE_ACCEPT = '.xlsx,.xls,.doc,.docx,.pdf,.txt,.sql,.csv,.json,.xml,.png,.jpg,.jpeg,.gif,.zip,.rar,.html,.htm'

export function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (ext === 'pdf') return '📕'
  if (ext === 'txt') return '📄'
  if (ext === 'sql') return '🗃️'
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return '🖼️'
  if (['zip', 'rar', '7z'].includes(ext)) return '📦'
  if (ext === 'json') return '{ }'
  if (['html', 'htm'].includes(ext)) return '🌐'
  return '📎'
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FileQueueSection({
  files,
  onAdd,
  onRemove,
}: {
  files: File[]
  onAdd: (fl: FileList | null) => void
  onRemove: (idx: number) => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div style={{ borderTop: '1px solid var(--vib-neutral-200)', paddingTop: 14, marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vib-neutral-600)' }}>
          Tài liệu đính kèm{files.length > 0 ? ` (${files.length})` : ''}
        </span>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          style={{
            padding: '3px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
            border: '1px dashed var(--vib-neutral-300)', background: '#fafafa',
            color: 'var(--vib-neutral-600)', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          📎 Thêm file
        </button>
        <input
          ref={ref}
          type="file"
          multiple
          accept={FILE_ACCEPT}
          hidden
          onChange={e => { onAdd(e.target.files); e.target.value = '' }}
        />
      </div>

      {files.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--vib-neutral-400)', fontStyle: 'italic' }}>
          Chưa chọn file đính kèm
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {files.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
              borderRadius: 6, background: '#f8fafc', border: '1px solid var(--vib-neutral-200)',
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{fileIcon(f.name)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>{fmtSize(f.size)}</div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(i)}
              style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vib-neutral-400)', padding: '2px 4px', flexShrink: 0 }}
              title="Bỏ file"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
