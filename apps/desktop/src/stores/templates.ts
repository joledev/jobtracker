import { create } from 'zustand'
import { load } from '@tauri-apps/plugin-store'
import type { ParseTemplate } from '@/lib/parsers/types'

interface TemplatesStore {
  templates: ParseTemplate[]
  isLoaded: boolean
  loadTemplates: () => Promise<void>
  addTemplate: (template: Omit<ParseTemplate, 'id' | 'createdAt'>) => Promise<void>
  updateTemplate: (id: string, data: Partial<Omit<ParseTemplate, 'id' | 'createdAt'>>) => Promise<void>
  removeTemplate: (id: string) => Promise<void>
}

const STORE_NAME = 'settings.json'
const STORE_KEY = 'parse_templates'

const persist = async (templates: ParseTemplate[]) => {
  const store = await load(STORE_NAME)
  await store.set(STORE_KEY, templates)
  await store.save()
}

export const useTemplatesStore = create<TemplatesStore>((set, get) => ({
  templates: [],
  isLoaded: false,

  loadTemplates: async () => {
    try {
      const store = await load(STORE_NAME)
      const templates = ((await store.get(STORE_KEY)) as ParseTemplate[]) || []
      set({ templates, isLoaded: true })
    } catch {
      set({ isLoaded: true })
    }
  },

  addTemplate: async (data) => {
    const template: ParseTemplate = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const templates = [...get().templates, template]
    await persist(templates)
    set({ templates })
  },

  updateTemplate: async (id, data) => {
    const templates = get().templates.map((t) =>
      t.id === id ? { ...t, ...data } : t,
    )
    await persist(templates)
    set({ templates })
  },

  removeTemplate: async (id) => {
    const templates = get().templates.filter((t) => t.id !== id)
    await persist(templates)
    set({ templates })
  },
}))
