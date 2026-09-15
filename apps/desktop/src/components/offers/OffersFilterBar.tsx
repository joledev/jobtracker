import { useEffect, useRef, useState } from 'react'
import type { OfferFilters, PipelineStage } from '@/types/api'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface OffersFilterBarProps {
  filters: OfferFilters
  stages: PipelineStage[]
  onChange: (key: keyof OfferFilters, value: string | undefined) => void
  onReset: () => void
}

export const OffersFilterBar = ({ filters, stages, onChange, onReset }: OffersFilterBarProps) => {
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [prevSearch, setPrevSearch] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Ajustar estado cuando cambia una prop se hace durante el render, no en un
  // efecto: asi React reprocesa antes de pintar, sin el render en cascada que
  // provocaba el `setSearchInput` dentro de `useEffect`.
  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search)
    setSearchInput(filters.search || '')
  }

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange('search', value || undefined)
    }, 300)
  }

  const hasActiveFilters = filters.search || filters.stage_id

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }))

  return (
    <div className="flex items-end gap-3 border-b border-border px-4 py-3">
      <div className="flex-1">
        <Input
          placeholder="Buscar por empresa o posicion..."
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <div className="w-44">
        <Select
          options={stageOptions}
          placeholder="Todas las etapas"
          value={filters.stage_id || ''}
          onChange={(e) => onChange('stage_id', e.target.value || undefined)}
        />
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Limpiar
        </Button>
      )}
    </div>
  )
}
