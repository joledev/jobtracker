import { useState, useRef, useEffect } from 'react'
import { useApi } from '@/lib/api'
import { TechTag } from '@/components/offers/TechTag'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { OfferDetail, Technology } from '@/types/api'

const contextOptions = [
  { value: 'required', label: 'Required' },
  { value: 'nice-to-have', label: 'Nice to have' },
  { value: 'asked-in-interview', label: 'Asked in interview' },
]

const contextColors: Record<string, string> = {
  required: 'text-status-rejected',
  'nice-to-have': 'text-status-screening',
  'asked-in-interview': 'text-status-interview',
}

interface TechnologiesTabProps {
  offer: OfferDetail
  onRefresh: () => void
}

export const TechnologiesTab = ({ offer, onRefresh }: TechnologiesTabProps) => {
  const api = useApi()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Technology[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedContext, setSelectedContext] = useState('required')
  const [isAdding, setIsAdding] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    clearTimeout(debounceRef.current)
    if (!value) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await api.technologies.list({ search: value })
        const linkedIds = new Set(offer.technologies.map((t) => t.id))
        setSearchResults(results.filter((t) => !linkedIds.has(t.id)))
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleAdd = async (techId: string) => {
    setIsAdding(true)
    try {
      await api.offers.addTechnology(offer.id, { technologyId: techId, context: selectedContext })
      setSearchQuery('')
      setSearchResults([])
      onRefresh()
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (techId: string) => {
    await api.offers.removeTechnology(offer.id, techId)
    onRefresh()
  }

  const handleCreateAndAdd = async () => {
    if (!searchQuery.trim()) return
    setIsAdding(true)
    try {
      const newTech = await api.technologies.create({ name: searchQuery.trim() })
      await api.offers.addTechnology(offer.id, { technologyId: newTech.id, context: selectedContext })
      setSearchQuery('')
      setSearchResults([])
      onRefresh()
    } finally {
      setIsAdding(false)
    }
  }

  // Check if search query matches any existing tech exactly
  const exactMatch = searchResults.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase())
  const showCreateButton = searchQuery.trim() && !exactMatch && !isSearching &&
    !offer.technologies.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase())

  return (
    <div className="space-y-4 p-4">
      {offer.technologies.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {offer.technologies.map((tech) => (
            <div key={tech.id} className="flex items-center gap-1.5">
              <TechTag name={tech.name} onRemove={() => handleRemove(tech.id)} />
              {tech.context && (
                <span className={`text-xs ${contextColors[tech.context] || 'text-text-muted'}`}>
                  {tech.context}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No hay tecnologias asociadas</p>
      )}

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-text-secondary">Agregar tecnologia</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              placeholder="Buscar tecnologia..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              options={contextOptions}
              value={selectedContext}
              onChange={(e) => setSelectedContext(e.target.value)}
            />
          </div>
        </div>
        {isSearching && <p className="mt-1 text-xs text-text-muted">Buscando...</p>}
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1 rounded-md border border-border bg-bg-card">
            {searchResults.map((t) => (
              <button
                key={t.id}
                onClick={() => handleAdd(t.id)}
                disabled={isAdding}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover disabled:opacity-40"
              >
                <span className="text-text-primary">{t.name}</span>
                {t.category && <span className="text-xs text-text-muted">{t.category}</span>}
              </button>
            ))}
          </div>
        )}
        {showCreateButton && (
          <Button size="sm" variant="secondary" className="mt-2" onClick={handleCreateAndAdd} loading={isAdding}>
            Crear &quot;{searchQuery.trim()}&quot; y agregar
          </Button>
        )}
      </div>
    </div>
  )
}
