import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompareDocView } from '../views/CompareDocView'
import type { MasterDocDetail, MasterDocListItem } from '../../../lib/ba-studio/types'

const getDoc = vi.fn()
vi.mock('../../../api/ba-studio', () => ({ getDoc: (id: string) => getDoc(id) }))

function listItem(over: Partial<MasterDocListItem> = {}): MasterDocListItem {
  return {
    id: 'd1', doc_code: 'doc-a', project_id: 'p1', project_code: 'PRJ-A', project_name: 'Dự án A',
    doc_type: 'BRS', title: 'BRS A', abbr: null, owner: 'Nguyễn A',
    base_version: 'v1.0', base_date: null, base_note: null, current_version: 'v2.0',
    status: 'active', created_at: '2026-01-01', updated_at: '2026-01-02',
    section_count: 2, version_count: 2, last_released_on: '2026-01-02',
    cr_pending: 0, cr_merged: 1, cr_rejected: 0,
    ...over,
  }
}

function detail(id: string, content: string, over: Partial<MasterDocDetail> = {}): MasterDocDetail {
  return {
    ...listItem({ id, doc_code: `doc-${id}` }),
    sections: [{ section_key: 's1', heading: 'Mục tiêu', heading_level: 2, body: content }],
    content_md: `## Mục tiêu\n\n${content}`,
    versions: [{
      id: `${id}-v1`, version_label: 'v1.0', seq: 1, kind: 'base', note: null,
      released_on: '2026-01-01', released_by: 'BA',
      sections: [{ section_key: 's1', heading: 'Mục tiêu', heading_level: 2, body: 'nội dung bản gốc' }],
      content_md: '## Mục tiêu\n\nnội dung bản gốc',
    }],
    change_requests: [],
    next_section_key: 's2',
    next_version_label: 'v3.0',
    editable_sections: false,
    ...over,
  } as MasterDocDetail
}

const DOCS = [listItem({ id: 'd1', title: 'BRS A' }), listItem({ id: 'd2', title: 'FSD B', doc_type: 'FSD' })]

describe('CompareDocView', () => {
  beforeEach(() => {
    getDoc.mockReset()
    getDoc.mockImplementation((id: string) => Promise.resolve(
      id === 'd1' ? detail('d1', 'dòng một\ndòng hai') : detail('d2', 'dòng một\ndòng hai đã sửa'),
    ))
  })

  it('so sánh hai tài liệu khác nhau và hiện thống kê khác biệt', async () => {
    render(<CompareDocView docs={DOCS} initialLeftDocId="d1" initialRightDocId="d2" onError={vi.fn()} />)
    await waitFor(() => expect(getDoc).toHaveBeenCalledWith('d1'))
    await waitFor(() => {
      expect(screen.getByTestId('line-diff-stat').textContent).toMatch(/dòng sửa/)
    })
  })

  it('hai bên giống nhau → báo giống nhau hoàn toàn', async () => {
    getDoc.mockImplementation((id: string) => Promise.resolve(detail(id, 'y hệt nhau')))
    render(<CompareDocView docs={DOCS} initialLeftDocId="d1" initialRightDocId="d2" onError={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByTestId('line-diff-stat').textContent).toContain('giống nhau hoàn toàn')
    })
  })

  it('dán văn bản trực tiếp ở cả hai bên', async () => {
    render(<CompareDocView docs={[]} onError={vi.fn()} />)
    fireEvent.change(screen.getByTestId('cmp-text-left'), { target: { value: 'alpha\nbeta' } })
    fireEvent.change(screen.getByTestId('cmp-text-right'), { target: { value: 'alpha\ngamma' } })
    await waitFor(() => {
      expect(screen.getByTestId('line-diff-stat').textContent).toMatch(/1 dòng sửa/)
    })
  })

  it('đổi chiều hoán vị hai bên', async () => {
    render(<CompareDocView docs={[]} onError={vi.fn()} />)
    fireEvent.change(screen.getByTestId('cmp-text-left'), { target: { value: 'chỉ bên trái' } })
    fireEvent.click(screen.getByText('Đổi chiều'))
    await waitFor(() => {
      expect((screen.getByTestId('cmp-text-right') as HTMLTextAreaElement).value).toBe('chỉ bên trái')
      expect((screen.getByTestId('cmp-text-left') as HTMLTextAreaElement).value).toBe('')
    })
  })

  it('chọn phiên bản cũ của tài liệu để so sánh', async () => {
    render(<CompareDocView docs={DOCS} initialLeftDocId="d1" initialRightDocId="d2" onError={vi.fn()} />)
    await waitFor(() => expect(getDoc).toHaveBeenCalledWith('d1'))
    const versionSelect = await screen.findByLabelText('Phiên bản bên trái')
    fireEvent.change(versionSelect, { target: { value: 'v1.0' } })
    await waitFor(() => {
      expect(screen.getByTestId('line-diff-stat').textContent).toMatch(/dòng/)
    })
  })

  it('chưa có nội dung → hiện trạng thái rỗng', () => {
    render(<CompareDocView docs={[]} onError={vi.fn()} />)
    expect(screen.getByText('Chưa có gì để so sánh')).toBeInTheDocument()
  })

  it('lỗi tải tài liệu được báo ra ngoài', async () => {
    const onError = vi.fn()
    getDoc.mockRejectedValue(new Error('Tài liệu không tồn tại'))
    render(<CompareDocView docs={DOCS} initialLeftDocId="d1" onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Tài liệu không tồn tại'))
  })

  it('bật tắt "Chỉ dòng khác" không làm mất hàng thay đổi', async () => {
    render(<CompareDocView docs={[]} onError={vi.fn()} />)
    const left = Array.from({ length: 30 }, (_, i) => `dòng ${i}`).join('\n')
    fireEvent.change(screen.getByTestId('cmp-text-left'), { target: { value: left } })
    fireEvent.change(screen.getByTestId('cmp-text-right'), {
      target: { value: left.replace('dòng 15', 'dòng 15 sửa') },
    })
    // gập hai khối giống nhau (trước và sau dòng đã sửa), vẫn giữ hàng thay đổi
    await waitFor(() => expect(screen.getAllByText(/dòng giống nhau/)).toHaveLength(2))
    const stat = () => screen.getByTestId('line-diff-stat').textContent ?? ''
    expect(stat()).toMatch(/1 dòng sửa/)
    fireEvent.click(screen.getByText('Chỉ dòng khác'))
    await waitFor(() => expect(screen.queryAllByText(/dòng giống nhau/)).toHaveLength(0))
    expect(stat()).toMatch(/1 dòng sửa/)
    // xem song song: dòng giống nhau hiện ở cả hai cột
    expect(screen.getAllByText('dòng 0')).toHaveLength(2)
  })
})
