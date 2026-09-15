import { useState } from 'react'
import { CvEditorTab } from './CvEditorTab'
import { CvPreviewTab } from './CvPreviewTab'
import { CvInfoTab } from './CvInfoTab'
import type { CvSnapshotDetail } from '@/types/api'

const tabs = ['Editor', 'Preview', 'Info'] as const
type Tab = typeof tabs[number]

interface CvDetailPanelProps {
  cv: CvSnapshotDetail | null
}

export const CvDetailPanel = ({ cv }: CvDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('Editor')

  if (!cv) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
        Selecciona un documento de la lista
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex gap-1 border-b border-border px-4 py-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-1 text-xs transition-colors ${
              activeTab === tab
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'Editor' && <CvEditorTab key={cv.id} cv={cv} />}
        {activeTab === 'Preview' && <CvPreviewTab />}
        {activeTab === 'Info' && <CvInfoTab cv={cv} />}
      </div>
    </div>
  )
}
