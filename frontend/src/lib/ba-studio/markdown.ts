/**
 * Markdown ⇄ mục tài liệu — BA Studio.
 *
 * BA soạn BRS/FSD trong MỘT file Markdown. Mục (section) là PHÉP CHIẾU của
 * Markdown: tách theo heading ATX (#, ##, ###…) để vẫn diff được cấp mục khi
 * review Change Request, ghép lại ra đúng file cũ.
 *
 * PHẢI khớp tuyệt đối với backend/ba-workflow/app/services/markdown_doc.py —
 * frontend tính bản preview BA duyệt, backend tính bản phát hành thật.
 * Parity fixture: __tests__/markdown.test.ts ↔ tests/backend/test_ba_studio.py
 *
 * Bất biến được test:
 *   1. joinMarkdown(splitMarkdown(x)) là dạng chuẩn hoá (chạy lại không đổi)
 *   2. splitMarkdown(joinMarkdown(splitMarkdown(x))) === splitMarkdown(x)
 *   3. applyOps(cũ, deriveOps(cũ, mới)) === mới   (kể cả thứ tự)
 */

import { applyOps, nextSectionKey, sectionLevel } from './diff'
import type { Section, SectionOp } from './types'

export interface ParsedSection {
  heading: string
  heading_level: number
  body: string
}

// ── Nhận dạng cú pháp ───────────────────────────────────────────────────────

/** ATX heading: thụt lề ≤ 3 space, 1–6 dấu #, phải có space sau (CommonMark) */
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/
/** Mở/đóng khối code: ``` hoặc ~~~ (≥3 ký tự) */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/
/** Gạch chân setext: === (h1) hoặc --- (h2) */
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/
/** Dòng KHÔNG được coi là đoạn văn để làm setext (list, quote, bảng, heading, thụt 4) */
const NOT_PARAGRAPH = /^(?: {4,}|[ \t]*(?:[-*+>|]|\d+[.)])[ \t]|[ \t]*#{1,6}[ \t]|[ \t]*$)/
/** Tách token đo tương đồng — giữ chữ/số mọi ngôn ngữ, bỏ dấu câu và _ */
const TOKEN_SPLIT = /[^\p{L}\p{N}]+/u

/** Ngưỡng tương đồng để coi 2 mục là "cùng một mục đã được viết lại" */
export const SIMILARITY_THRESHOLD = 0.5

/** '## Tiêu đề ##' → 'Tiêu đề' (closing sequence của ATX heading) */
function stripClosingHashes(text: string): string {
  const stripped = text.replace(/[ \t]+$/, '')
  if (stripped.endsWith('#')) {
    const without = stripped.replace(/#+$/, '')
    if (without === '' || without.endsWith(' ') || without.endsWith('\t')) {
      return without.replace(/[ \t]+$/, '')
    }
  }
  return stripped
}

/** [level, text] nếu là ATX heading CÓ nội dung, ngược lại null */
function atx(line: string): [number, string] | null {
  const m = ATX.exec(line)
  if (!m) return null
  const text = stripClosingHashes(m[2] ?? '')
  // '###' trơ trọi: coi như văn bản thường (heading rỗng không lưu được)
  if (!text) return null
  return [m[1].length, text]
}

/** Theo dõi khối code để không tách heading nằm trong ``` ``` */
class FenceTracker {
  private char: string | null = null
  private size = 0

  get open(): boolean { return this.char !== null }

  feed(line: string): void {
    const m = FENCE.exec(line)
    if (!m) return
    const marker = m[1]
    const info = (m[2] ?? '').trim()
    if (!this.open) {
      this.char = marker[0]
      this.size = marker.length
    } else if (marker[0] === this.char && marker.length >= this.size && !info) {
      this.char = null
      this.size = 0
    }
  }
}

const isBlank = (line: string) => line.trim() === ''

function trimBlankEdges(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && isBlank(lines[start])) start++
  while (end > start && isBlank(lines[end - 1])) end--
  return lines.slice(start, end)
}

// ── Chuẩn hoá ───────────────────────────────────────────────────────────────

/**
 * Đưa Markdown về dạng chuẩn: xuống dòng \n, setext → ATX, bỏ thụt lề và
 * closing hashes của heading. Chạy lại lần 2 không đổi gì thêm (idempotent).
 */
export function normalizeMarkdown(md: string): string {
  const text = (md ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const out: string[] = []
  const fence = new FenceTracker()

  for (const line of text.split('\n')) {
    if (fence.open) {
      out.push(line)
      fence.feed(line)
      continue
    }
    fence.feed(line)
    if (fence.open) {           // dòng này vừa MỞ fence
      out.push(line)
      continue
    }

    const setext = SETEXT.exec(line)
    if (setext && out.length > 0 && !NOT_PARAGRAPH.test(out[out.length - 1])) {
      const level = setext[1][0] === '=' ? 1 : 2
      out[out.length - 1] = '#'.repeat(level) + ' ' + out[out.length - 1].trim()
      continue
    }

    const hit = atx(line)
    out.push(hit ? '#'.repeat(hit[0]) + ' ' + hit[1] : line)
  }

  return out.join('\n')
}

// ── split / join ────────────────────────────────────────────────────────────

/**
 * Tách Markdown thành mục theo heading. Nội dung trước heading đầu tiên thành
 * "phần mở đầu" (heading = '', heading_level = 0) nếu có chữ.
 */
export function splitMarkdown(md: string): ParsedSection[] {
  const lines = normalizeMarkdown(md).split('\n')
  const preamble: string[] = []
  const sections: { heading: string; heading_level: number; lines: string[] }[] = []
  let current: { heading: string; heading_level: number; lines: string[] } | null = null
  const fence = new FenceTracker()

  for (const line of lines) {
    const inFence = fence.open
    fence.feed(line)
    if (inFence) {
      (current ? current.lines : preamble).push(line)
      continue
    }

    const hit = fence.open ? null : atx(line)
    if (hit) {
      current = { heading: hit[1], heading_level: hit[0], lines: [] }
      sections.push(current)
    } else {
      (current ? current.lines : preamble).push(line)
    }
  }

  const out: ParsedSection[] = []
  const pre = trimBlankEdges(preamble)
  if (pre.length > 0) out.push({ heading: '', heading_level: 0, body: pre.join('\n') })
  for (const s of sections) {
    out.push({
      heading: s.heading,
      heading_level: s.heading_level,
      body: trimBlankEdges(s.lines).join('\n'),
    })
  }
  return out
}

/** Ghép mục thành 1 file Markdown — nghịch đảo của splitMarkdown */
export function joinMarkdown(sections: Array<Partial<Section> & { heading?: string }>): string {
  const blocks: string[] = []
  for (const s of sections) {
    const heading = (s.heading ?? '').trim()
    const body = s.body ?? ''
    const level = sectionLevel(s)
    if (level <= 0 || !heading) {
      if (body.trim()) blocks.push(body)
      continue
    }
    let block = '#'.repeat(Math.min(level, 6)) + ' ' + heading
    if (body.trim()) block += '\n\n' + body
    blocks.push(block)
  }
  return blocks.join('\n\n')
}

// ── Đo tương đồng ───────────────────────────────────────────────────────────

function tokenSet(text: string): Set<string> {
  return new Set((text ?? '').toLowerCase().split(TOKEN_SPLIT).filter(Boolean))
}

/** Jaccard trên tập token. Hai chuỗi rỗng → 1.0; một rỗng → 0.0 */
export function similarity(a: string, b: string): number {
  const ta = tokenSet(a)
  const tb = tokenSet(b)
  if (ta.size === 0 && tb.size === 0) return 1
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  ta.forEach(t => { if (tb.has(t)) inter++ })
  const union = ta.size + tb.size - inter
  return inter / union
}

function matchScore(
  o: { heading?: string | null; body?: string | null },
  n: { heading?: string | null; body?: string | null },
): number {
  return (similarity(o.heading ?? '', n.heading ?? '') + similarity(o.body ?? '', n.body ?? '')) / 2
}

// ── align: gán section_key ──────────────────────────────────────────────────

/**
 * Gán section_key cho danh sách mục vừa tách từ Markdown, ưu tiên giữ key của
 * mục cũ tương ứng để CR diff ra 'modify' thay vì 'remove + add'.
 *
 * 3 lượt khớp (dừng ở lượt đầu tiên tìm được):
 *   1. cùng heading_level + heading
 *   2. cùng body (khác rỗng)
 *   3. điểm tương đồng heading/body ≥ SIMILARITY_THRESHOLD, lấy cao nhất
 * Mục còn lại nhận key mới, KHÔNG dùng lại key của mục đã xoá (giữ vết audit).
 */
export function alignSections(old: Section[], parsed: ParsedSection[]): Section[] {
  const keys: (string | null)[] = parsed.map(() => null)
  const used = new Set<number>()

  const pass = (predicate: (o: Section, n: ParsedSection) => boolean) => {
    parsed.forEach((n, i) => {
      if (keys[i] !== null) return
      for (let j = 0; j < old.length; j++) {
        if (used.has(j)) continue
        if (predicate(old[j], n)) {
          keys[i] = String(old[j].section_key)
          used.add(j)
          return
        }
      }
    })
  }

  // 1. heading + level giống nhau
  pass((o, n) => sectionLevel(o) === sectionLevel(n) && (o.heading ?? '') === (n.heading ?? ''))
  // 2. body giống nhau (khác rỗng)
  pass((o, n) => !!(n.body ?? '').trim() && (o.body ?? '') === (n.body ?? ''))

  // 3. tương đồng cao nhất
  parsed.forEach((n, i) => {
    if (keys[i] !== null) return
    let bestJ: number | null = null
    let bestScore = 0
    for (let j = 0; j < old.length; j++) {
      if (used.has(j)) continue
      const score = matchScore(old[j], n)
      if (score > bestScore) { bestScore = score; bestJ = j }
    }
    if (bestJ !== null && bestScore >= SIMILARITY_THRESHOLD) {
      keys[i] = String(old[bestJ].section_key)
      used.add(bestJ)
    }
  })

  // còn lại: key mới, tránh trùng cả key của mục đã bị xoá
  const pool: Section[] = old.map(s => ({
    section_key: String(s.section_key), heading: '', body: '',
  }))
  keys.forEach(k => { if (k) pool.push({ section_key: k, heading: '', body: '' }) })
  keys.forEach((k, i) => {
    if (k === null) {
      const key = nextSectionKey(pool)
      keys[i] = key
      pool.push({ section_key: key, heading: '', body: '' })
    }
  })

  return parsed.map((p, i) => ({
    section_key: keys[i] as string,
    heading: p.heading ?? '',
    heading_level: sectionLevel(p),
    body: p.body ?? '',
  }))
}

/** split + align trong một bước */
export function sectionsFromMarkdown(md: string, old: Section[] = []): Section[] {
  return alignSections(old, splitMarkdown(md))
}

// ── deriveOps ───────────────────────────────────────────────────────────────

/**
 * Sinh section ops biến `old` thành `next` (KHỚP CẢ THỨ TỰ).
 *
 * Thứ tự phát sinh: remove → modify → add → move. Bước move sửa lại vị trí vì
 * op 'add' chỉ chèn được sau một mục neo (after_section_key rỗng = đẩy xuống
 * cuối), nên mục mới ở đầu tài liệu = add + move.
 */
export function deriveOps(old: Section[], next: Section[]): SectionOp[] {
  const oldBy = new Map(old.map(s => [String(s.section_key), s]))
  const nextBy = new Map(next.map(s => [String(s.section_key), s]))
  const ops: SectionOp[] = []

  // 1. remove — theo thứ tự tài liệu cũ
  for (const s of old) {
    const key = String(s.section_key)
    if (!nextBy.has(key)) ops.push({ op: 'remove', section_key: key })
  }

  const work = old.map(s => String(s.section_key)).filter(k => nextBy.has(k))

  // 2. modify — theo thứ tự tài liệu mới để CR đọc từ trên xuống
  for (const s of next) {
    const key = String(s.section_key)
    const o = oldBy.get(key)
    if (!o) continue
    if ((o.heading ?? '') !== (s.heading ?? '')
      || (o.body ?? '') !== (s.body ?? '')
      || sectionLevel(o) !== sectionLevel(s)) {
      ops.push({
        op: 'modify',
        section_key: key,
        heading: s.heading ?? '',
        heading_level: sectionLevel(s),
        body: s.body ?? '',
      })
    }
  }

  // 3. add — neo vào mục đứng trước trong tài liệu mới
  next.forEach((s, i) => {
    const key = String(s.section_key)
    if (oldBy.has(key)) return
    const anchor = i > 0 ? String(next[i - 1].section_key) : null
    ops.push({
      op: 'add',
      section_key: key,
      after_section_key: anchor,
      heading: s.heading ?? '',
      heading_level: sectionLevel(s),
      body: s.body ?? '',
    })
    // mô phỏng đúng applyOps: không thấy neo → đẩy xuống cuối
    const at = anchor ? work.indexOf(anchor) : -1
    if (at >= 0) work.splice(at + 1, 0, key)
    else work.push(key)
  })

  // 4. move — chỉnh thứ tự cho khớp tài liệu mới
  const target = next.map(s => String(s.section_key))
  target.forEach((key, i) => {
    if (i < work.length && work[i] === key) return
    const anchor = i > 0 ? target[i - 1] : null
    ops.push({ op: 'move', section_key: key, after_section_key: anchor })
    work.splice(work.indexOf(key), 1)
    if (!anchor) work.unshift(key)
    else {
      const at = work.indexOf(anchor)
      if (at >= 0) work.splice(at + 1, 0, key)
      else work.push(key)
    }
  })

  return ops
}

/**
 * Markdown mới → { ops, sections }. Dùng cho CR: BA sửa cả file, hệ thống tự
 * suy ra thay đổi cấp mục để review và merge.
 */
export function opsFromMarkdown(current: Section[], md: string): {
  ops: SectionOp[]
  sections: Section[]
} {
  const sections = sectionsFromMarkdown(md, current)
  return { ops: deriveOps(current, sections), sections }
}

/** Kiểm tra nhanh: ops có tái tạo đúng `target` không (dùng trong test + guard UI) */
export function opsReproduce(old: Section[], ops: SectionOp[], target: Section[]): boolean {
  const got = applyOps(old, ops)
  if (got.length !== target.length) return false
  return got.every((s, i) =>
    s.section_key === target[i].section_key
    && s.heading === (target[i].heading ?? '')
    && s.body === (target[i].body ?? '')
    && sectionLevel(s) === sectionLevel(target[i]))
}
