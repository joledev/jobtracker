import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Spinner } from '@/components/ui/Spinner'
import type { OfferDetail, StatusLogEntry } from '@/types/api'

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface HistoryTabProps {
  offer: OfferDetail
}

export const HistoryTab = ({ offer }: HistoryTabProps) => {
  const api = useApi()
  const [entries, setEntries] = useState<StatusLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const log = await api.offers.getStatusLog(offer.id)
        setEntries(log.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()))
      } catch {
        setEntries([])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [api, offer.id])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-text-muted">
        No hay historial de cambios
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="relative ml-3 border-l border-border pl-6">
        {entries.map((entry, i) => (
          <div key={i} className="relative mb-6 last:mb-0">
            <div
              className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-bg-secondary"
              style={{ backgroundColor: entry.stageColor || '#555555' }}
            />
            <p className="text-xs text-text-muted">{formatDate(entry.timestamp)}</p>
            <div className="mt-1 flex items-center gap-2">
              {entry.type === 'offer_created' ? (
                <span className="text-sm text-text-primary">Oferta creada</span>
              ) : (
                <span className="text-sm text-text-primary">Cambio de etapa</span>
              )}
              {entry.stageName && entry.stageColor && (
                <StatusBadge stageName={entry.stageName} stageColor={entry.stageColor} size="sm" />
              )}
            </div>
            {entry.note && (
              <p className="mt-1 text-sm text-text-muted">{entry.note}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
