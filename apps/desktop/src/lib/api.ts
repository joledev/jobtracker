import { useMemo } from 'react'
import { useConnectionStore } from '@/stores/connection'
import { createLocalClient } from './local-db'
import type {
  OfferListItem,
  OfferDetail,
  CreateOfferInput,
  UpdateOfferInput,
  ChangeStatusInput,
  OfferFilters,
  PipelineStage,
  Workspace,
  Technology,
  TechnologyFilters,
  CvSnapshot,
  CvSnapshotDetail,
  CreateCvInput,
  UpdateCvInput,
  CvFilters,
  Contact,
  ContactFilters,
  CreateContactInput,
  PhoneCall,
  CreateCallInput,
  InterviewQuestion,
  CreateQuestionInput,
  UpdateQuestionInput,
  AddTechnologyInput,
  StatusLogEntry,
  TimelineResponse,
  TimelineFilters,
  ApiKey,
  CreateApiKeyResponse,
  CreateStageInput,
  UpdateStageInput,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  CreateTechnologyInput,
  UpdateTechnologyInput,
} from '@/types/api'

export interface ApiError {
  status: number
  message: string
}

export class ApiClientError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const handleApiError = (status: number, message: string) => {
  // Lazy import to avoid circular deps — ui store may import from api
  import('@/stores/ui').then(({ useUiStore }) => {
    if (status === 401) {
      useUiStore.getState().addToast('API Key invalida. Ve a Settings → Conexion.', 'error')
    } else if (status >= 500) {
      useUiStore.getState().addToast('Error del servidor. Intenta de nuevo.', 'error')
    }
  })
  throw new ApiClientError(status, message)
}

const createRequest = async <T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = `${baseUrl}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const msg = body?.error || response.statusText || `HTTP ${response.status}`
    handleApiError(response.status, msg)
  }

  return response.json() as Promise<T>
}

const createVoidRequest = async (
  baseUrl: string,
  apiKey: string,
  path: string,
  options: RequestInit = {},
): Promise<void> => {
  const url = `${baseUrl}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const msg = body?.error || response.statusText || `HTTP ${response.status}`
    handleApiError(response.status, msg)
  }
}

const buildQuery = (params: Record<string, string | number | undefined | null>): string => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
}

export const createApiClient = (baseUrl: string, apiKey: string) => ({
  health: {
    check: () =>
      createRequest<{ status: string; timestamp: string }>(baseUrl, apiKey, '/health'),
  },

  offers: {
    list: (filters?: OfferFilters) =>
      createRequest<OfferListItem[]>(
        baseUrl, apiKey,
        '/api/offers' + buildQuery({ ...filters } as Record<string, string | number | undefined>),
      ),

    get: (id: string) =>
      createRequest<OfferDetail>(baseUrl, apiKey, `/api/offers/${id}`),

    create: (data: CreateOfferInput) =>
      createRequest<OfferListItem>(baseUrl, apiKey, '/api/offers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateOfferInput) =>
      createRequest<OfferListItem>(baseUrl, apiKey, `/api/offers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/offers/${id}`, { method: 'DELETE' }),

    changeStatus: (id: string, data: ChangeStatusInput) =>
      createRequest<{ success: boolean; fromStageId: string | null; toStageId: string }>(
        baseUrl, apiKey, `/api/offers/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        },
      ),

    addContact: (offerId: string, contactId: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/offers/${offerId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contactId }),
      }),

    removeContact: (offerId: string, contactId: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/offers/${offerId}/contacts/${contactId}`, {
        method: 'DELETE',
      }),

    listCalls: (offerId: string) =>
      createRequest<PhoneCall[]>(baseUrl, apiKey, `/api/offers/${offerId}/calls`),

    addCall: (offerId: string, data: CreateCallInput) =>
      createRequest<PhoneCall>(baseUrl, apiKey, `/api/offers/${offerId}/calls`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listQuestions: (offerId: string) =>
      createRequest<InterviewQuestion[]>(baseUrl, apiKey, `/api/offers/${offerId}/questions`),

    createQuestion: (offerId: string, data: CreateQuestionInput) =>
      createRequest<InterviewQuestion>(baseUrl, apiKey, `/api/offers/${offerId}/questions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateQuestion: (offerId: string, qId: string, data: UpdateQuestionInput) =>
      createRequest<InterviewQuestion>(baseUrl, apiKey, `/api/offers/${offerId}/questions/${qId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteQuestion: (offerId: string, qId: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/offers/${offerId}/questions/${qId}`, {
        method: 'DELETE',
      }),

    addTechnology: (offerId: string, data: AddTechnologyInput) =>
      createVoidRequest(baseUrl, apiKey, `/api/offers/${offerId}/technologies`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    removeTechnology: (offerId: string, techId: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/offers/${offerId}/technologies/${techId}`, {
        method: 'DELETE',
      }),

    getStatusLog: async (offerId: string): Promise<StatusLogEntry[]> => {
      const data = await createRequest<TimelineResponse>(
        baseUrl, apiKey,
        '/api/timeline' + buildQuery({ limit: 500 } as Record<string, string | number | undefined>),
      )
      return data.events.filter((e) => e.offerId === offerId)
    },
  },

  contacts: {
    list: (params?: ContactFilters) =>
      createRequest<Contact[]>(
        baseUrl, apiKey,
        '/api/contacts' + buildQuery({ ...params } as Record<string, string | number | undefined>),
      ),

    create: (data: CreateContactInput) =>
      createRequest<Contact>(baseUrl, apiKey, '/api/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  timeline: {
    list: (params?: TimelineFilters) =>
      createRequest<TimelineResponse>(
        baseUrl, apiKey,
        '/api/timeline' + buildQuery({ ...params } as Record<string, string | number | undefined>),
      ),
  },

  pipeline: {
    list: () =>
      createRequest<PipelineStage[]>(baseUrl, apiKey, '/api/pipeline-stages'),

    create: (data: CreateStageInput) =>
      createRequest<PipelineStage>(baseUrl, apiKey, '/api/pipeline-stages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateStageInput) =>
      createRequest<PipelineStage>(baseUrl, apiKey, `/api/pipeline-stages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/pipeline-stages/${id}`, { method: 'DELETE' }),

    reorder: async (ids: string[]) => {
      for (let i = 0; i < ids.length; i++) {
        await createRequest<PipelineStage>(baseUrl, apiKey, `/api/pipeline-stages/${ids[i]}`, {
          method: 'PUT',
          body: JSON.stringify({ sortOrder: i }),
        })
      }
    },
  },

  workspaces: {
    list: () =>
      createRequest<Workspace[]>(baseUrl, apiKey, '/api/workspaces'),

    create: (data: CreateWorkspaceInput) =>
      createRequest<Workspace>(baseUrl, apiKey, '/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateWorkspaceInput) =>
      createRequest<Workspace>(baseUrl, apiKey, `/api/workspaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/workspaces/${id}`, { method: 'DELETE' }),
  },

  technologies: {
    list: (params?: TechnologyFilters) =>
      createRequest<Technology[]>(
        baseUrl, apiKey,
        '/api/technologies' + buildQuery({ ...params } as Record<string, string | number | undefined>),
      ),

    create: (data: CreateTechnologyInput) =>
      createRequest<Technology>(baseUrl, apiKey, '/api/technologies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateTechnologyInput) =>
      createRequest<Technology>(baseUrl, apiKey, `/api/technologies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/technologies/${id}`, { method: 'DELETE' }),
  },

  apiKeys: {
    list: () =>
      createRequest<ApiKey[]>(baseUrl, apiKey, '/api/api-keys'),

    create: (data: { label: string; expiresAt?: string }) =>
      createRequest<CreateApiKeyResponse>(baseUrl, apiKey, '/api/api-keys', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    revoke: (id: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/api-keys/${id}`, { method: 'DELETE' }),
  },

  cvs: {
    list: (filters?: CvFilters) =>
      createRequest<CvSnapshot[]>(
        baseUrl, apiKey,
        '/api/cvs' + buildQuery({ ...filters } as Record<string, string | number | undefined>),
      ),

    get: (id: string) =>
      createRequest<CvSnapshotDetail>(baseUrl, apiKey, `/api/cvs/${id}`),

    create: (data: CreateCvInput) =>
      createRequest<CvSnapshotDetail>(baseUrl, apiKey, '/api/cvs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateCvInput) =>
      createRequest<CvSnapshotDetail>(baseUrl, apiKey, `/api/cvs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      createVoidRequest(baseUrl, apiKey, `/api/cvs/${id}`, { method: 'DELETE' }),
  },
})

export type ApiClient = ReturnType<typeof createApiClient>

export const useApi = () => {
  const { storageMode, vpsUrl, apiKey } = useConnectionStore()

  return useMemo(() => {
    if (storageMode === 'local') return createLocalClient()
    return createApiClient(vpsUrl, apiKey)
  }, [storageMode, vpsUrl, apiKey])
}

export const testConnection = async (
  baseUrl: string,
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const response = await fetch(`${baseUrl}/health`)
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` }
    }
    const data = await response.json()
    return { ok: data.status === 'ok' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Connection failed' }
  }
}
