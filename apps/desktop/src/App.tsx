import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { OffersPage } from '@/pages/OffersPage'
import { OfferDetailPage } from '@/pages/OfferDetailPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { CVPage } from '@/pages/CVPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useConnectionStore } from '@/stores/connection'
import { usePipelineStore } from '@/stores/pipeline'

const App = () => {
  const loadFromStore = useConnectionStore((s) => s.loadFromStore)
  const isLoaded = useConnectionStore((s) => s.isLoaded)
  const vpsUrl = useConnectionStore((s) => s.vpsUrl)
  const apiKey = useConnectionStore((s) => s.apiKey)
  const fetchStages = usePipelineStore((s) => s.fetchStages)
  const fetchWorkspaces = usePipelineStore((s) => s.fetchWorkspaces)

  useEffect(() => {
    loadFromStore()
  }, [loadFromStore])

  useEffect(() => {
    if (isLoaded && vpsUrl && apiKey) {
      fetchStages()
      fetchWorkspaces()
    }
  }, [isLoaded, vpsUrl, apiKey, fetchStages, fetchWorkspaces])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<OffersPage />} />
          <Route path="/offers/:id" element={<OfferDetailPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/cv" element={<CVPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
