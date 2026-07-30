import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffView } from '../components/DiffView'
import type { Section } from '../../../lib/ba-studio/types'

const BEFORE: Section[] = [
  { section_key: 's1', heading: 'Mục tiêu', body: 'Phạm vi gồm A và B.' },
  { section_key: 's2', heading: 'Tích hợp', body: 'Tích hợp hệ X.' },
  { section_key: 's3', heading: 'Nghiệm thu', body: 'Chạy trên UAT.' },
]
const AFTER: Section[] = [
  { section_key: 's1', heading: 'Mục tiêu', body: 'Phạm vi gồm A, B và C.' },
  { section_key: 's4', heading: 'Rủi ro', body: 'Rủi ro tích hợp.' },
  { section_key: 's2', heading: 'Tích hợp', body: 'Tích hợp hệ X.' },
]

describe('DiffView', () => {
  it('hiển thị mục sửa / thêm / xoá và ẩn mục không đổi', () => {
    render(
      <DiffView before={BEFORE} after={AFTER} mode="inline" showSame={false}
        beforeLabel="v1.0" afterLabel="v2.0" />,
    )
    expect(screen.getByText('Sửa')).toBeInTheDocument()
    expect(screen.getByText('Thêm mục')).toBeInTheDocument()
    expect(screen.getByText('Xoá mục')).toBeInTheDocument()
    expect(screen.queryByText('Giữ')).not.toBeInTheDocument()
    // mục không đổi (s2 "Tích hợp") bị ẩn
    expect(screen.queryByText('Tích hợp')).not.toBeInTheDocument()
  })

  it('bật "Mục không đổi" thì hiện cả mục giữ nguyên', () => {
    render(
      <DiffView before={BEFORE} after={AFTER} mode="inline" showSame
        beforeLabel="v1.0" afterLabel="v2.0" />,
    )
    expect(screen.getByText('Giữ')).toBeInTheDocument()
    expect(screen.getByText('Tích hợp')).toBeInTheDocument()
  })

  it('chế độ song song hiện header Trước / Sau kèm nhãn phiên bản', () => {
    render(
      <DiffView before={BEFORE} after={AFTER} mode="side" showSame={false}
        beforeLabel="v1.0" afterLabel="v2.0 (dự kiến)" />,
    )
    expect(screen.getByText(/Trước · v1\.0/)).toBeInTheDocument()
    expect(screen.getByText(/Sau · v2\.0 \(dự kiến\)/)).toBeInTheDocument()
  })

  it('mục mới ở cột Trước hiện ghost, mục xoá ở cột Sau hiện ghost', () => {
    render(
      <DiffView before={BEFORE} after={AFTER} mode="side" showSame={false}
        beforeLabel="v1.0" afterLabel="v2.0" />,
    )
    expect(screen.getByText('(mục mới — chưa tồn tại)')).toBeInTheDocument()
    expect(screen.getByText('(đã xoá khỏi tài liệu)')).toBeInTheDocument()
  })

  it('không có thay đổi nào → thông báo rõ ràng, không bảng rỗng', () => {
    render(
      <DiffView before={BEFORE} after={BEFORE} mode="inline" showSame={false}
        beforeLabel="v1.0" afterLabel="v1.0" />,
    )
    expect(screen.getByText(/Không có mục nào thay đổi/)).toBeInTheDocument()
    expect(screen.queryByTestId('diff-view')).not.toBeInTheDocument()
  })

  it('highlight mức từ: từ thêm vào được bọc riêng khỏi phần không đổi', () => {
    const { container } = render(
      <DiffView before={BEFORE} after={AFTER} mode="inline" showSame={false}
        beforeLabel="v1.0" afterLabel="v2.0" />,
    )
    // các token đổi được bọc trong <span> có background riêng
    const highlighted = [...container.querySelectorAll('span')]
      .filter(el => (el.getAttribute('style') ?? '').includes('background'))
    expect(highlighted.length).toBeGreaterThan(0)
  })
})


// ── Chế độ xem Markdown (V051) ─────────────────────────────────────────────
const MD_BEFORE: Section[] = [
  {
    section_key: 's1', heading: 'Yêu cầu chức năng', heading_level: 2,
    body: '| Mã | Yêu cầu |\n| --- | --- |\n| FR-1 | Tạo đề nghị |\n\n- điểm cũ',
  },
]
const MD_AFTER: Section[] = [
  {
    section_key: 's1', heading: 'Yêu cầu chức năng', heading_level: 2,
    body: '| Mã | Yêu cầu |\n| --- | --- |\n| FR-1 | Tạo đề nghị |\n| FR-2 | Duyệt đề nghị |\n\n- điểm mới',
  },
]

describe('DiffView — chế độ Markdown', () => {
  it('render bảng Markdown thay vì nguồn .md thô', () => {
    const { container } = render(
      <DiffView before={MD_BEFORE} after={MD_AFTER} mode="side" showSame render="markdown"
        beforeLabel="v1.0" afterLabel="v2.0" />,
    )
    // hai bảng: một bên trước, một bên sau
    expect(container.querySelectorAll('table')).toHaveLength(2)
    expect(screen.getByText('FR-2')).toBeInTheDocument()
    // không còn ký tự nguồn của bảng
    expect(container.textContent).not.toContain('| --- |')
  })

  it('chế độ nguồn .md giữ nguyên văn bản thô để soát từng từ', () => {
    const { container } = render(
      <DiffView before={MD_BEFORE} after={MD_AFTER} mode="side" showSame render="tokens"
        beforeLabel="v1.0" afterLabel="v2.0" />,
    )
    expect(container.querySelectorAll('table')).toHaveLength(0)
    expect(container.textContent).toContain('| --- |')
  })

  it('hợp nhất + Markdown: mục sửa hiện hai khối TRƯỚC / SAU', () => {
    render(
      <DiffView before={MD_BEFORE} after={MD_AFTER} mode="inline" showSame render="markdown"
        beforeLabel="v1.0" afterLabel="v2.0" />,
    )
    expect(screen.getByText('TRƯỚC')).toBeInTheDocument()
    expect(screen.getByText('SAU')).toBeInTheDocument()
    expect(screen.getByText('điểm cũ')).toBeInTheDocument()
    expect(screen.getByText('điểm mới')).toBeInTheDocument()
  })

  it('Markdown + mục thêm mới / xoá vẫn có nhãn loại thay đổi', () => {
    render(
      <DiffView before={BEFORE} after={AFTER} mode="inline" showSame={false} render="markdown"
        beforeLabel="v1.0" afterLabel="v2.0" />,
    )
    expect(screen.getByText('Thêm mục')).toBeInTheDocument()
    expect(screen.getByText('Xoá mục')).toBeInTheDocument()
    expect(screen.getByText('Rủi ro tích hợp.')).toBeInTheDocument()
  })

  it('mục đổi vị trí được đánh dấu ở cả hai chế độ', () => {
    const reordered: Section[] = [BEFORE[2], BEFORE[0], BEFORE[1]]
    render(
      <DiffView before={BEFORE} after={reordered} mode="inline" showSame render="markdown"
        beforeLabel="v1.0" afterLabel="v2.0" />,
    )
    expect(screen.getAllByText('Đổi vị trí').length).toBeGreaterThan(0)
  })

  it('phần mở đầu (heading rỗng) có nhãn riêng, không hiện tiêu đề trống', () => {
    const withPreamble: Section[] = [
      { section_key: 's0', heading: '', heading_level: 0, body: 'Ghi chú đầu tài liệu.' },
    ]
    render(
      <DiffView before={[]} after={withPreamble} mode="inline" showSame render="markdown"
        beforeLabel="—" afterLabel="v1.0" />,
    )
    expect(screen.getByText('(phần mở đầu)')).toBeInTheDocument()
    expect(screen.getByText('Ghi chú đầu tài liệu.')).toBeInTheDocument()
  })
})
