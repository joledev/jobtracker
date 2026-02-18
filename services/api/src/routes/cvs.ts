import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { cvSnapshots, offers } from '../db/schema'
import { createCvSnapshotSchema, uuidParam } from './schemas'

export const cvsRoute = new Hono()

cvsRoute.get('/', async (c) => {
	const rows = await db
		.select({
			id: cvSnapshots.id,
			label: cvSnapshots.label,
			notes: cvSnapshots.notes,
			createdAt: cvSnapshots.createdAt,
			offerCount:
				sql<number>`(select count(*) from offers where cv_snapshot_id = ${cvSnapshots.id} and deleted_at is null)`.mapWith(
					Number,
				),
		})
		.from(cvSnapshots)
		.orderBy(desc(cvSnapshots.createdAt))

	return c.json(rows)
})

cvsRoute.post('/', async (c) => {
	const body = await c.req.json()
	const result = createCvSnapshotSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const [cv] = await db.insert(cvSnapshots).values(result.data).returning()
	return c.json(cv, 201)
})

cvsRoute.get('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const [cv] = await db.select().from(cvSnapshots).where(eq(cvSnapshots.id, id)).limit(1)
	if (!cv) {
		return c.json({ error: 'CV snapshot not found' }, 404)
	}

	const linkedOffers = await db
		.select({
			id: offers.id,
			company: offers.company,
			position: offers.position,
			appliedAt: offers.appliedAt,
		})
		.from(offers)
		.where(and(eq(offers.cvSnapshotId, id), isNull(offers.deletedAt)))

	return c.json({ ...cv, offers: linkedOffers })
})
