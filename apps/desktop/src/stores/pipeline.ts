import { create } from 'zustand'
import { createApiClient } from '@/lib/api'
import { useConnectionStore } from '@/stores/connection'
import type { PipelineStage, Workspace } from '@/types/api'

interface PipelineStore {
  stages: PipelineStage[]
  workspaces: Workspace[]
  isLoading: boolean
  fetchStages: () => Promise<void>
  fetchWorkspaces: () => Promise<void>
}

export const usePipelineStore = create<PipelineStore>((set) => ({
  stages: [],
  workspaces: [],
  isLoading: false,

  fetchStages: async () => {
    const { vpsUrl, apiKey } = useConnectionStore.getState()
    if (!vpsUrl || !apiKey) return
    set({ isLoading: true })
    try {
      const client = createApiClient(vpsUrl, apiKey)
      const stages = await client.pipeline.list()
      set({ stages })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchWorkspaces: async () => {
    const { vpsUrl, apiKey } = useConnectionStore.getState()
    if (!vpsUrl || !apiKey) return
    try {
      const client = createApiClient(vpsUrl, apiKey)
      const workspaces = await client.workspaces.list()
      set({ workspaces })
    } catch {
      // silently fail — workspaces are optional
    }
  },
}))
