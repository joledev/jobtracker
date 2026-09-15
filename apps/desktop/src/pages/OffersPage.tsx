import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { OfferList } from '@/components/offers/OfferList'
import { OffersFilterBar } from '@/components/offers/OffersFilterBar'
import { NewOfferModal } from '@/components/offers/NewOfferModal'
import { ImportOfferModal } from '@/components/offers/ImportOfferModal'
import { Button } from '@/components/ui/Button'
import { useOffersStore } from '@/stores/offers'
import { usePipelineStore } from '@/stores/pipeline'
import { useUiStore } from '@/stores/ui'
import { useConnectionStore } from '@/stores/connection'

export const OffersPage = () => {
  const navigate = useNavigate()
  const isLoaded = useConnectionStore((s) => s.isLoaded)
  const vpsUrl = useConnectionStore((s) => s.vpsUrl)
  const apiKey = useConnectionStore((s) => s.apiKey)

  const items = useOffersStore((s) => s.items)
  const isLoading = useOffersStore((s) => s.isLoading)
  const filters = useOffersStore((s) => s.filters)
  const activeWorkspaceId = useOffersStore((s) => s.activeWorkspaceId)
  const fetchOffers = useOffersStore((s) => s.fetchOffers)
  const setFilter = useOffersStore((s) => s.setFilter)
  const resetFilters = useOffersStore((s) => s.resetFilters)

  const stages = usePipelineStore((s) => s.stages)
  const workspaces = usePipelineStore((s) => s.workspaces)

  const modalOpen = useUiStore((s) => s.newOfferModalOpen)
  const toggleModal = useUiStore((s) => s.toggleNewOfferModal)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [prefillData, setPrefillData] = useState<Record<string, string> | null>(null)
  const [prefillTechs, setPrefillTechs] = useState<string[]>([])

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  const title = activeWorkspace ? activeWorkspace.name : 'Ofertas'

  useEffect(() => {
    if (isLoaded && vpsUrl && apiKey) {
      fetchOffers()
    }
  }, [isLoaded, vpsUrl, apiKey, fetchOffers, activeWorkspaceId])

  const handleImport = (formValues: Record<string, string>, technologies: string[]) => {
    setImportModalOpen(false)
    setPrefillData(formValues)
    setPrefillTechs(technologies)
    toggleModal()
  }

  const handleNewOfferClose = () => {
    toggleModal()
    setPrefillData(null)
    setPrefillTechs([])
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={title}
        action={
          <>
            <Button size="sm" variant="ghost" onClick={() => setImportModalOpen(true)}>
              Importar HTML
            </Button>
            <Button size="sm" onClick={toggleModal}>
              Nueva Oferta
            </Button>
          </>
        }
      />
      <OffersFilterBar
        filters={filters}
        stages={stages}
        onChange={setFilter}
        onReset={resetFilters}
      />
      <div className="flex-1 overflow-y-auto">
        <OfferList
          offers={items}
          isLoading={isLoading}
          onOfferClick={(id) => navigate(`/offers/${id}`)}
          onCreateClick={toggleModal}
        />
      </div>
      <NewOfferModal open={modalOpen} onClose={handleNewOfferClose} prefill={prefillData} prefillTechnologies={prefillTechs} />
      <ImportOfferModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  )
}
