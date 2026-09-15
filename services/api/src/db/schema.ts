import {
	boolean,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'

// Workspaces — configurable tabs/views
export const workspaces = pgTable('workspaces', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	icon: text('icon'),
	color: text('color'),
	sortOrder: integer('sort_order').notNull().default(0),
	filters: jsonb('filters').notNull().default({}),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Pipeline stages — configurable pipeline states
export const pipelineStages = pgTable('pipeline_stages', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	color: text('color').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	isTerminal: boolean('is_terminal').notNull().default(false),
	isPositive: boolean('is_positive'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// CV snapshots — LaTeX CV versions (defined before offers due to FK reference)
export const cvSnapshots = pgTable('cv_snapshots', {
	id: uuid('id').defaultRandom().primaryKey(),
	label: text('label').notNull(),
	type: text('type').notNull().default('cv'), // 'cv' | 'cover_letter'
	latexSource: text('latex_source').notNull(),
	compiledPdf: text('compiled_pdf'), // base64 encoded, BYTEA in raw SQL
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Offers — central entity
export const offers = pgTable('offers', {
	id: uuid('id').defaultRandom().primaryKey(),
	company: text('company').notNull(),
	position: text('position').notNull(),
	level: text('level'),
	type: text('type'),
	modality: text('modality'),
	salaryMin: integer('salary_min'),
	salaryMax: integer('salary_max'),
	salaryCurrency: text('salary_currency').default('USD'),
	salaryPeriod: text('salary_period').default('monthly'),
	currentStageId: uuid('current_stage_id').references(() => pipelineStages.id),
	appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
	sourceUrl: text('source_url'),
	sourcePlatform: text('source_platform'),
	cvSnapshotId: uuid('cv_snapshot_id').references(() => cvSnapshots.id),
	workspaceId: uuid('workspace_id').references(() => workspaces.id),
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Offer status log — audit trail of stage changes
export const offerStatusLog = pgTable('offer_status_log', {
	id: uuid('id').defaultRandom().primaryKey(),
	offerId: uuid('offer_id')
		.notNull()
		.references(() => offers.id),
	fromStageId: uuid('from_stage_id').references(() => pipelineStages.id),
	toStageId: uuid('to_stage_id')
		.notNull()
		.references(() => pipelineStages.id),
	note: text('note'),
	changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
})

// Contacts — recruiters, hiring managers
export const contacts = pgTable('contacts', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	email: text('email'),
	linkedinUrl: text('linkedin_url'),
	company: text('company'),
	role: text('role'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Offer contacts — N:M relationship
export const offerContacts = pgTable(
	'offer_contacts',
	{
		offerId: uuid('offer_id')
			.notNull()
			.references(() => offers.id),
		contactId: uuid('contact_id')
			.notNull()
			.references(() => contacts.id),
	},
	(t) => [primaryKey({ columns: [t.offerId, t.contactId] })],
)

// Phone calls — call logs per offer
export const phoneCalls = pgTable('phone_calls', {
	id: uuid('id').defaultRandom().primaryKey(),
	offerId: uuid('offer_id')
		.notNull()
		.references(() => offers.id),
	phoneNumber: text('phone_number'),
	contactId: uuid('contact_id').references(() => contacts.id),
	calledAt: timestamp('called_at', { withTimezone: true }).notNull().defaultNow(),
	durationMinutes: integer('duration_minutes'),
	notes: text('notes'),
	callType: text('call_type').default('inbound'),
})

// Technologies — tech stack catalog
export const technologies = pgTable('technologies', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull().unique(),
	category: text('category'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Offer technologies — N:M relationship
export const offerTechnologies = pgTable(
	'offer_technologies',
	{
		offerId: uuid('offer_id')
			.notNull()
			.references(() => offers.id),
		technologyId: uuid('technology_id')
			.notNull()
			.references(() => technologies.id),
		context: text('context'),
	},
	(t) => [primaryKey({ columns: [t.offerId, t.technologyId] })],
)

// Interview questions — Q&A per offer
export const interviewQuestions = pgTable('interview_questions', {
	id: uuid('id').defaultRandom().primaryKey(),
	offerId: uuid('offer_id')
		.notNull()
		.references(() => offers.id),
	question: text('question').notNull(),
	myAnswer: text('my_answer'),
	difficulty: text('difficulty'),
	category: text('category'),
	askedAt: timestamp('asked_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Reminders — scheduled events per offer
export const reminders = pgTable('reminders', {
	id: uuid('id').defaultRandom().primaryKey(),
	offerId: uuid('offer_id')
		.notNull()
		.references(() => offers.id),
	title: text('title').notNull(),
	scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
	locationType: text('location_type').notNull().default('video'),
	videoLink: text('video_link'),
	address: text('address'),
	contactId: uuid('contact_id').references(() => contacts.id),
	notes: text('notes'),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// API keys — authentication tokens
export const apiKeys = pgTable('api_keys', {
	id: uuid('id').defaultRandom().primaryKey(),
	label: text('label').notNull(),
	keyHash: text('key_hash').notNull().unique(),
	keyPrefix: text('key_prefix').notNull(),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	revokedAt: timestamp('revoked_at', { withTimezone: true }),
})
