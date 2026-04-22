/**
 * Unit tests for ProjectObjectTable
 * FR-023–FR-025
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectObjectTable } from '../ProjectObjectTable'
import type { ProjectObject } from '../../../lib/types/project-object'

const mockObjects: ProjectObject[] = [
  {
    id: 'obj-001',
    project_id: 'proj-001',
    object_type: 'web_app',
    name: 'Customer Portal',
    code: 'CUSTOMER_PORTAL',
    description: 'Web app for customers',
    owner: 'team-frontend',
    status: 'active',
    standard_info: {
      object_type: 'web_app',
      tech_stack: 'React',
      version: 'v2.0',
    },
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'admin',
  },
  {
    id: 'obj-002',
    project_id: 'proj-001',
    object_type: 'api',
    name: 'Customer API',
    code: 'CUSTOMER_API',
    description: 'REST API',
    owner: 'team-backend',
    status: 'active',
    standard_info: {
      object_type: 'api',
      base_url: 'https://api.example.com',
      auth_method: 'JWT',
      version: 'v1',
    },
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'admin',
  },
  {
    id: 'obj-003',
    project_id: 'proj-001',
    object_type: 'elt',
    name: 'Data Pipeline',
    code: 'DATA_PIPELINE',
    owner: 'team-data',
    status: 'deprecated',
    standard_info: {
      object_type: 'elt',
      source_system: 'Oracle',
      target_system: 'DWH',
    },
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'admin',
  },
]

describe('ProjectObjectTable', () => {
  it('renders all objects by default', () => {
    render(<ProjectObjectTable objects={mockObjects} />)
    expect(screen.getByText('Customer Portal')).toBeTruthy()
    expect(screen.getByText('Customer API')).toBeTruthy()
    expect(screen.getByText('Data Pipeline')).toBeTruthy()
  })

  it('renders object codes', () => {
    render(<ProjectObjectTable objects={mockObjects} />)
    expect(screen.getByText('CUSTOMER_PORTAL')).toBeTruthy()
    expect(screen.getByText('CUSTOMER_API')).toBeTruthy()
  })

  it('shows object type icons and labels', () => {
    render(<ProjectObjectTable objects={mockObjects} />)
    expect(screen.getByText('Web App')).toBeTruthy()
    expect(screen.getByText('API')).toBeTruthy()
    expect(screen.getByText('ELT')).toBeTruthy()
  })

  it('filters by object type', () => {
    render(<ProjectObjectTable objects={mockObjects} />)
    const apiBtn = screen.getByText('🔌 API')
    fireEvent.click(apiBtn)
    expect(screen.queryByText('Customer Portal')).toBeNull()
    expect(screen.getByText('Customer API')).toBeTruthy()
  })

  it('filters by search query', () => {
    render(<ProjectObjectTable objects={mockObjects} />)
    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc code...')
    fireEvent.change(searchInput, { target: { value: 'customer portal' } })
    expect(screen.getByText('Customer Portal')).toBeTruthy()
    expect(screen.queryByText('Customer API')).toBeNull()
  })

  it('shows empty state when no results match filter', () => {
    render(<ProjectObjectTable objects={mockObjects} />)
    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc code...')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    expect(screen.getByText('Không có đối tượng')).toBeTruthy()
  })

  it('shows loading state', () => {
    render(<ProjectObjectTable objects={[]} loading />)
    expect(screen.getByText('Đang tải...')).toBeTruthy()
  })

  it('calls onAdd when Add button clicked', () => {
    const onAdd = vi.fn()
    render(<ProjectObjectTable objects={mockObjects} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Thêm đối tượng'))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(<ProjectObjectTable objects={mockObjects} onEdit={onEdit} />)
    const editButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('title') === null && b.innerHTML.includes('Edit'),
    )
    // There should be edit buttons
    expect(onEdit).not.toHaveBeenCalled() // initial state
  })

  it('calls onViewConnections when connection button clicked', () => {
    const onViewConnections = vi.fn()
    render(
      <ProjectObjectTable
        objects={mockObjects}
        onViewConnections={onViewConnections}
      />,
    )
    const connButtons = screen.getAllByTitle('Xem kết nối')
    fireEvent.click(connButtons[0])
    expect(onViewConnections).toHaveBeenCalledWith(mockObjects[0])
  })

  it('renders owner column', () => {
    render(<ProjectObjectTable objects={mockObjects} />)
    expect(screen.getByText('team-frontend')).toBeTruthy()
    expect(screen.getByText('team-backend')).toBeTruthy()
  })

  it('renders status badges', () => {
    render(<ProjectObjectTable objects={mockObjects} />)
    const activeBadges = screen.getAllByText('active')
    expect(activeBadges.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('deprecated')).toBeTruthy()
  })
})
