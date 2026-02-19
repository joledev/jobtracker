import { useEffect, useCallback, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/Button'
import { createApiClient } from '@/lib/api'
import { useConnectionStore } from '@/stores/connection'
import { useCvsStore } from '@/stores/cvs'
import type { CvSnapshotDetail } from '@/types/api'

interface CvEditorTabProps {
  cv: CvSnapshotDetail
}

export const CvEditorTab = ({ cv }: CvEditorTabProps) => {
  const [source, setSource] = useState(cv.latexSource)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const updateCv = useCvsStore((s) => s.updateCv)
  const compileLatex = useCvsStore((s) => s.compileLatex)
  const savePdfToDisk = useCvsStore((s) => s.savePdfToDisk)
  const isCompiling = useCvsStore((s) => s.isCompiling)
  const compileError = useCvsStore((s) => s.compileError)
  const latexAvailable = useCvsStore((s) => s.latexAvailable)
  const selected = useCvsStore((s) => s.selected)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>(null)
  const sourceRef = useRef(source)
  const lastSavedRef = useRef(cv.latexSource)

  // Sync sourceRef in effect to satisfy lint (refs can't be written during render)
  useEffect(() => {
    sourceRef.current = source
  }, [source])

  // Save on unmount — flush pending changes when switching CVs
  // cv.id is stable for the lifetime of this component (key={cv.id} in parent)
  useEffect(() => {
    const id = cv.id
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      const currentSource = sourceRef.current
      if (currentSource !== lastSavedRef.current) {
        const { vpsUrl, apiKey } = useConnectionStore.getState()
        if (vpsUrl && apiKey) {
          createApiClient(vpsUrl, apiKey).cvs.update(id, { latexSource: currentSource }).catch(() => {})
        }
      }
    }
  }, [cv.id])

  const handleChange = (value: string | undefined) => {
    const v = value ?? ''
    setSource(v)
    setHasUnsaved(v !== lastSavedRef.current)

    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      if (v !== lastSavedRef.current) {
        try {
          await updateCv(cv.id, { latexSource: v })
          lastSavedRef.current = v
          setSaveError(null)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          setSaveError(`Error al auto-guardar: ${msg}`)
        }
      }
    }, 3000)
  }

  const handleSave = useCallback(async () => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    try {
      await updateCv(cv.id, { latexSource: source })
      lastSavedRef.current = source
      setHasUnsaved(false)
      setSaveError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setSaveError(`Error al guardar: ${msg}`)
    }
  }, [cv.id, source, updateCv])

  const handleCompile = useCallback(async () => {
    try {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      const base64 = await compileLatex(source)
      setShowLog(false)
      try {
        await updateCv(cv.id, { latexSource: source, compiledPdf: base64 })
        lastSavedRef.current = source
        setHasUnsaved(false)
        setSaveError(null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setSaveError(`Compilado OK, error al guardar: ${msg}`)
      }
    } catch {
      setShowLog(true)
    }
  }, [cv.id, source, compileLatex, updateCv])

  const handleDownload = useCallback(async () => {
    const pdf = selected?.compiledPdf
    if (!pdf) return
    await savePdfToDisk(pdf, `${cv.label}.pdf`)
  }, [cv.label, selected?.compiledPdf, savePdfToDisk])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        handleCompile()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, handleCompile])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        {latexAvailable === false && (
          <span className="mr-auto text-xs text-status-rejected">
            pdflatex no encontrado — instala TeX Live o MiKTeX
          </span>
        )}
        {latexAvailable !== false && saveError && (
          <span className="mr-auto text-xs text-status-rejected">{saveError}</span>
        )}
        {latexAvailable !== false && !saveError && hasUnsaved && (
          <span className="mr-auto text-xs text-status-offer">Sin guardar</span>
        )}
        {latexAvailable !== false && !saveError && !hasUnsaved && (
          <span className="mr-auto text-xs text-text-muted">Guardado</span>
        )}
        <Button size="sm" variant="ghost" onClick={handleSave}>
          Guardar
        </Button>
        <Button
          size="sm"
          onClick={handleCompile}
          loading={isCompiling}
          disabled={latexAvailable === false}
        >
          Compilar
        </Button>
        {selected?.compiledPdf && (
          <Button size="sm" variant="secondary" onClick={handleDownload}>
            Descargar PDF
          </Button>
        )}
      </div>

      <div className="flex-1">
        <Editor
          height="100%"
          language="latex"
          theme="vs-dark"
          value={source}
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {showLog && compileError && (
        <div className="max-h-40 overflow-y-auto border-t border-border bg-bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-status-rejected">Error de compilacion</span>
            <button
              onClick={() => setShowLog(false)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Cerrar
            </button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap text-[11px] text-text-muted">{compileError}</pre>
        </div>
      )}
    </div>
  )
}
