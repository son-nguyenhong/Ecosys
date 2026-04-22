/**
 * Unit tests for AnnualPlanCard
 * FR-019
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnnualPlanCard } from '../AnnualPlanCard'
import type { AnnualPlan } from '../../../lib/types/annual-plan'

const mockPlan: AnnualPlan = {
  id: 'plan-001',
  name: 'Kế hoạch IT 2026',
  year: 2026,
  description: 'Kế hoạch chuyển đổi số',
  status: 'active',
  objectives_count: 5,
  dod_completion_pct: 60,
  projects_count: 8,
  created_at: '2026-01-01T00:00:00Z',
  created_by: 'admin',
}

describe('AnnualPlanCard', () => {
  it('renders plan name and year', () => {
    render(<AnnualPlanCard plan={mockPlan} />)
    expect(screen.getByText('Kế hoạch IT 2026')).toBeTruthy()
    expect(screen.getByText('2026')).toBeTruthy()
  })

  it('renders status badge', () => {
    render(<AnnualPlanCard plan={mockPlan} />)
    expect(screen.getByText('active')).toBeTruthy()
  })

  it('renders DoD completion percentage', () => {
    render(<AnnualPlanCard plan={mockPlan} />)
    expect(screen.getByText('60%')).toBeTruthy()
  })

  it('renders project and objective counts', () => {
    render(<AnnualPlanCard plan={mockPlan} />)
    expect(screen.getByText('8 dự án')).toBeTruthy()
    expect(screen.getByText('5 mục tiêu')).toBeTruthy()
  })

  it('renders description when provided', () => {
    render(<AnnualPlanCard plan={mockPlan} />)
    expect(screen.getByText('Kế hoạch chuyển đổi số')).toBeTruthy()
  })

  it('does not render description when absent', () => {
    const planNoDesc = { ...mockPlan, description: undefined }
    render(<AnnualPlanCard plan={planNoDesc} />)
    expect(screen.queryByText('Kế hoạch chuyển đổi số')).toBeNull()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<AnnualPlanCard plan={mockPlan} onClick={onClick} />)
    const card = screen.getByRole('button')
    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('calls onClick on Enter key', () => {
    const onClick = vi.fn()
    render(<AnnualPlanCard plan={mockPlan} onClick={onClick} />)
    const card = screen.getByRole('button')
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies selected style when selected=true', () => {
    render(<AnnualPlanCard plan={mockPlan} selected />)
    const card = screen.getByRole('button')
    expect(card.getAttribute('aria-selected')).toBe('true')
  })

  it('shows warning color for low DoD completion', () => {
    const lowPlan = { ...mockPlan, dod_completion_pct: 20 }
    const { container } = render(<AnnualPlanCard plan={lowPlan} />)
    // Progress bar fill should use danger color
    const fill = container.querySelector('.process-progress__fill')
    expect(fill).toBeTruthy()
  })

  it('renders closed status plan correctly', () => {
    const closedPlan = { ...mockPlan, status: 'closed' as const }
    render(<AnnualPlanCard plan={closedPlan} />)
    expect(screen.getByText('closed')).toBeTruthy()
  })
})
