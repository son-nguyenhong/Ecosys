import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CrRegisterView } from '../views/CrRegisterView'
import type { DocCr } from '../../../lib/ba-studio/types'
import type { BaStudioNav } from '../nav'

const NAV: BaStudioNav = {
  goConsole: vi.fn(), goDocs: vi.fn(), goDoc: vi.fn(), goCrs: vi.fn(),
  goCr: vi.fn(), goCompare: vi.fn(), goCompareDoc: vi.fn(), goAi: vi.fn(),
}

function makeCr(over: Partial<DocCr> = {}): DocCr {
  return {
    id: over.id ?? 'cr-1',
    request_code: 'PCR-EMS2-01',
    project_id: 'p1',
    project_code: 'EMS2-UPG-2026',
    project_name: 'EMS 2.0 Upgrading',
    target_doc_id: 'd1',
    doc_code: 'doc-ems2-brs',
    doc_title: 'BRS — EMS 2.0',
    doc_type: 'BRS',
    doc_current_version: 'v2.0',
    title: 'Mở rộng scope tích hợp Collection Support',
    change_type: 'scope',
    priority: 'high',
    stage: 'approved',
    status: 'approved',
    merge_state: 'pending',
    requested_by: 'Hoàng Thị Hòa',
    acceptance: [],
    dependencies: [],
    created_at: '2026-07-02T09:00:00+07:00',
    updated_at: '2026-07-02T09:00:00+07:00',
    delta: { add: 1, modify: 3, remove: 0 },
    ...over,
  }
}

const CRS: DocCr[] = [
  makeCr({ id: 'cr-low', request_code: 'PCR-LOW-01', title: 'CR thấp', priority: 'low' }),
  makeCr({ id: 'cr-crit', request_code: 'PCR-CRIT-02', title: 'CR nghiêm trọng', priority: 'critical' }),
  makeCr({
    id: 'cr-merged', request_code: 'PCR-MERGED-03', title: 'CR đã merge',
    priority: 'medium', merge_state: 'merged', stage: 'implemented', status: 'implemented',
    merged_version: 'v2.0',
  }),
]

describe('CrRegisterView', () => {
  it('sắp xếp giảm theo ưu tiên', () => {
    render(
      <CrRegisterView crs={CRS} filter="all" onFilterChange={vi.fn()} nav={NAV} onCreateCr={vi.fn()} />,
    )
    const codes = screen.getAllByText(/^PCR-/).map(el => el.textContent)
    expect(codes[0]).toBe('PCR-CRIT-02')
    expect(codes[codes.length - 1]).toBe('PCR-LOW-01')
  })

  it('hiển thị số lượng theo từng trạng thái trên bộ lọc', () => {
    render(
      <CrRegisterView crs={CRS} filter="all" onFilterChange={vi.fn()} nav={NAV} onCreateCr={vi.fn()} />,
    )
    expect(screen.getByText('Tất cả (3)')).toBeInTheDocument()
    expect(screen.getByText('Chờ duyệt (2)')).toBeInTheDocument()
    expect(screen.getByText('Đã merge (1)')).toBeInTheDocument()
    expect(screen.getByText('Từ chối (0)')).toBeInTheDocument()
  })

  it('lọc theo merge_state khi filter đổi', () => {
    render(
      <CrRegisterView crs={CRS} filter="merged" onFilterChange={vi.fn()} nav={NAV} onCreateCr={vi.fn()} />,
    )
    expect(screen.getByText('PCR-MERGED-03')).toBeInTheDocument()
    expect(screen.queryByText('PCR-CRIT-02')).not.toBeInTheDocument()
  })

  it('bấm nút bộ lọc gọi onFilterChange', () => {
    const onFilterChange = vi.fn()
    render(
      <CrRegisterView crs={CRS} filter="all" onFilterChange={onFilterChange} nav={NAV} onCreateCr={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('Chờ duyệt (2)'))
    expect(onFilterChange).toHaveBeenCalledWith('pending')
  })

  it('tìm kiếm theo mã CR', () => {
    render(
      <CrRegisterView crs={CRS} filter="all" onFilterChange={vi.fn()} nav={NAV} onCreateCr={vi.fn()} />,
    )
    fireEvent.change(screen.getByPlaceholderText(/Tìm mã CR/), { target: { value: 'MERGED' } })
    expect(screen.getByText('PCR-MERGED-03')).toBeInTheDocument()
    expect(screen.queryByText('PCR-CRIT-02')).not.toBeInTheDocument()
  })

  it('click dòng CR mở chi tiết', () => {
    render(
      <CrRegisterView crs={CRS} filter="all" onFilterChange={vi.fn()} nav={NAV} onCreateCr={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('CR nghiêm trọng'))
    expect(NAV.goCr).toHaveBeenCalledWith('cr-crit')
  })

  it('không có CR nào → empty state, không bảng rỗng', () => {
    render(
      <CrRegisterView crs={[]} filter="all" onFilterChange={vi.fn()} nav={NAV} onCreateCr={vi.fn()} />,
    )
    expect(screen.getByText('Không có Change Request nào')).toBeInTheDocument()
  })
})
