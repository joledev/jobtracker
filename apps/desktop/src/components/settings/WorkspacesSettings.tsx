import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useApi, ApiClientError } from '@/lib/api'
import { usePipelineStore } from '@/stores/pipeline'
import { useOffersStore } from '@/stores/offers'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import type { Workspace } from '@/types/api'

interface WorkspaceRowProps {
  workspace: Workspace
  onSave: (id: string, data: { name: string; description: string; color: string }) => Promise<void>
  onDelete: (ws: Workspace) => void
}

const WorkspaceRow = ({ workspace, onSave, onDelete }: WorkspaceRowProps) => {
  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description || '')
  const [color, setColor] = useState(workspace.color || '#4a7c59')
  const [isSaving, setIsSaving] = useState(false)

  const hasChanges = name !== workspace.name ||
    description !== (workspace.description || '') ||
    color !== (workspace.color || '#4a7c59')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(workspace.id, { name, description, color })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-2 rounded-md bg-bg-card p-3">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-border bg-bg-card"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none focus:border-text-secondary"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripcion..."
        rows={2}
        className="w-full rounded-md border border-border bg-bg-primary px-2 py-1 text-sm text-text-secondary placeholder-text-muted outline-none focus:border-text-secondary"
      />
      <div className="flex gap-2">
        {hasChanges && (
          <Button size="sm" onClick={handleSave} loading={isSaving}>
            Guardar cambios
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={() => onDelete(workspace)}>
          <Trash2 size={14} />
          Eliminar
        </Button>
      </div>
    </div>
  )
}

interface DeleteDialogProps {
  workspace: Workspace
  offerCount: number
  otherWorkspaces: Workspace[]
  onConfirm: (action: 'delete_offers' | 'move_offers', targetId?: string) => Promise<void>
  onCancel: () => void
}

const DeleteDialog = ({ workspace, offerCount, otherWorkspaces, onConfirm, onCancel }: DeleteDialogProps) => {
  const [action, setAction] = useState<'delete_offers' | 'move_offers'>('move_offers')
  const [targetId, setTargetId] = useState(otherWorkspaces[0]?.id || '')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm(action, action === 'move_offers' ? targetId : undefined)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal open onClose={onCancel} title="Eliminar workspace" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          El workspace <span className="font-medium text-text-primary">{workspace.name}</span> tiene{' '}
          <span className="font-medium text-text-primary">{offerCount}</span> oferta{offerCount > 1 ? 's' : ''} activa{offerCount > 1 ? 's' : ''}.
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-bg-hover transition-colors">
            <input
              type="radio"
              name="action"
              checked={action === 'move_offers'}
              onChange={() => setAction('move_offers')}
              className="accent-status-applied"
            />
            <div>
              <p className="text-sm text-text-primary">Mover ofertas a otro workspace</p>
              <p className="text-xs text-text-muted">Las ofertas se conservan en el workspace seleccionado</p>
            </div>
          </label>

          {action === 'move_offers' && otherWorkspaces.length > 0 && (
            <div className="ml-6">
              <Select
                options={otherWorkspaces.map((w) => ({ value: w.id, label: w.name }))}
                placeholder="Seleccionar workspace destino"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              />
            </div>
          )}

          {action === 'move_offers' && otherWorkspaces.length === 0 && (
            <p className="ml-6 text-xs text-status-rejected">No hay otros workspaces disponibles. Crea uno primero o elimina las ofertas.</p>
          )}

          <label className="flex items-center gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-bg-hover transition-colors">
            <input
              type="radio"
              name="action"
              checked={action === 'delete_offers'}
              onChange={() => setAction('delete_offers')}
              className="accent-status-rejected"
            />
            <div>
              <p className="text-sm text-text-primary">Eliminar las ofertas junto con el workspace</p>
              <p className="text-xs text-status-rejected">Esta accion no se puede deshacer</p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={isDeleting}
            disabled={action === 'move_offers' && !targetId}
          >
            Eliminar workspace
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export const WorkspacesSettings = () => {
  const api = useApi()
  const fetchWorkspaces = usePipelineStore((s) => s.fetchWorkspaces)
  const fetchOffers = useOffersStore((s) => s.fetchOffers)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#4a7c59')
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ workspace: Workspace; offerCount: number } | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const data = await api.workspaces.list()
      setWorkspaces(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (id: string, data: { name: string; description: string; color: string }) => {
    await api.workspaces.update(id, data)
    await load()
    fetchWorkspaces()
  }

  const handleDeleteClick = async (ws: Workspace) => {
    try {
      // Try delete without action -- API returns 409 if has offers
      await api.workspaces.delete(ws.id)
      await load()
      fetchWorkspaces()
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 409) {
        const count = (e.body?.offerCount as number) || 0
        setDeleteTarget({ workspace: ws, offerCount: count })
      }
    }
  }

  const handleDeleteConfirm = async (action: 'delete_offers' | 'move_offers', targetId?: string) => {
    if (!deleteTarget) return
    await api.workspaces.delete(deleteTarget.workspace.id, {
      action,
      targetWorkspaceId: targetId,
    })
    setDeleteTarget(null)
    await load()
    fetchWorkspaces()
    fetchOffers()
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      await api.workspaces.create({
        name: newName.trim(),
        description: newDesc || undefined,
        color: newColor,
      })
      setNewName('')
      setNewDesc('')
      setNewColor('#4a7c59')
      setShowNew(false)
      await load()
      fetchWorkspaces()
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">Workspaces</h3>
        <Button size="sm" onClick={() => setShowNew(true)}>
          + Nuevo Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <p className="text-sm text-text-muted">No hay workspaces</p>
      ) : (
        <div className="space-y-3">
          {workspaces.map((ws) => (
            <WorkspaceRow key={ws.id} workspace={ws} onSave={handleSave} onDelete={handleDeleteClick} />
          ))}
        </div>
      )}

      {showNew && (
        <div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-border bg-bg-card"
            />
            <Input
              placeholder="Nombre del workspace *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <Textarea
            placeholder="Descripcion..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} loading={isCreating}>
              Crear
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteDialog
          workspace={deleteTarget.workspace}
          offerCount={deleteTarget.offerCount}
          otherWorkspaces={workspaces.filter((w) => w.id !== deleteTarget.workspace.id)}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
