import { useCvsStore } from '@/stores/cvs'

export const CvPreviewTab = () => {
  const compiledPdf = useCvsStore((s) => s.selected?.compiledPdf)

  if (!compiledPdf) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Sin PDF compilado — usa el editor para compilar
      </div>
    )
  }

  return (
    <iframe
      title="PDF Preview"
      src={`data:application/pdf;base64,${compiledPdf}`}
      className="h-full w-full"
    />
  )
}
