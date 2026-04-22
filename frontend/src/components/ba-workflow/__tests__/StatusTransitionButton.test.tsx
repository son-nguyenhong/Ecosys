/**
 * Unit tests for StatusTransitionButton
 * FR-028: BA document state machine transitions
 * BR-001: draft → review → approved → archived (no skip)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StatusTransitionButton } from '../StatusTransitionButton'

describe('StatusTransitionButton — draft state', () => {
  it('shows Submit Review button', () => {
    render(
      <StatusTransitionButton
        currentStatus="draft"
        onTransition={vi.fn()}
      />,
    )
    expect(screen.getByText('Gửi Review')).toBeTruthy()
  })

  it('does not show Approve button from draft', () => {
    render(
      <StatusTransitionButton
        currentStatus="draft"
        onTransition={vi.fn()}
      />,
    )
    expect(screen.queryByText('Approve')).toBeNull()
  })

  it('calls onTransition with submit_review action', async () => {
    const onTransition = vi.fn().mockResolvedValue(undefined)
    render(
      <StatusTransitionButton
        currentStatus="draft"
        onTransition={onTransition}
      />,
    )
    fireEvent.click(screen.getByText('Gửi Review'))
    await waitFor(() => {
      expect(onTransition).toHaveBeenCalledWith('submit_review', undefined)
    })
  })
})

describe('StatusTransitionButton — review state', () => {
  it('shows Approve and Reject buttons', () => {
    render(
      <StatusTransitionButton
        currentStatus="review"
        onTransition={vi.fn()}
      />,
    )
    expect(screen.getByText('Approve')).toBeTruthy()
    expect(screen.getByText('Trả lại Draft')).toBeTruthy()
  })

  it('calls onTransition with approve action', async () => {
    const onTransition = vi.fn().mockResolvedValue(undefined)
    render(
      <StatusTransitionButton
        currentStatus="review"
        onTransition={onTransition}
      />,
    )
    fireEvent.click(screen.getByText('Approve'))
    await waitFor(() => {
      expect(onTransition).toHaveBeenCalledWith('approve', undefined)
    })
  })

  it('opens modal for Reject with notes requirement', () => {
    render(
      <StatusTransitionButton
        currentStatus="review"
        onTransition={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Trả lại Draft'))
    expect(screen.getByText('Ghi chú')).toBeTruthy()
    expect(screen.getByPlaceholderText('Lý do / ghi chú về việc chuyển trạng thái...')).toBeTruthy()
  })

  it('requires notes before confirming reject', () => {
    const onTransition = vi.fn()
    render(
      <StatusTransitionButton
        currentStatus="review"
        onTransition={onTransition}
      />,
    )
    fireEvent.click(screen.getByText('Trả lại Draft'))
    // Find the confirm button in modal
    const confirmBtn = screen.getAllByText('Trả lại Draft').find((el) =>
      el.closest('.modal-body'),
    )
    if (confirmBtn) {
      fireEvent.click(confirmBtn)
      expect(onTransition).not.toHaveBeenCalled()
    }
  })
})

describe('StatusTransitionButton — approved state', () => {
  it('shows Archive button', () => {
    render(
      <StatusTransitionButton
        currentStatus="approved"
        onTransition={vi.fn()}
      />,
    )
    expect(screen.getByText('Archive')).toBeTruthy()
  })

  it('opens confirm modal for archive', () => {
    render(
      <StatusTransitionButton
        currentStatus="approved"
        onTransition={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Archive'))
    expect(screen.getByText(/chắc muốn/)).toBeTruthy()
  })
})

describe('StatusTransitionButton — archived state', () => {
  it('shows no available transition message', () => {
    render(
      <StatusTransitionButton
        currentStatus="archived"
        onTransition={vi.fn()}
      />,
    )
    expect(screen.getByText('Không có chuyển tiếp khả dụng')).toBeTruthy()
  })
})

describe('StatusTransitionButton — state machine visual', () => {
  it('renders all 4 state steps', () => {
    render(
      <StatusTransitionButton
        currentStatus="review"
        onTransition={vi.fn()}
      />,
    )
    expect(screen.getByText('draft')).toBeTruthy()
    expect(screen.getByText('review')).toBeTruthy()
    expect(screen.getByText('approved')).toBeTruthy()
    expect(screen.getByText('archived')).toBeTruthy()
  })

  it('marks previous states with checkmark', () => {
    render(
      <StatusTransitionButton
        currentStatus="approved"
        onTransition={vi.fn()}
      />,
    )
    // draft and review should have "✓" prefix
    const completedStates = screen.getAllByText(/✓/)
    expect(completedStates.length).toBeGreaterThanOrEqual(2)
  })

  it('disables buttons when disabled prop is true', () => {
    render(
      <StatusTransitionButton
        currentStatus="draft"
        onTransition={vi.fn()}
        disabled
      />,
    )
    const btn = screen.getByText('Gửi Review')
    expect(btn.closest('button')?.disabled).toBe(true)
  })
})
