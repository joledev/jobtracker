interface Tab {
  key: string
  label: string
}

interface TabNavProps {
  tabs: Tab[]
  activeKey: string
  onChange: (key: string) => void
}

export const TabNav = ({ tabs, activeKey, onChange }: TabNavProps) => {
  return (
    <div className="flex gap-1 border-b border-border px-4">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3 py-2 text-sm transition-colors ${
            activeKey === tab.key
              ? 'border-b-2 border-text-primary text-text-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
