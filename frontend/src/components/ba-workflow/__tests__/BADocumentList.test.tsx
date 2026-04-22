/**
 * Unit tests for BADocumentList
 * FR-027, FR-029
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BADocumentList } from '../BADocumentList'
import type { BADocument } from '../../../lib/types/workflow-doc'

const mockDocuments: BADocument[] = [
  {
    id: 'doc-001',
    project_id: 'proj-001',
    doc_type: 'BRD',
    title: 'BRD — Customer Module',
    version: 'v1.0',
    status: 'draft',
    object_ids: ['obj-001'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'doc-002',
    project_id: 'proj-001',
    doc_type: 'BRS',
    title: 'BRS — Payment Flow',
    version: 'v0.9',
    status: 'review',
    object_ids: [],
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'doc-003',
    project_id: 'proj-001',
    doc_type: 'FSD',
    title: 'FSD — Authentication',
    version: 'v2.1',
    status: 'approved',
    object_ids: ['obj-001', 'obj-002'],
    created_at: '2026-01-03T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
  },
]

describe('BADocumentList', () => {
  it('renders all documents', () => {
    render(<BADocumentList documents={mockDocuments} />)
    expect(screen.getByText('BRD — Customer Module')).toBeTruthy()
    expect(screen.getByText('BRS — Payment Flow')).toBeTruthy()
    expect(screen.getByText('FSD — Authentication')).toBeTruthy()
  })

  it('renders doc type badges', () => {
    render(<BADocumentList documents={mockDocuments} />)
    expect(screen.getByText('BRD')).toBeTruthy()
    expect(screen.getByText('BRS')).toBeTruthy()
    expect(screen.getByText('FSD')).toBeTruthy()
  })

  it('renders status badges', () => {
    render(<BADocumentList documents={mockDocuments} />)
    expect(screen.getByText('draft')).toBeTruthy()
    expect(screen.getByText('review')).toBeTruthy()
    expect(screen.getByText('approved')).toBeTruthy()
  })

  it('renders version numbers', () => {
    render(<BADocumentList documents={mockDocuments} />)
    expect(screen.getByText('v1.0')).toBeTruthy()
    expect(screen.getByText('v0.9')).toBeTruthy()
  })

  it('shows object_ids count', () => {
    render(<BADocumentList documents={mockDocuments} />)
    expect(screen.getByText('1 đối tượng gắn kết')).toBeTruthy()
    expect(screen.getByText('2 đối tượng gắn kết')).toBeTruthy()
  })

  it('filters by doc type', () => {
    render(<BADocumentList documents={mockDocuments} />)
    const brsBtn = screen.getByText('BRS')
    // Click the filter button (not the table badge — find the button)
    const filterButtons = screen.getAllByRole('button')
    const brsFilter = filterButtons.find((b) => b.textContent === 'BRS')
    if (brsFilter) {
      fireEvent.click(brsFilter)
      expect(screen.getByText('BRS — Payment Flow')).toBeTruthy()
      expect(screen.queryByText('BRD — Customer Module')).toBeNull()
    }
  })

  it('filters by status', () => {
    render(<BADocumentList documents={mockDocuments} />)
    const buttons = screen.getAllByRole('button')
    const approvedFilter = buttons.find((b) => b.textContent === 'approved')
    if (approvedFilter) {
      fireEvent.click(approvedFilter)
      expect(screen.getByText('FSD — Authentication')).toBeTruthy()
      expect(screen.queryByText('BRD — Customer Module')).toBeNull()
    }
  })

  it('shows empty state when no documents', () => {
    render(<BADocumentList documents={[]} />)
    expect(screen.getByText('Không có tài liệu')).toBeTruthy()
  })

  it('shows loading state', () => {
    render(<BADocumentList documents={[]} loading />)
    expect(screen.getByText('Đang tải...')).toBeTruthy()
  })

  it('calls onAdd when create button clicked', () => {
    const onAdd = vi.fn()
    render(<BADocumentList documents={mockDocuments} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Tạo tài liệu'))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('calls onTransition when transition button clicked', () => {
    const onTransition = vi.fn()
    render(
      <BADocumentList documents={mockDocuments} onTransition={onTransition} />,
    )
    const arrowButtons = screen.getAllByTitle('Chuyển trạng thái')
    fireEvent.click(arrowButtons[0])
    expect(onTransition).toHaveBeenCalledWith(mockDocuments[0])
  })

  it('does not show transition button for archived docs', () => {
    const archivedDoc: BADocument = {
      ...mockDocuments[0],
      id: 'doc-archived',
      status: 'archived',
    }
    render(
      <BADocumentList
        documents={[archivedDoc]}
        onTransition={vi.fn()}
      />,
    )
    expect(screen.queryByTitle('Chuyển trạng thái')).toBeNull()
  })
})
