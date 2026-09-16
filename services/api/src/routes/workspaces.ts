import { and, asc, count, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db'
import { offers, workspaces } from '../db/schema'
import { createWorkspaceSchema, updateWorkspaceSchema, uuidParam } from './schemas'

export const workspacesRoute = new Hono()

workspacesRoute.get('/', async (c) => {
	const result = await db
		.select()
		.from(workspaces)
		.where(isNull(workspaces.deletedAt))
		.orderBy(asc(workspaces.sortOrder))
	return c.json(result)
})

workspacesRoute.post('/', async (c) => {
	const body = await c.req.json()
	const result = createWorkspaceSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const [workspace] = await db.insert(workspaces).values(result.data).returning()
	return c.json(workspace, 201)
})

workspacesRoute.put('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const body = await c.req.json()
	const result = updateWorkspaceSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const [updated] = await db
		.update(workspaces)
		.set({ ...result.data, updatedAt: new Date() })
		.where(and(eq(workspaces.id, paramResult.data.id), isNull(workspaces.deletedAt)))
		.returning()
	if (!updated) {
		return c.json({ error: 'Workspace not found' }, 404)
	}
	return c.json(updated)
})

const deleteQuerySchema = z.object({
	action: z.enum(['delete_offers', 'move_offers']).optional(),
	target_workspace_id: z.string().uuid().optional(),
})

workspacesRoute.delete('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const queryResult = deleteQuerySchema.safeParse(c.req.query())
	if (!queryResult.success) {
		return c.json({ error: 'Invalid query', issues: queryResult.error.flatten() }, 400)
	}
	const { action, target_workspace_id } = queryResult.data

	// Count active offers in this workspace
	const [offerCount] = await db
		.select({ total: count() })
		.from(offers)
		.where(and(eq(offers.workspaceId, id), isNull(offers.deletedAt)))

	// Un agregado sin GROUP BY siempre trae una fila; sin ella el conteo es cero.
	const total = Number(offerCount?.total ?? 0)

	if (total > 0 && !action) {
		return c.json(
			{
				error: 'Workspace has active offers',
				offerCount: total,
				actions: ['delete_offers', 'move_offers'],
			},
			409,
		)
	}

	if (action === 'move_offers') {
		if (!target_workspace_id) {
			return c.json({ error: 'target_workspace_id is required when moving offers' }, 400)
		}
		// Verify target exists
		const [target] = await db
			.select({ id: workspaces.id })
			.from(workspaces)
			.where(and(eq(workspaces.id, target_workspace_id), isNull(workspaces.deletedAt)))
			.limit(1)
		if (!target) {
			return c.json({ error: 'Target workspace not found' }, 404)
		}
		await db
			.update(offers)
			.set({ workspaceId: target_workspace_id, updatedAt: new Date() })
			.where(and(eq(offers.workspaceId, id), isNull(offers.deletedAt)))
	}

	if (action === 'delete_offers') {
		await db
			.update(offers)
			.set({ deletedAt: new Date() })
			.where(and(eq(offers.workspaceId, id), isNull(offers.deletedAt)))
	}

	const [deleted] = await db
		.update(workspaces)
		.set({ deletedAt: new Date() })
		.where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt)))
		.returning()
	if (!deleted) {
		return c.json({ error: 'Workspace not found' }, 404)
	}
	return c.json({ success: true, offersAffected: total })
})
