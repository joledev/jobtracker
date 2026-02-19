import { useState } from 'react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useCvsStore } from '@/stores/cvs'

const DEFAULT_CV_TEMPLATE = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{hyperref}

\\begin{document}

\\begin{center}
  {\\LARGE\\textbf{Tu Nombre}}\\\\[4pt]
  email@ejemplo.com \\quad | \\quad +1 234 567 890 \\quad | \\quad LinkedIn \\quad | \\quad GitHub
\\end{center}

\\section*{Experiencia}
\\textbf{Titulo del Puesto} \\hfill Fecha Inicio -- Fecha Fin\\\\
\\textit{Empresa} \\hfill Ciudad, Pais
\\begin{itemize}
  \\item Logro o responsabilidad principal
  \\item Otro logro relevante
\\end{itemize}

\\section*{Educacion}
\\textbf{Titulo} \\hfill Año\\\\
\\textit{Universidad}

\\section*{Habilidades}
TypeScript, React, Rust, Go, PostgreSQL

\\end{document}
`

const DEFAULT_COVER_LETTER_TEMPLATE = `\\documentclass[11pt,a4paper]{letter}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}

\\begin{document}

\\begin{letter}{Nombre del Reclutador\\\\Empresa\\\\Direccion}

\\opening{Estimado/a,}

Escribo para expresar mi interes en la posicion de [Puesto] en [Empresa].

[Cuerpo de la carta]

\\closing{Atentamente,}

\\end{letter}
\\end{document}
`

const typeOptions = [
  { value: 'cv', label: 'CV' },
  { value: 'cover_letter', label: 'Carta de presentacion' },
]

interface NewCvModalProps {
  open: boolean
  onClose: () => void
  defaultType?: 'cv' | 'cover_letter'
  onCreated?: (id: string) => void
}

export const NewCvModal = ({ open, onClose, defaultType = 'cv', onCreated }: NewCvModalProps) => {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<'cv' | 'cover_letter'>(defaultType)
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState<'latex' | 'upload'>('latex')
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createCv = useCvsStore((s) => s.createCv)

  const resetForm = () => {
    setLabel('')
    setType(defaultType)
    setNotes('')
    setMode('latex')
    setPdfBase64(null)
    setPdfName(null)
  }

  const handleUploadPdf = async () => {
    const file = await openDialog({
      multiple: false,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (!file) return
    const bytes = await readFile(file)
    const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('')
    const base64 = btoa(binary)
    setPdfBase64(base64)
    const name = file.split(/[\\/]/).pop() ?? 'archivo.pdf'
    setPdfName(name)
    if (!label) setLabel(name.replace(/\.pdf$/i, ''))
  }

  const handleSubmit = async () => {
    if (!label.trim()) return
    setIsSubmitting(true)
    try {
      const latexSource = mode === 'latex'
        ? (type === 'cover_letter' ? DEFAULT_COVER_LETTER_TEMPLATE : DEFAULT_CV_TEMPLATE)
        : ''
      const id = await createCv({
        label: label.trim(),
        type,
        latexSource,
        notes: notes || undefined,
        compiledPdf: mode === 'upload' ? (pdfBase64 ?? undefined) : undefined,
      })
      resetForm()
      onClose()
      onCreated?.(id)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo documento">
      <div className="space-y-4">
        <Input
          label="Nombre"
          placeholder="CV Principal, Carta Google, etc."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <Select
          label="Tipo"
          options={typeOptions}
          value={type}
          onChange={(e) => setType(e.target.value as 'cv' | 'cover_letter')}
        />

        <div>
          <label className="mb-1 block text-sm text-text-secondary">Contenido inicial</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('latex')}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                mode === 'latex'
                  ? 'bg-bg-hover text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Template LaTeX
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                mode === 'upload'
                  ? 'bg-bg-hover text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Subir PDF
            </button>
          </div>
        </div>

        {mode === 'upload' && (
          <div>
            <Button size="sm" variant="secondary" onClick={handleUploadPdf}>
              Seleccionar PDF
            </Button>
            {pdfName && (
              <p className="mt-1 text-xs text-text-muted">{pdfName}</p>
            )}
          </div>
        )}

        <Textarea
          label="Notas"
          placeholder="Notas opcionales..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!label.trim() || (mode === 'upload' && !pdfBase64)}
          >
            Crear
          </Button>
        </div>
      </div>
    </Modal>
  )
}
