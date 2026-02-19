import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CreateTemplateModal } from './CreateTemplateModal'
import { useTemplatesStore } from '@/stores/templates'
import type { ParseTemplate } from '@/lib/parsers/types'

const selectorInputClass = 'w-full rounded border border-border bg-bg-primary px-2 py-1 font-mono text-xs text-text-primary outline-none focus:border-text-secondary'

const descriptionToString = (desc: string | string[] | undefined): string => {
  if (!desc) return ''
  return Array.isArray(desc) ? desc.join(', ') : desc
}

const stringToDescription = (val: string): string | string[] | undefined => {
  const trimmed = val.trim()
  if (!trimmed) return undefined
  const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts : parts[0]
}

interface TemplateRowProps {
  template: ParseTemplate
  onSave: (id: string, data: Partial<Omit<ParseTemplate, 'id' | 'createdAt'>>) => Promise<void>
  onDelete: (id: string) => void
}

const TemplateRow = ({ template, onSave, onDelete }: TemplateRowProps) => {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(template.name)
  const [platform, setPlatform] = useState(template.platform)
  const [company, setCompany] = useState(template.selectors.company || '')
  const [position, setPosition] = useState(template.selectors.position || '')
  const [salary, setSalary] = useState(template.selectors.salary || '')
  const [location, setLocation] = useState(template.selectors.location || '')
  const [modality, setModality] = useState(template.selectors.modality || '')
  const [type, setType] = useState(template.selectors.type || '')
  const [level, setLevel] = useState(template.selectors.level || '')
  const [description, setDescription] = useState(descriptionToString(template.selectors.description))
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(template.id, {
        name,
        platform,
        selectors: {
          company: company || undefined,
          position: position || undefined,
          salary: salary || undefined,
          location: location || undefined,
          modality: modality || undefined,
          type: type || undefined,
          level: level || undefined,
          description: stringToDescription(description),
        },
      })
      setEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (editing) {
    return (
      <tr className="border-b border-border">
        <td className="px-3 py-2" colSpan={3}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre"
                className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none focus:border-text-secondary"
              />
              <input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Plataforma"
                className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none focus:border-text-secondary"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Selector: empresa" className={selectorInputClass} />
              <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Selector: posicion" className={selectorInputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Selector: salario" className={selectorInputClass} />
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Selector: ubicacion" className={selectorInputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={modality} onChange={(e) => setModality(e.target.value)} placeholder="Selector: modalidad" className={selectorInputClass} />
              <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Selector: tipo" className={selectorInputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Selector: nivel" className={selectorInputClass} />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Selector: descripcion (separar con comas si son varios)"
                className={selectorInputClass}
              />
            </div>
            <div className="flex justify-end gap-1">
              <Button size="sm" onClick={handleSave} loading={isSaving}>Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border">
      <td className="px-3 py-2">
        <button onClick={() => setEditing(true)} className="text-sm text-text-primary hover:underline">
          {template.name}
        </button>
      </td>
      <td className="px-3 py-2">
        <span className="rounded bg-bg-hover px-1.5 py-0.5 text-xs text-text-secondary">
          {template.platform || 'custom'}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={() => onDelete(template.id)}
          className="text-xs text-text-muted transition-colors hover:text-status-rejected"
        >
          Eliminar
        </button>
      </td>
    </tr>
  )
}

export const ImportTemplatesSettings = () => {
  const templates = useTemplatesStore((s) => s.templates)
  const isLoaded = useTemplatesStore((s) => s.isLoaded)
  const loadTemplates = useTemplatesStore((s) => s.loadTemplates)
  const addTemplate = useTemplatesStore((s) => s.addTemplate)
  const updateTemplate = useTemplatesStore((s) => s.updateTemplate)
  const removeTemplate = useTemplatesStore((s) => s.removeTemplate)

  const [showManualForm, setShowManualForm] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPlatform, setNewPlatform] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newPosition, setNewPosition] = useState('')
  const [newSalary, setNewSalary] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newModality, setNewModality] = useState('')
  const [newType, setNewType] = useState('')
  const [newLevel, setNewLevel] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!isLoaded) loadTemplates()
  }, [isLoaded, loadTemplates])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      await addTemplate({
        name: newName.trim(),
        platform: newPlatform.trim(),
        selectors: {
          company: newCompany.trim() || undefined,
          position: newPosition.trim() || undefined,
          salary: newSalary.trim() || undefined,
          location: newLocation.trim() || undefined,
          modality: newModality.trim() || undefined,
          type: newType.trim() || undefined,
          level: newLevel.trim() || undefined,
          description: stringToDescription(newDescription),
        },
      })
      setNewName('')
      setNewPlatform('')
      setNewCompany('')
      setNewPosition('')
      setNewSalary('')
      setNewLocation('')
      setNewModality('')
      setNewType('')
      setNewLevel('')
      setNewDescription('')
      setShowManualForm(false)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSave = async (id: string, data: Partial<Omit<ParseTemplate, 'id' | 'createdAt'>>) => {
    await updateTemplate(id, data)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este template?')) return
    await removeTemplate(id)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h3 className="text-sm font-medium text-text-primary">Templates de importacion</h3>
      <p className="text-xs text-text-secondary">
        Define selectores CSS personalizados para extraer datos de sitios que no son detectados automaticamente.
      </p>

      {templates.length === 0 ? (
        <p className="text-sm text-text-muted">No hay templates</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Plataforma</th>
              <th className="px-3 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <TemplateRow key={t.id} template={t} onSave={handleSave} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>
      )}

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            Desde HTML
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowManualForm(!showManualForm)}
          >
            Manual
          </Button>
        </div>

        {showManualForm && (
          <div className="mt-3 space-y-2">
            <h4 className="text-xs font-medium text-text-secondary">Nuevo template (manual)</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nombre del template" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input placeholder="Plataforma (ej: Glassdoor)" value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Selector CSS: empresa" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
              <Input placeholder="Selector CSS: posicion" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Selector CSS: salario" value={newSalary} onChange={(e) => setNewSalary(e.target.value)} />
              <Input placeholder="Selector CSS: ubicacion" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Selector CSS: modalidad" value={newModality} onChange={(e) => setNewModality(e.target.value)} />
              <Input placeholder="Selector CSS: tipo" value={newType} onChange={(e) => setNewType(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Selector CSS: nivel" value={newLevel} onChange={(e) => setNewLevel(e.target.value)} />
              <Input placeholder="Selector CSS: descripcion (comas = varios)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCreate} loading={isCreating} disabled={!newName.trim()}>
                Agregar template
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateTemplateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => setShowCreateModal(false)}
      />
    </div>
  )
}
