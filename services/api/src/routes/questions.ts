import { and, asc, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { interviewQuestions, offers } from '../db/schema'
import {
	createQuestionSchema,
	listQuestionsQuerySchema,
	updateQuestionSchema,
	uuidParam,
} from './schemas'

export const questionsRoute = new Hono()

questionsRoute.get('/:id/questions', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const queryResult = listQuestionsQuerySchema.safeParse(c.req.query())
	if (!queryResult.success) {
		return c.json({ error: 'Validation failed', issues: queryResult.error.flatten() }, 400)
	}
	const { id } = paramResult.data
	const { category } = queryResult.data

	const rows = await db
		.select()
		.from(interviewQuestions)
		.where(
			and(
				eq(interviewQuestions.offerId, id),
				category ? eq(interviewQuestions.category, category) : undefined,
			),
		)
		.orderBy(asc(interviewQuestions.createdAt))

	return c.json(rows)
})

questionsRoute.post('/:id/questions', async (c) => {
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
	const result = createQuestionSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const { askedAt, ...rest } = result.data
	const [question] = await db
		.insert(interviewQuestions)
		.values({
			...rest,
			offerId: id,
			...(askedAt ? { askedAt: new Date(askedAt) } : {}),
		})
		.returning()
	return c.json(question, 201)
})

questionsRoute.put('/:id/questions/:questionId', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const questionParamResult = uuidParam.safeParse({ id: c.req.param('questionId') })
	if (!questionParamResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}

	const body = await c.req.json()
	const result = updateQuestionSchema.safeParse(body)
	if (!result.success) {
		return c.json({ error: 'Validation failed', issues: result.error.flatten() }, 400)
	}
	const { askedAt, ...rest } = result.data
	const [updated] = await db
		.update(interviewQuestions)
		.set({
			...rest,
			...(askedAt ? { askedAt: new Date(askedAt) } : {}),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(interviewQuestions.offerId, paramResult.data.id),
				eq(interviewQuestions.id, questionParamResult.data.id),
			),
		)
		.returning()
	if (!updated) {
		return c.json({ error: 'Question not found' }, 404)
	}
	return c.json(updated)
})

questionsRoute.delete('/:id/questions/:questionId', async (c) => {
	const paramResult = uuidParam.safeParse({ id: c.req.param('id') })
	if (!paramResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}
	const questionParamResult = uuidParam.safeParse({ id: c.req.param('questionId') })
	if (!questionParamResult.success) {
		return c.json({ error: 'Invalid UUID' }, 400)
	}

	const [deleted] = await db
		.delete(interviewQuestions)
		.where(
			and(
				eq(interviewQuestions.offerId, paramResult.data.id),
				eq(interviewQuestions.id, questionParamResult.data.id),
			),
		)
		.returning()
	if (!deleted) {
		return c.json({ error: 'Question not found' }, 404)
	}
	return c.json({ success: true })
})
