import { create } from 'zustand'
import { getClient } from '@/lib/client'
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
    const client = getClient()
    if (!client) return
    set({ isLoading: true })
    try {
      const stages = await client.pipeline.list()
      set({ stages })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchWorkspaces: async () => {
    const client = getClient()
    if (!client) return
    try {
      const workspaces = await client.workspaces.list()
      set({ workspaces })
    } catch {
      // silently fail — workspaces are optional
    }
  },
}))
