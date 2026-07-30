import { describe, it, expect } from 'vitest'
import {
  applyOps, cleanupSemantic, diffSections, diffStat, diffStatLabel, wordDiff,
  nextSectionKey, opsDelta, validateOps,
} from '../diff'
import type { Section, SectionOp } from '../types'

// ── PARITY FIXTURE — phải giống hệt tests/backend/test_ba_studio.py ─────────
const PARITY_SECTIONS: Section[] = [
  { section_key: 's1', heading: 'Mục tiêu', heading_level: 2, body: 'Phạm vi gồm A và B.' },
  { section_key: 's2', heading: 'Tích hợp', heading_level: 2, body: 'Tích hợp hệ X.' },
  { section_key: 's3', heading: 'Nghiệm thu', heading_level: 2, body: 'Chạy trên UAT.' },
]
const PARITY_OPS: SectionOp[] = [
  { op: 'modify', section_key: 's1', heading: 'Mục tiêu', body: 'Phạm vi gồm A, B và C.' },
  { op: 'add', section_key: 's4', after_section_key: 's1', heading: 'Rủi ro', body: 'Rủi ro tích hợp.' },
  { op: 'remove', section_key: 's3' },
]
const PARITY_EXPECTED: Section[] = [
  { section_key: 's1', heading: 'Mục tiêu', heading_level: 2, body: 'Phạm vi gồm A, B và C.' },
  { section_key: 's4', heading: 'Rủi ro', heading_level: 2, body: 'Rủi ro tích hợp.' },
  { section_key: 's2', heading: 'Tích hợp', heading_level: 2, body: 'Tích hợp hệ X.' },
]

describe('applyOps', () => {
  it('khớp fixture parity với backend section_ops.apply_ops', () => {
    expect(applyOps(PARITY_SECTIONS, PARITY_OPS)).toEqual(PARITY_EXPECTED)
  })

  it('modify thay heading + body', () => {
    const out = applyOps(PARITY_SECTIONS, [
      { op: 'modify', section_key: 's2', heading: 'Tích hợp mới', body: 'Nội dung mới.' },
    ])
    expect(out[1]).toEqual({
      section_key: 's2', heading: 'Tích hợp mới', heading_level: 2, body: 'Nội dung mới.',
    })
  })

  it('không mutate input', () => {
    applyOps(PARITY_SECTIONS, PARITY_OPS)
    expect(PARITY_SECTIONS[0].body).toBe('Phạm vi gồm A và B.')
    expect(PARITY_SECTIONS).toHaveLength(3)
  })

  it('remove loại mục khỏi tài liệu', () => {
    const out = applyOps(PARITY_SECTIONS, [{ op: 'remove', section_key: 's2' }])
    expect(out.map(s => s.section_key)).toEqual(['s1', 's3'])
  })

  it('add chèn ngay sau mục neo', () => {
    const out = applyOps(PARITY_SECTIONS, [
      { op: 'add', section_key: 's9', after_section_key: 's1', heading: 'Mục mới', body: 'x' },
    ])
    expect(out.map(s => s.section_key)).toEqual(['s1', 's9', 's2', 's3'])
  })

  it('add không có neo → đẩy xuống cuối', () => {
    const out = applyOps(PARITY_SECTIONS, [
      { op: 'add', section_key: 's9', heading: 'Cuối', body: 'x' },
    ])
    expect(out[out.length - 1].section_key).toBe('s9')
  })

  it('add với neo không tồn tại → đẩy xuống cuối', () => {
    const out = applyOps(PARITY_SECTIONS, [
      { op: 'add', section_key: 's9', after_section_key: 'sZZ', heading: 'Cuối', body: 'x' },
    ])
    expect(out[out.length - 1].section_key).toBe('s9')
  })

  it('modify mục không tồn tại → bỏ qua, không lỗi', () => {
    const out = applyOps(PARITY_SECTIONS, [
      { op: 'modify', section_key: 's99', heading: 'H', body: 'B' },
    ])
    expect(out).toHaveLength(3)
  })

  it('áp ops theo đúng thứ tự (add rồi remove cùng key → mất)', () => {
    const out = applyOps(PARITY_SECTIONS, [
      { op: 'add', section_key: 's4', after_section_key: 's1', heading: 'A', body: 'b' },
      { op: 'remove', section_key: 's4' },
    ])
    expect(out.some(s => s.section_key === 's4')).toBe(false)
  })
})

describe('diffSections', () => {
  it('phân loại add / modify / remove / same', () => {
    const after = applyOps(PARITY_SECTIONS, PARITY_OPS)
    const rows = diffSections(PARITY_SECTIONS, after)
    const byKey = Object.fromEntries(rows.map(r => [r.section_key, r.op]))
    expect(byKey.s1).toBe('modify')
    expect(byKey.s4).toBe('add')
    expect(byKey.s2).toBe('same')
    expect(byKey.s3).toBe('remove')
  })

  it('ghép theo section_key, không theo vị trí', () => {
    const reordered: Section[] = [PARITY_SECTIONS[2], PARITY_SECTIONS[0], PARITY_SECTIONS[1]]
    const rows = diffSections(PARITY_SECTIONS, reordered)
    expect(rows.every(r => r.op === 'same')).toBe(true)
    // nội dung không đổi nhưng thứ tự đổi → cờ moved bật cho mục bị dịch
    expect(rows.some(r => r.moved)).toBe(true)
  })

  it('thống kê và nhãn thống kê', () => {
    const after = applyOps(PARITY_SECTIONS, PARITY_OPS)
    const rows = diffSections(PARITY_SECTIONS, after)
    expect(diffStat(rows)).toEqual({ add: 1, modify: 1, remove: 1, same: 1, moved: 0 })
    expect(diffStatLabel(rows)).toBe('+1 thêm · ~1 sửa · −1 xoá · 1 giữ')
  })

  it('tài liệu rỗng → chỉ có add', () => {
    const rows = diffSections([], PARITY_SECTIONS)
    expect(rows.map(r => r.op)).toEqual(['add', 'add', 'add'])
  })

  it('xoá hết → chỉ có remove', () => {
    const rows = diffSections(PARITY_SECTIONS, [])
    expect(rows.map(r => r.op)).toEqual(['remove', 'remove', 'remove'])
  })
})

describe('wordDiff', () => {
  it('văn bản giống nhau → toàn token =', () => {
    const ops = wordDiff('Phạm vi gồm A và B.', 'Phạm vi gồm A và B.')
    expect(ops.every(([kind]) => kind === '=')).toBe(true)
  })

  it('nhận ra từ thêm vào', () => {
    const ops = wordDiff('Phạm vi gồm A và B.', 'Phạm vi gồm A, B và C.')
    const added = ops.filter(([k]) => k === '+').map(([, t]) => t).join('')
    expect(added.length).toBeGreaterThan(0)
    // tái tạo lại được văn bản mới từ token '=' và '+'
    const rebuilt = ops.filter(([k]) => k !== '-').map(([, t]) => t).join('')
    expect(rebuilt).toBe('Phạm vi gồm A, B và C.')
  })

  it('tái tạo được văn bản cũ từ token = và -', () => {
    const before = 'Hệ thống tích hợp với ESD Portal và hệ kế toán lõi.'
    const after = 'Hệ thống tích hợp hai chiều với ESD Portal, Collection Support và hệ kế toán lõi.'
    const ops = wordDiff(before, after)
    expect(ops.filter(([k]) => k !== '+').map(([, t]) => t).join('')).toBe(before)
    expect(ops.filter(([k]) => k !== '-').map(([, t]) => t).join('')).toBe(after)
  })

  it('giữ khoảng trắng làm token riêng', () => {
    const ops = wordDiff('a b', 'a b')
    expect(ops.map(([, t]) => t)).toEqual(['a', ' ', 'b'])
  })

  it('từ rỗng → chỉ thêm', () => {
    const ops = wordDiff('', 'Nội dung mới')
    expect(ops.every(([k]) => k === '+')).toBe(true)
  })

  it('guard n*m > 250000 → diff cả khối, không treo', () => {
    const long = 'từ '.repeat(400)          // 400 từ → ~800 token
    const long2 = 'chữ '.repeat(400)
    const started = Date.now()
    const ops = wordDiff(long, long2)
    expect(Date.now() - started).toBeLessThan(2000)
    expect(ops).toEqual([['-', long], ['+', long2]])
  })
})

describe('helpers', () => {
  it('nextSectionKey', () => {
    expect(nextSectionKey([])).toBe('s1')
    expect(nextSectionKey(PARITY_SECTIONS)).toBe('s4')
    expect(nextSectionKey([{ section_key: 'intro', heading: 'x', body: '' }])).toBe('s1')
  })

  it('opsDelta', () => {
    expect(opsDelta(PARITY_OPS)).toEqual({ add: 1, modify: 1, remove: 1, move: 0 })
  })
})

describe('validateOps', () => {
  it('ops hợp lệ → không lỗi', () => {
    expect(validateOps(PARITY_OPS, PARITY_SECTIONS)).toEqual([])
  })

  it('modify mục không tồn tại', () => {
    const errs = validateOps([{ op: 'modify', section_key: 's99', heading: 'H', body: 'B' }], PARITY_SECTIONS)
    expect(errs).toHaveLength(1)
    expect(errs[0]).toContain('không tồn tại')
  })

  it('add trùng mã mục', () => {
    const errs = validateOps([{ op: 'add', section_key: 's1', heading: 'H', body: 'B' }], PARITY_SECTIONS)
    expect(errs[0]).toContain('đã tồn tại')
  })

  it('add thiếu tiêu đề', () => {
    const errs = validateOps([{ op: 'add', section_key: 's9', heading: '  ', body: 'B' }], PARITY_SECTIONS)
    expect(errs[0]).toContain('tiêu đề')
  })

  it('add rồi modify cùng mục → hợp lệ', () => {
    const errs = validateOps([
      { op: 'add', section_key: 's4', after_section_key: 's1', heading: 'H', body: 'B' },
      { op: 'modify', section_key: 's4', heading: 'H2', body: 'B2' },
    ], PARITY_SECTIONS)
    expect(errs).toEqual([])
  })

  it('xoá 2 lần cùng mục → lỗi', () => {
    const errs = validateOps([
      { op: 'remove', section_key: 's3' },
      { op: 'remove', section_key: 's3' },
    ], PARITY_SECTIONS)
    expect(errs).toHaveLength(1)
  })
})

describe('cleanupSemantic', () => {
  it('gom khối thay đổi thành một cặp trước/sau thay vì vụn từng chữ', () => {
    const raw = wordDiff(
      'Giai đoạn UAT dự kiến bắt đầu tuần đầu tháng 8 và kéo dài 3 tuần.',
      'Giai đoạn UAT được lùi 2 tuần, dự kiến bắt đầu tuần thứ ba của tháng 8 và kéo dài 3 tuần.',
    )
    const clean = cleanupSemantic(raw)
    const rawChanges = raw.filter(([k]) => k !== '=').length
    const cleanChanges = clean.filter(([k]) => k !== '=').length
    expect(cleanChanges).toBeLessThan(rawChanges)
  })

  it('giữ bất biến: = và - tái tạo văn bản cũ, = và + tái tạo văn bản mới', () => {
    const before = 'Hệ thống tích hợp với ESD Portal và hệ kế toán lõi để hạch toán chi phí.'
    const after = 'Hệ thống tích hợp hai chiều với ESD Portal, Collection Support và hệ kế toán lõi.'
    const clean = cleanupSemantic(wordDiff(before, after))
    expect(clean.filter(([k]) => k !== '+').map(([, t]) => t).join('')).toBe(before)
    expect(clean.filter(([k]) => k !== '-').map(([, t]) => t).join('')).toBe(after)
  })

  it('văn bản không đổi → một token = duy nhất', () => {
    const clean = cleanupSemantic(wordDiff('Nội dung giữ nguyên.', 'Nội dung giữ nguyên.'))
    expect(clean).toEqual([['=', 'Nội dung giữ nguyên.']])
  })

  it('thay hoàn toàn → đúng 1 khối xoá + 1 khối thêm', () => {
    const clean = cleanupSemantic(wordDiff('alpha beta', 'gamma delta'))
    expect(clean.filter(([k]) => k === '-')).toHaveLength(1)
    expect(clean.filter(([k]) => k === '+')).toHaveLength(1)
  })

  it('đoạn giống nhau dài vẫn được giữ nguyên làm mốc đọc', () => {
    const before = 'Phần đầu giữ nguyên hoàn toàn không thay đổi gì cả. Đoạn cuối cũ.'
    const after = 'Phần đầu giữ nguyên hoàn toàn không thay đổi gì cả. Đoạn cuối mới.'
    const clean = cleanupSemantic(wordDiff(before, after))
    const equalRun = clean.find(([k, t]) => k === '=' && t.includes('không thay đổi gì cả'))
    expect(equalRun).toBeTruthy()
  })
})

// ── op 'move' (V051) ────────────────────────────────────────────────────────
describe('applyOps — op move', () => {
  it('move không có neo → đưa lên đầu tài liệu', () => {
    const out = applyOps(PARITY_SECTIONS, [{ op: 'move', section_key: 's3' }])
    expect(out.map(s => s.section_key)).toEqual(['s3', 's1', 's2'])
  })

  it('move có neo → chèn ngay sau neo', () => {
    const out = applyOps(PARITY_SECTIONS, [
      { op: 'move', section_key: 's1', after_section_key: 's2' },
    ])
    expect(out.map(s => s.section_key)).toEqual(['s2', 's1', 's3'])
  })

  it('move mục không tồn tại → bỏ qua, không lỗi', () => {
    const out = applyOps(PARITY_SECTIONS, [{ op: 'move', section_key: 'sZZ' }])
    expect(out.map(s => s.section_key)).toEqual(['s1', 's2', 's3'])
  })

  it('move với neo không tồn tại → đẩy xuống cuối', () => {
    const out = applyOps(PARITY_SECTIONS, [
      { op: 'move', section_key: 's1', after_section_key: 'sZZ' },
    ])
    expect(out.map(s => s.section_key)).toEqual(['s2', 's3', 's1'])
  })

  it('move giữ nguyên nội dung mục', () => {
    const out = applyOps(PARITY_SECTIONS, [{ op: 'move', section_key: 's3' }])
    expect(out[0]).toEqual({
      section_key: 's3', heading: 'Nghiệm thu', heading_level: 2, body: 'Chạy trên UAT.',
    })
  })

  it('validateOps: move mục không tồn tại / neo không tồn tại / neo là chính nó', () => {
    expect(validateOps([{ op: 'move', section_key: 'sZZ' }], PARITY_SECTIONS)[0])
      .toContain('không tồn tại')
    expect(validateOps(
      [{ op: 'move', section_key: 's1', after_section_key: 'sZZ' }], PARITY_SECTIONS,
    )[0]).toContain('mục neo')
    expect(validateOps(
      [{ op: 'move', section_key: 's1', after_section_key: 's1' }], PARITY_SECTIONS,
    )[0]).toContain('sau chính nó')
  })

  it('heading_level đổi qua modify', () => {
    const out = applyOps(PARITY_SECTIONS, [
      { op: 'modify', section_key: 's1', heading: 'Mục tiêu', heading_level: 1, body: 'x' },
    ])
    expect(out[0].heading_level).toBe(1)
  })

  it('mục mở đầu (level 0, heading rỗng) hợp lệ với validateOps', () => {
    expect(validateOps(
      [{ op: 'add', section_key: 's0', heading: '', heading_level: 0, body: 'Mở đầu' }],
      PARITY_SECTIONS,
    )).toEqual([])
  })

  it('heading rỗng ở level > 0 → lỗi', () => {
    expect(validateOps(
      [{ op: 'add', section_key: 's9', heading: '', heading_level: 2, body: 'x' }],
      PARITY_SECTIONS,
    )[0]).toContain('tiêu đề')
  })
})

describe('diffSections — đổi vị trí', () => {
  it('xoá mục phía trên KHÔNG làm mục dưới bị báo đổi vị trí', () => {
    const after = applyOps(PARITY_SECTIONS, [{ op: 'remove', section_key: 's1' }])
    const rows = diffSections(PARITY_SECTIONS, after)
    expect(rows.filter(r => r.moved)).toHaveLength(0)
  })

  it('đảo thứ tự → đúng số mục bị đánh dấu đổi vị trí', () => {
    const after = applyOps(PARITY_SECTIONS, [
      { op: 'move', section_key: 's3' },
    ])
    const rows = diffSections(PARITY_SECTIONS, after)
    expect(rows.filter(r => r.moved).map(r => r.section_key)).toEqual(['s3'])
    expect(diffStatLabel(rows)).toContain('đổi vị trí')
  })
})
