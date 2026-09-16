import { and, count, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { offerStatusLog, offers, pipelineStages } from '../db/schema'
import { timelineQuerySchema } from './schemas'

export const timelineRoute = new Hono()

timelineRoute.get('/', async (c) => {
	const queryResult = timelineQuerySchema.safeParse(c.req.query())
	if (!queryResult.success) {
		return c.json({ error: 'Validation failed', issues: queryResult.error.flatten() }, 400)
	}
	const { workspace_id, stage_id, from_date, to_date, limit, offset } = queryResult.data

	// Query 1: offer_created events
	const createdEvents = await db
		.select({
			type: sql<string>`'offer_created'`,
			timestamp: offers.appliedAt,
			offerId: offers.id,
			company: offers.company,
			position: offers.position,
			stageName: pipelineStages.name,
			stageColor: pipelineStages.color,
		})
		.from(offers)
		.leftJoin(pipelineStages, eq(offers.currentStageId, pipelineStages.id))
		.where(
			and(
				isNull(offers.deletedAt),
				workspace_id ? eq(offers.workspaceId, workspace_id) : undefined,
				stage_id ? eq(offers.currentStageId, stage_id) : undefined,
				from_date ? gte(offers.appliedAt, new Date(from_date)) : undefined,
				to_date ? lte(offers.appliedAt, new Date(to_date)) : undefined,
			),
		)

	// Query 2: status_changed events
	const statusEvents = await db
		.select({
			type: sql<string>`'status_changed'`,
			timestamp: offerStatusLog.changedAt,
			offerId: offers.id,
			company: offers.company,
			position: offers.position,
			stageName: pipelineStages.name,
			stageColor: pipelineStages.color,
			note: offerStatusLog.note,
		})
		.from(offerStatusLog)
		.innerJoin(offers, eq(offerStatusLog.offerId, offers.id))
		.leftJoin(pipelineStages, eq(offerStatusLog.toStageId, pipelineStages.id))
		.where(
			and(
				isNull(offers.deletedAt),
				workspace_id ? eq(offers.workspaceId, workspace_id) : undefined,
				from_date ? gte(offerStatusLog.changedAt, new Date(from_date)) : undefined,
				to_date ? lte(offerStatusLog.changedAt, new Date(to_date)) : undefined,
			),
		)

	// Merge and sort by timestamp DESC, then paginate
	const allEvents = [...createdEvents, ...statusEvents].sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	)
	const events = allEvents.slice(offset, offset + limit)

	// Stats: total offers
	const [totalResult] = await db
		.select({ total: count() })
		.from(offers)
		.where(
			and(
				isNull(offers.deletedAt),
				workspace_id ? eq(offers.workspaceId, workspace_id) : undefined,
			),
		)

	// Stats: by stage
	const byStage = await db
		.select({
			stageName: pipelineStages.name,
			count: count(),
		})
		.from(offers)
		.innerJoin(pipelineStages, eq(offers.currentStageId, pipelineStages.id))
		.where(
			and(
				isNull(offers.deletedAt),
				workspace_id ? eq(offers.workspaceId, workspace_id) : undefined,
			),
		)
		.groupBy(pipelineStages.name)

	return c.json({
		events,
		stats: {
			// Un agregado sin GROUP BY siempre trae una fila; sin ella el conteo es cero.
			total_offers: totalResult?.total ?? 0,
			by_stage: byStage,
		},
	})
})
