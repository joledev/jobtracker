import { hashApiKey } from '../middleware/auth'
import { db } from '.'
import {
	apiKeys,
	interviewQuestions,
	offers,
	offerTechnologies,
	pipelineStages,
	technologies,
	workspaces,
} from './schema'

const masterKey = process.env.MASTER_API_KEY
if (!masterKey) {
	console.error('MASTER_API_KEY environment variable is required')
	process.exit(1)
}

const keyHash = await hashApiKey(masterKey)
const keyPrefix = masterKey.slice(0, 8)

await db
	.insert(apiKeys)
	.values({
		label: 'Bootstrap Master Key',
		keyHash,
		keyPrefix,
	})
	.onConflictDoNothing()

console.log(`API key seeded successfully (prefix: ${keyPrefix}...)`)

await db
	.insert(pipelineStages)
	.values([
		{ name: 'Aplicado', slug: 'applied', color: '#4a7c59', sortOrder: 0, isTerminal: false },
		{ name: 'Screening', slug: 'screening', color: '#7c6b2a', sortOrder: 1, isTerminal: false },
		{
			name: 'Entrevista Técnica',
			slug: 'technical-interview',
			color: '#7c4a2a',
			sortOrder: 2,
			isTerminal: false,
		},
		{
			name: 'Entrevista Final',
			slug: 'final-interview',
			color: '#2a5c7c',
			sortOrder: 3,
			isTerminal: false,
		},
		{
			name: 'Oferta Recibida',
			slug: 'offer-received',
			color: '#2a7c4a',
			sortOrder: 4,
			isTerminal: false,
		},
		{
			name: 'Aceptado',
			slug: 'accepted',
			color: '#2a7c4a',
			sortOrder: 5,
			isTerminal: true,
			isPositive: true,
		},
		{
			name: 'Rechazado',
			slug: 'rejected',
			color: '#7c2a2a',
			sortOrder: 6,
			isTerminal: true,
			isPositive: false,
		},
		{
			name: 'Retirado',
			slug: 'withdrawn',
			color: '#444444',
			sortOrder: 7,
			isTerminal: true,
			isPositive: false,
		},
	])
	.onConflictDoNothing({ target: pipelineStages.slug })

console.log('Pipeline stages seeded successfully')

// --- Workspaces ---

const WS_BACKEND_ID = '00000000-0000-4000-a000-000000000001'
const WS_ARCHITECT_ID = '00000000-0000-4000-a000-000000000002'

await db
	.insert(workspaces)
	.values([
		{
			id: WS_BACKEND_ID,
			name: 'Backend Engineer',
			sortOrder: 0,
		},
		{
			id: WS_ARCHITECT_ID,
			name: 'Software Architect',
			sortOrder: 1,
		},
	])
	.onConflictDoNothing()

console.log('Workspaces seeded successfully')

// --- Technologies ---

await db
	.insert(technologies)
	.values([
		{ name: 'TypeScript', category: 'language' },
		{ name: 'PostgreSQL', category: 'database' },
	])
	.onConflictDoNothing({ target: technologies.name })

console.log('Technologies seeded successfully')

// --- Lookup stage IDs by slug ---

const stageRows = await db
	.select({ id: pipelineStages.id, slug: pipelineStages.slug })
	.from(pipelineStages)

const stageBySlug = Object.fromEntries(stageRows.map((s) => [s.slug, s.id]))

// Los indices construidos con Object.fromEntries devuelven `string | undefined`:
// nada garantiza que la fila buscada este en la base. Leerlos directo dejaba que
// un id ausente viajara como `undefined` hasta el insert, donde drizzle omite la
// columna: en `offer_technologies.technology_id`, que es NOT NULL, eso revienta
// con un error de Postgres que no dice que fila falta. Resolver aqui convierte el
// fallo en un mensaje con nombre y aborta antes de tocar la base.
function requireId(index: Record<string, string>, key: string, kind: string): string {
	const id = index[key]
	if (!id) {
		throw new Error(`Seed aborted: no ${kind} named '${key}' exists in the database`)
	}
	return id
}

// --- Offers ---

const OFFER_ACME_ID = '00000000-0000-4000-b000-000000000001'
const OFFER_TECHSTARTUP_ID = '00000000-0000-4000-b000-000000000002'
const OFFER_BIGCO_ID = '00000000-0000-4000-b000-000000000003'

await db
	.insert(offers)
	.values([
		{
			id: OFFER_ACME_ID,
			company: 'Acme Corp',
			position: 'Backend Engineer',
			currentStageId: requireId(stageBySlug, 'applied', 'pipeline stage'),
			workspaceId: WS_BACKEND_ID,
		},
		{
			id: OFFER_TECHSTARTUP_ID,
			company: 'TechStartup',
			position: 'Senior Backend Engineer',
			currentStageId: requireId(stageBySlug, 'screening', 'pipeline stage'),
			workspaceId: WS_BACKEND_ID,
		},
		{
			id: OFFER_BIGCO_ID,
			company: 'BigCo',
			position: 'Software Architect',
			currentStageId: requireId(stageBySlug, 'technical-interview', 'pipeline stage'),
			workspaceId: WS_ARCHITECT_ID,
		},
	])
	.onConflictDoNothing()

console.log('Offers seeded successfully')

// --- Link technologies to offers ---

const techRows = await db
	.select({ id: technologies.id, name: technologies.name })
	.from(technologies)

const techByName = Object.fromEntries(techRows.map((t) => [t.name, t.id]))

await db
	.insert(offerTechnologies)
	.values([
		{
			offerId: OFFER_ACME_ID,
			technologyId: requireId(techByName, 'TypeScript', 'technology'),
			context: 'required',
		},
		{
			offerId: OFFER_ACME_ID,
			technologyId: requireId(techByName, 'PostgreSQL', 'technology'),
			context: 'required',
		},
		{
			offerId: OFFER_TECHSTARTUP_ID,
			technologyId: requireId(techByName, 'TypeScript', 'technology'),
			context: 'required',
		},
		{
			offerId: OFFER_BIGCO_ID,
			technologyId: requireId(techByName, 'PostgreSQL', 'technology'),
			context: 'asked-in-interview',
		},
	])
	.onConflictDoNothing()

console.log('Offer technologies seeded successfully')

// --- Interview questions ---

const Q_ACME_ID = '00000000-0000-4000-c000-000000000001'
const Q_TECHSTARTUP_ID = '00000000-0000-4000-c000-000000000002'
const Q_BIGCO_ID = '00000000-0000-4000-c000-000000000003'

await db
	.insert(interviewQuestions)
	.values([
		{
			id: Q_ACME_ID,
			offerId: OFFER_ACME_ID,
			question: 'Explain event-driven architecture patterns',
			category: 'system-design',
			difficulty: 'medium',
		},
		{
			id: Q_TECHSTARTUP_ID,
			offerId: OFFER_TECHSTARTUP_ID,
			question: 'How would you design a rate limiter?',
			category: 'system-design',
			difficulty: 'hard',
		},
		{
			id: Q_BIGCO_ID,
			offerId: OFFER_BIGCO_ID,
			question: 'Describe your experience with PostgreSQL query optimization',
			category: 'database',
			difficulty: 'medium',
		},
	])
	.onConflictDoNothing()

console.log('Interview questions seeded successfully')

process.exit(0)
