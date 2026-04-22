/**
 * Unit tests for ObjectTypeForm
 * FR-023–FR-025: Discriminated union form per object type
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ObjectTypeForm } from '../ObjectTypeForm'

describe('ObjectTypeForm — web_app', () => {
  it('renders tech_stack and version fields', () => {
    render(
      <ObjectTypeForm
        objectType="web_app"
        value={{}}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByPlaceholderText('React, Angular, Spring Boot...')).toBeTruthy()
    expect(screen.getByPlaceholderText('v1.0.0')).toBeTruthy()
  })

  it('calls onChange when tech_stack changes', () => {
    const onChange = vi.fn()
    render(
      <ObjectTypeForm objectType="web_app" value={{}} onChange={onChange} />,
    )
    const techInput = screen.getByPlaceholderText('React, Angular, Spring Boot...')
    fireEvent.change(techInput, { target: { value: 'React + TypeScript' } })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tech_stack: 'React + TypeScript' }),
    )
  })

  it('renders URL fields for web_app', () => {
    render(
      <ObjectTypeForm objectType="web_app" value={{}} onChange={vi.fn()} />,
    )
    expect(screen.getByPlaceholderText('https://dev.example.com')).toBeTruthy()
    expect(screen.getByPlaceholderText('https://staging.example.com')).toBeTruthy()
    expect(screen.getByPlaceholderText('https://prod.example.com')).toBeTruthy()
  })
})

describe('ObjectTypeForm — mobile_app', () => {
  it('renders platform selector', () => {
    render(
      <ObjectTypeForm
        objectType="mobile_app"
        value={{}}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('iOS')).toBeTruthy()
    expect(screen.getByText('Android')).toBeTruthy()
    expect(screen.getByText('Cross-platform')).toBeTruthy()
  })

  it('renders store link fields', () => {
    render(
      <ObjectTypeForm
        objectType="mobile_app"
        value={{}}
        onChange={vi.fn()}
      />,
    )
    expect(
      screen.getByPlaceholderText('https://apps.apple.com/...'),
    ).toBeTruthy()
    expect(
      screen.getByPlaceholderText('https://play.google.com/...'),
    ).toBeTruthy()
  })
})

describe('ObjectTypeForm — api', () => {
  it('renders base_url field', () => {
    render(
      <ObjectTypeForm objectType="api" value={{}} onChange={vi.fn()} />,
    )
    expect(
      screen.getByPlaceholderText('https://api.example.com/v1'),
    ).toBeTruthy()
  })

  it('renders auth_method dropdown with correct options', () => {
    render(
      <ObjectTypeForm objectType="api" value={{}} onChange={vi.fn()} />,
    )
    expect(screen.getByText('JWT')).toBeTruthy()
    expect(screen.getByText('OAuth2')).toBeTruthy()
    expect(screen.getByText('API_Key')).toBeTruthy()
    expect(screen.getByText('Basic')).toBeTruthy()
    expect(screen.getByText('None')).toBeTruthy()
  })

  it('renders protocol selector', () => {
    render(
      <ObjectTypeForm objectType="api" value={{}} onChange={vi.fn()} />,
    )
    expect(screen.getByText('REST')).toBeTruthy()
    expect(screen.getByText('GraphQL')).toBeTruthy()
    expect(screen.getByText('gRPC')).toBeTruthy()
  })

  it('renders swagger_url field', () => {
    render(
      <ObjectTypeForm objectType="api" value={{}} onChange={vi.fn()} />,
    )
    expect(
      screen.getByPlaceholderText('https://api.example.com/swagger'),
    ).toBeTruthy()
  })
})

describe('ObjectTypeForm — elt', () => {
  it('renders source and target system fields', () => {
    render(
      <ObjectTypeForm objectType="elt" value={{}} onChange={vi.fn()} />,
    )
    expect(
      screen.getByPlaceholderText('Oracle DB / Kafka / S3'),
    ).toBeTruthy()
    expect(
      screen.getByPlaceholderText('Data Warehouse / PostgreSQL'),
    ).toBeTruthy()
  })

  it('renders schedule and technology fields', () => {
    render(
      <ObjectTypeForm objectType="elt" value={{}} onChange={vi.fn()} />,
    )
    expect(screen.getByPlaceholderText('0 2 * * * (cron)')).toBeTruthy()
    expect(screen.getByPlaceholderText('Apache Spark, Talend, dbt...')).toBeTruthy()
  })

  it('renders SLA field', () => {
    render(
      <ObjectTypeForm objectType="elt" value={{}} onChange={vi.fn()} />,
    )
    expect(screen.getByPlaceholderText('30')).toBeTruthy()
  })

  it('calls onChange when source_system changes', () => {
    const onChange = vi.fn()
    render(<ObjectTypeForm objectType="elt" value={{}} onChange={onChange} />)
    const sourceInput = screen.getByPlaceholderText('Oracle DB / Kafka / S3')
    fireEvent.change(sourceInput, { target: { value: 'Oracle 19c' } })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ source_system: 'Oracle 19c' }),
    )
  })
})
