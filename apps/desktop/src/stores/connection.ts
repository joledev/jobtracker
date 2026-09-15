import { create } from 'zustand'
import { load } from '@tauri-apps/plugin-store'

export type StorageMode = 'local' | 'remote'

interface ConnectionStore {
  storageMode: StorageMode
  vpsUrl: string
  apiKey: string
  isLoaded: boolean
  setStorageMode: (mode: StorageMode) => Promise<void>
  setVpsUrl: (url: string) => Promise<void>
  setApiKey: (key: string) => Promise<void>
  loadFromStore: () => Promise<void>
}

const STORE_NAME = 'settings.json'

export const useConnectionStore = create<ConnectionStore>((set) => ({
  storageMode: 'local',
  vpsUrl: '',
  apiKey: '',
  isLoaded: false,

  setStorageMode: async (mode: StorageMode) => {
    const store = await load(STORE_NAME)
    await store.set('storage_mode', mode)
    await store.save()
    set({ storageMode: mode })
  },

  setVpsUrl: async (url: string) => {
    const store = await load(STORE_NAME)
    await store.set('vps_url', url)
    await store.save()
    set({ vpsUrl: url })
  },

  setApiKey: async (key: string) => {
    const store = await load(STORE_NAME)
    await store.set('api_key', key)
    await store.save()
    set({ apiKey: key })
  },

  loadFromStore: async () => {
    try {
      const store = await load(STORE_NAME)
      const storageMode = ((await store.get('storage_mode')) as StorageMode) || 'local'
      const vpsUrl = ((await store.get('vps_url')) as string) || ''
      const apiKey = ((await store.get('api_key')) as string) || ''
      set({ storageMode, vpsUrl, apiKey, isLoaded: true })
    } catch {
      set({ isLoaded: true })
    }
  },
}))
