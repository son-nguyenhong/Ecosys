import { describe, it, expect } from 'vitest'
import { applyOps } from '../diff'
import {
  alignSections, deriveOps, joinMarkdown, normalizeMarkdown, opsFromMarkdown, opsReproduce,
  sectionsFromMarkdown, similarity, splitMarkdown,
} from '../markdown'
import type { Section } from '../types'

// ── PARITY FIXTURE — phải giống hệt tests/backend/test_ba_studio.py ─────────
export const PARITY_MD = [
  'Tài liệu nội bộ VIB.',
  '',
  '# BRS — EMS 2.0',
  '',
  'Tổng quan.',
  '',
  '## Mục tiêu',
  '',
  'Tự động hoá chi tiêu.',
  '',
  '- Điểm 1',
  '- Điểm 2',
  '',
  '### Ngoài phạm vi',
  '',
  'Không gồm kế toán.',
  '',
  '## Yêu cầu',
  '',
  '| Mã | Tên |',
  '| --- | --- |',
  '| FR-1 | Tạo đề nghị |',
  '',
  '```sql',
  '-- # không phải heading',
  'SELECT 1;',
  '```',
].join('\n')

const BASE_MD = ['## A', '', 'noi dung A', '', '## B', '', 'noi dung B', '', '## C', '', 'noi dung C'].join('\n')

describe('splitMarkdown', () => {
  it('tách đúng số mục, cấp heading và phần mở đầu (parity fixture)', () => {
    const secs = splitMarkdown(PARITY_MD)
    expect(secs.map(s => [s.heading_level, s.heading])).toEqual([
      [0, ''],
      [1, 'BRS — EMS 2.0'],
      [2, 'Mục tiêu'],
      [3, 'Ngoài phạm vi'],
      [2, 'Yêu cầu'],
    ])
    expect(secs[0].body).toBe('Tài liệu nội bộ VIB.')
  })

  it('không tách heading nằm trong khối code', () => {
    const secs = splitMarkdown(PARITY_MD)
    const last = secs[secs.length - 1]
    expect(last.heading).toBe('Yêu cầu')
    expect(last.body).toContain('-- # không phải heading')
    expect(last.body).toContain('SELECT 1;')
  })

  it('giữ nguyên bảng và danh sách trong body', () => {
    const secs = splitMarkdown(PARITY_MD)
    expect(secs[2].body).toContain('- Điểm 1')
    expect(secs[4].body).toContain('| FR-1 | Tạo đề nghị |')
  })

  it('văn bản rỗng → không có mục nào', () => {
    expect(splitMarkdown('')).toEqual([])
    expect(splitMarkdown('   \n\n  ')).toEqual([])
  })

  it('không có heading → chỉ một mục mở đầu', () => {
    const secs = splitMarkdown('Chỉ là đoạn văn.\n\nĐoạn hai.')
    expect(secs).toHaveLength(1)
    expect(secs[0].heading_level).toBe(0)
    expect(secs[0].body).toBe('Chỉ là đoạn văn.\n\nĐoạn hai.')
  })

  it("'###' trơ trọi không phải heading", () => {
    const secs = splitMarkdown('## A\n\n###\n\nvăn bản')
    expect(secs).toHaveLength(1)
    expect(secs[0].body).toContain('###')
  })

  it('heading không có space sau # → không phải heading (CommonMark)', () => {
    const secs = splitMarkdown('##KhongCoSpace\n\nnội dung')
    expect(secs).toHaveLength(1)
    expect(secs[0].heading_level).toBe(0)
  })
})

describe('normalizeMarkdown', () => {
  it('setext → ATX', () => {
    expect(normalizeMarkdown('Tiêu đề\n===')).toBe('# Tiêu đề')
    expect(normalizeMarkdown('Tiêu đề\n---')).toBe('## Tiêu đề')
  })

  it('--- sau dòng trống vẫn là đường kẻ', () => {
    expect(normalizeMarkdown('văn bản\n\n---\n\nvăn bản')).toBe('văn bản\n\n---\n\nvăn bản')
  })

  it('--- sau item danh sách vẫn là đường kẻ, không thành heading', () => {
    expect(normalizeMarkdown('- item\n---')).toBe('- item\n---')
  })

  it('bỏ thụt lề và closing hashes của heading', () => {
    expect(normalizeMarkdown('   ## Tiêu đề ##')).toBe('## Tiêu đề')
  })

  it('CRLF → LF', () => {
    expect(normalizeMarkdown('a\r\nb\rc')).toBe('a\nb\nc')
  })

  it('idempotent — chạy lần 2 không đổi', () => {
    const once = normalizeMarkdown(PARITY_MD)
    expect(normalizeMarkdown(once)).toBe(once)
  })
})

describe('joinMarkdown', () => {
  it('bất biến: split(join(split(x))) === split(x)', () => {
    const secs = splitMarkdown(PARITY_MD)
    expect(splitMarkdown(joinMarkdown(secs))).toEqual(secs)
  })

  it('join là dạng chuẩn — chạy lại không đổi', () => {
    const once = joinMarkdown(splitMarkdown(PARITY_MD))
    expect(joinMarkdown(splitMarkdown(once))).toBe(once)
  })

  it('phần mở đầu ghép ra không có dòng heading', () => {
    const md = joinMarkdown([{ section_key: 's1', heading: '', heading_level: 0, body: 'Mở đầu' }])
    expect(md).toBe('Mở đầu')
  })

  it('mục không có body chỉ ghép ra dòng heading', () => {
    const md = joinMarkdown([{ section_key: 's1', heading: 'Trống', heading_level: 2, body: '' }])
    expect(md).toBe('## Trống')
  })

  it('snapshot cũ không có heading_level → mặc định ##', () => {
    const md = joinMarkdown([{ section_key: 's1', heading: 'Cũ', body: 'x' } as Section])
    expect(md).toBe('## Cũ\n\nx')
  })
})

describe('alignSections', () => {
  it('tài liệu mới → key s1..sN', () => {
    const secs = sectionsFromMarkdown(BASE_MD)
    expect(secs.map(s => s.section_key)).toEqual(['s1', 's2', 's3'])
  })

  it('đổi tên heading vẫn giữ key (khớp theo body)', () => {
    const old = sectionsFromMarkdown(BASE_MD)
    const next = sectionsFromMarkdown(BASE_MD.replace('## A', '## A đã đổi tên'), old)
    expect(next[0].section_key).toBe('s1')
  })

  it('viết lại body vẫn giữ key (khớp theo heading)', () => {
    const old = sectionsFromMarkdown(BASE_MD)
    const next = sectionsFromMarkdown(BASE_MD.replace('noi dung A', 'hoan toan khac roi'), old)
    expect(next[0].section_key).toBe('s1')
  })

  it('mục hoàn toàn mới nhận key mới, không tái dùng key đã xoá', () => {
    const old = sectionsFromMarkdown(BASE_MD)
    const next = sectionsFromMarkdown('## A\n\nnoi dung A\n\n## Z\n\nnoi dung Z hoan toan moi', old)
    expect(next.map(s => s.section_key)).toEqual(['s1', 's4'])
  })

  it('đổi cấp heading (## → #) vẫn giữ key', () => {
    const old = sectionsFromMarkdown(BASE_MD)
    const next = sectionsFromMarkdown(BASE_MD.replace('## A', '# A'), old)
    expect(next[0].section_key).toBe('s1')
    expect(next[0].heading_level).toBe(1)
  })
})

describe('similarity', () => {
  it('giống hệt → 1, khác hoàn toàn → 0', () => {
    expect(similarity('a b c', 'a b c')).toBe(1)
    expect(similarity('alpha beta', 'gamma delta')).toBe(0)
  })

  it('hai chuỗi rỗng → 1, một rỗng → 0', () => {
    expect(similarity('', '')).toBe(1)
    expect(similarity('x', '')).toBe(0)
  })

  it('bỏ qua dấu câu và hoa/thường, giữ dấu tiếng Việt', () => {
    expect(similarity('Mục tiêu, phạm vi!', 'mục tiêu phạm vi')).toBe(1)
    expect(similarity('phạm vi', 'pham vi')).toBeLessThan(1)
  })
})

// ── deriveOps: bất biến apply_ops(cũ, ops) === mới ─────────────────────────
const SCENARIOS: [string, string][] = [
  ['sửa nội dung', '## A\n\nnoi dung A da sua\n\n## B\n\nnoi dung B\n\n## C\n\nnoi dung C'],
  ['đổi tên heading', '## A moi\n\nnoi dung A\n\n## B\n\nnoi dung B\n\n## C\n\nnoi dung C'],
  ['xoá mục giữa', '## A\n\nnoi dung A\n\n## C\n\nnoi dung C'],
  ['thêm mục cuối', `${BASE_MD}\n\n## D\n\nnoi dung D`],
  ['thêm mục đầu', `## Z\n\nnoi dung Z\n\n${BASE_MD}`],
  ['thêm mục giữa', '## A\n\nnoi dung A\n\n## Z\n\nnoi dung Z\n\n## B\n\nnoi dung B\n\n## C\n\nnoi dung C'],
  ['đảo thứ tự', '## C\n\nnoi dung C\n\n## B\n\nnoi dung B\n\n## A\n\nnoi dung A'],
  ['đổi cấp heading', '# A\n\nnoi dung A\n\n## B\n\nnoi dung B\n\n## C\n\nnoi dung C'],
  ['thêm phần mở đầu', `Mo dau moi\n\n${BASE_MD}`],
  ['viết lại toàn bộ', '## X\n\nhoan toan khac\n\n## Y\n\ncung khac luon'],
  ['giữ nguyên', BASE_MD],
]

describe('deriveOps', () => {
  const old = sectionsFromMarkdown(BASE_MD)

  SCENARIOS.forEach(([name, md]) => {
    it(`tái tạo đúng tài liệu mới — ${name}`, () => {
      const { ops, sections } = opsFromMarkdown(old, md)
      expect(opsReproduce(old, ops, sections)).toBe(true)
      expect(applyOps(old, ops).map(s => s.section_key))
        .toEqual(sections.map(s => s.section_key))
    })
  })

  it('không thay đổi → không sinh op nào', () => {
    expect(opsFromMarkdown(old, BASE_MD).ops).toEqual([])
  })

  it('thêm mục ở đầu = add (xuống cuối) + move (lên đầu)', () => {
    const { ops } = opsFromMarkdown(old, `## Z\n\nnoi dung Z\n\n${BASE_MD}`)
    expect(ops.map(o => o.op)).toEqual(['add', 'move'])
    expect(ops[1].after_section_key ?? null).toBeNull()
  })

  it('đảo thứ tự chỉ sinh op move', () => {
    const { ops } = opsFromMarkdown(old, '## C\n\nnoi dung C\n\n## B\n\nnoi dung B\n\n## A\n\nnoi dung A')
    expect(ops.every(o => o.op === 'move')).toBe(true)
  })

  it('xoá mục sinh đúng 1 op remove', () => {
    const { ops } = opsFromMarkdown(old, '## A\n\nnoi dung A\n\n## C\n\nnoi dung C')
    expect(ops).toEqual([{ op: 'remove', section_key: 's2' }])
  })

  it('deriveOps trên danh sách rỗng → toàn add', () => {
    const target = sectionsFromMarkdown(BASE_MD)
    const ops = deriveOps([], target)
    expect(ops.every(o => o.op === 'add')).toBe(true)
    expect(opsReproduce([], ops, target)).toBe(true)
  })

  it('xoá hết nội dung → toàn remove', () => {
    const ops = deriveOps(old, [])
    expect(ops.every(o => o.op === 'remove')).toBe(true)
    expect(applyOps(old, ops)).toEqual([])
  })

  it('align + derive chịu được tài liệu 60 mục', () => {
    const big = Array.from({ length: 60 }, (_, i) => `## Mục ${i + 1}\n\nNội dung ${i + 1}`).join('\n\n')
    const base = sectionsFromMarkdown(big)
    const edited = big.replace('Nội dung 30', 'Nội dung 30 đã cập nhật')
    const { ops, sections } = opsFromMarkdown(base, edited)
    expect(ops).toHaveLength(1)
    expect(ops[0].op).toBe('modify')
    expect(opsReproduce(base, ops, sections)).toBe(true)
  })
})

describe('alignSections — đầu vào lạ', () => {
  it('mục trùng heading vẫn giữ được key theo thứ tự', () => {
    const md = '## Giống nhau\n\nmột\n\n## Giống nhau\n\nhai'
    const old = sectionsFromMarkdown(md)
    expect(old.map(s => s.section_key)).toEqual(['s1', 's2'])
    const next = alignSections(old, splitMarkdown(md))
    expect(next.map(s => s.section_key)).toEqual(['s1', 's2'])
  })

  it('body rỗng ở cả hai bên không bị khớp sai theo lượt body', () => {
    const old = sectionsFromMarkdown('## A\n\n## B')
    const next = sectionsFromMarkdown('## A\n\n## B', old)
    expect(next.map(s => s.section_key)).toEqual(['s1', 's2'])
  })
})
