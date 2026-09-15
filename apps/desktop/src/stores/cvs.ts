import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { getClient } from '@/lib/client'
import type { CvSnapshot, CvSnapshotDetail, CreateCvInput, UpdateCvInput } from '@/types/api'

interface CvsStore {
  items: CvSnapshot[]
  selected: CvSnapshotDetail | null
  isLoading: boolean
  isCompiling: boolean
  compileError: string | null
  latexAvailable: boolean | null
  filterType: 'cv' | 'cover_letter' | null

  fetchCvs: () => Promise<void>
  selectCv: (id: string) => Promise<void>
  clearSelection: () => void
  createCv: (data: CreateCvInput) => Promise<string>
  updateCv: (id: string, data: UpdateCvInput) => Promise<void>
  deleteCv: (id: string) => Promise<void>
  setFilterType: (type: 'cv' | 'cover_letter' | null) => void
  checkLatex: () => Promise<void>
  compileLatex: (source: string) => Promise<string>
  savePdfToDisk: (base64: string, filename: string) => Promise<void>
}

export const useCvsStore = create<CvsStore>((set, get) => ({
  items: [],
  selected: null,
  isLoading: false,
  isCompiling: false,
  compileError: null,
  latexAvailable: null,
  filterType: null,

  fetchCvs: async () => {
    const client = getClient()
    if (!client) return
    set({ isLoading: true })
    try {
      const { filterType } = get()
      const items = await client.cvs.list(filterType ? { type: filterType } : undefined)
      set({ items })
    } finally {
      set({ isLoading: false })
    }
  },

  selectCv: async (id) => {
    const client = getClient()
    if (!client) return
    try {
      const detail = await client.cvs.get(id)
      set({ selected: detail })
    } catch {
      set({ selected: null })
    }
  },

  clearSelection: () => set({ selected: null }),

  createCv: async (data) => {
    const client = getClient()
    if (!client) return ''
    const created = await client.cvs.create(data)
    await get().fetchCvs()
    return created.id
  },

  updateCv: async (id, data) => {
    const client = getClient()
    if (!client) return
    const updated = await client.cvs.update(id, data)
    const { selected } = get()
    // Preserve locally-compiled PDF if the API response doesn't include it
    if (selected && data.compiledPdf && !updated.compiledPdf) {
      updated.compiledPdf = data.compiledPdf
    }
    set({ selected: updated })
    await get().fetchCvs()
  },

  deleteCv: async (id) => {
    const client = getClient()
    if (!client) return
    await client.cvs.delete(id)
    const { selected } = get()
    if (selected?.id === id) set({ selected: null })
    set((state) => ({ items: state.items.filter((c) => c.id !== id) }))
  },

  setFilterType: (type) => {
    set({ filterType: type })
    get().fetchCvs()
  },

  checkLatex: async () => {
    try {
      const available = await invoke<boolean>('check_latex_installed')
      console.log('[checkLatex] available:', available)
      set({ latexAvailable: available })
    } catch (e) {
      console.error('[checkLatex] error:', e)
      set({ latexAvailable: false })
    }
  },

  compileLatex: async (source) => {
    console.log('[compileLatex] called, source length:', source.length)
    set({ isCompiling: true, compileError: null })
    try {
      const base64 = await invoke<string>('compile_latex', { latexSource: source })
      console.log('[compileLatex] success, pdf base64 length:', base64.length)
      const { selected } = get()
      if (selected) {
        set({ selected: { ...selected, latexSource: source, compiledPdf: base64 } })
      }
      set({ isCompiling: false })
      return base64
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set({ isCompiling: false, compileError: msg })
      throw e
    }
  },

  savePdfToDisk: async (base64, filename) => {
    await invoke('save_pdf_to_disk', { pdfBase64: base64, defaultName: filename })
  },
}))
