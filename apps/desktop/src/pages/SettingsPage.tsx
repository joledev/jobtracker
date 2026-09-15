import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { ConnectionSettings } from '@/components/settings/ConnectionSettings'
import { PipelineSettings } from '@/components/settings/PipelineSettings'
import { ApiKeysSettings } from '@/components/settings/ApiKeysSettings'
import { WorkspacesSettings } from '@/components/settings/WorkspacesSettings'
import { TechnologiesSettings } from '@/components/settings/TechnologiesSettings'
import { ImportTemplatesSettings } from '@/components/settings/ImportTemplatesSettings'

const tabs = ['Conexion', 'Pipeline', 'API Keys', 'Workspaces', 'Tecnologias', 'Importacion'] as const
type SettingsTab = (typeof tabs)[number]

export const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('Conexion')

  return (
    <div>
      <TopBar title="Configuracion" />
      <div className="border-b border-border">
        <div className="flex gap-0 px-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-text-primary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        {activeTab === 'Conexion' && <ConnectionSettings />}
        {activeTab === 'Pipeline' && <PipelineSettings />}
        {activeTab === 'API Keys' && <ApiKeysSettings />}
        {activeTab === 'Workspaces' && <WorkspacesSettings />}
        {activeTab === 'Tecnologias' && <TechnologiesSettings />}
        {activeTab === 'Importacion' && <ImportTemplatesSettings />}
      </div>
    </div>
  )
}
