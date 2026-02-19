import type { ReactNode } from 'react'

interface TopBarProps {
  title: string
  action?: ReactNode
}

export const TopBar = ({ title, action }: TopBarProps) => {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-bg-secondary px-6">
      <h2 className="text-sm font-medium text-text-primary">{title}</h2>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </header>
  )
}
