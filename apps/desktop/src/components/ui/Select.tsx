import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  disabled?: boolean
  className?: string
  id?: string
  creatable?: boolean
  onCreateOption?: (option: SelectOption) => void
}

export const Select = ({ label, error, options, placeholder, className = '', id, value, onChange, disabled, creatable, onCreateOption }: SelectProps) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  const selected = options.find((o) => o.value === value)
  const displayLabel = selected?.label || placeholder || ''
  const isPlaceholder = !selected

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const showCreateOption = creatable && search.trim() && !options.some(
    (o) => o.label.toLowerCase() === search.trim().toLowerCase()
  )

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && creatable && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open, creatable])

  const handleSelect = (val: string) => {
    onChange?.({ target: { value: val } })
    setOpen(false)
    setSearch('')
  }

  const handleCreate = () => {
    const trimmed = search.trim()
    if (!trimmed) return
    const slug = trimmed.toLowerCase().replace(/\s+/g, '-')
    const newOption = { value: slug, label: trimmed }
    onCreateOption?.(newOption)
    onChange?.({ target: { value: slug } })
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className="relative">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm text-text-secondary">
          {label}
        </label>
      )}
      <button
        id={inputId}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-md border bg-bg-card px-3 py-2 text-left text-sm outline-none transition-colors focus:border-text-secondary disabled:opacity-40 ${
          error ? 'border-status-rejected' : 'border-border'
        } ${isPlaceholder ? 'text-text-muted' : 'text-text-primary'} ${className}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} className={`ml-2 flex-shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-bg-card py-1 shadow-lg">
          {creatable && (
            <div className="px-2 pb-1 pt-0.5">
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (showCreateOption) handleCreate()
                    else if (filtered.length === 1) handleSelect(filtered[0].value)
                  }
                  if (e.key === 'Escape') {
                    setOpen(false)
                    setSearch('')
                  }
                }}
                placeholder="Buscar o crear..."
                className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
              />
            </div>
          )}
          {placeholder && !search && (
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-bg-hover ${
                !value ? 'text-text-primary bg-bg-hover' : 'text-text-muted'
              }`}
            >
              {placeholder}
            </button>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-bg-hover ${
                opt.value === value ? 'text-text-primary bg-bg-hover' : 'text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreate}
              className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm text-status-applied transition-colors hover:bg-bg-hover"
            >
              <Plus size={14} />
              Agregar "{search.trim()}"
            </button>
          )}
          {!showCreateOption && filtered.length === 0 && (
            <p className="px-3 py-1.5 text-sm text-text-muted">Sin resultados</p>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-status-rejected">{error}</p>}
    </div>
  )
}
