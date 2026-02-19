import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useCvsStore } from '@/stores/cvs'
import type { CvSnapshotDetail } from '@/types/api'

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

interface CvInfoTabProps {
  cv: CvSnapshotDetail
}

export const CvInfoTab = ({ cv }: CvInfoTabProps) => {
  const navigate = useNavigate()
  const createCv = useCvsStore((s) => s.createCv)
  const selectCv = useCvsStore((s) => s.selectCv)
  const deleteCv = useCvsStore((s) => s.deleteCv)

  const handleClone = async () => {
    const newId = await createCv({
      label: `${cv.label} (copia)`,
      latexSource: cv.latexSource,
      type: cv.type,
      notes: cv.notes ?? undefined,
    })
    if (newId) await selectCv(newId)
  }

  const handleDelete = async () => {
    await deleteCv(cv.id)
  }

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <div>
          <p className="text-xs text-text-muted">Label</p>
          <p className="text-sm text-text-primary">{cv.label}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Tipo</p>
          <p className="text-sm text-text-primary">
            {cv.type === 'cover_letter' ? 'Carta de presentacion' : 'CV'}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Creado</p>
          <p className="text-sm text-text-primary">{formatDate(cv.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Actualizado</p>
          <p className="text-sm text-text-primary">{formatDate(cv.updatedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Tiene PDF</p>
          <p className="text-sm text-text-primary">{cv.compiledPdf ? 'Si' : 'No'}</p>
        </div>
      </div>

      {cv.notes && (
        <div>
          <p className="mb-1 text-xs text-text-muted">Notas</p>
          <p className="whitespace-pre-wrap rounded-md bg-bg-card p-3 text-sm text-text-secondary">
            {cv.notes}
          </p>
        </div>
      )}

      {cv.offers.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-text-muted">Ofertas vinculadas ({cv.offers.length})</p>
          <div className="space-y-1">
            {cv.offers.map((o) => (
              <button
                key={o.id}
                onClick={() => navigate(`/offers/${o.id}`)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-bg-hover"
              >
                <span className="text-sm text-text-primary">{o.company} — {o.position}</span>
                <span className="text-xs text-text-muted">{formatDate(o.appliedAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 border-t border-border pt-4">
        <Button size="sm" variant="secondary" onClick={handleClone}>
          Crear nueva version
        </Button>
        <Button size="sm" variant="danger" onClick={handleDelete}>
          Eliminar
        </Button>
      </div>
    </div>
  )
}
