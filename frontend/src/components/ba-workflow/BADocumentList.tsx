/**
 * BADocumentList — Table with status badges (FR-027, FR-029)
 * Supports filter by doc_type and status
 */

import React, { useState } from 'react'
import { Plus, Edit, ArrowRight } from 'lucide-react'
import { StatusBadge, Btn, EmptyState } from '../ui'
import type { BADocument, BADocType, BADocStatus } from '../../lib/types/workflow-doc'

const DOC_TYPE_COLORS: Record<BADocType, string> = {
  BRD: '#0066B3',
  BRS: '#1B7A3F',
  FSD: '#6B21A8',
  API_SPEC: '#C97A00',
  ERD: '#0F766E',
  DATA_DICT: '#7C3AED',
  WIREFRAME: '#DB2777',
  PROCESS_FLOW: '#EA580C',
}

const STATUS_ORDER: BADocStatus[] = ['draft', 'review', 'approved', 'archived']

interface BADocumentListProps {
  documents: BADocument[]
  loading?: boolean
  onAdd?: () => void
  onEdit?: (doc: BADocument) => void
  onTransition?: (doc: BADocument) => void
}

export function BADocumentList({
  documents,
  loading = false,
  onAdd,
  onEdit,
  onTransition,
}: BADocumentListProps) {
  const [typeFilter, setTypeFilter] = useState<BADocType | ''>('')
  const [statusFilter, setStatusFilter] = useState<BADocStatus | ''>('')

  const filtered = documents.filter((d) => {
    const matchType = typeFilter === '' || d.doc_type === typeFilter
    const matchStatus = statusFilter === '' || d.status === statusFilter
    return matchType && matchStatus
  })

  const docTypes = Array.from(new Set(documents.map((d) => d.doc_type)))

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          <Btn
            variant={typeFilter === '' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTypeFilter('')}
          >
            Tất cả loại
          </Btn>
          {docTypes.map((t) => (
            <Btn
              key={t}
              variant={typeFilter === t ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter(t)}
              style={{
                borderLeft: `3px solid ${DOC_TYPE_COLORS[t]}`,
              }}
            >
              {t}
            </Btn>
          ))}
          <div style={{ width: 1, background: 'var(--vib-neutral-200)' }} />
          <Btn
            variant={statusFilter === '' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('')}
          >
            Tất cả trạng thái
          </Btn>
          {STATUS_ORDER.map((s) => (
            <Btn
              key={s}
              variant={statusFilter === s ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s}
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
          icon="📄"
          title="Không có tài liệu"
          desc="Chưa có tài liệu BA nào"
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
                {['Loại', 'Tiêu đề', 'Phiên bản', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(
                  (h) => (
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
                  ),
                )}
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
                      {doc.doc_type}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div className="txt_r_xxs" style={{ fontWeight: 600 }}>
                      {doc.title}
                    </div>
                    {doc.object_ids.length > 0 && (
                      <div className="txt_r_xxxs text-muted" style={{ marginTop: 2 }}>
                        {doc.object_ids.length} đối tượng gắn kết
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="txt_mono" style={{ fontSize: 11 }}>
                      {doc.version}
                    </span>
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
                      {onTransition && doc.status !== 'archived' && (
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
