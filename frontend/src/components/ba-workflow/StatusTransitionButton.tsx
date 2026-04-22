/**
 * StatusTransitionButton — FR-028: state machine transition button for BA documents
 * State machine: draft → review → approved → archived
 * BR-001: no skip states
 */

import React, { useState } from 'react'
import { ArrowRight, CheckCircle, Archive, RotateCcw } from 'lucide-react'
import { Btn, Modal, Field, VibTextarea } from '../ui'
import type { BADocStatus, BAStatusAction } from '../../lib/types/workflow-doc'

interface TransitionConfig {
  action: BAStatusAction
  label: string
  nextStatus: BADocStatus
  variant: 'primary' | 'secondary' | 'danger' | 'ghost'
  icon: React.ReactNode
  confirmRequired?: boolean
  notesRequired?: boolean
}

const TRANSITIONS: Record<BADocStatus, TransitionConfig[]> = {
  draft: [
    {
      action: 'submit_review',
      label: 'Gửi Review',
      nextStatus: 'review',
      variant: 'primary',
      icon: <ArrowRight size={13} />,
    },
  ],
  review: [
    {
      action: 'approve',
      label: 'Approve',
      nextStatus: 'approved',
      variant: 'primary',
      icon: <CheckCircle size={13} />,
    },
    {
      action: 'reject_to_draft',
      label: 'Trả lại Draft',
      nextStatus: 'draft',
      variant: 'ghost',
      icon: <RotateCcw size={13} />,
      notesRequired: true,
    },
  ],
  approved: [
    {
      action: 'archive',
      label: 'Archive',
      nextStatus: 'archived',
      variant: 'ghost',
      icon: <Archive size={13} />,
      confirmRequired: true,
    },
  ],
  archived: [],
}

interface StatusTransitionButtonProps {
  currentStatus: BADocStatus
  onTransition: (action: BAStatusAction, notes?: string) => Promise<void>
  disabled?: boolean
}

export function StatusTransitionButton({
  currentStatus,
  onTransition,
  disabled = false,
}: StatusTransitionButtonProps) {
  const transitions = TRANSITIONS[currentStatus] ?? []
  const [activeTransition, setActiveTransition] =
    useState<TransitionConfig | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  if (transitions.length === 0) {
    return (
      <span
        className="txt_r_xxxs text-muted"
        style={{ fontStyle: 'italic' }}
      >
        Không có chuyển tiếp khả dụng
      </span>
    )
  }

  const handleClick = (t: TransitionConfig) => {
    if (t.confirmRequired || t.notesRequired) {
      setActiveTransition(t)
      setNotes('')
    } else {
      executeTransition(t)
    }
  }

  const executeTransition = async (t: TransitionConfig, extraNotes?: string) => {
    setLoading(true)
    try {
      await onTransition(t.action, extraNotes || notes || undefined)
    } finally {
      setLoading(false)
      setActiveTransition(null)
    }
  }

  const STATUS_STEPS: BADocStatus[] = ['draft', 'review', 'approved', 'archived']
  const currentIdx = STATUS_STEPS.indexOf(currentStatus)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* State machine visual indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {STATUS_STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  background:
                    i < currentIdx
                      ? 'var(--vib-success)'
                      : i === currentIdx
                        ? 'var(--vib-primary)'
                        : 'var(--vib-neutral-200)',
                  color: i <= currentIdx ? '#fff' : 'var(--vib-neutral-500)',
                }}
              >
                {i < currentIdx ? '✓ ' : ''}
                {s}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background:
                      i < currentIdx
                        ? 'var(--vib-success)'
                        : 'var(--vib-neutral-200)',
                    minWidth: 12,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Transition buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {transitions.map((t) => (
            <Btn
              key={t.action}
              variant={t.variant}
              size="sm"
              loading={loading}
              disabled={disabled}
              onClick={() => handleClick(t)}
            >
              {t.icon} {t.label}
            </Btn>
          ))}
        </div>
      </div>

      {/* Confirm / Notes Modal */}
      <Modal
        title={activeTransition?.label ?? ''}
        open={!!activeTransition}
        onClose={() => setActiveTransition(null)}
        width="480px"
      >
        {activeTransition?.confirmRequired && (
          <div
            className="state-banner state-banner-warn"
            style={{ marginBottom: 12 }}
          >
            Bạn có chắc muốn{' '}
            <strong>{activeTransition.label.toLowerCase()}</strong> tài liệu
            này?
          </div>
        )}
        {(activeTransition?.notesRequired || activeTransition?.confirmRequired) && (
          <Field
            label="Ghi chú"
            required={activeTransition.notesRequired}
          >
            <VibTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Lý do / ghi chú về việc chuyển trạng thái..."
            />
          </Field>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn
            loading={loading}
            onClick={() => activeTransition && executeTransition(activeTransition)}
            disabled={
              activeTransition?.notesRequired && !notes.trim()
            }
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {activeTransition?.icon} {activeTransition?.label}
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => setActiveTransition(null)}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Hủy
          </Btn>
        </div>
      </Modal>
    </>
  )
}
