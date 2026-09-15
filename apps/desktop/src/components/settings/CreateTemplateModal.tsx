import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTemplatesStore } from '@/stores/templates'
import { extractTemplateNodes } from '@/lib/html-extractor'
import type { TemplateNode } from '@/lib/html-extractor'

interface CreateTemplateModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

type TemplateField = 'none' | 'position' | 'company' | 'salary' | 'location' | 'modality' | 'type' | 'level' | 'description'

const FIELD_OPTIONS: { value: TemplateField; label: string }[] = [
  { value: 'none', label: '— Sin asignar —' },
  { value: 'position', label: 'Posicion' },
  { value: 'company', label: 'Empresa' },
  { value: 'salary', label: 'Salario' },
  { value: 'location', label: 'Ubicacion' },
  { value: 'modality', label: 'Modalidad' },
  { value: 'type', label: 'Tipo' },
  { value: 'level', label: 'Nivel' },
  { value: 'description', label: 'Descripcion' },
]

const FIELD_LABELS: Record<string, string> = {
  position: 'Posicion',
  company: 'Empresa',
  salary: 'Salario',
  location: 'Ubicacion',
  modality: 'Modalidad',
  type: 'Tipo',
  level: 'Nivel',
  description: 'Descripcion',
}

// description is multi-assign, all others are singular
const SINGULAR_FIELDS = new Set<TemplateField>(['position', 'company', 'salary', 'location', 'modality', 'type', 'level'])

type Step = 'meta' | 'paste' | 'map'

interface NodeWithField extends TemplateNode {
  field: TemplateField
}

export const CreateTemplateModal = ({ open, onClose, onCreated }: CreateTemplateModalProps) => {
  const addTemplate = useTemplatesStore((s) => s.addTemplate)

  const [step, setStep] = useState<Step>('meta')
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('')
  const [html, setHtml] = useState('')
  const [nodes, setNodes] = useState<NodeWithField[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAnalyze = () => {
    if (!html.trim()) return
    setError('')
    try {
      const extracted = extractTemplateNodes(html)
      if (extracted.length === 0) {
        setError('No se encontraron textos en el HTML.')
        return
      }
      setNodes(extracted.map((n) => ({ ...n, field: 'none' as const })))
      setStep('map')
    } catch {
      setError('Error al analizar el HTML.')
    }
  }

  const handleAssign = (nodeId: string, field: TemplateField) => {
    setNodes((prev) => {
      let updated = [...prev]

      // Singular fields: unassign any other node that has this field
      if (field !== 'none' && SINGULAR_FIELDS.has(field)) {
        updated = updated.map((n) =>
          n.id !== nodeId && n.field === field
            ? { ...n, field: 'none' as const }
            : n,
        )
      }

      return updated.map((n) =>
        n.id === nodeId ? { ...n, field } : n,
      )
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const singleSelectors: Record<string, string> = {}
      const descriptionSelectors: string[] = []

      for (const node of nodes) {
        if (node.field === 'none') continue
        if (node.field === 'description') {
          descriptionSelectors.push(node.selector)
        } else {
          singleSelectors[node.field] = node.selector
        }
      }

      await addTemplate({
        name: name.trim(),
        platform: platform.trim(),
        selectors: {
          company: singleSelectors.company,
          position: singleSelectors.position,
          salary: singleSelectors.salary,
          location: singleSelectors.location,
          modality: singleSelectors.modality,
          type: singleSelectors.type,
          level: singleSelectors.level,
          description: descriptionSelectors.length > 1
            ? descriptionSelectors
            : descriptionSelectors[0],
        },
      })
      handleReset()
      onCreated()
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setStep('meta')
    setName('')
    setPlatform('')
    setHtml('')
    setNodes([])
    setSearchFilter('')
    setError('')
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const filteredNodes = useMemo(() => {
    if (!searchFilter) return nodes
    const lower = searchFilter.toLowerCase()
    return nodes.filter((n) => n.text.toLowerCase().includes(lower))
  }, [nodes, searchFilter])

  const assignedCount = nodes.filter((n) => n.field !== 'none').length
  const canSave = assignedCount > 0

  const summary = useMemo(() => {
    const fields = ['position', 'company', 'salary', 'location', 'modality', 'type', 'level', 'description'] as const
    const entries: { field: string; selector: string; text: string }[] = []
    for (const f of fields) {
      const assigned = nodes.filter((n) => n.field === f)
      if (assigned.length === 0) continue
      if (f === 'description' && assigned.length > 1) {
        entries.push({
          field: f,
          selector: `${assigned.length} selectores`,
          text: assigned.map((n) => n.truncatedText).join(' | '),
        })
      } else {
        entries.push({ field: f, selector: assigned[0].selector, text: assigned[0].truncatedText })
      }
    }
    return entries
  }, [nodes])

  const title = step === 'meta'
    ? 'Nuevo template'
    : `Nuevo template: "${name}"`

  return (
    <Modal open={open} onClose={handleClose} title={title} size={step === 'map' ? 'xl' : 'lg'}>
      {step === 'meta' ? (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Define un nombre para el template y opcionalmente la plataforma.
          </p>
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del template"
              className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
              autoFocus
            />
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Plataforma (ej: Glassdoor) — opcional"
              className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={() => setStep('paste')} disabled={!name.trim()}>
              Siguiente
            </Button>
          </div>
        </div>
      ) : step === 'paste' ? (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Pega el HTML de una oferta de ejemplo de esta plataforma.
          </p>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="Pegar HTML aqui..."
            rows={10}
            className="w-full rounded-md border border-border bg-bg-card px-3 py-2 font-mono text-xs text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
            autoFocus
          />
          {error && <p className="text-xs text-status-rejected">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setStep('meta')}>
              Volver
            </Button>
            <Button onClick={handleAnalyze} disabled={!html.trim()}>
              Analizar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search + count */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar textos..."
              className="flex-1 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
            />
            <span className="shrink-0 text-xs text-text-muted">
              {nodes.length} textos · {assignedCount} asignados
            </span>
          </div>

          {/* Hint for description multi-select */}
          <p className="text-[10px] text-text-muted">
            Descripcion permite seleccionar multiples textos. Los demas campos son unicos.
          </p>

          {/* Two-column layout */}
          <div className="flex gap-4" style={{ maxHeight: '50vh' }}>
            {/* Left: node list */}
            <div className="flex-1 overflow-y-auto rounded-md border border-border bg-bg-card">
              {filteredNodes.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-muted">
                  {searchFilter ? 'Sin resultados' : 'No hay textos'}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredNodes.map((node) => (
                    <div
                      key={node.id}
                      className={`flex items-center gap-2 px-3 py-2 ${
                        node.field !== 'none' ? 'bg-bg-hover/50' : ''
                      }`}
                    >
                      <span className="shrink-0 rounded bg-bg-hover px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                        {node.tagName}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate text-xs text-text-primary"
                        title={node.text}
                      >
                        {node.truncatedText}
                      </span>
                      <select
                        value={node.field}
                        onChange={(e) => handleAssign(node.id, e.target.value as TemplateField)}
                        className={`shrink-0 rounded border border-border bg-bg-card px-2 py-1 text-xs outline-none focus:border-text-secondary ${
                          node.field !== 'none' ? 'text-text-primary' : 'text-text-muted'
                        }`}
                      >
                        {FIELD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: selectors summary */}
            <div className="w-56 shrink-0 overflow-y-auto rounded-md border border-border bg-bg-card p-3">
              <h4 className="mb-3 text-xs font-medium text-text-secondary">Selectores</h4>
              <div className="space-y-2">
                {summary.length === 0 ? (
                  <p className="text-xs text-text-muted">Sin asignaciones</p>
                ) : (
                  summary.map(({ field, selector, text }) => (
                    <div key={field}>
                      <span className="text-[10px] font-medium uppercase text-text-muted">
                        {FIELD_LABELS[field]}
                      </span>
                      <p className="truncate font-mono text-xs text-text-primary" title={selector}>
                        {selector}
                      </p>
                      <p className="truncate text-[10px] text-text-muted" title={text}>
                        {text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setStep('paste'); setNodes([]); setSearchFilter('') }}>
              Volver
            </Button>
            <Button onClick={handleSave} disabled={!canSave} loading={isSaving}>
              Guardar template
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
