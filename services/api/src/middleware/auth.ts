import { and, eq, isNull } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import { db } from '../db'
import { apiKeys } from '../db/schema'

export const hashApiKey = async (key: string): Promise<string> => {
	const encoder = new TextEncoder()
	const data = encoder.encode(key)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const authMiddleware = createMiddleware(async (c, next) => {
	const apiKey = c.req.header('X-API-Key')
	if (!apiKey) {
		return c.json({ error: 'Missing X-API-Key header' }, 401)
	}

	const keyHash = await hashApiKey(apiKey)
	const [found] = await db
		.select({ id: apiKeys.id, expiresAt: apiKeys.expiresAt })
		.from(apiKeys)
		.where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
		.limit(1)

	if (!found) {
		return c.json({ error: 'Invalid or revoked API key' }, 401)
	}

	if (found.expiresAt && found.expiresAt < new Date()) {
		return c.json({ error: 'API key expired' }, 401)
	}

	// Update last_used_at in the background
	db.update(apiKeys)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKeys.keyHash, keyHash))
		.then(() => {})
		.catch((err) => console.error('Failed to update lastUsedAt:', err))

	await next()
})
