import { z } from 'zod'

// --- Reusable ---

export const uuidParam = z.object({
	id: z.string().uuid(),
})

// --- Offers ---

export const createOfferSchema = z.object({
	company: z.string().min(1),
	position: z.string().min(1),
	level: z.string().optional(),
	type: z.string().optional(),
	modality: z.string().optional(),
	salaryMin: z.number().int().positive().optional(),
	salaryMax: z.number().int().positive().optional(),
	salaryCurrency: z.string().optional(),
	salaryPeriod: z.string().optional(),
	currentStageId: z.string().uuid().optional(),
	appliedAt: z.string().datetime().optional(),
	sourceUrl: z.string().url().optional(),
	sourcePlatform: z.string().optional(),
	cvSnapshotId: z.string().uuid().optional(),
	workspaceId: z.string().uuid().optional(),
	notes: z.string().optional(),
})

export const updateOfferSchema = createOfferSchema.partial()

export const listOffersQuerySchema = z.object({
	workspace_id: z.string().uuid().optional(),
	stage_id: z.string().uuid().optional(),
	search: z.string().optional(),
	limit: z.coerce.number().int().positive().default(50),
	offset: z.coerce.number().int().min(0).default(0),
})

export const changeOfferStatusSchema = z.object({
	stageId: z.string().uuid(),
	note: z.string().optional(),
})

// --- Pipeline Stages ---

export const createPipelineStageSchema = z.object({
	name: z.string().min(1),
	slug: z.string().regex(/^[a-z0-9-]+$/),
	color: z.string().min(1),
	sortOrder: z.number().int().min(0).optional(),
	isTerminal: z.boolean().optional(),
	isPositive: z.boolean().optional(),
})

export const updatePipelineStageSchema = createPipelineStageSchema.partial()

// --- Workspaces ---

export const createWorkspaceSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
	sortOrder: z.number().int().min(0).optional(),
	filters: z.record(z.string(), z.unknown()).optional(),
})

export const updateWorkspaceSchema = createWorkspaceSchema.partial()

// --- Contacts ---

export const createContactSchema = z.object({
	name: z.string().min(1),
	email: z.string().email().optional(),
	linkedinUrl: z.string().url().optional(),
	company: z.string().optional(),
	role: z.string().optional(),
})

export const updateContactSchema = createContactSchema.partial()

export const listContactsQuerySchema = z.object({
	search: z.string().optional(),
	limit: z.coerce.number().int().positive().default(50),
	offset: z.coerce.number().int().min(0).default(0),
})

export const linkOfferContactSchema = z.object({
	contactId: z.string().uuid(),
})

// --- Calls ---

export const createCallSchema = z.object({
	phoneNumber: z.string().optional(),
	contactId: z.string().uuid().optional(),
	calledAt: z.string().datetime(),
	durationMinutes: z.number().int().min(0).optional(),
	notes: z.string().optional(),
	callType: z.string().default('inbound'),
})

// --- Technologies ---

export const createTechnologySchema = z.object({
	name: z.string().min(1),
	category: z.string().optional(),
})

export const updateTechnologySchema = z.object({
	name: z.string().min(1).optional(),
	category: z.string().nullable().optional(),
})

export const listTechnologiesQuerySchema = z.object({
	category: z.string().optional(),
	search: z.string().optional(),
})

export const linkOfferTechnologySchema = z.object({
	technologyId: z.string().uuid(),
	context: z.enum(['required', 'nice-to-have', 'asked-in-interview']).optional(),
})

// --- Questions ---

export const createQuestionSchema = z.object({
	question: z.string().min(1),
	myAnswer: z.string().optional(),
	difficulty: z.string().optional(),
	category: z.string().optional(),
	askedAt: z.string().datetime().optional(),
})

export const updateQuestionSchema = createQuestionSchema.partial()

export const listQuestionsQuerySchema = z.object({
	category: z.string().optional(),
})

// --- CV Snapshots ---

export const createCvSnapshotSchema = z.object({
	label: z.string().min(1),
	type: z.enum(['cv', 'cover_letter']).default('cv'),
	latexSource: z.string(),
	notes: z.string().optional(),
	compiledPdf: z.string().optional(),
})

export const updateCvSnapshotSchema = z.object({
	label: z.string().min(1),
	type: z.enum(['cv', 'cover_letter']),
	latexSource: z.string(),
	notes: z.string().optional(),
	compiledPdf: z.string().optional(),
}).partial()

export const listCvsQuerySchema = z.object({
	type: z.enum(['cv', 'cover_letter']).optional(),
	search: z.string().optional(),
})

// --- API Keys ---

export const createApiKeySchema = z.object({
	label: z.string().min(1),
	expiresAt: z.string().datetime().optional(),
})

// --- Timeline ---

export const timelineQuerySchema = z.object({
	workspace_id: z.string().uuid().optional(),
	stage_id: z.string().uuid().optional(),
	from_date: z.string().datetime().optional(),
	to_date: z.string().datetime().optional(),
	limit: z.coerce.number().int().positive().default(50),
	offset: z.coerce.number().int().min(0).default(0),
})

// --- Inferred types ---

export type CreateOfferInput = z.infer<typeof createOfferSchema>
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>
export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>
export type ChangeOfferStatusInput = z.infer<typeof changeOfferStatusSchema>
export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>
export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>
export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>
export type LinkOfferContactInput = z.infer<typeof linkOfferContactSchema>
export type CreateCallInput = z.infer<typeof createCallSchema>
export type CreateTechnologyInput = z.infer<typeof createTechnologySchema>
export type ListTechnologiesQuery = z.infer<typeof listTechnologiesQuerySchema>
export type LinkOfferTechnologyInput = z.infer<typeof linkOfferTechnologySchema>
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>
export type CreateCvSnapshotInput = z.infer<typeof createCvSnapshotSchema>
export type UpdateCvSnapshotInput = z.infer<typeof updateCvSnapshotSchema>
export type ListCvsQuery = z.infer<typeof listCvsQuerySchema>
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
export type TimelineQuery = z.infer<typeof timelineQuerySchema>
