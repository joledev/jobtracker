import type { TimelineEvent, TimelineStats, PipelineStage } from '@/types/api'

export type Period = 'day' | 'week' | 'month'
export type EventTypeFilter = 'all' | 'offer_created' | 'status_changed'
export type DatePreset = '7d' | '30d' | '3m' | '1y' | 'all'

const WEEKDAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

const startOfDay = (d: Date): Date => {
	const r = new Date(d)
	r.setHours(0, 0, 0, 0)
	return r
}

const startOfWeek = (d: Date): Date => {
	const r = startOfDay(d)
	const day = r.getDay()
	r.setDate(r.getDate() - ((day + 6) % 7)) // Monday start
	return r
}

const formatDayLabel = (d: Date): string => `${d.getDate()}/${d.getMonth() + 1}`

const formatMonthLabel = (d: Date): string =>
	d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })

interface Bucket {
	start: Date
	end: Date
	label: string
}

const buildBuckets = (period: Period): Bucket[] => {
	const now = new Date()
	const buckets: Bucket[] = []

	if (period === 'day') {
		for (let i = 13; i >= 0; i--) {
			const start = startOfDay(new Date(now))
			start.setDate(start.getDate() - i)
			const end = new Date(start)
			end.setDate(end.getDate() + 1)
			buckets.push({ start, end, label: formatDayLabel(start) })
		}
	} else if (period === 'week') {
		for (let i = 7; i >= 0; i--) {
			const start = startOfWeek(new Date(now))
			start.setDate(start.getDate() - i * 7)
			const end = new Date(start)
			end.setDate(end.getDate() + 7)
			buckets.push({ start, end, label: formatDayLabel(start) })
		}
	} else {
		for (let i = 11; i >= 0; i--) {
			const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
			const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
			buckets.push({ start, end, label: formatMonthLabel(start) })
		}
	}

	return buckets
}

export const buildChartData = (
	events: TimelineEvent[],
	period: Period,
): { label: string; count: number }[] => {
	const buckets = buildBuckets(period)
	const created = events.filter((e) => e.type === 'offer_created')

	return buckets.map((b) => ({
		label: b.label,
		count: created.filter((e) => {
			const d = new Date(e.timestamp)
			return d >= b.start && d < b.end
		}).length,
	}))
}

export const buildCumulativeData = (
	events: TimelineEvent[],
	period: Period,
): { label: string; total: number }[] => {
	const buckets = buildBuckets(period)
	const created = events.filter((e) => e.type === 'offer_created')
	let running = 0

	return buckets.map((b) => {
		const count = created.filter((e) => {
			const d = new Date(e.timestamp)
			return d >= b.start && d < b.end
		}).length
		running += count
		return { label: b.label, total: running }
	})
}

export const buildStageDistribution = (
	byStage: TimelineStats['by_stage'],
	stages: PipelineStage[],
): { name: string; value: number; fill: string }[] =>
	byStage.map((s) => {
		const stage = stages.find((st) => st.name === s.stageName)
		return { name: s.stageName, value: s.count, fill: stage?.color ?? '#555555' }
	})

export const groupByPeriod = (
	events: TimelineEvent[],
	period: Period,
): { label: string; events: TimelineEvent[] }[] => {
	const groups: Record<string, { label: string; events: TimelineEvent[] }> = {}

	for (const ev of events) {
		const d = new Date(ev.timestamp)
		let key: string
		let label: string

		if (period === 'day') {
			key = d.toISOString().slice(0, 10)
			label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
		} else if (period === 'week') {
			const ws = startOfWeek(d)
			const we = new Date(ws)
			we.setDate(we.getDate() + 6)
			key = ws.toISOString().slice(0, 10)
			const fmt = (x: Date) => x.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
			label = `Semana del ${fmt(ws)} - ${fmt(we)} ${we.getFullYear()}`
		} else {
			key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
			label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
		}

		if (!groups[key]) groups[key] = { label, events: [] }
		groups[key].events.push(ev)
	}

	return Object.entries(groups)
		.sort(([a], [b]) => b.localeCompare(a))
		.map(([, g]) => g)
}

export const filterByEventType = (
	events: TimelineEvent[],
	type: EventTypeFilter,
): TimelineEvent[] => (type === 'all' ? events : events.filter((e) => e.type === type))

export const getPresetDateRange = (
	preset: DatePreset,
): { from: string | undefined; to: string | undefined } => {
	if (preset === 'all') return { from: undefined, to: undefined }

	const now = new Date()
	const to = now.toISOString().slice(0, 10) + 'T23:59:59'
	const start = new Date(now)

	if (preset === '7d') start.setDate(start.getDate() - 7)
	else if (preset === '30d') start.setDate(start.getDate() - 30)
	else if (preset === '3m') start.setMonth(start.getMonth() - 3)
	else if (preset === '1y') start.setFullYear(start.getFullYear() - 1)

	const from = start.toISOString().slice(0, 10) + 'T00:00:00'
	return { from, to }
}

export const computeEnhancedStats = (
	events: TimelineEvent[],
): { avgDaysToResponse: number | null; mostActiveDay: string | null } => {
	// Average days from offer_created to first status_changed
	const created = events.filter((e) => e.type === 'offer_created')
	const changed = events.filter((e) => e.type === 'status_changed')

	const deltas: number[] = []
	for (const c of created) {
		const first = changed
			.filter((ch) => ch.offerId === c.offerId)
			.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]
		if (first) {
			const diff = (new Date(first.timestamp).getTime() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60 * 24)
			if (diff >= 0) deltas.push(diff)
		}
	}
	const avgDaysToResponse = deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null

	// Most active weekday
	const dayCounts = [0, 0, 0, 0, 0, 0, 0]
	for (const e of created) {
		dayCounts[new Date(e.timestamp).getDay()]++
	}
	const maxCount = Math.max(...dayCounts)
	const mostActiveDay = maxCount > 0 ? WEEKDAYS_ES[dayCounts.indexOf(maxCount)] : null

	return { avgDaysToResponse, mostActiveDay }
}
