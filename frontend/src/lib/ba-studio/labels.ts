/**
 * BA Studio — nhãn tiếng Việt + map màu sang design token VIB.
 * Thiết kế gốc vẽ theo Ant Design v5; ở đây giữ nguyên ngữ nghĩa màu
 * nhưng dùng biến --vib-* của app để toàn hệ thống nhất quán.
 */

import type { ChangeType, CrStage, DocType, MergeState, Priority } from './types'

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  scope: 'Phạm vi',
  timeline: 'Timeline',
  resource: 'Nhân lực',
  budget: 'Ngân sách',
  technical: 'Kỹ thuật',
  process: 'Quy trình',
  other: 'Khác',
}

/** Thứ tự hiển thị của biểu đồ "Phân bổ loại thay đổi" */
export const CHANGE_TYPE_ORDER: ChangeType[] = [
  'scope', 'timeline', 'resource', 'budget', 'technical', 'process', 'other',
]

export const MERGE_STATE_LABELS: Record<MergeState, string> = {
  pending: 'Chờ duyệt',
  merged: 'Đã merge',
  rejected: 'Từ chối',
}

export const STAGE_LABELS: Record<CrStage, string> = {
  submitted: 'Đã gửi',
  reviewing: 'Đang review',
  approved: 'Đã phê duyệt',
  implementing: 'Đang triển khai',
  implemented: 'Đã triển khai',
  rejected: 'Từ chối',
  cancelled: 'Đã huỷ',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  critical: 'var(--vib-danger)',
  high: 'var(--vib-warning)',
  medium: 'var(--vib-info)',
  low: 'var(--vib-neutral-400)',
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  BRS: 'BRS', FSD: 'FSD', BRD: 'BRD', FRS: 'FRS', SRS: 'SRS',
}

export const DOC_TYPE_HINT: Record<DocType, string> = {
  BRS: 'Business Requirements Specification',
  FSD: 'Functional Specification Document',
  BRD: 'Business Requirements Document',
  FRS: 'Functional Requirements Specification',
  SRS: 'Software Requirements Specification',
}

// ── Tag preset → token VIB ──────────────────────────────────────────────────

export type TagTone =
  'blue' | 'green' | 'gold' | 'red' | 'purple' | 'cyan' | 'magenta' | 'neutral'

export const TAG_TONES: Record<TagTone, { fg: string; bg: string; bd: string }> = {
  blue:    { fg: 'var(--vib-primary)',      bg: 'var(--vib-info-bg)',      bd: '#BBD9F2' },
  green:   { fg: 'var(--vib-success)',      bg: 'var(--vib-success-bg)',   bd: '#B7DFC7' },
  gold:    { fg: 'var(--vib-warning)',      bg: 'var(--vib-warning-bg)',   bd: '#F0D9A8' },
  red:     { fg: 'var(--vib-danger)',       bg: 'var(--vib-danger-bg)',    bd: '#F0C4C0' },
  purple:  { fg: '#6B46C1',                 bg: '#F1ECFD',                 bd: '#D6C9F5' },
  cyan:    { fg: '#0E7490',                 bg: '#E0F5F9',                 bd: '#B4E1EA' },
  magenta: { fg: '#A21CAF',                 bg: '#FBEBFD',                 bd: '#EEC8F3' },
  neutral: { fg: 'var(--vib-neutral-600)',  bg: 'var(--vib-neutral-100)',  bd: 'var(--vib-neutral-300)' },
}

export function docTypeTone(docType?: DocType | null): TagTone {
  if (docType === 'FSD') return 'purple'
  if (docType === 'BRD' || docType === 'FRS' || docType === 'SRS') return 'cyan'
  return 'blue'
}

export function mergeStateTone(state: MergeState): TagTone {
  if (state === 'merged') return 'green'
  if (state === 'rejected') return 'red'
  return 'gold'
}

export function stageTone(stage: CrStage): TagTone {
  if (stage === 'implemented') return 'green'
  if (stage === 'rejected' || stage === 'cancelled') return 'red'
  if (stage === 'approved') return 'blue'
  if (stage === 'implementing') return 'cyan'
  return 'neutral'
}

/** 'move' chỉ xuất hiện trong danh sách section ops của CR, không phải hàng diff */
export type OpDisplayKind = 'add' | 'modify' | 'remove' | 'same' | 'move'

export function opTone(op: OpDisplayKind): TagTone {
  if (op === 'add') return 'green'
  if (op === 'remove') return 'red'
  if (op === 'modify') return 'gold'
  if (op === 'move') return 'cyan'
  return 'neutral'
}

export const OP_LABELS: Record<OpDisplayKind, string> = {
  add: 'Thêm mục', modify: 'Sửa', remove: 'Xoá mục', same: 'Giữ', move: 'Đổi vị trí',
}

/** Màu nền hàng diff theo op */
export const DIFF_ROW_BG: Record<'add' | 'modify' | 'remove' | 'same', string> = {
  add: 'var(--vib-success-bg)',
  remove: 'var(--vib-danger-bg)',
  modify: 'var(--vib-white)',
  same: 'var(--vib-white)',
}

export const DIFF_SIDE_BG: Record<'add' | 'modify' | 'remove' | 'same', { before: string; after: string }> = {
  add:    { before: 'var(--vib-white)',      after: 'var(--vib-success-bg)' },
  remove: { before: 'var(--vib-danger-bg)',  after: 'var(--vib-white)' },
  modify: { before: '#FFFAF2',               after: '#F4FBF7' },
  same:   { before: 'var(--vib-white)',      after: 'var(--vib-white)' },
}

// ── Định dạng ───────────────────────────────────────────────────────────────

/** ISO (YYYY-MM-DD hoặc timestamptz) → DD/MM/YYYY; rỗng → — */
export function fdate(value?: string | null): string {
  if (!value) return '—'
  const iso = value.slice(0, 10)
  const parts = iso.split('-')
  if (parts.length !== 3) return value
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function fdatetime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return fdate(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Số 0 trong ngữ cảnh đếm → em dash (theo thiết kế) */
export function fcount(n: number): string {
  return n > 0 ? String(n) : '—'
}
