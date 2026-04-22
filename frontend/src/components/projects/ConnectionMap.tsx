/**
 * ConnectionMap — FR-026: inbound/outbound connection diagram (table/list view)
 */

import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react'
import { StatusBadge, Btn, EmptyState, Modal, Field, VibInput, VibSelect } from '../ui'
import {
  getObjectConnections,
  createObjectConnection,
  deleteObjectConnection,
} from '../../lib/api/project-objects'
import type { ObjectConnection, ConnectionCreate, ConnectionType } from '../../lib/types/project-object'

const CONNECTION_TYPES: ConnectionType[] = [
  'api_call',
  'db_link',
  'file_transfer',
  'event_stream',
  'other',
]

interface ConnectionMapProps {
  projectId: string
  objectId: string
  objectName: string
  onError?: (msg: string) => void
}

export function ConnectionMap({
  projectId,
  objectId,
  objectName,
  onError,
}: ConnectionMapProps) {
  const [outbound, setOutbound] = useState<ObjectConnection[]>([])
  const [inbound, setInbound] = useState<ObjectConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<ConnectionCreate>({
    target_object_id: '',
    connection_type: 'api_call',
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getObjectConnections(projectId, objectId)
      setOutbound(res.data.outbound)
      setInbound(res.data.inbound)
    } catch (e: unknown) {
      onError?.((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [projectId, objectId, onError])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async () => {
    if (!form.target_object_id.trim()) return
    setSaving(true)
    try {
      await createObjectConnection(projectId, objectId, form)
      setShowAddModal(false)
      setForm({ target_object_id: '', connection_type: 'api_call' })
      load()
    } catch (e: unknown) {
      onError?.((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (connId: string) => {
    setDeletingId(connId)
    try {
      await deleteObjectConnection(projectId, objectId, connId)
      load()
    } catch (e: unknown) {
      onError?.((e as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  const renderConnectionRow = (
    conn: ObjectConnection,
    direction: 'out' | 'in',
  ) => (
    <div
      key={conn.connection_id}
      className="card card-pad-sm"
      style={{
        borderLeft: `3px solid ${direction === 'out' ? 'var(--vib-primary)' : 'var(--vib-success)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 16 }}>
        {direction === 'out' ? (
          <ArrowRight size={16} style={{ color: 'var(--vib-primary)' }} />
        ) : (
          <ArrowLeft size={16} style={{ color: 'var(--vib-success)' }} />
        )}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="txt_r_xxs" style={{ fontWeight: 600 }}>
            {conn.target_object.name}
          </span>
          <span
            className="txt_r_xxxs"
            style={{
              background: 'var(--vib-neutral-100)',
              padding: '1px 6px',
              borderRadius: 8,
              color: 'var(--vib-neutral-600)',
            }}
          >
            {conn.connection_type.replace('_', ' ')}
          </span>
          {conn.protocol && (
            <span className="txt_r_xxxs text-muted">{conn.protocol}</span>
          )}
          <StatusBadge status={conn.status} />
        </div>
        <div className="txt_r_xxxs text-muted" style={{ marginTop: 2 }}>
          {conn.target_object.project.name}
          {conn.frequency && ` · ${conn.frequency}`}
        </div>
      </div>
      <Btn
        variant="ghost"
        size="sm"
        loading={deletingId === conn.connection_id}
        onClick={() => handleDelete(conn.connection_id)}
      >
        <Trash2 size={12} />
      </Btn>
    </div>
  )

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h4 className="txt_s_xxs">Kết nối — {objectName}</h4>
          <span className="txt_r_xxxs text-muted">
            {outbound.length} outbound · {inbound.length} inbound
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} />
          </Btn>
          <Btn size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={13} /> Thêm kết nối
          </Btn>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Đang tải...</div>
      ) : outbound.length === 0 && inbound.length === 0 ? (
        <EmptyState
          icon="🔗"
          title="Chưa có kết nối"
          desc="Thêm kết nối inbound hoặc outbound cho đối tượng này"
          action={
            <Btn onClick={() => setShowAddModal(true)}>
              <Plus size={14} /> Thêm kết nối
            </Btn>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <ArrowRight size={14} style={{ color: 'var(--vib-primary)' }} />
              <span className="txt_r_xxs" style={{ fontWeight: 700 }}>
                Outbound ({outbound.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {outbound.length === 0 ? (
                <div className="txt_r_xxxs text-muted" style={{ fontStyle: 'italic' }}>
                  Không có kết nối outbound
                </div>
              ) : (
                outbound.map((c) => renderConnectionRow(c, 'out'))
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <ArrowLeft size={14} style={{ color: 'var(--vib-success)' }} />
              <span className="txt_r_xxs" style={{ fontWeight: 700 }}>
                Inbound ({inbound.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inbound.length === 0 ? (
                <div className="txt_r_xxxs text-muted" style={{ fontStyle: 'italic' }}>
                  Không có kết nối inbound
                </div>
              ) : (
                inbound.map((c) => renderConnectionRow(c, 'in'))
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        title="Thêm kết nối Outbound"
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      >
        <div
          className="state-banner state-banner-info"
          style={{ fontSize: 12, marginBottom: 12 }}
        >
          Kết nối outbound: từ <strong>{objectName}</strong> đến đối tượng khác
        </div>
        <Field label="Target Object ID" required>
          <VibInput
            value={form.target_object_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, target_object_id: e.target.value }))
            }
            placeholder="UUID của đối tượng đích"
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Loại kết nối" required>
            <VibSelect
              value={form.connection_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  connection_type: e.target.value as ConnectionType,
                }))
              }
            >
              {CONNECTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </VibSelect>
          </Field>
          <Field label="Protocol">
            <VibInput
              value={form.protocol ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, protocol: e.target.value }))
              }
              placeholder="REST / SOAP / JDBC..."
            />
          </Field>
        </div>
        <Field label="Frequency">
          <VibInput
            value={form.frequency ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, frequency: e.target.value }))
            }
            placeholder="real-time / daily / on-demand"
          />
        </Field>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn onClick={handleAdd} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>
            Thêm kết nối
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => setShowAddModal(false)}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Hủy
          </Btn>
        </div>
      </Modal>
    </div>
  )
}
