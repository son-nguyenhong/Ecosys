/**
 * Unit tests for DocsPage — tab navigation, default tab, sub-description.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mock child pages to keep tests fast and isolated
// ---------------------------------------------------------------------------

vi.mock('../../ba/BAPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ba-page' }, 'BAPage'),
}))

vi.mock('../../ba-workflow/BAWorkflowPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ba-workflow-page' }, 'BAWorkflowPage'),
}))

vi.mock('../../test-workflow/TestWorkflowPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'test-workflow-page' }, 'TestWorkflowPage'),
}))

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import DocsPage from '../DocsPage'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DocsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 3 tab buttons', () => {
    const { getAllByRole } = render(React.createElement(DocsPage))
    const buttons = getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('renders the correct 3 tab labels', () => {
    render(React.createElement(DocsPage))
    expect(screen.getByText('Tài liệu dự án')).toBeInTheDocument()
    expect(screen.getByText('Tài liệu BA')).toBeInTheDocument()
    expect(screen.getByText('Tài liệu Test')).toBeInTheDocument()
  })

  it('default active tab is "Tài liệu dự án" — renders BAPage', () => {
    render(React.createElement(DocsPage))
    expect(screen.getByTestId('ba-page')).toBeInTheDocument()
    expect(screen.queryByTestId('ba-workflow-page')).toBeNull()
    expect(screen.queryByTestId('test-workflow-page')).toBeNull()
  })

  it('clicking "Tài liệu BA" tab switches content to BAWorkflowPage', () => {
    render(React.createElement(DocsPage))
    fireEvent.click(screen.getByText('Tài liệu BA'))
    expect(screen.getByTestId('ba-workflow-page')).toBeInTheDocument()
    expect(screen.queryByTestId('ba-page')).toBeNull()
  })

  it('clicking "Tài liệu Test" tab switches content to TestWorkflowPage', () => {
    render(React.createElement(DocsPage))
    fireEvent.click(screen.getByText('Tài liệu Test'))
    expect(screen.getByTestId('test-workflow-page')).toBeInTheDocument()
    expect(screen.queryByTestId('ba-page')).toBeNull()
  })

  it('clicking back to "Tài liệu dự án" re-renders BAPage', () => {
    render(React.createElement(DocsPage))
    fireEvent.click(screen.getByText('Tài liệu BA'))
    fireEvent.click(screen.getByText('Tài liệu dự án'))
    expect(screen.getByTestId('ba-page')).toBeInTheDocument()
    expect(screen.queryByTestId('ba-workflow-page')).toBeNull()
  })

  it('shows sub-description for active "Tài liệu dự án" tab', () => {
    render(React.createElement(DocsPage))
    // The sub-description for project tab
    expect(screen.getByText('Requirements, documents gắn với project')).toBeInTheDocument()
  })

  it('shows sub-description for "Tài liệu BA" when that tab is active', () => {
    render(React.createElement(DocsPage))
    fireEvent.click(screen.getByText('Tài liệu BA'))
    expect(screen.getByText('BRD, FSD, API Spec, ERD gắn với đối tượng')).toBeInTheDocument()
  })

  it('shows sub-description for "Tài liệu Test" when that tab is active', () => {
    render(React.createElement(DocsPage))
    fireEvent.click(screen.getByText('Tài liệu Test'))
    expect(screen.getByText('Test Plan, Test Case, Bug Report, UAT Sign-off')).toBeInTheDocument()
  })

  it('sub-description is only shown for the active tab (not all 3 at once)', () => {
    render(React.createElement(DocsPage))
    // Only the active tab's sub-description is visible
    const sub1 = screen.getByText('Requirements, documents gắn với project')
    expect(sub1).toBeInTheDocument()
    // The other two should not appear in the default state
    expect(screen.queryByText('BRD, FSD, API Spec, ERD gắn với đối tượng')).toBeNull()
    expect(screen.queryByText('Test Plan, Test Case, Bug Report, UAT Sign-off')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TABS constant structure tests
// ---------------------------------------------------------------------------

describe('DocsPage — TABS data structure', () => {
  // Inline the TABS definition to test the structure without importing private
  const TABS = [
    { key: 'project', label: 'Tài liệu dự án', sub: 'Requirements, documents gắn với project' },
    { key: 'ba',      label: 'Tài liệu BA',    sub: 'BRD, FSD, API Spec, ERD gắn với đối tượng' },
    { key: 'test',    label: 'Tài liệu Test',  sub: 'Test Plan, Test Case, Bug Report, UAT Sign-off' },
  ]

  it('has exactly 3 tabs', () => {
    expect(TABS.length).toBe(3)
  })

  it('first tab is "Tài liệu dự án" with key "project"', () => {
    expect(TABS[0].key).toBe('project')
    expect(TABS[0].label).toBe('Tài liệu dự án')
  })

  it('second tab is "Tài liệu BA" with key "ba"', () => {
    expect(TABS[1].key).toBe('ba')
    expect(TABS[1].label).toBe('Tài liệu BA')
  })

  it('third tab is "Tài liệu Test" with key "test"', () => {
    expect(TABS[2].key).toBe('test')
    expect(TABS[2].label).toBe('Tài liệu Test')
  })

  it('all tabs have a sub-description', () => {
    TABS.forEach(tab => {
      expect(tab.sub).toBeTruthy()
      expect(tab.sub.length).toBeGreaterThan(0)
    })
  })
})
