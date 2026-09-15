import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
	AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'
import { TopBar } from '@/components/layout/TopBar'
import { useApi } from '@/lib/api'
import { usePipelineStore } from '@/stores/pipeline'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TabNav } from '@/components/ui/TabNav'
import { Circle, ArrowRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { TimelineEvent, TimelineStats, TimelineFilters } from '@/types/api'
import {
	buildChartData, buildCumulativeData, buildStageDistribution,
	groupByPeriod, filterByEventType, getPresetDateRange, computeEnhancedStats,
	type Period, type EventTypeFilter, type DatePreset,
} from '@/lib/timeline-helpers'

const TOOLTIP_STYLE = {
	contentStyle: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 12 },
	labelStyle: { color: '#888888' },
	itemStyle: { color: '#f5f5f5' },
}

const AXIS_TICK = { fontSize: 11, fill: '#555555' }

const PERIOD_TABS = [
	{ key: 'day', label: 'Dia' },
	{ key: 'week', label: 'Semana' },
	{ key: 'month', label: 'Mes' },
]

const PERIOD_CHART_TITLES: Record<Period, string> = {
	day: 'Aplicaciones por dia',
	week: 'Aplicaciones por semana',
	month: 'Aplicaciones por mes',
}

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
	{ key: '7d', label: '7 dias' },
	{ key: '30d', label: '30 dias' },
	{ key: '3m', label: '3 meses' },
	{ key: '1y', label: '1 ano' },
	{ key: 'all', label: 'Todo' },
]

const EVENT_TYPE_OPTIONS = [
	{ value: 'all', label: 'Todos los eventos' },
	{ value: 'offer_created', label: 'Ofertas creadas' },
	{ value: 'status_changed', label: 'Cambios de etapa' },
]

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

	const [period, setPeriod] = useState<Period>('week')
	const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all')
	const [datePreset, setDatePreset] = useState<DatePreset | null>(null)

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

	const applyPreset = (preset: DatePreset) => {
		const { from, to } = getPresetDateRange(preset)
		setFilters((prev) => ({ ...prev, from_date: from, to_date: to }))
		setDatePreset(preset)
	}

	const handleDateInput = (key: 'from_date' | 'to_date', value: string | undefined) => {
		setDatePreset(null)
		updateFilter(key, value)
	}

	const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }))
	const workspaceOptions = workspaces.map((w) => ({ value: w.id, label: w.name }))

	// Derived data
	const filteredEvents = useMemo(() => filterByEventType(events, eventTypeFilter), [events, eventTypeFilter])

	const totalOffers = stats?.total_offers ?? 0
	const inProcess = stats?.by_stage
		?.filter((s) => {
			const stage = stages.find((st) => st.name === s.stageName)
			return stage && !stage.isTerminal
		})
		.reduce((sum, s) => sum + s.count, 0) ?? 0

	const thisMonth = filteredEvents.filter((e) => {
		if (e.type !== 'offer_created') return false
		const d = new Date(e.timestamp)
		const now = new Date()
		return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
	}).length

	const createdEvents = filteredEvents.filter((e) => e.type === 'offer_created')
	const offerIdsWithChange = new Set(filteredEvents.filter((e) => e.type === 'status_changed').map((e) => e.offerId))
	const responseRate = createdEvents.length > 0
		? Math.round((offerIdsWithChange.size / createdEvents.length) * 100)
		: 0

	const enhanced = useMemo(() => computeEnhancedStats(filteredEvents), [filteredEvents])
	const chartData = useMemo(() => buildChartData(filteredEvents, period), [filteredEvents, period])
	const cumulativeData = useMemo(() => buildCumulativeData(filteredEvents, period), [filteredEvents, period])
	const stageData = useMemo(
		() => (stats?.by_stage ? buildStageDistribution(stats.by_stage, stages) : []),
		[stats, stages],
	)
	const grouped = useMemo(() => groupByPeriod(filteredEvents, period), [filteredEvents, period])

	return (
		<div className="flex h-full flex-col">
			<TopBar title="Timeline" />

			{/* Filters row 1 */}
			<div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
				<div className="w-36">
					<Input
						label="Desde"
						type="date"
						value={filters.from_date?.split('T')[0] || ''}
						onChange={(e) => handleDateInput('from_date', e.target.value ? e.target.value + 'T00:00:00' : undefined)}
					/>
				</div>
				<div className="w-36">
					<Input
						label="Hasta"
						type="date"
						value={filters.to_date?.split('T')[0] || ''}
						onChange={(e) => handleDateInput('to_date', e.target.value ? e.target.value + 'T23:59:59' : undefined)}
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
				<div className="w-44">
					<Select
						label="Tipo de evento"
						options={EVENT_TYPE_OPTIONS}
						value={eventTypeFilter}
						onChange={(e) => setEventTypeFilter(e.target.value as EventTypeFilter)}
					/>
				</div>
			</div>

			{/* Filters row 2: date presets */}
			<div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
				<span className="mr-1 text-xs text-text-muted">Periodo:</span>
				{DATE_PRESETS.map((p) => (
					<Button
						key={p.key}
						variant={datePreset === p.key ? 'secondary' : 'ghost'}
						size="sm"
						onClick={() => applyPreset(p.key)}
					>
						{p.label}
					</Button>
				))}
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
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
						<StatCard value={totalOffers} label="Total ofertas activas" />
						<StatCard value={inProcess} label="En proceso" />
						<StatCard value={thisMonth} label="Ofertas este mes" />
						<StatCard value={`${responseRate}%`} label="Tasa de respuesta" />
						<StatCard
							value={enhanced.avgDaysToResponse !== null ? `${enhanced.avgDaysToResponse}d` : '--'}
							label="Dias promedio a respuesta"
						/>
						<StatCard value={enhanced.mostActiveDay ?? '--'} label="Dia mas activo" />
					</div>

					{/* Period selector */}
					<TabNav tabs={PERIOD_TABS} activeKey={period} onChange={(k) => setPeriod(k as Period)} />

					{/* Charts: bar + area */}
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<div className="rounded-md bg-bg-card p-4">
							<p className="mb-3 text-xs font-medium text-text-secondary">{PERIOD_CHART_TITLES[period]}</p>
							<ResponsiveContainer width="100%" height={200}>
								<BarChart data={chartData}>
									<XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
									<YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
									<Tooltip {...TOOLTIP_STYLE} />
									<Bar dataKey="count" fill="#4a7c59" radius={[4, 4, 0, 0]} name="Aplicaciones" />
								</BarChart>
							</ResponsiveContainer>
						</div>

						<div className="rounded-md bg-bg-card p-4">
							<p className="mb-3 text-xs font-medium text-text-secondary">Aplicaciones acumuladas</p>
							<ResponsiveContainer width="100%" height={200}>
								<AreaChart data={cumulativeData}>
									<defs>
										<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="#4a7c59" stopOpacity={0.3} />
											<stop offset="100%" stopColor="#4a7c59" stopOpacity={0} />
										</linearGradient>
									</defs>
									<XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
									<YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
									<Tooltip {...TOOLTIP_STYLE} />
									<Area
										type="monotone"
										dataKey="total"
										stroke="#4a7c59"
										fill="url(#areaGrad)"
										strokeWidth={2}
										name="Total acumulado"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>

					{/* Donut chart: stage distribution */}
					{stageData.length > 0 && (
						<div className="rounded-md bg-bg-card p-4">
							<p className="mb-3 text-xs font-medium text-text-secondary">Distribucion por etapa</p>
							<div className="flex items-center gap-6">
								<ResponsiveContainer width={200} height={200}>
									<PieChart>
										<Pie
											data={stageData}
											dataKey="value"
											nameKey="name"
											cx="50%"
											cy="50%"
											innerRadius={55}
											outerRadius={85}
											paddingAngle={2}
										>
											{stageData.map((entry) => (
												<Cell key={entry.name} fill={entry.fill} />
											))}
										</Pie>
										<Tooltip {...TOOLTIP_STYLE} />
									</PieChart>
								</ResponsiveContainer>
								<div className="flex flex-col gap-2">
									{stageData.map((s) => (
										<div key={s.name} className="flex items-center gap-2 text-sm">
											<span
												className="inline-block h-3 w-3 rounded-sm"
												style={{ backgroundColor: s.fill }}
											/>
											<span className="text-text-secondary">{s.name}</span>
											<span className="text-text-muted">({s.value})</span>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Events grouped by period */}
					<div className="space-y-6">
						{grouped.map((group) => (
							<div key={group.label}>
								<h3 className="mb-3 text-xs font-medium uppercase text-text-muted">{group.label}</h3>
								<div className="space-y-2">
									{group.events.map((ev, i) => (
										<div key={`${ev.offerId}-${ev.timestamp}-${i}`} className="flex items-center gap-3 rounded-md bg-bg-card px-3 py-2.5">
											<span className="text-sm text-text-muted">
												{ev.type === 'offer_created' ? <Circle size={12} /> : <ArrowRight size={12} />}
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
