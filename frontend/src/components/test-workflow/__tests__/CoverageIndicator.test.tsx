/**
 * Unit tests for CoverageIndicator
 * FR-031: coverage display + milestone threshold alerts
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoverageIndicator, CoverageSummary } from '../CoverageIndicator'
import type { ObjectTestCoverage } from '../../../lib/types/workflow-doc'

const mockCoverage: ObjectTestCoverage = {
  object_id: 'obj-001',
  object_name: 'Customer Portal',
  total_test_cases: 50,
  executed: 40,
  passed: 36,
  failed: 4,
  coverage_pct: 72.0,
  milestone_coverage: [
    {
      milestone_id: 'ms-001',
      milestone_name: 'SIT',
      coverage_pct: 72.0,
      threshold_pct: 80.0,
      is_below_threshold: true,
      alert: 'Coverage 72.0% dưới ngưỡng 80% cho milestone SIT',
    },
    {
      milestone_id: 'ms-002',
      milestone_name: 'UAT',
      coverage_pct: 85.0,
      threshold_pct: 80.0,
      is_below_threshold: false,
    },
  ],
}

describe('CoverageSummary', () => {
  it('renders coverage percentage', () => {
    render(
      <CoverageSummary
        coverage_pct={72.0}
        total={50}
        passed={36}
        failed={4}
        executed={40}
      />,
    )
    expect(screen.getByText('72.0%')).toBeTruthy()
  })

  it('renders KPI cards with correct values', () => {
    render(
      <CoverageSummary
        coverage_pct={72.0}
        total={50}
        passed={36}
        failed={4}
        executed={40}
      />,
    )
    expect(screen.getByText('50')).toBeTruthy()
    expect(screen.getByText('36')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(screen.getByText('40')).toBeTruthy()
  })

  it('shows warning alert when below threshold', () => {
    render(
      <CoverageSummary
        coverage_pct={50}
        total={100}
        passed={50}
        failed={10}
        executed={60}
        threshold={80}
      />,
    )
    expect(screen.getByText(/thấp hơn ngưỡng/)).toBeTruthy()
  })

  it('shows success message when above threshold', () => {
    render(
      <CoverageSummary
        coverage_pct={90}
        total={100}
        passed={90}
        failed={5}
        executed={95}
        threshold={80}
      />,
    )
    expect(screen.getByText(/đạt ngưỡng/)).toBeTruthy()
  })

  it('renders compact mode', () => {
    const { container } = render(
      <CoverageSummary
        coverage_pct={72}
        total={50}
        passed={36}
        failed={4}
        executed={40}
        compact
      />,
    )
    // In compact mode no KPI cards
    expect(container.querySelector('.kpi-card')).toBeNull()
  })

  it('shows default threshold of 80', () => {
    render(
      <CoverageSummary
        coverage_pct={75}
        total={100}
        passed={75}
        failed={5}
        executed={80}
      />,
    )
    expect(screen.getByText('Ngưỡng: 80%')).toBeTruthy()
  })
})

describe('CoverageIndicator', () => {
  it('renders object name', () => {
    render(<CoverageIndicator coverage={mockCoverage} />)
    expect(screen.getByText('Customer Portal')).toBeTruthy()
  })

  it('shows alert count badge when milestones below threshold', () => {
    render(<CoverageIndicator coverage={mockCoverage} />)
    expect(screen.getByText('1 cảnh báo coverage')).toBeTruthy()
  })

  it('renders milestone coverage cards', () => {
    render(<CoverageIndicator coverage={mockCoverage} />)
    expect(screen.getByText('SIT')).toBeTruthy()
    expect(screen.getByText('UAT')).toBeTruthy()
  })

  it('shows milestone alert text', () => {
    render(<CoverageIndicator coverage={mockCoverage} />)
    expect(
      screen.getByText('Coverage 72.0% dưới ngưỡng 80% cho milestone SIT'),
    ).toBeTruthy()
  })

  it('shows Dưới ngưỡng for below threshold milestone', () => {
    render(<CoverageIndicator coverage={mockCoverage} />)
    expect(screen.getByText('Dưới ngưỡng')).toBeTruthy()
  })

  it('does not show alert badge when all milestones pass', () => {
    const allPassCoverage: ObjectTestCoverage = {
      ...mockCoverage,
      milestone_coverage: [
        {
          ...mockCoverage.milestone_coverage[1],
          milestone_name: 'SIT',
          is_below_threshold: false,
        },
      ],
    }
    render(<CoverageIndicator coverage={allPassCoverage} />)
    expect(screen.queryByText(/cảnh báo coverage/)).toBeNull()
  })

  it('renders no milestones section when empty', () => {
    const noCoverageMilestones: ObjectTestCoverage = {
      ...mockCoverage,
      milestone_coverage: [],
    }
    render(<CoverageIndicator coverage={noCoverageMilestones} />)
    expect(screen.queryByText('Coverage theo Milestone')).toBeNull()
  })
})
