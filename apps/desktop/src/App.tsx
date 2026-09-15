import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { OffersPage } from '@/pages/OffersPage'
import { OfferDetailPage } from '@/pages/OfferDetailPage'
import { Spinner } from '@/components/ui/Spinner'
import { useConnectionStore } from '@/stores/connection'
import { usePipelineStore } from '@/stores/pipeline'
import { useDropdownOptionsStore } from '@/stores/dropdown-options'
import { initLocalDb } from '@/lib/local-db'

const TimelinePage = lazy(() => import('@/pages/TimelinePage').then((m) => ({ default: m.TimelinePage })))
const CVPage = lazy(() => import('@/pages/CVPage').then((m) => ({ default: m.CVPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

const App = () => {
  const loadFromStore = useConnectionStore((s) => s.loadFromStore)
  const isLoaded = useConnectionStore((s) => s.isLoaded)
  const storageMode = useConnectionStore((s) => s.storageMode)
  const vpsUrl = useConnectionStore((s) => s.vpsUrl)
  const apiKey = useConnectionStore((s) => s.apiKey)
  const fetchStages = usePipelineStore((s) => s.fetchStages)
  const fetchWorkspaces = usePipelineStore((s) => s.fetchWorkspaces)

  const loadDropdownOptions = useDropdownOptionsStore((s) => s.loadOptions)
  const dbReady = useConnectionStore((s) => s.dbReady)
  const setDbReady = useConnectionStore((s) => s.setDbReady)

  useEffect(() => {
    loadFromStore()
    loadDropdownOptions()
  }, [loadFromStore, loadDropdownOptions])

  // Initialize local SQLite when in local mode
  useEffect(() => {
    if (!isLoaded) return
    if (storageMode === 'local') {
      initLocalDb().then(() => setDbReady(true)).catch(console.error)
    } else {
      setDbReady(true)
    }
  }, [isLoaded, storageMode])

  useEffect(() => {
    if (!dbReady) return
    const ready = storageMode === 'local' || !!(vpsUrl && apiKey)
    if (ready) {
      fetchStages()
      fetchWorkspaces()
    }
  }, [dbReady, storageMode, vpsUrl, apiKey, fetchStages, fetchWorkspaces])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<OffersPage />} />
          <Route path="/offers/:id" element={<OfferDetailPage />} />
          <Route path="/timeline" element={<Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}><TimelinePage /></Suspense>} />
          <Route path="/cv" element={<Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}><CVPage /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}><SettingsPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
