import { useEffect, useRef } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import { useCvsStore } from '@/stores/cvs'

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export const CvPreviewTab = () => {
  const compiledPdf = useCvsStore((s) => s.selected?.compiledPdf)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!compiledPdf || !containerRef.current) return

    const container = containerRef.current
    let cancelled = false
    let loadingTask: ReturnType<typeof getDocument> | null = null

    const render = async () => {
      const bytes = Uint8Array.from(atob(compiledPdf), (c) => c.charCodeAt(0))
      const task = getDocument({ data: bytes })
      loadingTask = task
      const pdf = await task.promise
      if (cancelled) return

      container.innerHTML = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        if (cancelled) return

        const scale = (container.clientWidth - 32) / page.getViewport({ scale: 1 }).width
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.display = 'block'
        canvas.style.margin = '0 auto 16px'
        canvas.style.borderRadius = '4px'

        container.appendChild(canvas)
        await page.render({ canvas, viewport }).promise
      }
    }

    render().catch(console.error)
    return () => {
      cancelled = true
      // Cada documento mantiene vivo un worker de pdf.js: sin destroy() se
      // acumula uno por cada PDF que se haya previsualizado. En pdfjs-dist 6
      // destroy() ya no esta en PDFDocumentProxy sino en la tarea de carga,
      // que es la que realmente cierra el worker.
      loadingTask?.destroy().catch(() => {})
    }
  }, [compiledPdf])

  if (!compiledPdf) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Sin PDF compilado -- usa el editor para compilar
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-bg-primary p-4" />
  )
}
