import { and, count, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { apiKeys } from '../db/schema'
import { hashApiKey } from '../middleware/auth'
import { createApiKeySchema, uuidParam } from './schemas'

export const apikeysRoute = new Hono()

apikeysRoute.get('/', async (c) => {
	const rows = await db
		.select({
			id: apiKeys.id,
			label: apiKeys.label,
			keyPrefix: apiKeys.keyPrefix,
			lastUsedAt: apiKeys.lastUsedAt,
			expiresAt: apiKeys.expiresAt,
			createdAt: apiKeys.createdAt,
		})
		.from(apiKeys)
		.where(isNull(apiKeys.revokedAt))

	return c.json(rows)
})

apikeysRoute.post('/', async (c) => {
	const body = await c.req.json()
	const result = createApiKeySchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const { label, expiresAt } = result.data

	const rawBytes = crypto.getRandomValues(new Uint8Array(32))
	const rawKey = Array.from(rawBytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
	const keyHash = await hashApiKey(rawKey)
	const keyPrefix = rawKey.slice(0, 8)

	const [apiKey] = await db
		.insert(apiKeys)
		.values({
			label,
			keyHash,
			keyPrefix,
			...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
		})
		.returning({
			id: apiKeys.id,
			label: apiKeys.label,
			keyPrefix: apiKeys.keyPrefix,
		})

	return c.json({ ...apiKey, rawKey }, 201)
})

apikeysRoute.delete('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const [activeCount] = await db
		.select({ total: count() })
		.from(apiKeys)
		.where(isNull(apiKeys.revokedAt))
	if (Number(activeCount.total) <= 1) {
		return c.json({ error: 'Cannot revoke the last active API key' }, 400)
	}

	const [revoked] = await db
		.update(apiKeys)
		.set({ revokedAt: new Date() })
		.where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
		.returning()
	if (!revoked) {
		return c.json({ error: 'API key not found or already revoked' }, 404)
	}
	return c.json({ success: true })
})
