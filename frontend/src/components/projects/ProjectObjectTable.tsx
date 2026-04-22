/**
 * ProjectObjectTable — Table of project objects with filter by type (FR-023–FR-025)
 */

import React, { useState } from 'react'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { StatusBadge, Btn, EmptyState } from '../ui'
import type { ProjectObject, ProjectObjectType } from '../../lib/types/project-object'

const OBJECT_TYPE_LABELS: Record<ProjectObjectType, string> = {
  web_app: 'Web App',
  mobile_app: 'Mobile App',
  api: 'API',
  elt: 'ELT',
}

const OBJECT_TYPE_ICONS: Record<ProjectObjectType, string> = {
  web_app: '🌐',
  mobile_app: '📱',
  api: '🔌',
  elt: '🔄',
}

interface ProjectObjectTableProps {
  objects: ProjectObject[]
  loading?: boolean
  onAdd?: () => void
  onEdit?: (obj: ProjectObject) => void
  onDelete?: (obj: ProjectObject) => void
  onViewConnections?: (obj: ProjectObject) => void
}

export function ProjectObjectTable({
  objects,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onViewConnections,
}: ProjectObjectTableProps) {
  const [typeFilter, setTypeFilter] = useState<ProjectObjectType | ''>('')
  const [search, setSearch] = useState('')

  const filtered = objects.filter((obj) => {
    const matchType = typeFilter === '' || obj.object_type === typeFilter
    const matchSearch =
      search === '' ||
      obj.name.toLowerCase().includes(search.toLowerCase()) ||
      obj.code.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const types: Array<ProjectObjectType | ''> = ['', 'web_app', 'mobile_app', 'api', 'elt']

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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
          <div
            style={{
              position: 'relative',
              flex: 1,
              maxWidth: 280,
            }}
          >
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--vib-neutral-400)',
              }}
            />
            <input
              className="vib-input"
              style={{ paddingLeft: 28 }}
              placeholder="Tìm theo tên hoặc code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {types.map((t) => (
              <Btn
                key={t === '' ? 'all' : t}
                variant={typeFilter === t ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTypeFilter(t)}
              >
                {t === ''
                  ? 'Tất cả'
                  : `${OBJECT_TYPE_ICONS[t]} ${OBJECT_TYPE_LABELS[t]}`}
              </Btn>
            ))}
          </div>
        </div>
        {onAdd && (
          <Btn size="sm" onClick={onAdd}>
            <Plus size={13} /> Thêm đối tượng
          </Btn>
        )}
      </div>

      {loading ? (
        <div className="empty-state">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="Không có đối tượng"
          desc={
            typeFilter
              ? `Không có ${OBJECT_TYPE_LABELS[typeFilter]} nào`
              : 'Chưa có đối tượng nào trong dự án này'
          }
          action={
            onAdd ? (
              <Btn onClick={onAdd}>
                <Plus size={14} /> Thêm đối tượng
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
                {['Loại', 'Code', 'Tên', 'Owner', 'Trạng thái', 'Thao tác'].map(
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
              {filtered.map((obj, idx) => (
                <tr
                  key={obj.id}
                  style={{
                    borderBottom:
                      idx < filtered.length - 1
                        ? '1px solid var(--vib-neutral-100)'
                        : 'none',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: 13 }}>
                      {OBJECT_TYPE_ICONS[obj.object_type]}
                    </span>
                    <span
                      className="txt_r_xxxs"
                      style={{ marginLeft: 4, color: 'var(--vib-neutral-600)' }}
                    >
                      {OBJECT_TYPE_LABELS[obj.object_type]}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="txt_mono" style={{ fontSize: 11 }}>
                      {obj.code}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div className="txt_r_xxs" style={{ fontWeight: 600 }}>
                      {obj.name}
                    </div>
                    {obj.description && (
                      <div className="txt_r_xxxs text-muted">
                        {obj.description.length > 60
                          ? obj.description.slice(0, 60) + '…'
                          : obj.description}
                      </div>
                    )}
                  </td>
                  <td
                    style={{ padding: '8px 12px' }}
                    className="txt_r_xxxs text-muted"
                  >
                    {obj.owner}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <StatusBadge status={obj.status} />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {onViewConnections && (
                        <Btn
                          variant="ghost"
                          size="sm"
                          title="Xem kết nối"
                          onClick={() => onViewConnections(obj)}
                        >
                          🔗
                        </Btn>
                      )}
                      {onEdit && (
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(obj)}
                        >
                          <Edit size={12} />
                        </Btn>
                      )}
                      {onDelete && (
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(obj)}
                        >
                          <Trash2 size={12} />
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
