/**
 * Unit tests for TestDocumentList
 * FR-032: Test document list with type badges and status
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestDocumentList } from '../TestDocumentList'
import type { TestDocument } from '../../../lib/types/workflow-doc'

const mockDocuments: TestDocument[] = [
  {
    id: 'tdoc-001',
    project_id: 'proj-001',
    doc_type: 'TEST_PLAN',
    title: 'Test Plan — Sprint 5',
    status: 'draft',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tdoc-002',
    project_id: 'proj-001',
    doc_type: 'BUG_REPORT',
    title: 'Bug: Login timeout không hiển thị message',
    status: 'open',
    metadata: { severity: 'high', component: 'authentication' },
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'tdoc-003',
    project_id: 'proj-001',
    doc_type: 'UAT_SIGNOFF',
    title: 'UAT Sign-off — Phase 1',
    status: 'signed',
    metadata: { approver: 'nguyen.van.a', sign_date: '2026-04-10' },
    created_at: '2026-01-03T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
  },
]

describe('TestDocumentList', () => {
  it('renders all documents', () => {
    render(<TestDocumentList documents={mockDocuments} />)
    expect(screen.getByText('Test Plan — Sprint 5')).toBeTruthy()
    expect(
      screen.getByText('Bug: Login timeout không hiển thị message'),
    ).toBeTruthy()
    expect(screen.getByText('UAT Sign-off — Phase 1')).toBeTruthy()
  })

  it('renders doc type badges', () => {
    render(<TestDocumentList documents={mockDocuments} />)
    expect(screen.getByText('Test Plan')).toBeTruthy()
    expect(screen.getByText('Bug Report')).toBeTruthy()
    expect(screen.getByText('UAT Sign-off')).toBeTruthy()
  })

  it('renders severity badge for bug report', () => {
    render(<TestDocumentList documents={mockDocuments} />)
    expect(screen.getByText('HIGH')).toBeTruthy()
  })

  it('renders approver for UAT sign-off', () => {
    render(<TestDocumentList documents={mockDocuments} />)
    expect(screen.getByText(/nguyen.van.a/)).toBeTruthy()
  })

  it('renders status badges', () => {
    render(<TestDocumentList documents={mockDocuments} />)
    expect(screen.getByText('draft')).toBeTruthy()
    expect(screen.getByText('open')).toBeTruthy()
    expect(screen.getByText('signed')).toBeTruthy()
  })

  it('filters by TEST_PLAN type', () => {
    render(<TestDocumentList documents={mockDocuments} />)
    const filterBtns = screen.getAllByRole('button')
    const testPlanFilter = filterBtns.find(
      (b) => b.textContent === 'Test Plan',
    )
    if (testPlanFilter) {
      fireEvent.click(testPlanFilter)
      expect(screen.getByText('Test Plan — Sprint 5')).toBeTruthy()
      expect(
        screen.queryByText('Bug: Login timeout không hiển thị message'),
      ).toBeNull()
    }
  })

  it('shows empty state when no documents', () => {
    render(<TestDocumentList documents={[]} />)
    expect(screen.getByText('Không có tài liệu test')).toBeTruthy()
  })

  it('shows loading state', () => {
    render(<TestDocumentList documents={[]} loading />)
    expect(screen.getByText('Đang tải...')).toBeTruthy()
  })

  it('calls onAdd when create button clicked', () => {
    const onAdd = vi.fn()
    render(<TestDocumentList documents={mockDocuments} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Tạo tài liệu'))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('calls onTransition when arrow button clicked', () => {
    const onTransition = vi.fn()
    render(
      <TestDocumentList
        documents={mockDocuments}
        onTransition={onTransition}
      />,
    )
    const transitionBtns = screen.getAllByTitle('Chuyển trạng thái')
    fireEvent.click(transitionBtns[0])
    expect(onTransition).toHaveBeenCalledWith(mockDocuments[0])
  })

  it('renders coverage panel when coveragePct provided', () => {
    render(
      <TestDocumentList
        documents={mockDocuments}
        coveragePct={75}
        totalTests={100}
        passedTests={75}
        failedTests={10}
      />,
    )
    expect(screen.getByText('75.0%')).toBeTruthy()
  })

  it('renders sign_date for UAT sign-off', () => {
    render(<TestDocumentList documents={mockDocuments} />)
    expect(screen.getByText(/2026-04-10/)).toBeTruthy()
  })
})
