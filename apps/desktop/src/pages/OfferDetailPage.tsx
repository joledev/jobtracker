import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi, ApiClientError } from '@/lib/api'
import { usePipelineStore } from '@/stores/pipeline'
import { useUiStore } from '@/stores/ui'
import { useOffersStore } from '@/stores/offers'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Select } from '@/components/ui/Select'
import { ArrowLeft } from 'lucide-react'
import { TabNav } from '@/components/ui/TabNav'
import { NewOfferModal } from '@/components/offers/NewOfferModal'
import { GeneralTab } from '@/components/offers/detail/GeneralTab'
import { HistoryTab } from '@/components/offers/detail/HistoryTab'
import { ContactsTab } from '@/components/offers/detail/ContactsTab'
import { CallsTab } from '@/components/offers/detail/CallsTab'
import { CommunicationsTab } from '@/components/offers/detail/CommunicationsTab'
import { TechnologiesTab } from '@/components/offers/detail/TechnologiesTab'
import { QuestionsTab } from '@/components/offers/detail/QuestionsTab'
import { RemindersTab } from '@/components/offers/detail/RemindersTab'
import { ScreeningModal } from '@/components/offers/ScreeningModal'
import type { OfferDetail, CreateReminderInput } from '@/types/api'

const tabs = [
  { key: 'general', label: 'General' },
  { key: 'history', label: 'Historial' },
  { key: 'contacts', label: 'Contactos' },
  { key: 'calls', label: 'Llamadas' },
  { key: 'communications', label: 'Comunicaciones' },
  { key: 'technologies', label: 'Tecnologias' },
  { key: 'questions', label: 'Preguntas' },
  { key: 'reminders', label: 'Recordatorios' },
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
  const [stageSubmitting, setStageSubmitting] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState('')
  const [screeningModalOpen, setScreeningModalOpen] = useState(false)
  const [pendingScreeningStageId, setPendingScreeningStageId] = useState('')

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

    const targetStage = stages.find((s) => s.id === selectedStageId)
    if (targetStage?.slug === 'screening') {
      setPendingScreeningStageId(selectedStageId)
      setScreeningModalOpen(true)
      return
    }

    // El cambio de etapa son dos escrituras que en modo local no pueden ir en
    // una transaccion (el plugin SQL solo expone execute sobre un pool), asi que
    // un doble clic es capaz de dejar el historial con dos entradas. Bloquear el
    // boton mientras la promesa esta en vuelo es lo que cierra ese camino.
    setStageSubmitting(true)
    try {
      await api.offers.changeStatus(id, { stageId: selectedStageId })
      setChangingStage(false)
      setSelectedStageId('')
      await loadOffer()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cambiar la etapa'
      useUiStore.getState().addToast(msg, 'error')
    } finally {
      setStageSubmitting(false)
    }
  }

  const handleScreeningConfirm = async (reminderData: CreateReminderInput) => {
    if (!id) return
    await api.offers.changeStatus(id, { stageId: pendingScreeningStageId })
    await api.offers.createReminder(id, reminderData)
    setScreeningModalOpen(false)
    setChangingStage(false)
    setSelectedStageId('')
    setPendingScreeningStageId('')
    await loadOffer()
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
            <ArrowLeft size={12} className="inline mr-1" />Volver a ofertas
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
                  <Button size="sm" onClick={handleChangeStage} disabled={!selectedStageId || stageSubmitting}>
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
        {activeTab === 'communications' && <CommunicationsTab offerId={offer.id} />}
        {activeTab === 'technologies' && <TechnologiesTab offer={offer} onRefresh={loadOffer} />}
        {activeTab === 'questions' && <QuestionsTab offerId={offer.id} />}
        {activeTab === 'reminders' && <RemindersTab offerId={offer.id} />}
      </div>

      {/* Screening modal */}
      <ScreeningModal
        open={screeningModalOpen}
        onClose={() => {
          setScreeningModalOpen(false)
          setPendingScreeningStageId('')
        }}
        contacts={offer.contacts}
        onConfirm={handleScreeningConfirm}
      />

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
