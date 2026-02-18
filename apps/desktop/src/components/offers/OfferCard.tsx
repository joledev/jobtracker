import type { OfferListItem } from '@/types/api'
import { StatusBadge } from '@/components/ui/StatusBadge'

const relativeTime = (dateStr: string): string => {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 dia'
  if (days < 30) return `hace ${days} dias`
  const months = Math.floor(days / 30)
  if (months === 1) return 'hace 1 mes'
  return `hace ${months} meses`
}

const formatSalary = (offer: OfferListItem): string | null => {
  if (!offer.salaryMin && !offer.salaryMax) return null
  const currency = offer.salaryCurrency || 'USD'
  if (offer.salaryMin && offer.salaryMax) {
    return `${currency} ${offer.salaryMin.toLocaleString()}–${offer.salaryMax.toLocaleString()}`
  }
  const value = offer.salaryMin || offer.salaryMax
  return `${currency} ${value!.toLocaleString()}`
}

interface OfferCardProps {
  offer: OfferListItem
  onClick: () => void
}

export const OfferCard = ({ offer, onClick }: OfferCardProps) => {
  const salary = formatSalary(offer)

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-bg-hover"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{offer.company}</p>
        <p className="truncate text-sm text-text-secondary">{offer.position}</p>
        <p className="mt-0.5 text-xs text-text-muted">{relativeTime(offer.appliedAt)}</p>
      </div>
      <div className="ml-4 flex flex-shrink-0 flex-col items-end gap-1">
        {offer.stageName && offer.stageColor && (
          <StatusBadge stageName={offer.stageName} stageColor={offer.stageColor} />
        )}
        {salary && <span className="text-xs text-text-muted">{salary}</span>}
      </div>
    </button>
  )
}
