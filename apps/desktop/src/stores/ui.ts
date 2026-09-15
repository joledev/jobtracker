import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
}

interface UiStore {
  newOfferModalOpen: boolean
  sidebarCollapsed: boolean
  toasts: Toast[]
  toggleNewOfferModal: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

let toastCounter = 0

export const useUiStore = create<UiStore>((set) => ({
  newOfferModalOpen: false,
  sidebarCollapsed: false,
  toasts: [],

  toggleNewOfferModal: () =>
    set((state) => ({ newOfferModalOpen: !state.newOfferModalOpen })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  addToast: (message, type = 'info') => {
    const id = String(++toastCounter)
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
