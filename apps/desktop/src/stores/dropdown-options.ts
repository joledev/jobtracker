import { create } from 'zustand'
import { load } from '@tauri-apps/plugin-store'

export interface SelectOption {
  value: string
  label: string
}

interface DropdownOptions {
  levels: SelectOption[]
  types: SelectOption[]
  modalities: SelectOption[]
  currencies: SelectOption[]
  periods: SelectOption[]
  platforms: SelectOption[]
}

interface DropdownOptionsStore {
  options: DropdownOptions
  isLoaded: boolean
  loadOptions: () => Promise<void>
  addOption: (key: keyof DropdownOptions, option: SelectOption) => Promise<void>
}

const STORE_NAME = 'settings.json'
const STORE_KEY = 'dropdown_options'

const defaultOptions: DropdownOptions = {
  levels: [
    { value: 'junior', label: 'Junior' },
    { value: 'mid', label: 'Mid' },
    { value: 'senior', label: 'Senior' },
    { value: 'staff', label: 'Staff' },
    { value: 'architect', label: 'Architect' },
  ],
  types: [
    { value: 'full-time', label: 'Full-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'part-time', label: 'Part-time' },
  ],
  modalities: [
    { value: 'remote', label: 'Remote' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'onsite', label: 'On-site' },
  ],
  currencies: [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
    { value: 'ARS', label: 'ARS' },
    { value: 'MXN', label: 'MXN' },
  ],
  periods: [
    { value: 'monthly', label: 'Mensual' },
    { value: 'annual', label: 'Anual' },
    { value: 'hourly', label: 'Por hora' },
  ],
  platforms: [
    { value: 'LinkedIn', label: 'LinkedIn' },
    { value: 'Indeed', label: 'Indeed' },
    { value: 'OCC', label: 'OCC' },
    { value: 'Computrabajo', label: 'Computrabajo' },
    { value: 'referral', label: 'Referido' },
    { value: 'company-site', label: 'Web empresa' },
    { value: 'other', label: 'Otro' },
  ],
}

const persist = async (options: DropdownOptions) => {
  const store = await load(STORE_NAME)
  await store.set(STORE_KEY, options)
  await store.save()
}

export const useDropdownOptionsStore = create<DropdownOptionsStore>((set, get) => ({
  options: defaultOptions,
  isLoaded: false,

  loadOptions: async () => {
    try {
      const store = await load(STORE_NAME)
      const saved = (await store.get(STORE_KEY)) as DropdownOptions | null
      if (saved) {
        // Merge: keep defaults, add any custom ones from saved
        const merged: DropdownOptions = { ...defaultOptions }
        for (const key of Object.keys(defaultOptions) as (keyof DropdownOptions)[]) {
          if (saved[key]) {
            const defaultValues = new Set(defaultOptions[key].map((o) => o.value))
            const custom = saved[key].filter((o) => !defaultValues.has(o.value))
            merged[key] = [...defaultOptions[key], ...custom]
          }
        }
        set({ options: merged, isLoaded: true })
      } else {
        set({ isLoaded: true })
      }
    } catch {
      set({ isLoaded: true })
    }
  },

  addOption: async (key, option) => {
    const { options } = get()
    if (options[key].some((o) => o.value === option.value)) return
    const updated = { ...options, [key]: [...options[key], option] }
    set({ options: updated })
    await persist(updated)
  },
}))
