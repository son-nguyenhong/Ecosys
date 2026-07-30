import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocLibraryView } from '../views/DocLibraryView'
import type { MasterDocListItem } from '../../../lib/ba-studio/types'
import type { BaStudioNav } from '../nav'

const NAV: BaStudioNav = {
  goConsole: vi.fn(), goDocs: vi.fn(), goDoc: vi.fn(), goCrs: vi.fn(),
  goCr: vi.fn(), goCompare: vi.fn(), goCompareDoc: vi.fn(), goAi: vi.fn(),
}

function doc(over: Partial<MasterDocListItem> = {}): MasterDocListItem {
  return {
    id: 'd1', doc_code: 'doc-a-brs', project_id: 'p1', project_code: 'PRJ-A',
    project_name: 'Dự án A', doc_type: 'BRS', title: 'BRS Dự án A', abbr: null,
    owner: 'Nguyễn Văn A', base_version: 'v1.0', base_date: null, base_note: null,
    current_version: 'v2.0', status: 'active',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-05T00:00:00Z',
    section_count: 8, version_count: 2, last_released_on: '2026-01-05',
    cr_pending: 1, cr_merged: 1, cr_rejected: 0,
    ...over,
  }
}

const DOCS: MasterDocListItem[] = [
  doc(),
  doc({
    id: 'd2', doc_code: 'doc-a-fsd', doc_type: 'FSD', title: 'FSD Dự án A',
    owner: 'Trần Thị B', cr_pending: 0, version_count: 1, updated_at: '2026-01-06T00:00:00Z',
  }),
  doc({
    id: 'd3', doc_code: 'doc-b-brs', project_code: 'PRJ-B', project_name: 'Dự án B',
    title: 'BRS Dự án B', owner: 'Nguyễn Văn A', cr_pending: 3,
    updated_at: '2026-01-02T00:00:00Z',
  }),
  doc({
    id: 'd4', doc_code: 'doc-c-brs', project_code: 'PRJ-C', title: 'BRS đã lưu trữ',
    status: 'archived', cr_pending: 0,
  }),
]

function renderView(docs = DOCS) {
  return render(<DocLibraryView docs={docs} nav={NAV} onCreateDoc={vi.fn()} />)
}

describe('DocLibraryView — bảng Master Doc', () => {
  it('hiển thị dạng bảng với các cột chính', () => {
    const { container } = renderView()
    expect(container.querySelector('table')).toBeInTheDocument()
    expect(screen.getByText('Tài liệu')).toBeInTheDocument()
    expect(screen.getByText('Chủ tài liệu')).toBeInTheDocument()
    expect(screen.getByText('Bản hiện hành')).toBeInTheDocument()
    expect(screen.getByText('CR chờ')).toBeInTheDocument()
  })

  it('mặc định nhóm theo Dự án, hiện tiêu đề nhóm và số lượng', () => {
    renderView()
    const groups = screen.getAllByTestId('doc-group').map(g => g.textContent ?? '')
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatch(/PRJ-A · Dự án A/)
    expect(groups[0]).toMatch(/2 tài liệu/)
    expect(groups[0]).toMatch(/1 CR chờ/)
    expect(groups[1]).toMatch(/PRJ-B · Dự án B/)
    expect(groups[1]).toMatch(/3 CR chờ/)
    // tài liệu archived bị lọc mặc định → không có nhóm PRJ-C
    expect(groups.some(g => g.includes('PRJ-C'))).toBe(false)
  })

  it('đổi group by sang Loại tài liệu', () => {
    renderView()
    fireEvent.change(screen.getByLabelText('Nhóm theo'), { target: { value: 'type' } })
    const groups = screen.getAllByTestId('doc-group').map(g => g.textContent ?? '')
    expect(groups[0]).toMatch(/BRS — Business Requirements Specification/)
    expect(groups[1]).toMatch(/FSD — Functional Specification Document/)
    // cột Dự án xuất hiện khi không nhóm theo dự án
    expect(screen.getByText('Dự án')).toBeInTheDocument()
  })

  it('bỏ nhóm → không còn hàng tiêu đề nhóm', () => {
    renderView()
    fireEvent.change(screen.getByLabelText('Nhóm theo'), { target: { value: 'none' } })
    expect(screen.queryAllByTestId('doc-group')).toHaveLength(0)
    expect(screen.getByText('BRS Dự án A')).toBeInTheDocument()
  })

  it('gập / mở nhóm', () => {
    renderView()
    const groupB = () => screen.getAllByTestId('doc-group')
      .find(g => (g.textContent ?? '').includes('PRJ-B'))!
    expect(screen.getByText('BRS Dự án B')).toBeInTheDocument()
    fireEvent.click(groupB())
    expect(screen.queryByText('BRS Dự án B')).toBeNull()
    fireEvent.click(groupB())
    expect(screen.getByText('BRS Dự án B')).toBeInTheDocument()
  })

  it('filter theo dự án', () => {
    renderView()
    fireEvent.change(screen.getByDisplayValue('Mọi dự án'), { target: { value: 'PRJ-B' } })
    expect(screen.getByText('BRS Dự án B')).toBeInTheDocument()
    expect(screen.queryByText('BRS Dự án A')).toBeNull()
  })

  it('filter theo loại tài liệu', () => {
    renderView()
    fireEvent.change(screen.getByDisplayValue('Mọi loại'), { target: { value: 'FSD' } })
    expect(screen.getByText('FSD Dự án A')).toBeInTheDocument()
    expect(screen.queryByText('BRS Dự án A')).toBeNull()
  })

  it('filter theo chủ tài liệu', () => {
    renderView()
    fireEvent.change(screen.getByDisplayValue('Mọi chủ tài liệu'), { target: { value: 'Trần Thị B' } })
    expect(screen.getByText('FSD Dự án A')).toBeInTheDocument()
    expect(screen.queryByText('BRS Dự án B')).toBeNull()
  })

  it('filter trạng thái lưu trữ', () => {
    renderView()
    fireEvent.change(screen.getByDisplayValue('Đang dùng'), { target: { value: 'archived' } })
    expect(screen.getByText('BRS đã lưu trữ')).toBeInTheDocument()
    expect(screen.queryByText('BRS Dự án A')).toBeNull()
  })

  it('tìm kiếm theo từ khoá', () => {
    renderView()
    fireEvent.change(
      screen.getByPlaceholderText(/Tìm theo tiêu đề/),
      { target: { value: 'fsd' } },
    )
    expect(screen.getByText('FSD Dự án A')).toBeInTheDocument()
    expect(screen.queryByText('BRS Dự án A')).toBeNull()
  })

  it('chip filter đang bật xoá được', () => {
    renderView()
    fireEvent.change(screen.getByDisplayValue('Mọi loại'), { target: { value: 'FSD' } })
    const chip = screen.getByText(/Loại: FSD/)
    fireEvent.click(chip)
    expect(screen.getByText('BRS Dự án A')).toBeInTheDocument()
  })

  it('chỉ tài liệu có CR chờ', () => {
    renderView()
    fireEvent.click(screen.getByText('Chỉ tài liệu có CR chờ'))
    expect(screen.getByText('BRS Dự án A')).toBeInTheDocument()
    expect(screen.queryByText('FSD Dự án A')).toBeNull()
  })

  it('sắp xếp theo CR chờ nhiều nhất', () => {
    renderView()
    fireEvent.change(screen.getByLabelText('Nhóm theo'), { target: { value: 'none' } })
    fireEvent.change(screen.getByLabelText('Sắp xếp'), { target: { value: 'pending' } })
    const rows = screen.getAllByText(/^(BRS|FSD) /)
    expect(rows[0].textContent).toBe('BRS Dự án B')
  })

  it('bấm hàng mở chi tiết tài liệu', () => {
    renderView()
    fireEvent.click(screen.getByText('BRS Dự án A'))
    expect(NAV.goDoc).toHaveBeenCalledWith('d1')
  })

  it('không có tài liệu khớp filter → trạng thái rỗng', () => {
    renderView()
    fireEvent.change(
      screen.getByPlaceholderText(/Tìm theo tiêu đề/),
      { target: { value: 'không tồn tại' } },
    )
    expect(screen.getByText('Không có tài liệu nào khớp điều kiện')).toBeInTheDocument()
  })

  it('tổng hợp ở tiêu đề trang', () => {
    renderView()
    expect(screen.getByText(/3\/4 tài liệu/)).toBeInTheDocument()
    expect(screen.getByText(/4 CR đang chờ/)).toBeInTheDocument()
  })
})
