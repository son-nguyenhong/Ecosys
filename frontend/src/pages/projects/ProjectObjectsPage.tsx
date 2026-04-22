/**
 * ProjectObjectsPage — FR-023 to FR-026
 * Danh sách project objects, form tạo mới, export/import, connection map
 */

import React, { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import {
  Btn, Modal, Field, VibInput, VibSelect, VibTextarea,
  EmptyState, Confirm,
} from '../../components/ui'
import { ProjectObjectTable } from '../../components/projects/ProjectObjectTable'
import { ObjectTypeForm } from '../../components/projects/ObjectTypeForm'
import { ConnectionMap } from '../../components/projects/ConnectionMap'
import { ExportImportPanel } from '../../components/projects/ExportImportPanel'
import {
  getProjectObjects,
  createProjectObject,
  updateProjectObject,
  deleteProjectObject,
} from '../../lib/api/project-objects'
import { useStore } from '../../stores/auth'
import type { ProjectObject, ProjectObjectType, ProjectObjectCreate } from '../../lib/types/project-object'
import type { StandardInfoFormValue } from '../../components/projects/ObjectTypeForm'

type ActiveModal = 'create' | 'edit' | 'connections' | 'export_import' | null

const OBJECT_TYPE_OPTIONS: Array<{ value: ProjectObjectType; label: string }> = [
  { value: 'web_app', label: 'Web App' },
  { value: 'mobile_app', label: 'Mobile App' },
  { value: 'api', label: 'API' },
  { value: 'elt', label: 'ELT' },
]

interface ObjectFormState {
  name: string
  code: string
  description: string
  owner: string
  object_type: ProjectObjectType
  standard_info: StandardInfoFormValue
}

const DEFAULT_FORM: ObjectFormState = {
  name: '',
  code: '',
  description: '',
  owner: '',
  object_type: 'web_app',
  standard_info: {},
}

export default function ProjectObjectsPage() {
  const { addToast, selectedProject } = useStore()
  const [objects, setObjects] = useState<ProjectObject[]>([])
  const [loading, setLoading] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [editing, setEditing] = useState<ProjectObject | null>(null)
  const [activeConnObj, setActiveConnObj] = useState<ProjectObject | null>(null)
  const [form, setForm] = useState<ObjectFormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ProjectObject | null>(null)
  const [typeFilter, setTypeFilter] = useState<ProjectObjectType | ''>('')

  const projectId = selectedProject?.id ?? ''

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await getProjectObjects(projectId)
      setObjects(res.data)
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, addToast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setActiveModal('create')
  }

  const openEdit = (obj: ProjectObject) => {
    setEditing(obj)
    setForm({
      name: obj.name,
      code: obj.code,
      description: obj.description ?? '',
      owner: obj.owner,
      object_type: obj.object_type,
      standard_info: { ...obj.standard_info },
    })
    setActiveModal('edit')
  }

  const openConnections = (obj: ProjectObject) => {
    setActiveConnObj(obj)
    setActiveModal('connections')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      return addToast('Cần nhập Tên và Code', 'warn')
    }
    if (!form.owner.trim()) {
      return addToast('Cần nhập Owner', 'warn')
    }
    setSaving(true)
    try {
      const payload: ProjectObjectCreate = {
        object_type: form.object_type,
        name: form.name,
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        owner: form.owner,
        standard_info: form.standard_info as ProjectObjectCreate['standard_info'],
      }
      if (editing) {
        await updateProjectObject(projectId, editing.id, {
          name: payload.name,
          description: payload.description,
          owner: payload.owner,
          standard_info: payload.standard_info,
        })
        addToast('Đã cập nhật đối tượng', 'success')
      } else {
        await createProjectObject(projectId, payload)
        addToast('Đã tạo đối tượng', 'success')
      }
      setActiveModal(null)
      load()
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (obj: ProjectObject) => {
    try {
      await deleteProjectObject(projectId, obj.id)
      addToast('Đã xóa đối tượng', 'success')
      setConfirmDelete(null)
      load()
    } catch (e: unknown) {
      addToast((e as Error).message, 'error')
      setConfirmDelete(null)
    }
  }

  if (!projectId) {
    return (
      <EmptyState
        icon="📁"
        title="Chưa chọn Project"
        desc="Chọn một project từ tab Projects để quản lý đối tượng"
      />
    )
  }

  const displayObjects = typeFilter
    ? objects.filter((o) => o.object_type === typeFilter)
    : objects

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
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--vib-neutral-900)' }}>
            Đối tượng — {selectedProject?.name}
          </span>
        </div>
        <Btn variant="ghost" size="sm" onClick={load}>
          <RefreshCw size={13} />
        </Btn>
      </div>

      {/* Type filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {([
          { key: '' as const, label: 'Tất cả' },
          { key: 'web_app' as const, label: 'Web App' },
          { key: 'mobile_app' as const, label: 'Mobile App' },
          { key: 'api' as const, label: 'API' },
          { key: 'elt' as const, label: 'ELT' },
        ]).map(({ key, label }) => {
          const isActive = typeFilter === key
          const count = key === '' ? objects.length : objects.filter(o => o.object_type === key).length
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font)', fontSize: 13, fontWeight: isActive ? 700 : 400,
                background: isActive ? 'var(--vib-primary)' : 'var(--vib-neutral-100)',
                color: isActive ? '#fff' : 'var(--vib-neutral-600)',
                transition: 'all 0.15s',
              }}
            >
              {label}
              <span style={{
                fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center',
                padding: '1px 5px', borderRadius: 10,
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--vib-neutral-200)',
                color: isActive ? '#fff' : 'var(--vib-neutral-500)',
              }}>{count}</span>
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <Btn
          variant="ghost"
          size="sm"
          onClick={() => setActiveModal('export_import')}
        >
          Export / Import
        </Btn>
        <Btn size="sm" onClick={openCreate}>
          <Plus size={14} /> Thêm đối tượng
        </Btn>
      </div>

      <ProjectObjectTable
        objects={displayObjects}
        loading={loading}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(obj) => setConfirmDelete(obj)}
        onViewConnections={openConnections}
      />

      {/* Create / Edit Modal */}
      <Modal
        title={editing ? 'Chỉnh sửa đối tượng' : 'Thêm đối tượng mới'}
        open={activeModal === 'create' || activeModal === 'edit'}
        onClose={() => setActiveModal(null)}
        width="720px"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Loại đối tượng" required>
            <VibSelect
              value={form.object_type}
              onChange={(e) => {
                setForm((f) => ({
                  ...f,
                  object_type: e.target.value as ProjectObjectType,
                  standard_info: {},
                }))
              }}
              disabled={!!editing}
            >
              {OBJECT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </VibSelect>
          </Field>
          <Field label="Code" required>
            <VibInput
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  code: e.target.value.toUpperCase(),
                }))
              }
              placeholder="CUSTOMER_API"
              readOnly={!!editing}
              style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
            />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Tên" required>
            <VibInput
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Tên đầy đủ"
            />
          </Field>
          <Field label="Owner" required>
            <VibInput
              value={form.owner}
              onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
              placeholder="Team / người chịu trách nhiệm"
            />
          </Field>
        </div>
        <Field label="Mô tả">
          <VibTextarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={2}
            placeholder="Mô tả ngắn về đối tượng"
          />
        </Field>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: 'var(--vib-neutral-50)',
            borderRadius: 8,
            border: '1px solid var(--vib-neutral-200)',
          }}
        >
          <div className="txt_r_xxs" style={{ fontWeight: 700, marginBottom: 10 }}>
            Thông tin chuẩn — {form.object_type.replace('_', ' ').toUpperCase()}
          </div>
          <ObjectTypeForm
            objectType={form.object_type}
            value={form.standard_info}
            onChange={(v) => setForm((f) => ({ ...f, standard_info: v }))}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <Btn
            onClick={handleSave}
            loading={saving}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {editing ? 'Cập nhật' : 'Tạo đối tượng'}
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => setActiveModal(null)}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Hủy
          </Btn>
        </div>
      </Modal>

      {/* Connections Modal */}
      <Modal
        title={`Kết nối — ${activeConnObj?.name ?? ''}`}
        open={activeModal === 'connections'}
        onClose={() => setActiveModal(null)}
        width="860px"
      >
        {activeConnObj && (
          <ConnectionMap
            projectId={projectId}
            objectId={activeConnObj.id}
            objectName={activeConnObj.name}
            onError={(msg) => addToast(msg, 'error')}
          />
        )}
      </Modal>

      {/* Export/Import Modal */}
      <Modal
        title="Export / Import đối tượng"
        open={activeModal === 'export_import'}
        onClose={() => setActiveModal(null)}
        width="720px"
      >
        <ExportImportPanel
          projectId={projectId}
          onImportSuccess={(result) => {
            addToast(
              `Import thành công: ${result.created} tạo mới, ${result.updated} cập nhật`,
              'success',
            )
            setActiveModal(null)
            load()
          }}
          onError={(msg) => addToast(msg, 'error')}
        />
      </Modal>

      <Confirm
        open={!!confirmDelete}
        message={`Xóa đối tượng "${confirmDelete?.name}"? Thao tác này sẽ set status = decommissioned.`}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
