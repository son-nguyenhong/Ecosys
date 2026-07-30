/**
 * Trình soạn Markdown 1 file — dùng chung cho form tạo Master Doc và form Change Request.
 *
 * Tài liệu BRS/FSD của BA là MỘT file .md, nên đây là bề mặt soạn thảo chính:
 *   · gõ / dán trực tiếp, hoặc tải file .md lên
 *   · chèn khung tài liệu mẫu
 *   · xem trước bản render, xem dàn ý các mục hệ thống tách được
 *   · tải nội dung đang soạn xuống .md
 * Mỗi heading (#, ##, ###…) thành một mục để diff khi review CR — dàn ý cho BA
 * thấy trước hệ thống sẽ tách bao nhiêu mục.
 */
import React, { useMemo, useRef, useState } from 'react'
import { Download, Eye, EyeOff, FileText, ListTree, Upload } from 'lucide-react'
import { Btn } from '../../../components/ui'
import { splitMarkdown } from '../../../lib/ba-studio/markdown'
import { Markdown } from './Markdown'
import { Tag } from './primitives'

interface Props {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  placeholder?: string
  rows?: number
  /** tên file khi bấm "Tải .md" */
  fileName?: string
  /** nội dung khung mẫu — có thì hiện nút "Chèn khung mẫu" */
  template?: string
  label?: string
  hint?: React.ReactNode
}

export function downloadMarkdown(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.md') ? fileName : `${fileName}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function MarkdownEditor({
  value, onChange, disabled, placeholder, rows = 18, fileName = 'tai-lieu.md',
  template, label = 'Nội dung tài liệu (Markdown)', hint,
}: Props) {
  const [tab, setTab] = useState<'edit' | 'preview' | 'outline'>('edit')
  const fileRef = useRef<HTMLInputElement>(null)

  const sections = useMemo(() => splitMarkdown(value), [value])
  const lineCount = value ? value.split('\n').length : 0
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    onChange(text)
    e.target.value = ''
    setTab('edit')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Tab trong ô soạn = 2 space, không nhảy focus (đang gõ Markdown lồng nhau)
    if (e.key !== 'Tab' || e.shiftKey) return
    e.preventDefault()
    const el = e.currentTarget
    const { selectionStart: s, selectionEnd: t } = el
    const next = `${value.slice(0, s)}  ${value.slice(t)}`
    onChange(next)
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2 })
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--vib-neutral-700)' }}>{label}</span>
        <span data-testid="md-section-count">
          <Tag tone="neutral">{sections.length} mục</Tag>
        </span>
        <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>
          {lineCount} dòng · {wordCount} từ
        </span>
        <span style={{ flex: 1 }} />

        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt"
          onChange={pickFile}
          style={{ display: 'none' }}
          data-testid="md-file-input"
        />
        <Btn variant="secondary" size="sm" disabled={disabled} onClick={() => fileRef.current?.click()}>
          <Upload size={13} /> Tải .md lên
        </Btn>
        {template && (
          <Btn
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => {
              if (value.trim() && !window.confirm('Thay toàn bộ nội dung đang soạn bằng khung mẫu?')) return
              onChange(template)
            }}
          ><FileText size={13} /> Khung mẫu</Btn>
        )}
        <Btn variant="secondary" size="sm" onClick={() => downloadMarkdown(fileName, value)}>
          <Download size={13} /> Tải .md
        </Btn>
        <Btn
          variant="secondary"
          size="sm"
          onClick={() => setTab(t => (t === 'outline' ? 'edit' : 'outline'))}
        ><ListTree size={13} /> Dàn ý</Btn>
        <Btn
          variant="secondary"
          size="sm"
          onClick={() => setTab(t => (t === 'preview' ? 'edit' : 'preview'))}
        >
          {tab === 'preview' ? <><EyeOff size={13} /> Soạn</> : <><Eye size={13} /> Xem trước</>}
        </Btn>
      </div>

      {tab === 'edit' && (
        <textarea
          value={value}
          disabled={disabled}
          rows={rows}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          data-testid="md-editor"
          placeholder={placeholder ?? '# Tiêu đề tài liệu\n\n## 1. Mục tiêu & phạm vi\n\nNội dung...'}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 6,
            border: '1px solid var(--vib-neutral-300)', background: 'var(--vib-white)',
            fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.6,
            color: 'var(--vib-neutral-900)', resize: 'vertical', tabSize: 2,
          }}
        />
      )}

      {tab === 'preview' && (
        <div style={{
          border: '1px solid var(--vib-neutral-200)', borderRadius: 6, padding: '4px 16px 14px',
          background: 'var(--vib-white)', maxHeight: 460, overflowY: 'auto',
        }}>
          {value.trim()
            ? <Markdown text={value} />
            : <div style={{ padding: 20, fontSize: 13, color: 'var(--vib-neutral-500)' }}>
              Chưa có nội dung để xem trước.
            </div>}
        </div>
      )}

      {tab === 'outline' && (
        <div style={{
          border: '1px solid var(--vib-neutral-200)', borderRadius: 6,
          background: 'var(--vib-neutral-50)', maxHeight: 460, overflowY: 'auto',
        }}>
          {sections.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: 'var(--vib-neutral-500)' }}>
              Chưa tách được mục nào — thêm heading dạng <code>## Tiêu đề</code>.
            </div>
          ) : sections.map((s, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 12px',
              borderBottom: i === sections.length - 1 ? 'none' : '1px solid var(--vib-neutral-200)',
              paddingLeft: 12 + Math.max(0, s.heading_level - 1) * 16,
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--vib-neutral-400)',
                minWidth: 28,
              }}>{s.heading_level === 0 ? '—' : '#'.repeat(s.heading_level)}</span>
              <span style={{ fontSize: 13, fontWeight: s.heading_level <= 2 ? 600 : 400, flex: 1 }}>
                {s.heading || '(phần mở đầu)'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)' }}>
                {s.body ? `${s.body.split('\n').length} dòng` : 'trống'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 5, fontSize: 12, color: 'var(--vib-neutral-500)' }}>
        {hint ?? <>
          Mỗi heading (<code># … ######</code>) thành một mục để so sánh khi review Change Request.
          Hỗ trợ bảng, danh sách, khối code, in đậm/nghiêng.
        </>}
      </div>
    </div>
  )
}
