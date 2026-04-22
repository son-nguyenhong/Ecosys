/**
 * Unit tests for ObjectiveList
 * FR-019: Objectives CRUD
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ObjectiveList } from '../ObjectiveList'
import type { Objective } from '../../../lib/types/annual-plan'

const mockObjectives: Objective[] = [
  {
    id: 'obj-001',
    plan_id: 'plan-001',
    title: 'Triển khai 5 ứng dụng mới',
    description: 'Bao gồm mobile và web app',
    sort_order: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'obj-002',
    plan_id: 'plan-001',
    title: 'Nâng cấp hạ tầng cloud',
    description: undefined,
    sort_order: 2,
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('ObjectiveList', () => {
  it('renders all objectives', () => {
    render(<ObjectiveList objectives={mockObjectives} />)
    expect(screen.getByText('Triển khai 5 ứng dụng mới')).toBeTruthy()
    expect(screen.getByText('Nâng cấp hạ tầng cloud')).toBeTruthy()
  })

  it('shows correct count in header', () => {
    render(<ObjectiveList objectives={mockObjectives} />)
    expect(screen.getByText('Mục tiêu (2)')).toBeTruthy()
  })

  it('renders sequential numbers', () => {
    render(<ObjectiveList objectives={mockObjectives} />)
    expect(screen.getByText('01.')).toBeTruthy()
    expect(screen.getByText('02.')).toBeTruthy()
  })

  it('renders description when present', () => {
    render(<ObjectiveList objectives={mockObjectives} />)
    expect(screen.getByText('Bao gồm mobile và web app')).toBeTruthy()
  })

  it('renders empty message when no objectives', () => {
    render(<ObjectiveList objectives={[]} />)
    expect(screen.getByText('Chưa có mục tiêu nào')).toBeTruthy()
  })

  it('shows Add button when not readOnly', () => {
    const onAdd = vi.fn()
    render(<ObjectiveList objectives={mockObjectives} onAdd={onAdd} />)
    expect(screen.getByText('Thêm')).toBeTruthy()
  })

  it('hides Add button in readOnly mode', () => {
    render(<ObjectiveList objectives={mockObjectives} readOnly />)
    expect(screen.queryByText('Thêm')).toBeNull()
  })

  it('shows form when Add button clicked', () => {
    const onAdd = vi.fn()
    render(<ObjectiveList objectives={mockObjectives} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Thêm'))
    expect(screen.getByPlaceholderText('Ví dụ: Triển khai 5 ứng dụng mới')).toBeTruthy()
  })

  it('calls onAdd with form data when saved', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined)
    render(<ObjectiveList objectives={mockObjectives} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Thêm'))
    const input = screen.getByPlaceholderText('Ví dụ: Triển khai 5 ứng dụng mới')
    fireEvent.change(input, { target: { value: 'Mục tiêu mới' } })
    fireEvent.click(screen.getByText('Lưu'))
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Mục tiêu mới' }),
      )
    })
  })

  it('does not call onAdd when title is empty', async () => {
    const onAdd = vi.fn()
    render(<ObjectiveList objectives={mockObjectives} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Thêm'))
    fireEvent.click(screen.getByText('Lưu'))
    await waitFor(() => {
      expect(onAdd).not.toHaveBeenCalled()
    })
  })

  it('hides form when Cancel clicked', () => {
    const onAdd = vi.fn()
    render(<ObjectiveList objectives={mockObjectives} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Thêm'))
    fireEvent.click(screen.getByText('Hủy'))
    expect(
      screen.queryByPlaceholderText('Ví dụ: Triển khai 5 ứng dụng mới'),
    ).toBeNull()
  })
})
