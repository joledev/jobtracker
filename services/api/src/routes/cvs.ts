import { and, desc, eq, ilike, isNull, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { cvSnapshots, offers } from '../db/schema'
import { escapeLike } from '../utils'
import {
	createCvSnapshotSchema,
	listCvsQuerySchema,
	updateCvSnapshotSchema,
	uuidParam,
} from './schemas'

export const cvsRoute = new Hono()

cvsRoute.get('/', async (c) => {
	const query = listCvsQuerySchema.safeParse(c.req.query())
	if (!query.success) {
		return c.json({ error: 'Invalid query', issues: query.error.flatten() }, 400)
	}
	const { type, search } = query.data

	const conditions = [isNull(cvSnapshots.deletedAt)]
	if (type) conditions.push(eq(cvSnapshots.type, type))
	if (search) conditions.push(ilike(cvSnapshots.label, `%${escapeLike(search)}%`))

	const rows = await db
		.select({
			id: cvSnapshots.id,
			label: cvSnapshots.label,
			type: cvSnapshots.type,
			notes: cvSnapshots.notes,
			createdAt: cvSnapshots.createdAt,
			updatedAt: cvSnapshots.updatedAt,
			offerCount:
				sql<number>`(select count(*) from offers where cv_snapshot_id = ${cvSnapshots.id} and deleted_at is null)`.mapWith(
					Number,
				),
		})
		.from(cvSnapshots)
		.where(and(...conditions))
		.orderBy(desc(cvSnapshots.updatedAt))

	return c.json(rows)
})

cvsRoute.post('/', async (c) => {
	const body = await c.req.json()
	const result = createCvSnapshotSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const [cv] = await db.insert(cvSnapshots).values(result.data).returning()

	const linkedOffers = await db
		.select({
			id: offers.id,
			company: offers.company,
			position: offers.position,
			appliedAt: offers.appliedAt,
		})
		.from(offers)
		.where(and(eq(offers.cvSnapshotId, cv.id), isNull(offers.deletedAt)))

	return c.json({ ...cv, offers: linkedOffers }, 201)
})

cvsRoute.get('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const [cv] = await db
		.select()
		.from(cvSnapshots)
		.where(and(eq(cvSnapshots.id, id), isNull(cvSnapshots.deletedAt)))
		.limit(1)
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

cvsRoute.put('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const body = await c.req.json()
	const result = updateCvSnapshotSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}

	const [updated] = await db
		.update(cvSnapshots)
		.set({ ...result.data, updatedAt: new Date() })
		.where(and(eq(cvSnapshots.id, id), isNull(cvSnapshots.deletedAt)))
		.returning()
	if (!updated) {
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

	return c.json({ ...updated, offers: linkedOffers })
})

cvsRoute.delete('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const [deleted] = await db
		.update(cvSnapshots)
		.set({ deletedAt: new Date() })
		.where(and(eq(cvSnapshots.id, id), isNull(cvSnapshots.deletedAt)))
		.returning({ id: cvSnapshots.id })
	if (!deleted) {
		return c.json({ error: 'CV snapshot not found' }, 404)
	}

	return c.json({ success: true })
})
