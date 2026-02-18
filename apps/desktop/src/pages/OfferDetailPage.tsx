import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi, ApiClientError } from '@/lib/api'
import { usePipelineStore } from '@/stores/pipeline'
import { useOffersStore } from '@/stores/offers'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Select } from '@/components/ui/Select'
import { TabNav } from '@/components/ui/TabNav'
import { NewOfferModal } from '@/components/offers/NewOfferModal'
import { GeneralTab } from '@/components/offers/detail/GeneralTab'
import { HistoryTab } from '@/components/offers/detail/HistoryTab'
import { ContactsTab } from '@/components/offers/detail/ContactsTab'
import { CallsTab } from '@/components/offers/detail/CallsTab'
import { TechnologiesTab } from '@/components/offers/detail/TechnologiesTab'
import { QuestionsTab } from '@/components/offers/detail/QuestionsTab'
import type { OfferDetail } from '@/types/api'

const tabs = [
  { key: 'general', label: 'General' },
  { key: 'history', label: 'Historial' },
  { key: 'contacts', label: 'Contactos' },
  { key: 'calls', label: 'Llamadas' },
  { key: 'technologies', label: 'Tecnologias' },
  { key: 'questions', label: 'Preguntas' },
]

export const OfferDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const api = useApi()
  const stages = usePipelineStore((s) => s.stages)
  const deleteOffer = useOffersStore((s) => s.deleteOffer)

  const [offer, setOffer] = useState<OfferDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [changingStage, setChangingStage] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState('')

  const loadOffer = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.offers.get(id)
      setOffer(data)
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 404) {
        setError('Oferta no encontrada')
      } else {
        setError('Error al cargar la oferta')
      }
    } finally {
      setIsLoading(false)
    }
  }, [api, id])

  useEffect(() => {
    loadOffer()
  }, [loadOffer])

  const handleChangeStage = async () => {
    if (!id || !selectedStageId) return
    try {
      await api.offers.changeStatus(id, { stageId: selectedStageId })
      setChangingStage(false)
      setSelectedStageId('')
      await loadOffer()
    } catch {
      // silent for now
    }
  }

  const handleDelete = async () => {
    if (!id || !confirm('¿Eliminar esta oferta? Esta accion no se puede deshacer.')) return
    await deleteOffer(id)
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-text-muted">{error || 'Oferta no encontrada'}</p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Volver
        </Button>
      </div>
    )
  }

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }))

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-bg-secondary px-6 py-4">
        <div className="mb-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-text-muted transition-colors hover:text-text-primary"
          >
            ← Volver a ofertas
          </button>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{offer.company}</h1>
            <h2 className="text-sm text-text-secondary">{offer.position}</h2>
            <div className="mt-2 flex items-center gap-3">
              {offer.stage && (
                <StatusBadge stageName={offer.stage.name} stageColor={offer.stage.color} />
              )}
              {changingStage ? (
                <div className="flex items-center gap-2">
                  <div className="w-40">
                    <Select
                      options={stageOptions}
                      placeholder="Seleccionar etapa"
                      value={selectedStageId}
                      onChange={(e) => setSelectedStageId(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={handleChangeStage} disabled={!selectedStageId}>
                    Confirmar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setChangingStage(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setChangingStage(true)}>
                  Cambiar Stage
                </Button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditModalOpen(true)}>
              Editar
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabNav tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'general' && <GeneralTab offer={offer} />}
        {activeTab === 'history' && <HistoryTab offer={offer} />}
        {activeTab === 'contacts' && <ContactsTab offer={offer} onRefresh={loadOffer} />}
        {activeTab === 'calls' && <CallsTab offerId={offer.id} />}
        {activeTab === 'technologies' && <TechnologiesTab offer={offer} onRefresh={loadOffer} />}
        {activeTab === 'questions' && <QuestionsTab offerId={offer.id} />}
      </div>

      {/* Edit modal */}
      <NewOfferModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        offer={offer}
        onUpdated={loadOffer}
      />
    </div>
  )
}
