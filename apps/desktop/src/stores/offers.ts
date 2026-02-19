import { create } from 'zustand'
import { createApiClient } from '@/lib/api'
import { useConnectionStore } from '@/stores/connection'
import type { OfferListItem, OfferFilters, CreateOfferInput, UpdateOfferInput } from '@/types/api'

interface OffersStore {
  items: OfferListItem[]
  isLoading: boolean
  filters: OfferFilters
  activeWorkspaceId: string | null
  fetchOffers: () => Promise<void>
  setFilter: (key: keyof OfferFilters, value: string | number | undefined) => void
  resetFilters: () => void
  createOffer: (data: CreateOfferInput) => Promise<string>
  updateOffer: (id: string, data: UpdateOfferInput) => Promise<void>
  deleteOffer: (id: string) => Promise<void>
  setActiveWorkspace: (id: string | null) => void
}

export const useOffersStore = create<OffersStore>((set, get) => ({
  items: [],
  isLoading: false,
  filters: {},
  activeWorkspaceId: null,

  fetchOffers: async () => {
    const { vpsUrl, apiKey } = useConnectionStore.getState()
    if (!vpsUrl || !apiKey) return
    set({ isLoading: true })
    try {
      const client = createApiClient(vpsUrl, apiKey)
      const { filters, activeWorkspaceId } = get()
      const params: OfferFilters = { ...filters }
      if (activeWorkspaceId) params.workspace_id = activeWorkspaceId
      const items = await client.offers.list(params)
      set({ items })
    } finally {
      set({ isLoading: false })
    }
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value || undefined } }))
    get().fetchOffers()
  },

  resetFilters: () => {
    set({ filters: {} })
    get().fetchOffers()
  },

  createOffer: async (data) => {
    const { vpsUrl, apiKey } = useConnectionStore.getState()
    if (!vpsUrl || !apiKey) return ''
    const client = createApiClient(vpsUrl, apiKey)
    const created = await client.offers.create(data)
    await get().fetchOffers()
    return created.id
  },

  updateOffer: async (id, data) => {
    const { vpsUrl, apiKey } = useConnectionStore.getState()
    if (!vpsUrl || !apiKey) return
    const client = createApiClient(vpsUrl, apiKey)
    await client.offers.update(id, data)
    await get().fetchOffers()
  },

  deleteOffer: async (id) => {
    const { vpsUrl, apiKey } = useConnectionStore.getState()
    if (!vpsUrl || !apiKey) return
    const client = createApiClient(vpsUrl, apiKey)
    await client.offers.delete(id)
    set((state) => ({ items: state.items.filter((o) => o.id !== id) }))
  },

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id, filters: {} })
    get().fetchOffers()
  },
}))
