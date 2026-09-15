import { useCvsStore } from '@/stores/cvs'

const tabs = [
  { value: null, label: 'Todos' },
  { value: 'cv' as const, label: 'CVs' },
  { value: 'cover_letter' as const, label: 'Cartas' },
]

export const CvTypeFilter = () => {
  const filterType = useCvsStore((s) => s.filterType)
  const setFilterType = useCvsStore((s) => s.setFilterType)

  return (
    <div className="flex gap-1 border-b border-border px-4 py-2">
      {tabs.map((tab) => (
        <button
          key={tab.label}
          onClick={() => setFilterType(tab.value)}
          className={`rounded-md px-3 py-1 text-xs transition-colors ${
            filterType === tab.value
              ? 'bg-bg-hover text-text-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
