import { and, asc, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { workspaces } from '../db/schema'
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

workspacesRoute.delete('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const [deleted] = await db
		.update(workspaces)
		.set({ deletedAt: new Date() })
		.where(and(eq(workspaces.id, paramResult.data.id), isNull(workspaces.deletedAt)))
		.returning()
	if (!deleted) {
		return c.json({ error: 'Workspace not found' }, 404)
	}
	return c.json({ success: true })
})
