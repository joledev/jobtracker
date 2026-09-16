import { and, desc, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { communications, contacts, offers } from '../db/schema'
import { createCommunicationSchema, updateCommunicationSchema, uuidParam } from './schemas'

export const communicationsRoute = new Hono()

// Devuelve el id de la oferta si existe y no esta borrada. Las cuatro rutas de
// abajo la necesitan: sin esta comprobacion, una comunicacion podria colgar de
// una oferta eliminada y no aparecer en ningun sitio.
async function ofertaViva(id: string): Promise<boolean> {
	const [fila] = await db
		.select({ id: offers.id })
		.from(offers)
		.where(and(eq(offers.id, id), isNull(offers.deletedAt)))
		.limit(1)
	return Boolean(fila)
}

communicationsRoute.get('/:id/communications', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	if (!(await ofertaViva(id))) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const rows = await db
		.select({
			id: communications.id,
			offerId: communications.offerId,
			contactId: communications.contactId,
			channel: communications.channel,
			direction: communications.direction,
			subject: communications.subject,
			body: communications.body,
			occurredAt: communications.occurredAt,
			createdAt: communications.createdAt,
			contactName: contacts.name,
		})
		.from(communications)
		.leftJoin(contacts, eq(communications.contactId, contacts.id))
		.where(eq(communications.offerId, id))
		.orderBy(desc(communications.occurredAt))

	return c.json(rows)
})

communicationsRoute.post('/:id/communications', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	if (!(await ofertaViva(id))) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const body = await c.req.json()
	const result = createCommunicationSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}

	const { occurredAt, ...rest } = result.data
	const [created] = await db
		.insert(communications)
		.values({ ...rest, offerId: id, occurredAt: new Date(occurredAt) })
		.returning()

	// `returning()` de un insert de una sola fila siempre la devuelve; si no lo
	// hace, el insert no ocurrio y devolver un 201 vacio mentiria.
	if (!created) {
		throw new Error('Insert into communications returned no row')
	}
	return c.json(created, 201)
})

communicationsRoute.put('/:id/communications/:commId', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	const commResult = uuidParam.safeParse({ id: c.req.param('commId') })
	if (!paramResult.success || !commResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data
	const { id: commId } = commResult.data

	const body = await c.req.json()
	const result = updateCommunicationSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}

	const { occurredAt, ...rest } = result.data
	const [updated] = await db
		.update(communications)
		.set({ ...rest, ...(occurredAt ? { occurredAt: new Date(occurredAt) } : {}) })
		// El offerId va en el WHERE a proposito: sin el, un commId de otra oferta
		// se actualizaria desde una URL que dice pertenecer a esta.
		.where(and(eq(communications.id, commId), eq(communications.offerId, id)))
		.returning()

	if (!updated) {
		return c.json({ error: 'Communication not found' }, 404)
	}
	return c.json(updated)
})

communicationsRoute.delete('/:id/communications/:commId', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	const commResult = uuidParam.safeParse({ id: c.req.param('commId') })
	if (!paramResult.success || !commResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data
	const { id: commId } = commResult.data

	const [deleted] = await db
		.delete(communications)
		.where(and(eq(communications.id, commId), eq(communications.offerId, id)))
		.returning({ id: communications.id })

	if (!deleted) {
		return c.json({ error: 'Communication not found' }, 404)
	}
	return c.body(null, 204)
})
