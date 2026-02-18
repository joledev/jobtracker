import { and, asc, count, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { offers, pipelineStages } from '../db/schema'
import { createPipelineStageSchema, updatePipelineStageSchema, uuidParam } from './schemas'

export const pipelineStagesRoute = new Hono()

pipelineStagesRoute.get('/', async (c) => {
	const stages = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.sortOrder))
	return c.json(stages)
})

pipelineStagesRoute.post('/', async (c) => {
	const body = await c.req.json()
	const result = createPipelineStageSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const [stage] = await db.insert(pipelineStages).values(result.data).returning()
	return c.json(stage, 201)
})

pipelineStagesRoute.put('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const body = await c.req.json()
	const result = updatePipelineStageSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const [updated] = await db
		.update(pipelineStages)
		.set(result.data)
		.where(eq(pipelineStages.id, paramResult.data.id))
		.returning()
	if (!updated) {
		return c.json({ error: 'Pipeline stage not found' }, 404)
	}
	return c.json(updated)
})

pipelineStagesRoute.delete('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const [usage] = await db
		.select({ activeOffers: count() })
		.from(offers)
		.where(and(eq(offers.currentStageId, id), isNull(offers.deletedAt)))

	if (Number(usage.activeOffers) > 0) {
		return c.json(
			{ error: `Cannot delete: ${usage.activeOffers} active offer(s) reference this stage` },
			409,
		)
	}

	const [deleted] = await db.delete(pipelineStages).where(eq(pipelineStages.id, id)).returning()
	if (!deleted) {
		return c.json({ error: 'Pipeline stage not found' }, 404)
	}
	return c.json({ success: true })
})
