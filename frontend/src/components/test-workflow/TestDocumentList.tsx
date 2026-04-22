/**
 * TestDocumentList — Table with coverage % (FR-031) and status badges (FR-032)
 */

import React, { useState } from 'react'
import { Plus, Edit, ArrowRight } from 'lucide-react'
import { StatusBadge, Btn, EmptyState } from '../ui'
import { CoverageSummary } from './CoverageIndicator'
import type { TestDocument, TestDocType, TestDocStatus } from '../../lib/types/workflow-doc'

const DOC_TYPE_LABELS: Record<TestDocType, string> = {
  TEST_PLAN: 'Test Plan',
  BUG_REPORT: 'Bug Report',
  UAT_SIGNOFF: 'UAT Sign-off',
}

const DOC_TYPE_COLORS: Record<TestDocType, string> = {
  TEST_PLAN: '#0066B3',
  BUG_REPORT: '#DC2626',
  UAT_SIGNOFF: '#059669',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#D97706',
  low: '#65A30D',
}

interface TestDocumentListProps {
  documents: TestDocument[]
  loading?: boolean
  coveragePct?: number
  totalTests?: number
  passedTests?: number
  failedTests?: number
  onAdd?: () => void
  onEdit?: (doc: TestDocument) => void
  onTransition?: (doc: TestDocument) => void
}

export function TestDocumentList({
  documents,
  loading = false,
  coveragePct,
  totalTests = 0,
  passedTests = 0,
  failedTests = 0,
  onAdd,
  onEdit,
  onTransition,
}: TestDocumentListProps) {
  const [typeFilter, setTypeFilter] = useState<TestDocType | ''>('')

  const filtered = documents.filter(
    (d) => typeFilter === '' || d.doc_type === typeFilter,
  )

  return (
    <div>
      {/* Coverage summary if provided */}
      {coveragePct !== undefined && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <CoverageSummary
            coverage_pct={coveragePct}
            total={totalTests}
            passed={passedTests}
            failed={failedTests}
            executed={passedTests + failedTests}
            compact={false}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn
            variant={typeFilter === '' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTypeFilter('')}
          >
            Tất cả
          </Btn>
          {(Object.keys(DOC_TYPE_LABELS) as TestDocType[]).map((t) => (
            <Btn
              key={t}
              variant={typeFilter === t ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter(t)}
              style={{ borderLeft: `3px solid ${DOC_TYPE_COLORS[t]}` }}
            >
              {DOC_TYPE_LABELS[t]}
            </Btn>
          ))}
        </div>
        {onAdd && (
          <Btn size="sm" onClick={onAdd}>
            <Plus size={13} /> Tạo tài liệu
          </Btn>
        )}
      </div>

      {loading ? (
        <div className="empty-state">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🧪"
          title="Không có tài liệu test"
          desc="Chưa có tài liệu test nào"
          action={
            onAdd ? (
              <Btn onClick={onAdd}>
                <Plus size={14} /> Tạo tài liệu
              </Btn>
            ) : undefined
          }
        />
      ) : (
        <div
          style={{
            border: '1px solid var(--vib-neutral-200)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: 'var(--vib-neutral-50)',
                  borderBottom: '1px solid var(--vib-neutral-200)',
                }}
              >
                {[
                  'Loại',
                  'Tiêu đề',
                  'Trạng thái',
                  'Ngày tạo',
                  'Thao tác',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--vib-neutral-600)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, idx) => (
                <tr
                  key={doc.id}
                  style={{
                    borderBottom:
                      idx < filtered.length - 1
                        ? '1px solid var(--vib-neutral-100)'
                        : 'none',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: `${DOC_TYPE_COLORS[doc.doc_type]}18`,
                        color: DOC_TYPE_COLORS[doc.doc_type],
                        border: `1px solid ${DOC_TYPE_COLORS[doc.doc_type]}40`,
                      }}
                    >
                      {DOC_TYPE_LABELS[doc.doc_type]}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div className="txt_r_xxs" style={{ fontWeight: 600 }}>
                      {doc.title}
                    </div>
                    {doc.doc_type === 'BUG_REPORT' &&
                      doc.metadata?.severity && (
                        <div style={{ marginTop: 3 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: `${SEVERITY_COLORS[doc.metadata.severity]}20`,
                              color: SEVERITY_COLORS[doc.metadata.severity],
                              textTransform: 'uppercase',
                            }}
                          >
                            {doc.metadata.severity}
                          </span>
                        </div>
                      )}
                    {doc.doc_type === 'UAT_SIGNOFF' &&
                      doc.metadata?.approver && (
                        <div
                          className="txt_r_xxxs text-muted"
                          style={{ marginTop: 2 }}
                        >
                          Approver: {doc.metadata.approver}
                          {doc.metadata.sign_date &&
                            ` · ${doc.metadata.sign_date}`}
                        </div>
                      )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td
                    style={{ padding: '8px 12px' }}
                    className="txt_r_xxxs text-muted"
                  >
                    {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {onTransition && (
                        <Btn
                          variant="ghost"
                          size="sm"
                          title="Chuyển trạng thái"
                          onClick={() => onTransition(doc)}
                        >
                          <ArrowRight size={12} />
                        </Btn>
                      )}
                      {onEdit && (
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(doc)}
                        >
                          <Edit size={12} />
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
