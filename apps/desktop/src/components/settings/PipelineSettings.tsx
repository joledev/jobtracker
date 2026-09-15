import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useApi } from '@/lib/api'
import { usePipelineStore } from '@/stores/pipeline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { PipelineStage } from '@/types/api'

const SortableStageRow = ({
  stage,
  onDelete,
}: {
  stage: PipelineStage
  onDelete: (id: string) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md bg-bg-card px-3 py-2.5"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-text-muted hover:text-text-primary">
        <GripVertical size={16} />
      </button>
      <div
        className="h-4 w-4 rounded-sm border border-border"
        style={{ backgroundColor: stage.color }}
      />
      <span className="flex-1 text-sm text-text-primary">{stage.name}</span>
      {stage.isTerminal && (
        <span className="rounded bg-bg-hover px-1.5 py-0.5 text-xs text-text-muted">terminal</span>
      )}
      <button
        onClick={() => onDelete(stage.id)}
        className="text-xs text-text-muted transition-colors hover:text-status-rejected"
      >
        Eliminar
      </button>
    </div>
  )
}

export const PipelineSettings = () => {
  const api = useApi()
  const fetchStages = usePipelineStore((s) => s.fetchStages)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#4a7c59')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = async () => {
    setIsLoading(true)
    try {
      const data = await api.pipeline.list()
      setStages(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = stages.findIndex((s) => s.id === active.id)
    const newIndex = stages.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(stages, oldIndex, newIndex)
    setStages(reordered)
    await api.pipeline.reorder(reordered.map((s) => s.id))
    fetchStages()
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    setError('')
    try {
      const slug = newName.trim().toLowerCase().replace(/\s+/g, '-')
      await api.pipeline.create({ name: newName.trim(), slug, color: newColor })
      setNewName('')
      setNewColor('#4a7c59')
      await load()
      fetchStages()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError('')
    try {
      await api.pipeline.delete(id)
      await load()
      fetchStages()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se puede eliminar (tiene ofertas activas)')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">Cargando stages...</p>
  }

  return (
    <div className="max-w-lg space-y-4">
      <h3 className="text-sm font-medium text-text-primary">Pipeline Stages</h3>

      {error && <p className="text-xs text-status-rejected">{error}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {stages.map((stage) => (
              <SortableStageRow key={stage.id} stage={stage} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-end gap-2 border-t border-border pt-4">
        <div className="flex-1">
          <Input
            placeholder="Nombre del stage"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-md border border-border bg-bg-card"
        />
        <Button size="sm" onClick={handleCreate} loading={isCreating}>
          Agregar
        </Button>
      </div>
    </div>
  )
}
