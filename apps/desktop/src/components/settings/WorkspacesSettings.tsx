import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api'
import { usePipelineStore } from '@/stores/pipeline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'
import type { Workspace } from '@/types/api'

interface WorkspaceRowProps {
  workspace: Workspace
  onSave: (id: string, data: { name: string; description: string; color: string }) => Promise<void>
  onDelete: (id: string) => void
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
        <Button size="sm" variant="danger" onClick={() => onDelete(workspace.id)}>
          Eliminar
        </Button>
      </div>
    </div>
  )
}

export const WorkspacesSettings = () => {
  const api = useApi()
  const fetchWorkspaces = usePipelineStore((s) => s.fetchWorkspaces)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#4a7c59')
  const [isCreating, setIsCreating] = useState(false)

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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este workspace?')) return
    await api.workspaces.delete(id)
    await load()
    fetchWorkspaces()
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
            <WorkspaceRow key={ws.id} workspace={ws} onSave={handleSave} onDelete={handleDelete} />
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
    </div>
  )
}
