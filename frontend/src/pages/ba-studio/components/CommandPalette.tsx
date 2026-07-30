/**
 * Command palette (⌘K / Ctrl+K) — tìm nhanh tài liệu, CR, trụ cột AI, skill.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { BA_AI_ADOPTION, type SkillItem } from '../../../data/ba-ai-adoption'
import {
  MERGE_STATE_LABELS, docTypeTone, mergeStateTone, type TagTone,
} from '../../../lib/ba-studio/labels'
import type { DocCr, MasterDocListItem } from '../../../lib/ba-studio/types'
import { Tag } from './primitives'
import type { BaStudioNav } from '../nav'

export interface PaletteItem {
  kind: string
  tone: TagTone
  label: string
  meta: string
  run: () => void
}

export function buildPaletteItems(
  docs: MasterDocListItem[],
  crs: DocCr[],
  nav: BaStudioNav,
): PaletteItem[] {
  const items: PaletteItem[] = [
    { kind: 'Trang', tone: 'neutral', label: 'Bảng điều khiển tài liệu', meta: '', run: nav.goConsole },
    { kind: 'Trang', tone: 'neutral', label: 'Master Doc', meta: '', run: nav.goDocs },
    { kind: 'Trang', tone: 'neutral', label: 'Sổ Change Request', meta: '', run: () => nav.goCrs() },
    { kind: 'Trang', tone: 'neutral', label: 'So sánh phiên bản', meta: '', run: () => nav.goCompare() },
    {
      kind: 'Trang', tone: 'neutral', label: 'So sánh tài liệu', meta: 'hai tài liệu bất kỳ',
      run: () => nav.goCompareDoc(),
    },
    { kind: 'Trang', tone: 'neutral', label: 'AI Adoption', meta: '', run: () => nav.goAi() },
  ]

  docs.forEach(d => items.push({
    kind: d.doc_type,
    tone: docTypeTone(d.doc_type),
    label: d.title,
    meta: d.project_code ?? '',
    run: () => nav.goDoc(d.id),
  }))

  docs.forEach(d => items.push({
    kind: 'So sánh',
    tone: 'cyan',
    label: `So sánh ${d.doc_code} với tài liệu khác`,
    meta: d.project_code ?? '',
    run: () => nav.goCompareDoc(d.id),
  }))

  crs.forEach(c => items.push({
    kind: 'CR',
    tone: mergeStateTone(c.merge_state),
    label: `${c.request_code} — ${c.title}`,
    meta: MERGE_STATE_LABELS[c.merge_state],
    run: () => nav.goCr(c.id),
  }))

  BA_AI_ADOPTION.pillars.forEach(p => items.push({
    kind: `AI ${p.code}`,
    tone: 'cyan',
    label: p.name,
    meta: `${p.items.length} mục`,
    run: () => nav.goAi(p.id),
  }))

  const skills = BA_AI_ADOPTION.pillars.find(p => p.id === 'skills')
  ;(skills?.items as SkillItem[] | undefined)?.forEach(s => items.push({
    kind: 'Skill',
    tone: 'magenta',
    label: `${s.cmd} — ${s.task}`,
    meta: s.output,
    run: () => nav.goAi('skills'),
  }))

  return items
}

export function CommandPalette({ open, items, onClose }: {
  open: boolean
  items: PaletteItem[]
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, 14)
    return items
      .filter(i => `${i.label} ${i.kind} ${i.meta}`.toLowerCase().includes(q))
      .slice(0, 14)
  }, [items, query])

  if (!open) return null

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => (s + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => (s - 1 + results.length) % results.length) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[selected]
      if (item) { item.run(); onClose() }
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 96,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)', background: 'var(--vib-white)', borderRadius: 8,
          boxShadow: 'var(--shadow-modal)', maxHeight: '60vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderBottom: '1px solid var(--vib-neutral-200)', flexShrink: 0,
        }}>
          <Search size={15} color="var(--vib-neutral-500)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={onKeyDown}
            placeholder="Tìm tài liệu, CR, trụ cột AI, skill…"
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent',
              color: 'var(--vib-neutral-900)', fontFamily: 'var(--font)',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--vib-neutral-500)',
            background: 'var(--vib-neutral-100)', border: '1px solid var(--vib-neutral-200)',
            borderRadius: 4, padding: '1px 5px',
          }}>ESC</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
          {results.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--vib-neutral-400)' }}>
              Không có kết quả
            </div>
          ) : results.map((item, i) => (
            <button
              key={`${item.kind}-${item.label}-${i}`}
              onClick={() => { item.run(); onClose() }}
              onMouseEnter={() => setSelected(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px',
                border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                background: i === selected ? 'var(--vib-info-bg)' : 'transparent',
              }}
            >
              <Tag tone={item.tone}>{item.kind}</Tag>
              <span style={{
                flex: 1, minWidth: 0, fontSize: 13, color: 'var(--vib-neutral-900)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{item.label}</span>
              <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)', flexShrink: 0 }}>{item.meta}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
