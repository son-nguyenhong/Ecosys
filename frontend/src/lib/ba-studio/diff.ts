/**
 * BA Studio — engine áp ops + diff.
 *
 * applyOps PHẢI cho kết quả y hệt backend/ba-workflow/app/services/section_ops.py:
 * bản preview BA thấy trước khi duyệt do file này tính, còn tài liệu phát hành thật
 * do backend tính. Lệch nhau = phát hành khác bản đã review.
 * Parity fixture: __tests__/diff.test.ts ↔ tests/backend/test_ba_studio.py
 */

import type { Section, SectionOp } from './types'

export type DiffOpKind = 'add' | 'modify' | 'remove' | 'same'

export interface DiffRow {
  op: DiffOpKind
  section_key: string
  before: Section | null
  after: Section | null
  /** mục còn nguyên nhưng đã bị đổi vị trí trong tài liệu */
  moved?: boolean
}

export interface DiffStat {
  add: number
  modify: number
  remove: number
  same: number
  moved: number
}

export const DEFAULT_HEADING_LEVEL = 2

/**
 * heading_level của mục. Snapshot phát hành trước V051 không có trường này:
 * heading rỗng → 0 (phần mở đầu), còn lại → 2.
 * Song song với section_ops.section_level ở backend.
 */
export function sectionLevel(section: { heading?: string | null; heading_level?: number | null }): number {
  const level = section.heading_level
  if (level === undefined || level === null) return section.heading ? DEFAULT_HEADING_LEVEL : 0
  return Number(level)
}

/** ['=' | '-' | '+', token] — whitespace được giữ làm token để tái tạo văn bản */
export type DiffToken = ['=' | '-' | '+', string]

/** Ngưỡng bảo vệ LCS: quá lớn thì diff cả khối thay vì từng từ (README §8.4) */
const LCS_GUARD = 250_000

function normalize(section: Section): Section {
  return {
    section_key: section.section_key,
    heading: section.heading ?? '',
    heading_level: sectionLevel(section),
    body: section.body ?? '',
  }
}

/**
 * Áp tuần tự ops lên sections (không mutate input).
 *  modify : thay heading / heading_level / body của section trùng key
 *           (không tìm thấy → bỏ qua)
 *  remove : loại section khỏi tài liệu
 *  add    : chèn NGAY SAU after_section_key (không thấy/không có → đẩy xuống CUỐI)
 *  move   : đổi vị trí — chèn ngay sau after_section_key (không có → lên ĐẦU)
 *
 * 'add' và 'move' hiểu after_section_key rỗng khác nhau: 'add' giữ nguyên hành vi
 * đã lưu hành từ V049 (xuống cuối), 'move' sinh ra để đưa mục lên đầu.
 */
export function applyOps(sections: Section[], ops: SectionOp[]): Section[] {
  let out: Section[] = sections.map(normalize)

  for (const op of ops) {
    const key = op.section_key

    if (op.op === 'modify') {
      const idx = out.findIndex(s => s.section_key === key)
      if (idx >= 0) {
        out[idx] = {
          section_key: key,
          heading: op.heading ?? out[idx].heading,
          heading_level: op.heading_level ?? out[idx].heading_level,
          body: op.body ?? out[idx].body,
        }
      }
    } else if (op.op === 'remove') {
      out = out.filter(s => s.section_key !== key)
    } else if (op.op === 'add') {
      const created: Section = {
        section_key: key,
        heading: op.heading ?? '',
        heading_level: op.heading_level ?? (op.heading ? DEFAULT_HEADING_LEVEL : 0),
        body: op.body ?? '',
      }
      const anchor = op.after_section_key
      const idx = anchor ? out.findIndex(s => s.section_key === anchor) : -1
      if (idx < 0) out.push(created)
      else out.splice(idx + 1, 0, created)
    } else if (op.op === 'move') {
      const idx = out.findIndex(s => s.section_key === key)
      if (idx < 0) continue
      const [moved] = out.splice(idx, 1)
      const anchor = op.after_section_key
      if (!anchor) {
        out.unshift(moved)
      } else {
        const at = out.findIndex(s => s.section_key === anchor)
        if (at < 0) out.push(moved)
        else out.splice(at + 1, 0, moved)
      }
    }
  }

  return out
}

/**
 * Các mục có ở CẢ HAI bản mà thứ tự tương đối không đổi.
 * Dùng LCS trên chuỗi key chung: mục nằm ngoài LCS = đã bị đổi vị trí.
 * Nhờ so thứ tự TƯƠNG ĐỐI, việc xoá một mục phía trên không làm các mục
 * còn lại bị báo nhầm là "đổi vị trí".
 */
function stableKeys(before: Section[], after: Section[]): Set<string> {
  const inAfter = new Set(after.map(s => s.section_key))
  const inBefore = new Set(before.map(s => s.section_key))
  const A = before.map(s => s.section_key).filter(k => inAfter.has(k))
  const B = after.map(s => s.section_key).filter(k => inBefore.has(k))
  const n = A.length
  const m = B.length
  if (n === 0 || m === 0) return new Set()

  const dp: Uint16Array[] = []
  for (let i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const stable = new Set<string>()
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) { stable.add(A[i]); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return stable
}

/**
 * Ghép 2 danh sách mục theo section_key (KHÔNG theo vị trí) — README §8.3.
 * 1. duyệt after: thiếu ở before → add; khác heading/level/body → modify; giống → same
 * 2. duyệt before: key không còn ở after → chèn row remove vào vị trí xấp xỉ
 * Mục giữ nguyên nội dung nhưng đổi thứ tự tương đối → cờ moved.
 */
export function diffSections(before: Section[], after: Section[]): DiffRow[] {
  const beforeMap = new Map(before.map(s => [s.section_key, s]))
  const afterMap = new Map(after.map(s => [s.section_key, s]))
  const stable = stableKeys(before, after)
  const rows: DiffRow[] = []

  for (const section of after) {
    const prev = beforeMap.get(section.section_key)
    const moved = prev ? !stable.has(section.section_key) : false
    if (!prev) {
      rows.push({ op: 'add', section_key: section.section_key, before: null, after: section })
    } else if (prev.heading !== section.heading
      || prev.body !== section.body
      || sectionLevel(prev) !== sectionLevel(section)) {
      rows.push({ op: 'modify', section_key: section.section_key, before: prev, after: section, moved })
    } else {
      rows.push({ op: 'same', section_key: section.section_key, before: prev, after: section, moved })
    }
  }

  before.forEach((section, i) => {
    if (!afterMap.has(section.section_key)) {
      rows.splice(Math.min(i, rows.length), 0, {
        op: 'remove', section_key: section.section_key, before: section, after: null,
      })
    }
  })

  return rows
}

export function diffStat(rows: DiffRow[]): DiffStat {
  return {
    add: rows.filter(r => r.op === 'add').length,
    modify: rows.filter(r => r.op === 'modify').length,
    remove: rows.filter(r => r.op === 'remove').length,
    same: rows.filter(r => r.op === 'same').length,
    moved: rows.filter(r => r.moved).length,
  }
}

export function diffStatLabel(rows: DiffRow[]): string {
  const s = diffStat(rows)
  const base = `+${s.add} thêm · ~${s.modify} sửa · −${s.remove} xoá · ${s.same} giữ`
  return s.moved > 0 ? `${base} · ⇅${s.moved} đổi vị trí` : base
}

/**
 * Diff mức từ bằng LCS. Token tách theo /(\s+)/ và GIỮ khoảng trắng làm token
 * để render lại đúng văn bản gốc. Ưu tiên '-' khi dp[i+1][j] >= dp[i][j+1]
 * (xoá trước, thêm sau).
 */
export function wordDiff(before: string, after: string): DiffToken[] {
  // giữ khoảng trắng làm token, nhưng bỏ token rỗng do split sinh ra ở đầu/cuối
  const A = String(before ?? '').split(/(\s+)/).filter(t => t !== '')
  const B = String(after ?? '').split(/(\s+)/).filter(t => t !== '')
  const n = A.length
  const m = B.length

  if (n * m > LCS_GUARD) {
    const out: DiffToken[] = []
    if (before) out.push(['-', before])
    if (after) out.push(['+', after])
    return out
  }

  const dp: Uint16Array[] = []
  for (let i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops: DiffToken[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push(['=', A[i]]); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', A[i]]); i++ }
    else { ops.push(['+', B[j]]); j++ }
  }
  while (i < n) { ops.push(['-', A[i]]); i++ }
  while (j < m) { ops.push(['+', B[j]]); j++ }

  return ops
}

/**
 * Gộp ngữ nghĩa cho token diff — chỉ phục vụ HIỂN THỊ.
 *
 * LCS thuần cho ra chuỗi đỏ/xanh xen kẽ từng chữ khi câu bị viết lại
 * ("confetti diff"), rất khó review. Hàm này gom các đoạn thay đổi liền nhau
 * thành một khối "trước" và một khối "sau": các đoạn GIỐNG NHAU quá ngắn
 * (<= maxEqualRun ký tự) nằm giữa hai đoạn thay đổi sẽ được hút vào cả hai bên.
 *
 * Bất biến vẫn giữ: ghép token '=' và '-' ⇒ văn bản cũ; '=' và '+' ⇒ văn bản mới.
 */
export function cleanupSemantic(tokens: DiffToken[], maxEqualRun = 8): DiffToken[] {
  // 1. gộp token liền kề cùng loại thành "run"
  const runs: DiffToken[] = []
  for (const [kind, text] of tokens) {
    const last = runs[runs.length - 1]
    if (last && last[0] === kind) last[1] += text
    else runs.push([kind, text])
  }

  // 2. đánh dấu đoạn '=' ngắn kẹp giữa hai thay đổi → coi như thay đổi
  const absorbed = runs.map(([kind, text], i) => {
    if (kind !== '=') return false
    if (i === 0 || i === runs.length - 1) return false
    if (text.length > maxEqualRun) return false
    return runs[i - 1][0] !== '=' && runs[i + 1][0] !== '='
  })

  // 3. gom từng khối thay đổi thành một cặp (trước, sau)
  const out: DiffToken[] = []
  let i = 0
  while (i < runs.length) {
    const [kind] = runs[i]
    if (kind === '=' && !absorbed[i]) {
      out.push(['=', runs[i][1]])
      i++
      continue
    }
    let before = ''
    let after = ''
    while (i < runs.length && (runs[i][0] !== '=' || absorbed[i])) {
      const [k, t] = runs[i]
      if (k === '-') before += t
      else if (k === '+') after += t
      else { before += t; after += t }   // đoạn giống nhau bị hút vào cả hai bên
      i++
    }
    if (before) out.push(['-', before])
    if (after) out.push(['+', after])
  }

  return out
}

/** Sinh section_key kế tiếp: s1, s2… (bỏ qua key không theo pattern) */
export function nextSectionKey(sections: Section[]): string {
  let max = 0
  for (const s of sections) {
    const key = s.section_key ?? ''
    if (/^s\d+$/.test(key)) max = Math.max(max, Number(key.slice(1)))
  }
  return `s${max + 1}`
}

/** Đếm ops theo loại — cột "Δ Mục" */
export function opsDelta(ops: SectionOp[]): {
  add: number; modify: number; remove: number; move: number
} {
  return {
    add: ops.filter(o => o.op === 'add').length,
    modify: ops.filter(o => o.op === 'modify').length,
    remove: ops.filter(o => o.op === 'remove').length,
    move: ops.filter(o => o.op === 'move').length,
  }
}

/** Kiểm tra ops áp được lên sections hiện tại — song song với validate_ops ở backend */
export function validateOps(ops: SectionOp[], sections: Section[]): string[] {
  const errors: string[] = []
  const keys = sections.map(s => s.section_key)

  ops.forEach((op, index) => {
    const label = `Thay đổi #${index + 1}`
    const key = (op.section_key ?? '').trim()
    if (!key) { errors.push(`${label}: thiếu mã mục`); return }

    const level = op.heading_level
    if (level !== undefined && level !== null && (level < 0 || level > 6)) {
      errors.push(`${label}: cấp tiêu đề phải trong 0..6 (nhận ${level})`); return
    }
    // tiêu đề rỗng chỉ hợp lệ cho phần mở đầu (level 0)
    const needsHeading = (op.op === 'add' || op.op === 'modify')
      && (level === undefined || level === null || level > 0)

    if (op.op === 'add') {
      if (keys.includes(key)) {
        errors.push(`${label}: mã mục '${key}' đã tồn tại, không thể thêm mới`); return
      }
      const anchor = op.after_section_key
      if (anchor && !keys.includes(anchor)) {
        errors.push(`${label}: mục neo '${anchor}' không tồn tại`); return
      }
      if (needsHeading && !(op.heading ?? '').trim()) {
        errors.push(`${label}: mục thêm mới phải có tiêu đề`)
      }
      const at = anchor && keys.includes(anchor) ? keys.indexOf(anchor) + 1 : keys.length
      keys.splice(at, 0, key)
    } else if (op.op === 'modify') {
      if (!keys.includes(key)) {
        errors.push(`${label}: mục '${key}' không tồn tại để sửa`); return
      }
      if (needsHeading && !(op.heading ?? '').trim()) {
        errors.push(`${label}: mục sửa phải có tiêu đề`)
      }
    } else if (op.op === 'remove') {
      if (!keys.includes(key)) {
        errors.push(`${label}: mục '${key}' không tồn tại để xoá`); return
      }
      keys.splice(keys.indexOf(key), 1)
    } else if (op.op === 'move') {
      if (!keys.includes(key)) {
        errors.push(`${label}: mục '${key}' không tồn tại để đổi vị trí`); return
      }
      const anchor = op.after_section_key
      if (anchor === key) {
        errors.push(`${label}: không thể chèn mục '${key}' sau chính nó`); return
      }
      if (anchor && !keys.includes(anchor)) {
        errors.push(`${label}: mục neo '${anchor}' không tồn tại`); return
      }
      keys.splice(keys.indexOf(key), 1)
      keys.splice(anchor ? keys.indexOf(anchor) + 1 : 0, 0, key)
    }
  })

  return errors
}
