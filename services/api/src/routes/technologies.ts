import { and, asc, eq, ilike, isNull, ne } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { offers, offerTechnologies, technologies } from '../db/schema'
import {
	createTechnologySchema,
	linkOfferTechnologySchema,
	listTechnologiesQuerySchema,
	updateTechnologySchema,
	uuidParam,
} from './schemas'

export const technologiesRoute = new Hono()

technologiesRoute.get('/', async (c) => {
	const queryResult = listTechnologiesQuerySchema.safeParse(c.req.query())
	if (!queryResult.success) {
		return c.json({ error: 'Validation failed', issues: queryResult.error.flatten() }, 400)
	}
	const { category, search } = queryResult.data

	const rows = await db
		.select()
		.from(technologies)
		.where(
			and(
				category ? eq(technologies.category, category) : undefined,
				search ? ilike(technologies.name, `%${search}%`) : undefined,
			),
		)
		.orderBy(asc(technologies.name))

	return c.json(rows)
})

technologiesRoute.post('/', async (c) => {
	const body = await c.req.json()
	const result = createTechnologySchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}

	const [existing] = await db
		.select({ id: technologies.id })
		.from(technologies)
		.where(eq(technologies.name, result.data.name))
		.limit(1)
	if (existing) {
		return c.json({ error: 'Technology with this name already exists' }, 409)
	}

	const [tech] = await db.insert(technologies).values(result.data).returning()
	return c.json(tech, 201)
})

technologiesRoute.put('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const body = await c.req.json()
	const result = updateTechnologySchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}

	if (result.data.name) {
		const [dup] = await db
			.select({ id: technologies.id })
			.from(technologies)
			.where(and(eq(technologies.name, result.data.name), ne(technologies.id, id)))
			.limit(1)
		if (dup) {
			return c.json({ error: 'Technology with this name already exists' }, 409)
		}
	}

	const [updated] = await db
		.update(technologies)
		.set(result.data)
		.where(eq(technologies.id, id))
		.returning()
	if (!updated) {
		return c.json({ error: 'Technology not found' }, 404)
	}

	return c.json(updated)
})

technologiesRoute.delete('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const [deleted] = await db
		.delete(technologies)
		.where(eq(technologies.id, id))
		.returning({ id: technologies.id })
	if (!deleted) {
		return c.json({ error: 'Technology not found' }, 404)
	}

	return c.json({ success: true })
})

// Offer-scoped technology routes
export const offerTechnologiesRoute = new Hono()

offerTechnologiesRoute.post('/:id/technologies', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const body = await c.req.json()
	const result = linkOfferTechnologySchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const { id } = paramResult.data
	const { technologyId, context } = result.data

	const [offerExists] = await db
		.select({ id: offers.id })
		.from(offers)
		.where(and(eq(offers.id, id), isNull(offers.deletedAt)))
		.limit(1)
	if (!offerExists) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const [existing] = await db
		.select({ offerId: offerTechnologies.offerId })
		.from(offerTechnologies)
		.where(and(eq(offerTechnologies.offerId, id), eq(offerTechnologies.technologyId, technologyId)))
		.limit(1)
	if (existing) {
		return c.json({ error: 'Technology already linked to this offer' }, 409)
	}

	await db.insert(offerTechnologies).values({ offerId: id, technologyId, context })
	return c.json({ success: true }, 201)
})

offerTechnologiesRoute.delete('/:id/technologies/:technologyId', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const techParamResult = uuidParam.safeParse({ id: c.req.param('technologyId') })
	if (!techParamResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}

	const [deleted] = await db
		.delete(offerTechnologies)
		.where(
			and(
				eq(offerTechnologies.offerId, paramResult.data.id),
				eq(offerTechnologies.technologyId, techParamResult.data.id),
			),
		)
		.returning()
	if (!deleted) {
		return c.json({ error: 'Link not found' }, 404)
	}
	return c.json({ success: true })
})
