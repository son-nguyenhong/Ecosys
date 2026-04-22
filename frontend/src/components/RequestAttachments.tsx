import React, { useEffect, useRef, useState } from 'react'
import { type RequestAttachment, downloadRequestAttachment } from '../api/requests'
import { FILE_ACCEPT, fileIcon, fmtSize } from './FileQueueSection'

const PREVIEW_EXTS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'html', 'htm', 'doc', 'docx'])

function actionIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return PREVIEW_EXTS.has(ext) ? '👁' : '↓'
}
function actionTitle(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return PREVIEW_EXTS.has(ext) ? 'Xem trước' : 'Tải xuống'
}

export function RequestAttachments({
  refId,
  listFn,
  uploadFn,
}: {
  refId: string
  listFn: (id: string) => Promise<RequestAttachment[]>
  uploadFn: (id: string, file: File) => Promise<RequestAttachment>
}) {
  const [attachments, setAttachments] = useState<RequestAttachment[]>([])
  const [uploading, setUploading]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const inputRef                      = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listFn(refId).then(setAttachments).catch(() => {})
  }, [refId])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true); setError(null)
    try {
      const results = await Promise.all(Array.from(files).map(f => uploadFn(refId, f)))
      setAttachments(prev => [...prev, ...results])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleAction(att: RequestAttachment) {
    try { await downloadRequestAttachment(att.id, att.filename) }
    catch (e) { alert('Lỗi: ' + (e as Error).message) }
  }

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--vib-neutral-200)', paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--vib-neutral-500)',
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          Tài liệu đính kèm{attachments.length > 0 ? ` (${attachments.length})` : ''}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '3px 10px', fontSize: 12, borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer',
            border: '1px dashed var(--vib-neutral-300)', background: '#fafafa',
            color: 'var(--vib-neutral-600)', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {uploading ? 'Đang tải...' : '📎 Đính kèm'}
        </button>
        <input ref={inputRef} type="file" accept={FILE_ACCEPT} multiple hidden
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 8, padding: '4px 8px', background: '#fee2e2', borderRadius: 4 }}>
          {error}
        </div>
      )}

      {attachments.length === 0 && !uploading && (
        <div style={{ fontSize: 12, color: 'var(--vib-neutral-400)', fontStyle: 'italic', paddingBottom: 4 }}>
          Chưa có tài liệu đính kèm
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {attachments.map(att => (
          <div key={att.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
            borderRadius: 6, background: '#f8fafc', border: '1px solid var(--vib-neutral-200)',
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{fileIcon(att.filename)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--vib-neutral-800)' }}>
                {att.filename}
              </div>
              <div style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>
                {fmtSize(att.file_size ?? 0)}{att.file_size ? ' · ' : ''}
                {att.uploaded_by} · {new Date(att.created_at).toLocaleDateString('vi-VN')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleAction(att)}
              title={actionTitle(att.filename)}
              style={{
                fontSize: 15, background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--vib-primary)', padding: '2px 4px', flexShrink: 0,
              }}
            >
              {actionIcon(att.filename)}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
