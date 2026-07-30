/**
 * Diff THEO DÒNG — dùng cho view "So sánh tài liệu" (kiểu text-compare.com).
 *
 * Khác diff.ts (diff theo MỤC của cùng một Master Doc): ở đây hai bên có thể là
 * hai tài liệu hoàn toàn khác nhau, hoặc văn bản dán tay / file .md tải lên, nên
 * không có section_key để khớp. Đơn vị so sánh là dòng, trong dòng thì highlight
 * tới mức từ bằng chính wordDiff của module.
 *
 * Tuỳ chọn so sánh (bỏ khoảng trắng / bỏ phân biệt hoa-thường / bỏ dòng trống)
 * chỉ ảnh hưởng KHOÁ SO SÁNH; nội dung hiển thị luôn là văn bản gốc.
 */

import { cleanupSemantic, wordDiff, type DiffToken } from './diff'
import { similarity } from './markdown'

export type LineKind = '=' | '-' | '+' | '~'

export interface LineRow {
  kind: LineKind
  /** số dòng bên trái (1-based), null nếu dòng chỉ có ở bên phải */
  leftNo: number | null
  rightNo: number | null
  left: string | null
  right: string | null
  /** diff mức từ — chỉ có ở hàng '~' và khi hai dòng còn đủ giống nhau */
  tokens?: DiffToken[]
}

export interface LineDiffStat {
  same: number
  added: number
  removed: number
  modified: number
  leftLines: number
  rightLines: number
}

export interface LineDiffResult {
  rows: LineRow[]
  stat: LineDiffStat
  /** true = văn bản quá lớn, đã dùng thuật toán rút gọn (đồng bộ theo cửa sổ) */
  degraded: boolean
}

export interface LineDiffOptions {
  ignoreWhitespace?: boolean
  ignoreCase?: boolean
  ignoreBlankLines?: boolean
}

/** Trần ô của bảng LCS; vượt ngưỡng → chuyển sang đồng bộ theo cửa sổ */
const LCS_CELL_GUARD = 4_000_000
/** Cửa sổ tìm điểm đồng bộ lại khi đã rút gọn */
const RESYNC_WINDOW = 200
/** Dưới ngưỡng này thì coi hai dòng là viết lại hoàn toàn, không diff theo từ */
const PAIR_SIMILARITY = 0.25

export function splitLines(text: string): string[] {
  return (text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
}

function lineKey(line: string, opts: LineDiffOptions): string {
  let key = line
  if (opts.ignoreWhitespace) key = key.trim().replace(/\s+/g, ' ')
  if (opts.ignoreCase) key = key.toLowerCase()
  return key
}

type Step = ['=', number, number] | ['-', number] | ['+', number]

/** LCS đầy đủ trên khoảng [i0,i1) × [j0,j1) */
function lcsSteps(A: string[], B: string[], i0: number, i1: number, j0: number, j1: number): Step[] {
  const n = i1 - i0
  const m = j1 - j0
  const dp: Uint32Array[] = []
  for (let i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i0 + i] === B[j0 + j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const steps: Step[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i0 + i] === B[j0 + j]) { steps.push(['=', i0 + i, j0 + j]); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { steps.push(['-', i0 + i]); i++ }
    else { steps.push(['+', j0 + j]); j++ }
  }
  while (i < n) { steps.push(['-', i0 + i]); i++ }
  while (j < m) { steps.push(['+', j0 + j]); j++ }
  return steps
}

/**
 * Đồng bộ theo cửa sổ cho văn bản rất lớn: gặp dòng khác thì dò tối đa
 * RESYNC_WINDOW dòng mỗi bên để tìm điểm giống nhau gần nhất.
 * Diff có thể dài hơn mức tối ưu nhưng chạy trong thời gian tuyến tính.
 */
function windowSteps(A: string[], B: string[]): Step[] {
  const steps: Step[] = []
  let i = 0
  let j = 0
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { steps.push(['=', i, j]); i++; j++; continue }
    let found = false
    for (let d = 1; d <= RESYNC_WINDOW && !found; d++) {
      if (i + d < A.length && A[i + d] === B[j]) {
        for (let k = 0; k < d; k++) steps.push(['-', i + k])
        i += d
        found = true
      } else if (j + d < B.length && A[i] === B[j + d]) {
        for (let k = 0; k < d; k++) steps.push(['+', j + k])
        j += d
        found = true
      }
    }
    if (!found) { steps.push(['-', i]); steps.push(['+', j]); i++; j++ }
  }
  while (i < A.length) { steps.push(['-', i]); i++ }
  while (j < B.length) { steps.push(['+', j]); j++ }
  return steps
}

/**
 * So sánh hai văn bản theo dòng. Các dòng xoá liền kề được ghép cặp với các dòng
 * thêm liền kề thành hàng "sửa" (~) để hai bên nằm ngang nhau khi xem song song —
 * đúng cách text-compare.com trình bày.
 */
export function diffLines(
  leftText: string,
  rightText: string,
  opts: LineDiffOptions = {},
): LineDiffResult {
  const left = splitLines(leftText)
  const right = splitLines(rightText)

  // chỉ mục dòng thực sự đưa vào so sánh (có thể bỏ dòng trống)
  const keep = (line: string) => !opts.ignoreBlankLines || line.trim() !== ''
  const leftIdx = left.map((_, i) => i).filter(i => keep(left[i]))
  const rightIdx = right.map((_, i) => i).filter(i => keep(right[i]))
  const A = leftIdx.map(i => lineKey(left[i], opts))
  const B = rightIdx.map(i => lineKey(right[i], opts))

  // cắt đầu/cuối giống nhau để bảng LCS nhỏ lại
  let head = 0
  while (head < A.length && head < B.length && A[head] === B[head]) head++
  let tail = 0
  while (tail < A.length - head && tail < B.length - head
    && A[A.length - 1 - tail] === B[B.length - 1 - tail]) tail++

  const midN = A.length - head - tail
  const midM = B.length - head - tail
  const degraded = midN * midM > LCS_CELL_GUARD

  const steps: Step[] = []
  for (let k = 0; k < head; k++) steps.push(['=', k, k])
  if (degraded) {
    const subA = A.slice(head, head + midN)
    const subB = B.slice(head, head + midM)
    for (const s of windowSteps(subA, subB)) {
      if (s[0] === '=') steps.push(['=', s[1] + head, s[2] + head])
      else steps.push([s[0], s[1] + head] as Step)
    }
  } else {
    steps.push(...lcsSteps(A, B, head, head + midN, head, head + midM))
  }
  for (let k = tail; k > 0; k--) {
    steps.push(['=', A.length - k, B.length - k])
  }

  // ── gộp '-' và '+' liền kề thành hàng sửa ────────────────────────────────
  const rows: LineRow[] = []
  const stat: LineDiffStat = {
    same: 0, added: 0, removed: 0, modified: 0,
    leftLines: left.length, rightLines: right.length,
  }

  let p = 0
  while (p < steps.length) {
    const step = steps[p]
    if (step[0] === '=') {
      const li = leftIdx[step[1]]
      const ri = rightIdx[step[2]]
      rows.push({
        kind: '=', leftNo: li + 1, rightNo: ri + 1, left: left[li], right: right[ri],
      })
      stat.same++
      p++
      continue
    }

    const dels: number[] = []
    const adds: number[] = []
    while (p < steps.length && steps[p][0] === '-') { dels.push(steps[p][1] as number); p++ }
    while (p < steps.length && steps[p][0] === '+') { adds.push(steps[p][1] as number); p++ }

    const pairs = Math.min(dels.length, adds.length)
    for (let k = 0; k < pairs; k++) {
      const li = leftIdx[dels[k]]
      const ri = rightIdx[adds[k]]
      const a = left[li]
      const b = right[ri]
      const row: LineRow = { kind: '~', leftNo: li + 1, rightNo: ri + 1, left: a, right: b }
      if (similarity(a, b) >= PAIR_SIMILARITY) {
        row.tokens = cleanupSemantic(wordDiff(a, b))
      }
      rows.push(row)
      stat.modified++
    }
    for (let k = pairs; k < dels.length; k++) {
      const li = leftIdx[dels[k]]
      rows.push({ kind: '-', leftNo: li + 1, rightNo: null, left: left[li], right: null })
      stat.removed++
    }
    for (let k = pairs; k < adds.length; k++) {
      const ri = rightIdx[adds[k]]
      rows.push({ kind: '+', leftNo: null, rightNo: ri + 1, left: null, right: right[ri] })
      stat.added++
    }
  }

  return { rows, stat, degraded }
}

export function lineDiffLabel(stat: LineDiffStat): string {
  if (!stat.added && !stat.removed && !stat.modified) return 'Hai văn bản giống nhau hoàn toàn'
  const parts: string[] = []
  if (stat.modified) parts.push(`~${stat.modified} dòng sửa`)
  if (stat.added) parts.push(`+${stat.added} dòng thêm`)
  if (stat.removed) parts.push(`−${stat.removed} dòng xoá`)
  parts.push(`${stat.same} dòng giữ`)
  return parts.join(' · ')
}

/**
 * Nhóm các hàng giống nhau dài thành khối gập lại để bảng không bị loãng.
 * Trả về danh sách phần tử: hàng diff, hoặc mốc "… n dòng giống nhau".
 */
export type CollapsedRow = { type: 'row'; row: LineRow } | { type: 'gap'; count: number; from: number }

export function collapseSame(rows: LineRow[], context = 3, minGap = 8): CollapsedRow[] {
  const changed = rows.map(r => r.kind !== '=')
  const visible = rows.map((_, i) => {
    for (let d = -context; d <= context; d++) {
      if (changed[i + d]) return true
    }
    return false
  })
  const out: CollapsedRow[] = []
  let i = 0
  while (i < rows.length) {
    if (visible[i]) { out.push({ type: 'row', row: rows[i] }); i++; continue }
    let j = i
    while (j < rows.length && !visible[j]) j++
    const count = j - i
    if (count >= minGap) out.push({ type: 'gap', count, from: i })
    else for (let k = i; k < j; k++) out.push({ type: 'row', row: rows[k] })
    i = j
  }
  return out
}
