import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { CvTypeFilter } from '@/components/cv/CvTypeFilter'
import { CvList } from '@/components/cv/CvList'
import { CvDetailPanel } from '@/components/cv/CvDetailPanel'
import { NewCvModal } from '@/components/cv/NewCvModal'
import { useCvsStore } from '@/stores/cvs'

export const CVPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'cv' | 'cover_letter'>('cv')
  const fetchCvs = useCvsStore((s) => s.fetchCvs)
  const selectCv = useCvsStore((s) => s.selectCv)
  const selected = useCvsStore((s) => s.selected)
  const checkLatex = useCvsStore((s) => s.checkLatex)

  const selectedId = selected?.id ?? null

  useEffect(() => {
    fetchCvs()
    checkLatex()
  }, [fetchCvs, checkLatex])

  useEffect(() => {
    const id = searchParams.get('selected')
    if (id) {
      selectCv(id)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, selectCv, setSearchParams])

  const handleSelect = (id: string) => {
    selectCv(id)
  }

  const handleCreated = (id: string) => {
    selectCv(id)
  }

  const openNewCv = () => {
    setModalType('cv')
    setModalOpen(true)
  }

  const openNewCoverLetter = () => {
    setModalType('cover_letter')
    setModalOpen(true)
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title="CV Manager"
        action={
          <>
            <Button size="sm" onClick={openNewCv}>+ Nuevo CV</Button>
            <Button size="sm" variant="secondary" onClick={openNewCoverLetter}>+ Carta</Button>
          </>
        }
      />
      <CvTypeFilter />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 shrink-0 overflow-y-auto border-r border-border">
          <CvList selectedId={selectedId} onSelect={handleSelect} />
        </div>
        <CvDetailPanel cv={selected} />
      </div>
      <NewCvModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultType={modalType}
        onCreated={handleCreated}
      />
    </div>
  )
}
