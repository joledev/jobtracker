import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { contacts, offerContacts, offers } from '../db/schema'
import {
	createContactSchema,
	linkOfferContactSchema,
	listContactsQuerySchema,
	updateContactSchema,
	uuidParam,
} from './schemas'

export const contactsRoute = new Hono()

contactsRoute.get('/', async (c) => {
	const queryResult = listContactsQuerySchema.safeParse(c.req.query())
	if (!queryResult.success) {
		return c.json({ error: 'Validation failed', issues: queryResult.error.flatten() }, 400)
	}
	const { search, limit, offset } = queryResult.data

	const rows = await db
		.select({
			id: contacts.id,
			name: contacts.name,
			email: contacts.email,
			linkedinUrl: contacts.linkedinUrl,
			company: contacts.company,
			role: contacts.role,
			createdAt: contacts.createdAt,
			updatedAt: contacts.updatedAt,
			offerCount:
				sql<number>`(select count(*) from offer_contacts where contact_id = ${contacts.id})`.mapWith(
					Number,
				),
		})
		.from(contacts)
		.where(
			search
				? or(ilike(contacts.name, `%${search}%`), ilike(contacts.company, `%${search}%`))
				: undefined,
		)
		.limit(limit)
		.offset(offset)

	return c.json(rows)
})

contactsRoute.post('/', async (c) => {
	const body = await c.req.json()
	const result = createContactSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const [contact] = await db.insert(contacts).values(result.data).returning()
	return c.json(contact, 201)
})

contactsRoute.put('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const body = await c.req.json()
	const result = updateContactSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const [updated] = await db
		.update(contacts)
		.set({ ...result.data, updatedAt: new Date() })
		.where(eq(contacts.id, paramResult.data.id))
		.returning()
	if (!updated) {
		return c.json({ error: 'Contact not found' }, 404)
	}
	return c.json(updated)
})

// Offer-scoped contact routes
export const offerContactsRoute = new Hono()

offerContactsRoute.post('/:id/contacts', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const body = await c.req.json()
	const result = linkOfferContactSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const { id } = paramResult.data
	const { contactId } = result.data

	const [offerExists] = await db
		.select({ id: offers.id })
		.from(offers)
		.where(and(eq(offers.id, id), isNull(offers.deletedAt)))
		.limit(1)
	if (!offerExists) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const [existing] = await db
		.select({ offerId: offerContacts.offerId })
		.from(offerContacts)
		.where(and(eq(offerContacts.offerId, id), eq(offerContacts.contactId, contactId)))
		.limit(1)
	if (existing) {
		return c.json({ error: 'Contact already linked to this offer' }, 409)
	}

	await db.insert(offerContacts).values({ offerId: id, contactId })
	return c.json({ success: true }, 201)
})

offerContactsRoute.delete('/:id/contacts/:contactId', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const contactParamResult = uuidParam.safeParse({ id: c.req.param('contactId') })
	if (!contactParamResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}

	const [deleted] = await db
		.delete(offerContacts)
		.where(
			and(
				eq(offerContacts.offerId, paramResult.data.id),
				eq(offerContacts.contactId, contactParamResult.data.id),
			),
		)
		.returning()
	if (!deleted) {
		return c.json({ error: 'Link not found' }, 404)
	}
	return c.json({ success: true })
})
