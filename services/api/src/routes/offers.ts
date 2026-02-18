import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import {
	contacts,
	cvSnapshots,
	offerContacts,
	offerStatusLog,
	offers,
	offerTechnologies,
	pipelineStages,
	technologies,
	workspaces,
} from '../db/schema'
import {
	changeOfferStatusSchema,
	createOfferSchema,
	listOffersQuerySchema,
	updateOfferSchema,
	uuidParam,
} from './schemas'

export const offersRoute = new Hono()

offersRoute.get('/', async (c) => {
	const queryResult = listOffersQuerySchema.safeParse(c.req.query())
	if (!queryResult.success) {
		return c.json({ error: 'Validation failed', issues: queryResult.error.flatten() }, 400)
	}
	const { workspace_id, stage_id, search, limit, offset } = queryResult.data

	const rows = await db
		.select({
			id: offers.id,
			company: offers.company,
			position: offers.position,
			level: offers.level,
			type: offers.type,
			modality: offers.modality,
			salaryMin: offers.salaryMin,
			salaryMax: offers.salaryMax,
			salaryCurrency: offers.salaryCurrency,
			salaryPeriod: offers.salaryPeriod,
			currentStageId: offers.currentStageId,
			appliedAt: offers.appliedAt,
			sourceUrl: offers.sourceUrl,
			sourcePlatform: offers.sourcePlatform,
			workspaceId: offers.workspaceId,
			notes: offers.notes,
			createdAt: offers.createdAt,
			updatedAt: offers.updatedAt,
			stageName: pipelineStages.name,
			stageSlug: pipelineStages.slug,
			stageColor: pipelineStages.color,
		})
		.from(offers)
		.leftJoin(pipelineStages, eq(offers.currentStageId, pipelineStages.id))
		.where(
			and(
				isNull(offers.deletedAt),
				workspace_id ? eq(offers.workspaceId, workspace_id) : undefined,
				stage_id ? eq(offers.currentStageId, stage_id) : undefined,
				search
					? or(ilike(offers.company, `%${search}%`), ilike(offers.position, `%${search}%`))
					: undefined,
			),
		)
		.orderBy(desc(offers.appliedAt))
		.limit(limit)
		.offset(offset)

	return c.json(rows)
})

offersRoute.post('/', async (c) => {
	const body = await c.req.json()
	const result = createOfferSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const { appliedAt, ...rest } = result.data
	const [offer] = await db
		.insert(offers)
		.values({
			...rest,
			...(appliedAt ? { appliedAt: new Date(appliedAt) } : {}),
		})
		.returning()
	return c.json(offer, 201)
})

offersRoute.get('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const { id } = paramResult.data

	const [row] = await db
		.select({
			id: offers.id,
			company: offers.company,
			position: offers.position,
			level: offers.level,
			type: offers.type,
			modality: offers.modality,
			salaryMin: offers.salaryMin,
			salaryMax: offers.salaryMax,
			salaryCurrency: offers.salaryCurrency,
			salaryPeriod: offers.salaryPeriod,
			currentStageId: offers.currentStageId,
			appliedAt: offers.appliedAt,
			sourceUrl: offers.sourceUrl,
			sourcePlatform: offers.sourcePlatform,
			workspaceId: offers.workspaceId,
			notes: offers.notes,
			createdAt: offers.createdAt,
			updatedAt: offers.updatedAt,
			stageId: pipelineStages.id,
			stageName: pipelineStages.name,
			stageSlug: pipelineStages.slug,
			stageColor: pipelineStages.color,
			stageIsTerminal: pipelineStages.isTerminal,
			wsId: workspaces.id,
			wsName: workspaces.name,
			wsIcon: workspaces.icon,
			wsColor: workspaces.color,
			cvId: cvSnapshots.id,
			cvLabel: cvSnapshots.label,
		})
		.from(offers)
		.leftJoin(pipelineStages, eq(offers.currentStageId, pipelineStages.id))
		.leftJoin(workspaces, eq(offers.workspaceId, workspaces.id))
		.leftJoin(cvSnapshots, eq(offers.cvSnapshotId, cvSnapshots.id))
		.where(and(eq(offers.id, id), isNull(offers.deletedAt)))
		.limit(1)

	if (!row) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const techRows = await db
		.select({
			id: technologies.id,
			name: technologies.name,
			category: technologies.category,
			context: offerTechnologies.context,
		})
		.from(offerTechnologies)
		.innerJoin(technologies, eq(offerTechnologies.technologyId, technologies.id))
		.where(eq(offerTechnologies.offerId, id))

	const contactRows = await db
		.select({
			id: contacts.id,
			name: contacts.name,
			email: contacts.email,
			linkedinUrl: contacts.linkedinUrl,
			company: contacts.company,
			role: contacts.role,
		})
		.from(offerContacts)
		.innerJoin(contacts, eq(offerContacts.contactId, contacts.id))
		.where(eq(offerContacts.offerId, id))

	return c.json({
		id: row.id,
		company: row.company,
		position: row.position,
		level: row.level,
		type: row.type,
		modality: row.modality,
		salaryMin: row.salaryMin,
		salaryMax: row.salaryMax,
		salaryCurrency: row.salaryCurrency,
		salaryPeriod: row.salaryPeriod,
		currentStageId: row.currentStageId,
		appliedAt: row.appliedAt,
		sourceUrl: row.sourceUrl,
		sourcePlatform: row.sourcePlatform,
		workspaceId: row.workspaceId,
		notes: row.notes,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		stage: row.stageId
			? {
					id: row.stageId,
					name: row.stageName,
					slug: row.stageSlug,
					color: row.stageColor,
					isTerminal: row.stageIsTerminal,
				}
			: null,
		workspace: row.wsId
			? { id: row.wsId, name: row.wsName, icon: row.wsIcon, color: row.wsColor }
			: null,
		cvSnapshot: row.cvId ? { id: row.cvId, label: row.cvLabel } : null,
		technologies: techRows,
		contacts: contactRows,
	})
})

offersRoute.put('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const body = await c.req.json()
	const result = updateOfferSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const { appliedAt, ...rest } = result.data
	const [updated] = await db
		.update(offers)
		.set({
			...rest,
			...(appliedAt ? { appliedAt: new Date(appliedAt) } : {}),
			updatedAt: new Date(),
		})
		.where(and(eq(offers.id, paramResult.data.id), isNull(offers.deletedAt)))
		.returning()
	if (!updated) {
		return c.json({ error: 'Offer not found' }, 404)
	}
	return c.json(updated)
})

offersRoute.delete('/:id', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const [deleted] = await db
		.update(offers)
		.set({ deletedAt: new Date(), updatedAt: new Date() })
		.where(and(eq(offers.id, paramResult.data.id), isNull(offers.deletedAt)))
		.returning()
	if (!deleted) {
		return c.json({ error: 'Offer not found' }, 404)
	}
	return c.json({ success: true })
})

offersRoute.patch('/:id/status', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const body = await c.req.json()
	const result = changeOfferStatusSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const { id } = paramResult.data
	const { stageId, note } = result.data

	const [targetStage] = await db
		.select({ id: pipelineStages.id })
		.from(pipelineStages)
		.where(eq(pipelineStages.id, stageId))
		.limit(1)
	if (!targetStage) {
		return c.json({ error: 'Target stage not found' }, 404)
	}

	const [offer] = await db
		.select({ id: offers.id, currentStageId: offers.currentStageId })
		.from(offers)
		.where(and(eq(offers.id, id), isNull(offers.deletedAt)))
		.limit(1)
	if (!offer) {
		return c.json({ error: 'Offer not found' }, 404)
	}

	const fromStageId = offer.currentStageId

	await db.transaction(async (tx) => {
		await tx.insert(offerStatusLog).values({
			offerId: id,
			fromStageId,
			toStageId: stageId,
			note,
		})
		await tx
			.update(offers)
			.set({ currentStageId: stageId, updatedAt: new Date() })
			.where(eq(offers.id, id))
	})

	return c.json({ success: true, fromStageId, toStageId: stageId })
})
