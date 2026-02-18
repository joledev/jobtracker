import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TopBar } from '@/components/layout/TopBar'
import { useApi } from '@/lib/api'
import { usePipelineStore } from '@/stores/pipeline'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { TimelineEvent, TimelineStats, TimelineFilters } from '@/types/api'

const relativeTime = (dateStr: string): string => {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 dia'
  if (days < 30) return `hace ${days} dias`
  const months = Math.floor(days / 30)
  return months === 1 ? 'hace 1 mes' : `hace ${months} meses`
}

const formatAbsDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

const groupByMonth = (events: TimelineEvent[]): { label: string; events: TimelineEvent[] }[] => {
  const groups: Record<string, TimelineEvent[]> = {}
  for (const ev of events) {
    const d = new Date(ev.timestamp)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push({ ...ev, _label: label } as TimelineEvent & { _label: string })
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, evts]) => ({
      label: (evts[0] as TimelineEvent & { _label: string })._label,
      events: evts,
    }))
}

const buildWeeklyChart = (events: TimelineEvent[]): { week: string; count: number }[] => {
  const now = new Date()
  const weeks: { week: string; count: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const count = events.filter((e) => {
      if (e.type !== 'offer_created') return false
      const d = new Date(e.timestamp)
      return d >= start && d < end
    }).length
    const label = `${start.getDate()}/${start.getMonth() + 1}`
    weeks.push({ week: label, count })
  }
  return weeks
}

const StatCard = ({ value, label }: { value: string | number; label: string }) => (
  <div className="rounded-md bg-bg-card p-4">
    <p className="text-2xl font-semibold text-text-primary">{value}</p>
    <p className="mt-1 text-xs text-text-muted">{label}</p>
  </div>
)

export const TimelinePage = () => {
  const navigate = useNavigate()
  const api = useApi()
  const stages = usePipelineStore((s) => s.stages)
  const workspaces = usePipelineStore((s) => s.workspaces)

  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [stats, setStats] = useState<TimelineStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<TimelineFilters>({ limit: 500 })

  const loadTimeline = async () => {
    setIsLoading(true)
    try {
      const data = await api.timeline.list(filters)
      setEvents(data.events)
      setStats(data.stats)
    } catch {
      setEvents([])
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTimeline()
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilter = (key: keyof TimelineFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }))
  const workspaceOptions = workspaces.map((w) => ({ value: w.id, label: w.name }))

  // Stats calculations
  const totalOffers = stats?.total_offers ?? 0
  const inProcess = stats?.by_stage
    ?.filter((s) => {
      const stage = stages.find((st) => st.name === s.stageName)
      return stage && !stage.isTerminal
    })
    .reduce((sum, s) => sum + s.count, 0) ?? 0

  const thisMonth = events.filter((e) => {
    if (e.type !== 'offer_created') return false
    const d = new Date(e.timestamp)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const createdEvents = events.filter((e) => e.type === 'offer_created')
  const movedBeyondApplied = events.filter((e) => e.type === 'status_changed')
  const offerIdsWithChange = new Set(movedBeyondApplied.map((e) => e.offerId))
  const responseRate = createdEvents.length > 0
    ? Math.round((offerIdsWithChange.size / createdEvents.length) * 100)
    : 0

  const weeklyData = useMemo(() => buildWeeklyChart(events), [events])
  const grouped = useMemo(() => groupByMonth(events), [events])

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Timeline" />

      {/* Filters */}
      <div className="flex items-end gap-3 border-b border-border px-4 py-3">
        <div className="w-36">
          <Input
            label="Desde"
            type="date"
            value={filters.from_date?.split('T')[0] || ''}
            onChange={(e) => updateFilter('from_date', e.target.value ? e.target.value + 'T00:00:00' : undefined)}
          />
        </div>
        <div className="w-36">
          <Input
            label="Hasta"
            type="date"
            value={filters.to_date?.split('T')[0] || ''}
            onChange={(e) => updateFilter('to_date', e.target.value ? e.target.value + 'T23:59:59' : undefined)}
          />
        </div>
        <div className="w-40">
          <Select
            label="Workspace"
            options={workspaceOptions}
            placeholder="Todos"
            value={filters.workspace_id || ''}
            onChange={(e) => updateFilter('workspace_id', e.target.value || undefined)}
          />
        </div>
        <div className="w-40">
          <Select
            label="Etapa"
            options={stageOptions}
            placeholder="Todas"
            value={filters.stage_id || ''}
            onChange={(e) => updateFilter('stage_id', e.target.value || undefined)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex-1">
          <EmptyState title="No hay actividad todavia" description="Crea ofertas para ver el timeline" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard value={totalOffers} label="Total ofertas activas" />
            <StatCard value={inProcess} label="En proceso" />
            <StatCard value={thisMonth} label="Ofertas este mes" />
            <StatCard value={`${responseRate}%`} label="Tasa de respuesta" />
          </div>

          {/* Chart */}
          <div className="rounded-md bg-bg-card p-4">
            <p className="mb-3 text-xs font-medium text-text-secondary">Aplicaciones por semana</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#555555' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#555555' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: '#888888' }}
                  itemStyle={{ color: '#f5f5f5' }}
                />
                <Bar dataKey="count" fill="#4a7c59" radius={[4, 4, 0, 0]} name="Aplicaciones" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Events grouped by month */}
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.label}>
                <h3 className="mb-3 text-xs font-medium uppercase text-text-muted">{group.label}</h3>
                <div className="space-y-2">
                  {group.events.map((ev, i) => (
                    <div key={`${ev.offerId}-${ev.timestamp}-${i}`} className="flex items-center gap-3 rounded-md bg-bg-card px-3 py-2.5">
                      <span className="text-sm">
                        {ev.type === 'offer_created' ? '●' : '→'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => navigate(`/offers/${ev.offerId}`)}
                          className="text-sm font-medium text-text-primary hover:underline"
                        >
                          {ev.company} — {ev.position}
                        </button>
                        <p className="text-xs text-text-muted">
                          {ev.type === 'offer_created' ? 'Oferta creada' : 'Cambio de etapa'}
                          {ev.note && ` — ${ev.note}`}
                        </p>
                      </div>
                      {ev.stageName && ev.stageColor && (
                        <StatusBadge stageName={ev.stageName} stageColor={ev.stageColor} size="sm" />
                      )}
                      <span className="flex-shrink-0 text-xs text-text-muted" title={formatAbsDate(ev.timestamp)}>
                        {relativeTime(ev.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
