/**
 * ExportImportPanel — FR-025: Export JSON, import with validation and conflict handling
 * BR-012: fixed template columns per type
 * BR-013: conflict resolution prompt (overwrite vs skip)
 */

import React, { useRef, useState } from 'react'
import { Download, Upload, AlertTriangle } from 'lucide-react'
import { Btn, Modal, VibSelect } from '../ui'
import {
  getExportUrl,
  importProjectObjects,
} from '../../lib/api/project-objects'
import type {
  ProjectObjectType,
  ConflictStrategy,
  ImportResult,
} from '../../lib/types/project-object'

const TYPE_LABELS: Record<ProjectObjectType, string> = {
  web_app: 'Web App',
  mobile_app: 'Mobile App',
  api: 'API',
  elt: 'ELT',
}

interface ExportImportPanelProps {
  projectId: string
  onImportSuccess?: (result: ImportResult) => void
  onError?: (msg: string) => void
}

export function ExportImportPanel({
  projectId,
  onImportSuccess,
  onError,
}: ExportImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportType, setExportType] = useState<ProjectObjectType>('web_app')
  const [importType, setImportType] = useState<ProjectObjectType>('web_app')
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)

  // Conflict resolution state
  const [conflictModal, setConflictModal] = useState(false)
  const [conflictingCodes, setConflictingCodes] = useState<string[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingType, setPendingType] = useState<ProjectObjectType>('web_app')

  // Result modal
  const [resultModal, setResultModal] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const handleExport = () => {
    const url = getExportUrl(projectId, exportType)
    window.open(url, '_blank')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImportFile(file)
    e.target.value = ''
  }

  const doImport = async (
    file: File,
    type: ProjectObjectType,
    strategy: ConflictStrategy,
  ) => {
    setImporting(true)
    try {
      const res = await importProjectObjects(projectId, file, {
        objectType: type,
        conflictStrategy: strategy,
      })

      if (!res.success) {
        // Conflict — ask user
        setConflictingCodes(res.conflict.details.conflicting_codes)
        setPendingFile(file)
        setPendingType(type)
        setConflictModal(true)
        return
      }

      setImportResult(res.result)
      setImportFile(null)
      setResultModal(true)
      onImportSuccess?.(res.result)
    } catch (e: unknown) {
      onError?.((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const handleImportSubmit = () => {
    if (!importFile) return
    doImport(importFile, importType, 'ask')
  }

  const handleConflictOverwrite = async () => {
    setConflictModal(false)
    if (pendingFile) {
      await doImport(pendingFile, pendingType, 'overwrite')
      setPendingFile(null)
    }
  }

  const handleConflictSkip = async () => {
    setConflictModal(false)
    if (pendingFile) {
      await doImport(pendingFile, pendingType, 'skip')
      setPendingFile(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Export Panel */}
        <div className="card card-pad-sm">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
            }}
          >
            <Download size={16} style={{ color: 'var(--vib-primary)' }} />
            <span className="txt_r_xxs" style={{ fontWeight: 700 }}>
              Export Excel
            </span>
          </div>
          <VibSelect
            value={exportType}
            onChange={(e) => setExportType(e.target.value as ProjectObjectType)}
            style={{ marginBottom: 10 }}
          >
            {(Object.keys(TYPE_LABELS) as ProjectObjectType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </VibSelect>
          <div className="txt_r_xxxs text-muted" style={{ marginBottom: 8 }}>
            Template cố định theo loại (BR-012). Format: .xlsx
          </div>
          <Btn onClick={handleExport} variant="ghost" size="sm">
            <Download size={13} /> Export {TYPE_LABELS[exportType]}
          </Btn>
        </div>

        {/* Import Panel */}
        <div className="card card-pad-sm">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
            }}
          >
            <Upload size={16} style={{ color: 'var(--vib-success)' }} />
            <span className="txt_r_xxs" style={{ fontWeight: 700 }}>
              Import Excel
            </span>
          </div>
          <VibSelect
            value={importType}
            onChange={(e) => setImportType(e.target.value as ProjectObjectType)}
            style={{ marginBottom: 10 }}
          >
            {(Object.keys(TYPE_LABELS) as ProjectObjectType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </VibSelect>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {importFile ? (
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span className="txt_r_xxxs" style={{ flex: 1 }}>
                {importFile.name}
              </span>
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => setImportFile(null)}
              >
                ✕
              </Btn>
            </div>
          ) : (
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ marginBottom: 8 }}
            >
              <Upload size={13} /> Chọn file .xlsx
            </Btn>
          )}

          {importFile && (
            <Btn
              size="sm"
              loading={importing}
              onClick={handleImportSubmit}
            >
              <Upload size={13} /> Import
            </Btn>
          )}
          <div className="txt_r_xxxs text-muted" style={{ marginTop: 8 }}>
            Trùng tên → hệ thống hỏi xác nhận (BR-013)
          </div>
        </div>
      </div>

      {/* Conflict Modal */}
      <Modal
        title="Phát hiện đối tượng trùng tên"
        open={conflictModal}
        onClose={() => setConflictModal(false)}
        width="520px"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--vib-warning)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="txt_r_xxs" style={{ fontWeight: 600, marginBottom: 6 }}>
              Các đối tượng sau đã tồn tại trong dự án:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {conflictingCodes.map((code) => (
                <span
                  key={code}
                  className="txt_mono"
                  style={{
                    background: 'var(--vib-warning)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="txt_r_xxxs text-muted" style={{ marginBottom: 16 }}>
          Bạn muốn xử lý như thế nào với các đối tượng trùng tên?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn
            onClick={handleConflictOverwrite}
            style={{ justifyContent: 'center' }}
          >
            Ghi đè (Overwrite) — cập nhật đối tượng hiện có
          </Btn>
          <Btn
            variant="secondary"
            onClick={handleConflictSkip}
            style={{ justifyContent: 'center' }}
          >
            Bỏ qua (Skip) — giữ nguyên đối tượng hiện có
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => setConflictModal(false)}
            style={{ justifyContent: 'center' }}
          >
            Hủy import
          </Btn>
        </div>
      </Modal>

      {/* Result Modal */}
      <Modal
        title="Kết quả Import"
        open={resultModal}
        onClose={() => setResultModal(false)}
        width="480px"
      >
        {importResult && (
          <div>
            <div
              className="kpi-row"
              style={{ marginBottom: 16, gridTemplateColumns: 'repeat(4, 1fr)' }}
            >
              {[
                { label: 'Tạo mới', value: importResult.created },
                { label: 'Cập nhật', value: importResult.updated },
                { label: 'Bỏ qua', value: importResult.skipped },
                { label: 'Lỗi', value: importResult.errors.length },
              ].map(({ label, value }) => (
                <div key={label} className="kpi-card">
                  <div className="kpi-card__label">{label}</div>
                  <div className="kpi-card__value">{value}</div>
                </div>
              ))}
            </div>
            {importResult.errors.length > 0 && (
              <div>
                <div className="txt_r_xxs" style={{ fontWeight: 700, marginBottom: 8 }}>
                  Chi tiết lỗi:
                </div>
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {importResult.errors.map((err, i) => (
                    <div
                      key={i}
                      className="txt_r_xxxs"
                      style={{
                        padding: '4px 8px',
                        background: 'var(--vib-danger-light, #fee2e2)',
                        borderRadius: 4,
                        color: 'var(--vib-danger)',
                      }}
                    >
                      Row {err.row}: {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Btn
              variant="ghost"
              onClick={() => setResultModal(false)}
              style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
            >
              Đóng
            </Btn>
          </div>
        )}
      </Modal>
    </div>
  )
}
