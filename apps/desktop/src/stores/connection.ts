import { create } from 'zustand'
import { load } from '@tauri-apps/plugin-store'

export type StorageMode = 'local' | 'remote'

interface ConnectionStore {
  storageMode: StorageMode
  vpsUrl: string
  apiKey: string
  isLoaded: boolean
  /** La base local ya esta inicializada. En modo remoto se marca de inmediato. */
  dbReady: boolean
  setDbReady: (ready: boolean) => void
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
  dbReady: false,

  setDbReady: (ready: boolean) => set({ dbReady: ready }),

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

/** Unica fuente de verdad para "ya se pueden pedir datos". */
export const useDataReady = (): boolean =>
  useConnectionStore(
    (s) =>
      s.isLoaded &&
      s.dbReady &&
      (s.storageMode === 'local' || !!(s.vpsUrl && s.apiKey)),
  )
