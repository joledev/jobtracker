import { useConnectionStore } from '@/stores/connection'
import { createApiClient, type ApiClient } from './api'
import { createLocalClient } from './local-db'

let cachedLocalClient: ApiClient | null = null

export function getClient(): ApiClient | null {
  const { storageMode, vpsUrl, apiKey } = useConnectionStore.getState()

  if (storageMode === 'local') {
    if (!cachedLocalClient) {
      cachedLocalClient = createLocalClient()
    }
    return cachedLocalClient
  }

  // Remote mode
  if (!vpsUrl || !apiKey) return null
  return createApiClient(vpsUrl, apiKey)
}
