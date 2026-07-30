/**
 * BA Studio — dựng danh sách phiên bản để chọn/so sánh.
 *
 * Khác prototype: bản đã phát hành lấy từ snapshot bất biến của backend
 * (ba_doc_versions.sections) chứ không replay lại từ ops. Chỉ bản *dự kiến*
 * (CR đang chờ) mới tính động — bằng after_sections do backend trả về.
 */

import type { DocCr, DocVersion, MasterDocDetail, Section } from './types'

export interface VersionEntry {
  /** khoá dùng cho state/URL: 'v1.0' hoặc 'preview:<crId>' */
  key: string
  /** nhãn ngắn hiển thị trên strip; bản dự kiến có hậu tố * */
  label: string
  /** tooltip đầy đủ */
  title: string
  kind: 'base' | 'merge' | 'preview'
  versionLabel: string
  note?: string | null
  releasedOn?: string | null
  releasedBy?: string | null
  sourceCrCode?: string | null
  crId?: string
  /** null với bản dự kiến — view tự nạp after_sections của CR */
  sections: Section[] | null
  sectionCount: number | null
}

function fdateShort(value?: string | null): string {
  if (!value) return ''
  const p = value.slice(0, 10).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : value
}

export function releasedEntry(version: DocVersion): VersionEntry {
  const date = fdateShort(version.released_on)
  return {
    key: version.version_label,
    label: version.version_label,
    title: `${version.version_label}${date ? ` · ${date}` : ''}${version.source_cr_code ? ` · ${version.source_cr_code}` : ''}`,
    kind: version.kind,
    versionLabel: version.version_label,
    note: version.note,
    releasedOn: version.released_on,
    releasedBy: version.released_by,
    sourceCrCode: version.source_cr_code,
    crId: version.source_cr_id ?? undefined,
    sections: version.sections ?? [],
    sectionCount: (version.sections ?? []).length,
  }
}

export function previewEntry(cr: DocCr, nextVersionLabel: string): VersionEntry {
  return {
    key: `preview:${cr.id}`,
    label: `${nextVersionLabel}*`,
    title: `${nextVersionLabel} ⟵ ${cr.request_code} (dự kiến) — bản dự kiến, chưa merge`,
    kind: 'preview',
    versionLabel: nextVersionLabel,
    note: cr.title,
    releasedOn: null,
    releasedBy: null,
    sourceCrCode: cr.request_code,
    crId: cr.id,
    sections: null,
    sectionCount: null,
  }
}

/**
 * Danh sách phiên bản của 1 tài liệu: các bản đã phát hành, rồi tới bản dự kiến
 * của từng CR đang chờ (mỗi CR pending là một nhánh dự kiến riêng).
 */
export function buildVersionEntries(doc: MasterDocDetail): VersionEntry[] {
  const released = [...doc.versions]
    .sort((a, b) => a.seq - b.seq)
    .map(releasedEntry)
  const pending = doc.change_requests
    .filter(cr => cr.merge_state === 'pending')
    .map(cr => previewEntry(cr, doc.next_version_label))
  return [...released, ...pending]
}

/** Bản hiện hành = bản phát hành cuối cùng (bỏ qua bản dự kiến) */
export function currentReleased(entries: VersionEntry[]): VersionEntry | undefined {
  const released = entries.filter(e => e.kind !== 'preview')
  return released[released.length - 1]
}

export function findEntry(entries: VersionEntry[], key: string): VersionEntry | undefined {
  return entries.find(e => e.key === key)
}

/** So sánh mặc định: bản áp cuối vs bản cuối (hoặc bản dự kiến nếu có) */
export function defaultComparePair(entries: VersionEntry[]): [string, string] {
  if (entries.length < 2) return [entries[0]?.key ?? '', entries[0]?.key ?? '']
  const last = entries[entries.length - 1]
  const released = entries.filter(e => e.kind !== 'preview')
  const prev = last.kind === 'preview'
    ? released[released.length - 1]
    : entries[entries.length - 2]
  return [prev?.key ?? entries[0].key, last.key]
}
