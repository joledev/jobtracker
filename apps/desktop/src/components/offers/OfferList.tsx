import type { OfferListItem } from '@/types/api'
import { OfferCard } from './OfferCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

interface OfferListProps {
  offers: OfferListItem[]
  isLoading: boolean
  onOfferClick: (id: string) => void
  onCreateClick?: () => void
}

const Skeleton = () => (
  <div className="animate-pulse px-4 py-3">
    <div className="mb-2 h-4 w-1/3 rounded bg-bg-hover" />
    <div className="mb-1 h-3 w-1/2 rounded bg-bg-hover" />
    <div className="h-3 w-16 rounded bg-bg-hover" />
  </div>
)

export const OfferList = ({ offers, isLoading, onOfferClick, onCreateClick }: OfferListProps) => {
  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    )
  }

  if (offers.length === 0) {
    return (
      <EmptyState
        title="No hay ofertas"
        description="Crea tu primera oferta para empezar"
        action={
          onCreateClick && (
            <Button onClick={onCreateClick}>Nueva Oferta</Button>
          )
        }
      />
    )
  }

  return (
    <div className="divide-y divide-border">
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          onClick={() => onOfferClick(offer.id)}
        />
      ))}
    </div>
  )
}
