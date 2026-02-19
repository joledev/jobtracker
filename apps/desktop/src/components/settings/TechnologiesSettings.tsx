import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import type { Technology } from '@/types/api'

const categoryOptions = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'database', label: 'Database' },
  { value: 'devops', label: 'DevOps' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'language', label: 'Language' },
  { value: 'tool', label: 'Tool' },
  { value: 'other', label: 'Other' },
]

const categoryColors: Record<string, string> = {
  frontend: 'bg-status-offer/20 text-status-offer',
  backend: 'bg-status-accepted/20 text-status-accepted',
  database: 'bg-status-interview/20 text-status-interview',
  devops: 'bg-status-screening/20 text-status-screening',
  mobile: 'bg-status-applied/20 text-status-applied',
  language: 'bg-bg-hover text-text-secondary',
  tool: 'bg-bg-hover text-text-secondary',
}

interface TechRowProps {
  tech: Technology
  onSave: (id: string, name: string, category: string) => Promise<void>
  onDelete: (id: string) => void
}

const TechRow = ({ tech, onSave, onDelete }: TechRowProps) => {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tech.name)
  const [category, setCategory] = useState(tech.category || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(tech.id, name, category)
      setEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const catClass = categoryColors[tech.category || ''] || 'bg-bg-hover text-text-muted'

  if (editing) {
    return (
      <tr className="border-b border-border">
        <td className="px-3 py-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none focus:border-text-secondary"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none"
          >
            <option value="">Sin categoria</option>
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex justify-end gap-1">
            <Button size="sm" onClick={handleSave} loading={isSaving}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border">
      <td className="px-3 py-2">
        <button onClick={() => setEditing(true)} className="text-sm text-text-primary hover:underline">
          {tech.name}
        </button>
      </td>
      <td className="px-3 py-2">
        {tech.category ? (
          <button onClick={() => setEditing(true)}>
            <span className={`rounded px-1.5 py-0.5 text-xs ${catClass}`}>
              {tech.category}
            </span>
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-text-muted hover:underline">
            Asignar
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={() => onDelete(tech.id)}
          className="text-xs text-text-muted transition-colors hover:text-status-rejected"
        >
          Eliminar
        </button>
      </td>
    </tr>
  )
}

export const TechnologiesSettings = () => {
  const api = useApi()
  const [techs, setTechs] = useState<Technology[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const data = await api.technologies.list()
      setTechs(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (id: string, name: string, category: string) => {
    await api.technologies.update(id, { name, category: category || null })
    await load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tecnologia?')) return
    await api.technologies.delete(id)
    await load()
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      await api.technologies.create({ name: newName.trim(), category: newCategory || undefined })
      setNewName('')
      setNewCategory('')
      await load()
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
      <h3 className="text-sm font-medium text-text-primary">Tecnologias</h3>

      {techs.length === 0 ? (
        <p className="text-sm text-text-muted">No hay tecnologias</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {techs.map((tech) => (
              <TechRow key={tech.id} tech={tech} onSave={handleSave} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>
      )}

      <div className="flex items-end gap-2 border-t border-border pt-4">
        <div className="flex-1">
          <Input
            placeholder="Nombre de la tecnologia"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Select
            options={categoryOptions}
            placeholder="Categoria"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={handleCreate} loading={isCreating}>
          Agregar
        </Button>
      </div>
    </div>
  )
}
