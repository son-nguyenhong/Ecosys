/**
 * ObjectTypeForm — Dynamic form based on object_type discriminated union (FR-023–FR-025)
 * ADR-004: JSONB flexible + discriminated union (web_app/mobile_app/api/elt)
 */

import React from 'react'
import { Field, VibInput, VibSelect } from '../ui'
import type {
  ProjectObjectType,
  WebAppInfo,
  MobileAppInfo,
  ApiInfo,
  EltInfo,
} from '../../lib/types/project-object'

// ── WebApp fields ─────────────────────────────────────────────────

function WebAppFields({
  value,
  onChange,
}: {
  value: Partial<Omit<WebAppInfo, 'object_type'>>
  onChange: (v: Partial<Omit<WebAppInfo, 'object_type'>>) => void
}) {
  const s =
    (k: keyof Omit<WebAppInfo, 'object_type'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [k]: e.target.value })

  return (
    <>
      <Field label="Tech Stack" required>
        <VibInput
          value={value.tech_stack ?? ''}
          onChange={s('tech_stack')}
          placeholder="React, Angular, Spring Boot..."
        />
      </Field>
      <Field label="Version" required>
        <VibInput
          value={value.version ?? ''}
          onChange={s('version')}
          placeholder="v1.0.0"
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Deployment Type">
          <VibSelect value={value.deployment_type ?? ''} onChange={s('deployment_type')}>
            <option value="">—</option>
            <option value="on_premise">On Premise</option>
            <option value="cloud">Cloud</option>
            <option value="hybrid">Hybrid</option>
          </VibSelect>
        </Field>
        <Field label="URL Dev">
          <VibInput
            value={value.url_dev ?? ''}
            onChange={s('url_dev')}
            placeholder="https://dev.example.com"
          />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="URL Staging">
          <VibInput
            value={value.url_staging ?? ''}
            onChange={s('url_staging')}
            placeholder="https://staging.example.com"
          />
        </Field>
        <Field label="URL UAT">
          <VibInput
            value={value.url_uat ?? ''}
            onChange={s('url_uat')}
            placeholder="https://uat.example.com"
          />
        </Field>
      </div>
      <Field label="URL Prod">
        <VibInput
          value={value.url_prod ?? ''}
          onChange={s('url_prod')}
          placeholder="https://prod.example.com"
        />
      </Field>
    </>
  )
}

// ── MobileApp fields ──────────────────────────────────────────────

function MobileAppFields({
  value,
  onChange,
}: {
  value: Partial<Omit<MobileAppInfo, 'object_type'>>
  onChange: (v: Partial<Omit<MobileAppInfo, 'object_type'>>) => void
}) {
  const s =
    (k: keyof Omit<MobileAppInfo, 'object_type'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [k]: e.target.value })

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Platform" required>
          <VibSelect
            value={value.platform ?? ''}
            onChange={s('platform')}
          >
            <option value="">— Chọn —</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="cross_platform">Cross-platform</option>
          </VibSelect>
        </Field>
        <Field label="Version" required>
          <VibInput
            value={value.version ?? ''}
            onChange={s('version')}
            placeholder="v1.0.0"
          />
        </Field>
      </div>
      <Field label="Tech Stack">
        <VibInput
          value={value.tech_stack ?? ''}
          onChange={s('tech_stack')}
          placeholder="Flutter, React Native, Swift..."
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Store Link iOS">
          <VibInput
            value={value.store_link_ios ?? ''}
            onChange={s('store_link_ios')}
            placeholder="https://apps.apple.com/..."
          />
        </Field>
        <Field label="Store Link Android">
          <VibInput
            value={value.store_link_android ?? ''}
            onChange={s('store_link_android')}
            placeholder="https://play.google.com/..."
          />
        </Field>
      </div>
      <Field label="Min OS Version">
        <VibInput
          value={value.min_os_version ?? ''}
          onChange={s('min_os_version')}
          placeholder="iOS 14.0 / Android 8.0"
        />
      </Field>
    </>
  )
}

// ── API fields ────────────────────────────────────────────────────

function ApiFields({
  value,
  onChange,
}: {
  value: Partial<Omit<ApiInfo, 'object_type'>>
  onChange: (v: Partial<Omit<ApiInfo, 'object_type'>>) => void
}) {
  const s =
    (k: keyof Omit<ApiInfo, 'object_type'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [k]: e.target.value })

  return (
    <>
      <Field label="Base URL" required>
        <VibInput
          value={value.base_url ?? ''}
          onChange={s('base_url')}
          placeholder="https://api.example.com/v1"
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Auth Method" required>
          <VibSelect value={value.auth_method ?? ''} onChange={s('auth_method')}>
            <option value="">— Chọn —</option>
            {['JWT', 'OAuth2', 'API_Key', 'Basic', 'None'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </VibSelect>
        </Field>
        <Field label="Version" required>
          <VibInput
            value={value.version ?? ''}
            onChange={s('version')}
            placeholder="v2"
          />
        </Field>
        <Field label="Protocol">
          <VibSelect value={value.protocol ?? ''} onChange={s('protocol')}>
            <option value="">—</option>
            {['REST', 'SOAP', 'GraphQL', 'gRPC'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </VibSelect>
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="URL Dev">
          <VibInput
            value={value.url_dev ?? ''}
            onChange={s('url_dev')}
            placeholder="https://api-dev.example.com"
          />
        </Field>
        <Field label="URL UAT">
          <VibInput
            value={value.url_uat ?? ''}
            onChange={s('url_uat')}
            placeholder="https://api-uat.example.com"
          />
        </Field>
      </div>
      <Field label="Swagger URL">
        <VibInput
          value={value.swagger_url ?? ''}
          onChange={s('swagger_url')}
          placeholder="https://api.example.com/swagger"
        />
      </Field>
    </>
  )
}

// ── ELT fields ────────────────────────────────────────────────────

function EltFields({
  value,
  onChange,
}: {
  value: Partial<Omit<EltInfo, 'object_type'>>
  onChange: (v: Partial<Omit<EltInfo, 'object_type'>>) => void
}) {
  const s =
    (k: keyof Omit<EltInfo, 'object_type'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [k]: e.target.value })

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Source System" required>
          <VibInput
            value={value.source_system ?? ''}
            onChange={s('source_system')}
            placeholder="Oracle DB / Kafka / S3"
          />
        </Field>
        <Field label="Target System" required>
          <VibInput
            value={value.target_system ?? ''}
            onChange={s('target_system')}
            placeholder="Data Warehouse / PostgreSQL"
          />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Schedule">
          <VibInput
            value={value.schedule ?? ''}
            onChange={s('schedule')}
            placeholder="0 2 * * * (cron)"
          />
        </Field>
        <Field label="Technology">
          <VibInput
            value={value.technology ?? ''}
            onChange={s('technology')}
            placeholder="Apache Spark, Talend, dbt..."
          />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Data Format">
          <VibInput
            value={value.data_format ?? ''}
            onChange={s('data_format')}
            placeholder="CSV, Parquet, JSON"
          />
        </Field>
        <Field label="Volume Estimate">
          <VibInput
            value={value.volume_estimate ?? ''}
            onChange={s('volume_estimate')}
            placeholder="~1M rows / day"
          />
        </Field>
        <Field label="SLA (minutes)">
          <VibInput
            type="number"
            value={value.sla_minutes ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                sla_minutes: parseInt(e.target.value) || undefined,
              })
            }
            placeholder="30"
          />
        </Field>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────

export type StandardInfoFormValue =
  | Partial<Omit<WebAppInfo, 'object_type'>>
  | Partial<Omit<MobileAppInfo, 'object_type'>>
  | Partial<Omit<ApiInfo, 'object_type'>>
  | Partial<Omit<EltInfo, 'object_type'>>

interface ObjectTypeFormProps {
  objectType: ProjectObjectType
  value: StandardInfoFormValue
  onChange: (v: StandardInfoFormValue) => void
}

export function ObjectTypeForm({
  objectType,
  value,
  onChange,
}: ObjectTypeFormProps) {
  switch (objectType) {
    case 'web_app':
      return (
        <WebAppFields
          value={value as Partial<Omit<WebAppInfo, 'object_type'>>}
          onChange={onChange as (v: Partial<Omit<WebAppInfo, 'object_type'>>) => void}
        />
      )
    case 'mobile_app':
      return (
        <MobileAppFields
          value={value as Partial<Omit<MobileAppInfo, 'object_type'>>}
          onChange={onChange as (v: Partial<Omit<MobileAppInfo, 'object_type'>>) => void}
        />
      )
    case 'api':
      return (
        <ApiFields
          value={value as Partial<Omit<ApiInfo, 'object_type'>>}
          onChange={onChange as (v: Partial<Omit<ApiInfo, 'object_type'>>) => void}
        />
      )
    case 'elt':
      return (
        <EltFields
          value={value as Partial<Omit<EltInfo, 'object_type'>>}
          onChange={onChange as (v: Partial<Omit<EltInfo, 'object_type'>>) => void}
        />
      )
    default:
      return null
  }
}
