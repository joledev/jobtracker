import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTemplatesStore } from '@/stores/templates'
import { extractTextNodes, autoSuggest, assignmentsToFormValues } from '@/lib/html-extractor'
import { htmlToText, extractTechnologies } from '@/lib/parsers/utils'
import { createApiClient } from '@/lib/api'
import { useConnectionStore } from '@/stores/connection'
import type { ExtractedNode, FieldAssignment } from '@/lib/html-extractor'

interface ImportOfferModalProps {
  open: boolean
  onClose: () => void
  onImport: (formValues: Record<string, string>, technologies: string[]) => void
}

const FIELD_OPTIONS: { value: FieldAssignment; label: string }[] = [
  { value: 'none', label: '— Sin asignar —' },
  { value: 'position', label: 'Posicion' },
  { value: 'company', label: 'Empresa' },
  { value: 'salary', label: 'Salario' },
  { value: 'level', label: 'Nivel' },
  { value: 'type', label: 'Tipo' },
  { value: 'modality', label: 'Modalidad' },
  { value: 'location', label: 'Ubicacion' },
  { value: 'notes', label: 'Notas' },
]

const SINGULAR_FIELDS = new Set<FieldAssignment>(['position', 'company', 'salary', 'level', 'type', 'modality', 'location'])

const FIELD_LABELS: Record<string, string> = {
  position: 'Posicion',
  company: 'Empresa',
  salary: 'Salario',
  level: 'Nivel',
  type: 'Tipo',
  modality: 'Modalidad',
  location: 'Ubicacion',
  notes: 'Notas',
}

type Step = 'paste' | 'map'

export const ImportOfferModal = ({ open, onClose, onImport }: ImportOfferModalProps) => {
  const [step, setStep] = useState<Step>('paste')
  const [html, setHtml] = useState('')
  const [nodes, setNodes] = useState<ExtractedNode[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [error, setError] = useState('')
  const [detectedTechs, setDetectedTechs] = useState<string[]>([])
  const [techInput, setTechInput] = useState('')
  const templates = useTemplatesStore((s) => s.templates)

  const handleAnalyze = async () => {
    if (!html.trim()) return
    setError('')
    try {
      const extracted = extractTextNodes(html)
      if (extracted.length === 0) {
        setError('No se encontraron textos en el HTML.')
        return
      }
      setNodes(extracted)

      // Detect technologies from full text
      const fullText = htmlToText(html)
      let customKeywords: string[] | undefined
      try {
        const { vpsUrl, apiKey } = useConnectionStore.getState()
        if (vpsUrl && apiKey) {
          const client = createApiClient(vpsUrl, apiKey)
          const apiTechs = await client.technologies.list()
          customKeywords = apiTechs.map(t => t.name)
        }
      } catch {
        // Silently fall back to built-in list
      }
      const techs = extractTechnologies(fullText, customKeywords)
      setDetectedTechs(techs)

      setStep('map')
    } catch {
      setError('Error al analizar el HTML.')
    }
  }

  const handleRemoveTech = (tech: string) => {
    setDetectedTechs(prev => prev.filter(t => t !== tech))
  }

  const handleAddTech = () => {
    const name = techInput.trim()
    if (!name) return
    if (!detectedTechs.some(t => t.toLowerCase() === name.toLowerCase())) {
      setDetectedTechs(prev => [...prev, name])
    }
    setTechInput('')
  }

  const handleAutoSuggest = () => {
    const suggested = autoSuggest(nodes, html, templates)
    setNodes(suggested)
  }

  const handleClearAssignments = () => {
    setNodes(nodes.map((n) => ({ ...n, assignment: 'none' as const })))
  }

  const handleAssign = (nodeId: string, field: FieldAssignment) => {
    setNodes((prev) => {
      let updated = [...prev]

      // For singular fields, unassign any other node that has this field
      if (field !== 'none' && field !== 'notes' && SINGULAR_FIELDS.has(field)) {
        updated = updated.map((n) =>
          n.id !== nodeId && n.assignment === field
            ? { ...n, assignment: 'none' as const }
            : n,
        )
      }

      return updated.map((n) =>
        n.id === nodeId ? { ...n, assignment: field } : n,
      )
    })
  }

  const handleConfirm = () => {
    const formValues = assignmentsToFormValues(nodes)
    onImport(formValues, detectedTechs)
    handleReset()
  }

  const handleBack = () => {
    setStep('paste')
    setNodes([])
    setSearchFilter('')
    setError('')
  }

  const handleReset = () => {
    setStep('paste')
    setHtml('')
    setNodes([])
    setSearchFilter('')
    setError('')
    setDetectedTechs([])
    setTechInput('')
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

  const assignedCount = nodes.filter((n) => n.assignment !== 'none').length
  const canConfirm = nodes.some((n) => n.assignment === 'position' || n.assignment === 'company')

  const summary = useMemo(() => {
    const entries: { field: string; text: string }[] = []
    const allFields = ['position', 'company', 'salary', 'level', 'type', 'modality', 'location', 'notes'] as const
    for (const field of allFields) {
      const assigned = nodes.filter((n) => n.assignment === field)
      if (assigned.length > 0) {
        const text = field === 'notes'
          ? `${assigned.length} texto${assigned.length > 1 ? 's' : ''}`
          : assigned[0].truncatedText
        entries.push({ field, text })
      }
    }
    return entries
  }, [nodes])

  return (
    <Modal open={open} onClose={handleClose} title="Importar desde HTML" size={step === 'map' ? 'xl' : 'lg'}>
      {step === 'paste' ? (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Pega el HTML de una oferta de empleo (OCC, LinkedIn, Indeed, Computrabajo u otro).
          </p>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="Pegar HTML aqui..."
            rows={10}
            className="w-full rounded-md border border-border bg-bg-card px-3 py-2 font-mono text-xs text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
          />
          {error && <p className="text-xs text-status-rejected">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleAnalyze} disabled={!html.trim()}>
              Analizar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={handleAutoSuggest}>
              Auto-sugerir
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClearAssignments}>
              Limpiar
            </Button>
            <span className="ml-auto text-xs text-text-muted">
              {nodes.length} textos extraidos · {assignedCount} asignados
            </span>
          </div>

          {/* Search filter */}
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filtrar textos..."
            className="w-full rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
          />

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
                        node.assignment !== 'none' ? 'bg-bg-hover/50' : ''
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
                        value={node.assignment}
                        onChange={(e) => handleAssign(node.id, e.target.value as FieldAssignment)}
                        className={`shrink-0 rounded border border-border bg-bg-card px-2 py-1 text-xs outline-none focus:border-text-secondary ${
                          node.assignment !== 'none' ? 'text-text-primary' : 'text-text-muted'
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

            {/* Right: summary */}
            <div className="w-56 shrink-0 overflow-y-auto rounded-md border border-border bg-bg-card p-3">
              <h4 className="mb-3 text-xs font-medium text-text-secondary">Resumen</h4>
              <div className="space-y-2">
                {summary.length === 0 ? (
                  <p className="text-xs text-text-muted">Sin asignaciones</p>
                ) : (
                  summary.map(({ field, text }) => (
                    <div key={field}>
                      <span className="text-[10px] font-medium uppercase text-text-muted">
                        {FIELD_LABELS[field]}
                      </span>
                      <p className="truncate text-xs text-text-primary" title={text}>
                        {text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Detected technologies */}
          {detectedTechs.length > 0 && (
            <div className="rounded-md border border-border bg-bg-card p-3">
              <h4 className="mb-2 text-xs font-medium text-text-secondary">
                Tecnologias detectadas ({detectedTechs.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {detectedTechs.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1 rounded-full bg-bg-hover px-2.5 py-1 text-xs text-text-primary"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(tech)}
                      className="ml-0.5 text-text-muted hover:text-text-primary"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTech() } }}
                  placeholder="Agregar tecnologia..."
                  className="w-48 rounded-md border border-border bg-bg-card px-2 py-1 text-xs text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
                />
                <Button type="button" size="sm" variant="ghost" onClick={handleAddTech} disabled={!techInput.trim()}>
                  + Agregar
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleBack}>
              Volver
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
