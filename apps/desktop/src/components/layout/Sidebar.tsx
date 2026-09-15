import { NavLink, useNavigate } from 'react-router-dom'
import { Briefcase, Clock, FileText, Settings, type LucideIcon } from 'lucide-react'
import { usePipelineStore } from '@/stores/pipeline'
import { useOffersStore } from '@/stores/offers'

const navItems: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '/', label: 'Offers', icon: Briefcase },
  { path: '/timeline', label: 'Timeline', icon: Clock },
  { path: '/cv', label: 'CV Manager', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export const Sidebar = () => {
  const navigate = useNavigate()
  const workspaces = usePipelineStore((s) => s.workspaces)
  const activeWorkspaceId = useOffersStore((s) => s.activeWorkspaceId)
  const setActiveWorkspace = useOffersStore((s) => s.setActiveWorkspace)

  const handleWorkspaceClick = (id: string | null) => {
    setActiveWorkspace(id)
    navigate('/')
  }

  return (
    <aside className="flex h-screen w-52 flex-col border-r border-border bg-bg-secondary">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold text-text-primary">JobTracker</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <div key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-bg-hover text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>

            {item.path === '/' && workspaces.length > 0 && (
              <div className="ml-6 mt-0.5 space-y-0.5">
                <button
                  onClick={() => handleWorkspaceClick(null)}
                  className={`flex w-full items-center rounded-md px-3 py-1.5 text-xs transition-colors ${
                    activeWorkspaceId === null
                      ? 'border-l-2 border-text-secondary bg-bg-hover text-text-primary'
                      : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary'
                  }`}
                >
                  Todos
                </button>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleWorkspaceClick(ws.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors ${
                      activeWorkspaceId === ws.id
                        ? 'border-l-2 border-text-secondary bg-bg-hover text-text-primary'
                        : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary'
                    }`}
                  >
                    {ws.icon && <span>{ws.icon}</span>}
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
