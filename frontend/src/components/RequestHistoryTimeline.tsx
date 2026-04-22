import React from 'react'
import type { RequestHistoryEntry } from '../api/requests'

const ACTION_LABEL: Record<string, string> = {
  created:        'Khởi tạo',
  updated:        'Cập nhật thông tin',
  status_changed: 'Thay đổi trạng thái',
}

function dotColor(e: RequestHistoryEntry): string {
  if (e.action === 'created') return '#22c55e'
  const terminal = ['rejected', 'cancelled', 'closed']
  if (e.to_status && terminal.includes(e.to_status)) return '#ef4444'
  if (e.to_status === 'implemented' || e.to_status === 'resolved') return '#22c55e'
  return 'var(--vib-primary, #1d4ed8)'
}

export function RequestHistoryTimeline({
  entries,
  statusLabels,
  loading,
}: {
  entries: RequestHistoryEntry[]
  statusLabels: Record<string, string>
  loading?: boolean
}) {
  if (loading) {
    return (
      <div style={{ marginTop: 16, borderTop: '1px solid var(--vib-neutral-200)', paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vib-neutral-400)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Lịch sử hoạt động
        </div>
        <div style={{ fontSize: 12, color: 'var(--vib-neutral-400)', paddingTop: 8 }}>Đang tải...</div>
      </div>
    )
  }
  if (entries.length === 0) return null

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--vib-neutral-200)', paddingTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vib-neutral-500)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Lịch sử hoạt động
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {entries.map((e, i) => (
          <div key={e.id} style={{ display: 'flex', gap: 10 }}>
            {/* Dot + connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 18 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                background: dotColor(e),
                boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${dotColor(e)}33`,
              }} />
              {i < entries.length - 1 && (
                <div style={{ width: 1, flex: 1, background: 'var(--vib-neutral-200)', minHeight: 14 }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vib-neutral-800)' }}>
                  {ACTION_LABEL[e.action] ?? e.action}
                </span>
                {e.from_status && e.to_status && (
                  <>
                    <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>
                      {statusLabels[e.from_status] ?? e.from_status}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--vib-neutral-400)' }}>→</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: dotColor(e) }}>
                      {statusLabels[e.to_status] ?? e.to_status}
                    </span>
                  </>
                )}
                {e.action === 'created' && e.to_status && !e.from_status && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>
                    {statusLabels[e.to_status] ?? e.to_status}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--vib-neutral-400)', marginTop: 1 }}>
                {e.actor} · {new Date(e.created_at).toLocaleString('vi-VN')}
              </div>
              {e.comment && (
                <div style={{
                  marginTop: 5, padding: '5px 10px',
                  background: '#fafafa', borderRadius: 6,
                  border: '1px solid var(--vib-neutral-200)',
                  fontSize: 12, color: 'var(--vib-neutral-700)',
                  lineHeight: 1.5, fontStyle: 'italic',
                }}>
                  "{e.comment}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
