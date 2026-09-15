import { and, desc, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { contacts, offers, phoneCalls } from '../db/schema'
import { createCallSchema, uuidParam } from './schemas'

export const callsRoute = new Hono()

callsRoute.get('/:id/calls', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const [offerExists] = await db
		.select({ id: offers.id })
		.from(offers)
		.where(and(eq(offers.id, id), isNull(offers.deletedAt)))
		.limit(1)
	if (!offerExists) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const rows = await db
		.select({
			id: phoneCalls.id,
			offerId: phoneCalls.offerId,
			phoneNumber: phoneCalls.phoneNumber,
			contactId: phoneCalls.contactId,
			calledAt: phoneCalls.calledAt,
			durationMinutes: phoneCalls.durationMinutes,
			notes: phoneCalls.notes,
			callType: phoneCalls.callType,
			contactName: contacts.name,
		})
		.from(phoneCalls)
		.leftJoin(contacts, eq(phoneCalls.contactId, contacts.id))
		.where(eq(phoneCalls.offerId, id))
		.orderBy(desc(phoneCalls.calledAt))

	return c.json(rows)
})

callsRoute.post('/:id/calls', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const [offerExists] = await db
		.select({ id: offers.id })
		.from(offers)
		.where(and(eq(offers.id, id), isNull(offers.deletedAt)))
		.limit(1)
	if (!offerExists) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const body = await c.req.json()
	const result = createCallSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const { calledAt, ...rest } = result.data
	const [call] = await db
		.insert(phoneCalls)
		.values({
			...rest,
			offerId: id,
			calledAt: new Date(calledAt),
		})
		.returning()
	return c.json(call, 201)
})
