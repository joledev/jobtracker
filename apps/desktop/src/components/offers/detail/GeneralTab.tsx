import { useNavigate } from 'react-router-dom'
import type { OfferDetail } from '@/types/api'

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatSalary = (offer: OfferDetail): string => {
  if (!offer.salaryMin && !offer.salaryMax) return 'No especificado'
  const currency = offer.salaryCurrency || 'USD'
  const period = offer.salaryPeriod || 'monthly'
  const periodLabel = { monthly: '/mes', annual: '/año', hourly: '/hora' }[period] || ''
  if (offer.salaryMin && offer.salaryMax) {
    return `${currency} ${offer.salaryMin.toLocaleString()}–${offer.salaryMax.toLocaleString()} ${periodLabel}`
  }
  const value = offer.salaryMin || offer.salaryMax
  return `${currency} ${value!.toLocaleString()} ${periodLabel}`
}

interface GeneralTabProps {
  offer: OfferDetail
}

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <p className="text-xs text-text-muted">{label}</p>
    <p className="text-sm text-text-primary">{value || 'No especificado'}</p>
  </div>
)

export const GeneralTab = ({ offer }: GeneralTabProps) => {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <div className="space-y-4">
          <Field label="Empresa" value={offer.company} />
          <Field label="Posicion" value={offer.position} />
          <Field label="Nivel" value={offer.level} />
          <Field label="Tipo" value={offer.type} />
          <Field label="Modalidad" value={offer.modality} />
          <Field label="Aplicado el" value={formatDate(offer.appliedAt)} />
        </div>
        <div className="space-y-4">
          <Field label="Salario" value={formatSalary(offer)} />
          <div>
            <p className="text-xs text-text-muted">URL de oferta</p>
            {offer.sourceUrl ? (
              <a
                href={offer.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-status-applied hover:underline"
              >
                {offer.sourceUrl}
              </a>
            ) : (
              <p className="text-sm text-text-primary">No especificado</p>
            )}
          </div>
          <Field label="Plataforma" value={offer.sourcePlatform} />
          <Field label="Workspace" value={offer.workspace?.name} />
          <div>
            <p className="text-xs text-text-muted">CV Enviado</p>
            {offer.cvSnapshot ? (
              <button
                onClick={() => navigate(`/cv?selected=${offer.cvSnapshot!.id}`)}
                className="text-sm text-status-applied hover:underline"
              >
                {offer.cvSnapshot.label}
              </button>
            ) : (
              <p className="text-sm text-text-primary">No especificado</p>
            )}
          </div>
        </div>
      </div>

      {offer.notes && (
        <div>
          <p className="mb-1 text-xs text-text-muted">Notas</p>
          <p className="whitespace-pre-wrap rounded-md bg-bg-card p-3 text-sm text-text-secondary">
            {offer.notes}
          </p>
        </div>
      )}
    </div>
  )
}
