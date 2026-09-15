import { and, asc, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { contacts, offers, reminders } from '../db/schema'
import { createReminderSchema, updateReminderSchema, uuidParam } from './schemas'

export const remindersRoute = new Hono()

const checkOffer = async (id: string) => {
	const [offer] = await db
		.select({ id: offers.id })
		.from(offers)
		.where(and(eq(offers.id, id), isNull(offers.deletedAt)))
		.limit(1)
	return offer
}

remindersRoute.get('/:id/reminders', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	if (!(await checkOffer(id))) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const rows = await db
		.select({
			id: reminders.id,
			offerId: reminders.offerId,
			title: reminders.title,
			scheduledAt: reminders.scheduledAt,
			locationType: reminders.locationType,
			videoLink: reminders.videoLink,
			address: reminders.address,
			contactId: reminders.contactId,
			notes: reminders.notes,
			completedAt: reminders.completedAt,
			createdAt: reminders.createdAt,
			updatedAt: reminders.updatedAt,
			contactName: contacts.name,
		})
		.from(reminders)
		.leftJoin(contacts, eq(reminders.contactId, contacts.id))
		.where(and(eq(reminders.offerId, id), isNull(reminders.deletedAt)))
		.orderBy(asc(reminders.scheduledAt))

	return c.json(rows)
})

remindersRoute.post('/:id/reminders', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	if (!(await checkOffer(id))) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const body = await c.req.json()
	const result = createReminderSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}

	const { scheduledAt, ...rest } = result.data
	const [reminder] = await db
		.insert(reminders)
		.values({
			...rest,
			offerId: id,
			scheduledAt: new Date(scheduledAt),
		})
		.returning()
	return c.json(reminder, 201)
})

remindersRoute.put('/:id/reminders/:reminderId', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	const reminderParamResult = uuidParam.safeParse({ id: c.req.param('reminderId') })
	if (!paramResult.success || !reminderParamResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}

	const body = await c.req.json()
	const result = updateReminderSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}

	const updateData: Record<string, unknown> = { updatedAt: new Date() }
	if (result.data.title !== undefined) updateData.title = result.data.title
	if (result.data.scheduledAt !== undefined)
		updateData.scheduledAt = new Date(result.data.scheduledAt)
	if (result.data.locationType !== undefined) updateData.locationType = result.data.locationType
	if (result.data.videoLink !== undefined) updateData.videoLink = result.data.videoLink
	if (result.data.address !== undefined) updateData.address = result.data.address
	if (result.data.contactId !== undefined) updateData.contactId = result.data.contactId
	if (result.data.notes !== undefined) updateData.notes = result.data.notes

	const [updated] = await db
		.update(reminders)
		.set(updateData)
		.where(
			and(
				eq(reminders.id, reminderParamResult.data.id),
				eq(reminders.offerId, paramResult.data.id),
				isNull(reminders.deletedAt),
			),
		)
		.returning()

	if (!updated) {
		return c.json({ error: 'Reminder not found' }, 404)
	}
	return c.json(updated)
})

remindersRoute.patch('/:id/reminders/:reminderId/complete', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	const reminderParamResult = uuidParam.safeParse({ id: c.req.param('reminderId') })
	if (!paramResult.success || !reminderParamResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}

	const [updated] = await db
		.update(reminders)
		.set({ completedAt: new Date(), updatedAt: new Date() })
		.where(
			and(
				eq(reminders.id, reminderParamResult.data.id),
				eq(reminders.offerId, paramResult.data.id),
				isNull(reminders.deletedAt),
			),
		)
		.returning()

	if (!updated) {
		return c.json({ error: 'Reminder not found' }, 404)
	}
	return c.json(updated)
})

remindersRoute.delete('/:id/reminders/:reminderId', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	const reminderParamResult = uuidParam.safeParse({ id: c.req.param('reminderId') })
	if (!paramResult.success || !reminderParamResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}

	const [deleted] = await db
		.update(reminders)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(reminders.id, reminderParamResult.data.id),
				eq(reminders.offerId, paramResult.data.id),
				isNull(reminders.deletedAt),
			),
		)
		.returning()

	if (!deleted) {
		return c.json({ error: 'Reminder not found' }, 404)
	}
	return c.json({ success: true })
})
