/**
 * So sánh phiên bản — đối chiếu 2 phiên bản của cùng tài liệu,
 * kể cả bản dự kiến sau khi merge CR đang chờ.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { VibSelect } from '../../../components/ui'
import * as api from '../../../api/ba-studio'
import { diffSections, diffStatLabel } from '../../../lib/ba-studio/diff'
import type { MasterDocDetail, MasterDocListItem, Section } from '../../../lib/ba-studio/types'
import { buildVersionEntries, defaultComparePair } from '../../../lib/ba-studio/versions'
import { DiffView, type DiffMode, type DiffRender } from '../components/DiffView'
import { EmptyBox, Panel, PageHead, Segmented, SwitchToggle } from '../components/primitives'

interface Props {
  docs: MasterDocListItem[]
  docId: string
  versionA: string
  versionB: string
  onChange: (docId: string, a: string, b: string) => void
  onError: (msg: string) => void
}

export function CompareView({ docs, docId, versionA, versionB, onChange, onError }: Props) {
  const [doc, setDoc] = useState<MasterDocDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewSections, setPreviewSections] = useState<Record<string, Section[]>>({})
  const [mode, setMode] = useState<DiffMode>('inline')
  const [render, setRender] = useState<DiffRender>('markdown')
  const [showSame, setShowSame] = useState(false)

  const activeDocId = docId || docs[0]?.id || ''

  const load = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    try {
      const data = await api.getDoc(id)
      setDoc(data)
      const entries = buildVersionEntries(data)
      const hasA = entries.some(e => e.key === versionA)
      const hasB = entries.some(e => e.key === versionB)
      if (!hasA || !hasB) {
        const [a, b] = defaultComparePair(entries)
        onChange(id, a, b)
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Không tải được tài liệu')
    } finally {
      setLoading(false)
    }
  }, [onChange, onError, versionA, versionB])

  useEffect(() => { void load(activeDocId) }, [activeDocId]) // eslint-disable-line react-hooks/exhaustive-deps

  const entries = useMemo(() => (doc ? buildVersionEntries(doc) : []), [doc])

  // nạp after_sections cho các bản dự kiến đang được chọn
  useEffect(() => {
    const needed = entries.filter(
      e => e.kind === 'preview' && (e.key === versionA || e.key === versionB) && e.crId && !previewSections[e.crId],
    )
    if (needed.length === 0) return
    let cancelled = false
    void Promise.all(needed.map(e => api.getDocCr(e.crId as string)))
      .then(list => {
        if (cancelled) return
        setPreviewSections(prev => {
          const next = { ...prev }
          list.forEach(cr => { next[cr.id] = cr.after_sections })
          return next
        })
      })
      .catch(e => onError(e instanceof Error ? e.message : 'Không tải được bản dự kiến'))
    return () => { cancelled = true }
  }, [entries, versionA, versionB, previewSections, onError])

  function sectionsOf(key: string): Section[] {
    const entry = entries.find(e => e.key === key)
    if (!entry) return []
    if (entry.kind === 'preview') return entry.crId ? previewSections[entry.crId] ?? [] : []
    return entry.sections ?? []
  }

  const before = sectionsOf(versionA)
  const after = sectionsOf(versionB)
  const labelA = entries.find(e => e.key === versionA)?.title ?? versionA
  const labelB = entries.find(e => e.key === versionB)?.title ?? versionB
  const statLabel = before.length || after.length ? diffStatLabel(diffSections(before, after)) : ''

  const versionOptions = entries.map(e => ({
    value: e.key,
    label: e.label,
    title: e.title,
    mono: true,
    color: e.kind === 'preview' ? 'var(--vib-warning)' : undefined,
  }))

  return (
    <div>
      <PageHead
        title="So sánh phiên bản"
        sub="Đối chiếu Master Doc giữa hai phiên bản, kể cả bản dự kiến sau khi merge CR đang chờ."
      />

      <Panel pad={false}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
          borderBottom: '1px solid var(--vib-neutral-200)', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: 'var(--vib-neutral-600)' }}>Tài liệu</span>
          <VibSelect
            value={activeDocId}
            onChange={e => { setPreviewSections({}); onChange(e.target.value, '', '') }}
            style={{ minWidth: 300, maxWidth: 420 }}
          >
            {docs.map(d => (
              <option key={d.id} value={d.id}>{d.doc_type} · {d.title}</option>
            ))}
          </VibSelect>

          {entries.length >= 2 && (
            <>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vib-danger)' }}>TRƯỚC</span>
              <Segmented size="sm" value={versionA} onChange={v => onChange(activeDocId, v, versionB)} options={versionOptions} />
              <ArrowRight size={15} color="var(--vib-neutral-400)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vib-success)' }}>SAU</span>
              <Segmented size="sm" value={versionB} onChange={v => onChange(activeDocId, versionA, v)} options={versionOptions} />
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--vib-neutral-500)', fontVariantNumeric: 'tabular-nums' }}>
                {statLabel}
              </span>
              <Segmented<DiffRender>
                size="sm"
                value={render}
                onChange={setRender}
                options={[
                  { value: 'markdown', label: 'Markdown', title: 'Render tài liệu như khi đọc' },
                  { value: 'tokens', label: 'Nguồn .md', title: 'Nguồn Markdown, highlight tới từng từ' },
                ]}
              />
              <Segmented<DiffMode>
                size="sm"
                value={mode}
                onChange={setMode}
                options={[{ value: 'inline', label: 'Hợp nhất' }, { value: 'side', label: 'Song song' }]}
              />
              <SwitchToggle checked={showSame} onChange={setShowSame} label="Mục không đổi" />
            </>
          )}
        </div>

        {loading && !doc ? (
          <div style={{ padding: 40, color: 'var(--vib-neutral-500)' }}>Đang tải…</div>
        ) : entries.length < 2 ? (
          <EmptyBox
            title="Chưa có gì để so sánh"
            desc="Tài liệu này chỉ có phiên bản gốc và chưa có CR nào chờ merge."
          />
        ) : (
          <DiffView
            before={before}
            after={after}
            mode={mode}
            render={render}
            showSame={showSame}
            beforeLabel={labelA}
            afterLabel={labelB}
          />
        )}
      </Panel>
    </div>
  )
}
