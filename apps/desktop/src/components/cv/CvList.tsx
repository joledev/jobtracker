import { useCvsStore } from '@/stores/cvs'

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

interface CvListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export const CvList = ({ selectedId, onSelect }: CvListProps) => {
  const items = useCvsStore((s) => s.items)
  const isLoading = useCvsStore((s) => s.isLoading)

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-text-muted">
        Cargando...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-text-muted">
        Sin documentos
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {items.map((cv) => (
        <button
          key={cv.id}
          onClick={() => onSelect(cv.id)}
          className={`flex flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors ${
            selectedId === cv.id
              ? 'bg-bg-hover'
              : 'hover:bg-bg-hover/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="truncate text-sm text-text-primary">{cv.label}</span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                cv.type === 'cover_letter'
                  ? 'bg-status-applied/20 text-status-applied'
                  : 'bg-status-interviewing/20 text-status-interviewing'
              }`}
            >
              {cv.type === 'cover_letter' ? 'Carta' : 'CV'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span>{formatDate(cv.updatedAt)}</span>
            {cv.offerCount > 0 && <span>{cv.offerCount} oferta{cv.offerCount > 1 ? 's' : ''}</span>}
          </div>
        </button>
      ))}
    </div>
  )
}
