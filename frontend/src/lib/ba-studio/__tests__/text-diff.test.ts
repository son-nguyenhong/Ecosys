import { describe, it, expect } from 'vitest'
import { collapseSame, diffLines, lineDiffLabel, splitLines } from '../text-diff'

const A = ['dòng một', 'dòng hai', 'dòng ba', 'dòng bốn'].join('\n')

describe('diffLines', () => {
  it('hai văn bản giống nhau → toàn hàng =', () => {
    const { rows, stat } = diffLines(A, A)
    expect(rows.every(r => r.kind === '=')).toBe(true)
    expect(stat).toMatchObject({ same: 4, added: 0, removed: 0, modified: 0 })
  })

  it('sửa một dòng → hàng ~ có số dòng hai bên', () => {
    const { rows, stat } = diffLines(A, A.replace('dòng hai', 'dòng hai đã sửa'))
    const mod = rows.find(r => r.kind === '~')
    expect(stat.modified).toBe(1)
    expect(mod?.leftNo).toBe(2)
    expect(mod?.rightNo).toBe(2)
    expect(mod?.left).toBe('dòng hai')
    expect(mod?.right).toBe('dòng hai đã sửa')
  })

  it('hàng ~ có token diff mức từ, tái tạo lại được cả hai bên', () => {
    const { rows } = diffLines('Tích hợp với ESD Portal.', 'Tích hợp hai chiều với ESD Portal.')
    const row = rows.find(r => r.kind === '~')
    expect(row?.tokens).toBeTruthy()
    const tokens = row!.tokens!
    expect(tokens.filter(([k]) => k !== '+').map(([, t]) => t).join('')).toBe('Tích hợp với ESD Portal.')
    expect(tokens.filter(([k]) => k !== '-').map(([, t]) => t).join(''))
      .toBe('Tích hợp hai chiều với ESD Portal.')
  })

  it('dòng thay hoàn toàn (không còn giống) → không diff theo từ', () => {
    const { rows } = diffLines('alpha beta gamma', 'khong lien quan gi ca')
    const row = rows.find(r => r.kind === '~')
    expect(row?.tokens).toBeUndefined()
  })

  it('thêm dòng ở cuối → hàng +', () => {
    const { rows, stat } = diffLines(A, `${A}\ndòng năm`)
    expect(stat.added).toBe(1)
    const added = rows[rows.length - 1]
    expect(added.kind).toBe('+')
    expect(added.leftNo).toBeNull()
    expect(added.rightNo).toBe(5)
  })

  it('xoá dòng ở đầu → hàng −', () => {
    const { rows, stat } = diffLines(A, ['dòng hai', 'dòng ba', 'dòng bốn'].join('\n'))
    expect(stat.removed).toBe(1)
    expect(rows[0].kind).toBe('-')
    expect(rows[0].leftNo).toBe(1)
    expect(rows[0].rightNo).toBeNull()
  })

  it('bỏ khoảng trắng: chỉ khác thụt lề → coi như giống nhau', () => {
    const left = 'a\n    b'
    const right = 'a\nb'
    expect(diffLines(left, right).stat.modified).toBe(1)
    expect(diffLines(left, right, { ignoreWhitespace: true }).stat.same).toBe(2)
  })

  it('bỏ hoa/thường', () => {
    expect(diffLines('Alpha', 'alpha').stat.modified).toBe(1)
    expect(diffLines('Alpha', 'alpha', { ignoreCase: true }).stat.same).toBe(1)
  })

  it('bỏ dòng trống', () => {
    const withBlank = 'a\n\n\nb'
    expect(diffLines(withBlank, 'a\nb', { ignoreBlankLines: true }).stat.same).toBe(2)
  })

  it('số dòng hiển thị luôn theo văn bản GỐC dù bỏ dòng trống', () => {
    const { rows } = diffLines('a\n\nb', 'a\n\nb sửa', { ignoreBlankLines: true })
    const mod = rows.find(r => r.kind === '~')
    expect(mod?.leftNo).toBe(3)
    expect(mod?.rightNo).toBe(3)
  })

  it('văn bản rỗng một bên → toàn hàng thêm', () => {
    const { rows, stat } = diffLines('', A)
    expect(stat.added).toBeGreaterThan(0)
    expect(rows.every(r => r.kind === '+' || r.kind === '~' || r.kind === '=')).toBe(true)
  })

  it('thống kê giữ nguyên tổng số dòng gốc', () => {
    const { stat } = diffLines(A, `${A}\nnữa`)
    expect(stat.leftLines).toBe(4)
    expect(stat.rightLines).toBe(5)
  })

  it('văn bản lớn: chạy nhanh và bật cờ rút gọn', () => {
    const big1 = Array.from({ length: 2600 }, (_, i) => `dòng ${i}`).join('\n')
    const big2 = Array.from({ length: 2600 }, (_, i) => `dòng ${i % 2 ? i : i + 10000}`).join('\n')
    const t0 = Date.now()
    const res = diffLines(big1, big2)
    expect(Date.now() - t0).toBeLessThan(8000)
    expect(res.degraded).toBe(true)
    expect(res.rows.length).toBeGreaterThan(0)
  })

  it('nhãn thống kê', () => {
    expect(lineDiffLabel(diffLines(A, A).stat)).toContain('giống nhau hoàn toàn')
    const label = lineDiffLabel(diffLines(A, `${A}\nx`).stat)
    expect(label).toContain('+1 dòng thêm')
  })
})

describe('splitLines', () => {
  it('chuẩn hoá CRLF', () => {
    expect(splitLines('a\r\nb\rc')).toEqual(['a', 'b', 'c'])
  })

  it('văn bản rỗng → một dòng rỗng', () => {
    expect(splitLines('')).toEqual([''])
  })
})

describe('collapseSame', () => {
  it('gập khối dòng giống nhau dài, giữ context quanh chỗ khác', () => {
    const left = Array.from({ length: 40 }, (_, i) => `dòng ${i}`).join('\n')
    const right = left.replace('dòng 20', 'dòng 20 sửa')
    const { rows } = diffLines(left, right)
    const collapsed = collapseSame(rows)
    const gaps = collapsed.filter(c => c.type === 'gap')
    expect(gaps.length).toBe(2)
    expect(collapsed.filter(c => c.type === 'row').length).toBeLessThan(rows.length)
    // hàng thay đổi luôn còn trong danh sách
    expect(collapsed.some(c => c.type === 'row' && c.row.kind === '~')).toBe(true)
  })

  it('khối giống nhau ngắn thì không gập (đọc liền mạch hơn)', () => {
    const { rows } = diffLines('a\nb\nc', 'a sửa\nb\nc sửa')
    const collapsed = collapseSame(rows)
    expect(collapsed.every(c => c.type === 'row')).toBe(true)
  })

  it('không có gì thay đổi → gập hết thành 1 mốc', () => {
    const { rows } = diffLines(
      Array.from({ length: 30 }, (_, i) => `x${i}`).join('\n'),
      Array.from({ length: 30 }, (_, i) => `x${i}`).join('\n'),
    )
    const collapsed = collapseSame(rows)
    expect(collapsed).toEqual([{ type: 'gap', count: 30, from: 0 }])
  })
})
