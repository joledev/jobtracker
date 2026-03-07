import Database from '@tauri-apps/plugin-sql'
import type { ApiClient } from './api'
import type {
  OfferListItem,
  OfferDetail,
  CreateOfferInput,
  UpdateOfferInput,
  ChangeStatusInput,
  OfferFilters,
  PipelineStage,
  Workspace,
  Technology,
  TechnologyFilters,
  CvSnapshot,
  CvSnapshotDetail,
  CreateCvInput,
  UpdateCvInput,
  CvFilters,
  Contact,
  ContactFilters,
  PhoneCall,
  CreateCallInput,
  InterviewQuestion,
  CreateQuestionInput,
  UpdateQuestionInput,
  AddTechnologyInput,
  StatusLogEntry,
  TimelineResponse,
  TimelineFilters,
  CreateStageInput,
  UpdateStageInput,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  CreateTechnologyInput,
  UpdateTechnologyInput,
  CreateContactInput,
} from '@/types/api'

let db: Database | null = null

const uuid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export async function initLocalDb(): Promise<void> {
  db = await Database.load('sqlite:jobtracker.db')

  await db.execute('PRAGMA journal_mode = WAL')
  await db.execute('PRAGMA foreign_keys = ON')

  await db.execute(`CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_terminal INTEGER NOT NULL DEFAULT 0,
    is_positive INTEGER,
    created_at TEXT NOT NULL
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    filters TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS cv_snapshots (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'cv',
    latex_source TEXT NOT NULL,
    compiled_pdf TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    level TEXT,
    type TEXT,
    modality TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT DEFAULT 'USD',
    salary_period TEXT DEFAULT 'monthly',
    current_stage_id TEXT REFERENCES pipeline_stages(id),
    applied_at TEXT NOT NULL,
    source_url TEXT,
    source_platform TEXT,
    cv_snapshot_id TEXT REFERENCES cv_snapshots(id),
    workspace_id TEXT REFERENCES workspaces(id),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS offer_status_log (
    id TEXT PRIMARY KEY,
    offer_id TEXT NOT NULL REFERENCES offers(id),
    from_stage_id TEXT REFERENCES pipeline_stages(id),
    to_stage_id TEXT NOT NULL REFERENCES pipeline_stages(id),
    note TEXT,
    changed_at TEXT NOT NULL
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    linkedin_url TEXT,
    company TEXT,
    role TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS offer_contacts (
    offer_id TEXT NOT NULL REFERENCES offers(id),
    contact_id TEXT NOT NULL REFERENCES contacts(id),
    PRIMARY KEY (offer_id, contact_id)
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS phone_calls (
    id TEXT PRIMARY KEY,
    offer_id TEXT NOT NULL REFERENCES offers(id),
    phone_number TEXT,
    contact_id TEXT REFERENCES contacts(id),
    called_at TEXT NOT NULL,
    duration_minutes INTEGER,
    notes TEXT,
    call_type TEXT DEFAULT 'inbound',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS technologies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TEXT NOT NULL
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS offer_technologies (
    offer_id TEXT NOT NULL REFERENCES offers(id),
    technology_id TEXT NOT NULL REFERENCES technologies(id),
    context TEXT,
    PRIMARY KEY (offer_id, technology_id)
  )`)

  await db.execute(`CREATE TABLE IF NOT EXISTS interview_questions (
    id TEXT PRIMARY KEY,
    offer_id TEXT NOT NULL REFERENCES offers(id),
    question TEXT NOT NULL,
    my_answer TEXT,
    difficulty TEXT,
    category TEXT,
    asked_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`)

  // Seed default pipeline stages if empty
  const stageCount = await db.select<[{ cnt: number }]>('SELECT COUNT(*) as cnt FROM pipeline_stages')
  if (stageCount[0].cnt === 0) {
    const defaults = [
      { name: 'Aplicado', slug: 'aplicado', color: '#22c55e', order: 0 },
      { name: 'Screening', slug: 'screening', color: '#eab308', order: 1 },
      { name: 'Entrevista Tecnica', slug: 'entrevista-tecnica', color: '#f97316', order: 2 },
      { name: 'Entrevista Final', slug: 'entrevista-final', color: '#f97316', order: 3 },
      { name: 'Oferta Recibida', slug: 'oferta-recibida', color: '#3b82f6', order: 4 },
      { name: 'Aceptado', slug: 'aceptado', color: '#22c55e', order: 5, terminal: true, positive: true },
      { name: 'Rechazado', slug: 'rechazado', color: '#ef4444', order: 6, terminal: true, positive: false },
      { name: 'Retirado', slug: 'retirado', color: '#6b7280', order: 7, terminal: true, positive: false },
    ]
    for (const s of defaults) {
      await db.execute(
        'INSERT INTO pipeline_stages (id, name, slug, color, sort_order, is_terminal, is_positive, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [uuid(), s.name, s.slug, s.color, s.order, s.terminal ? 1 : 0, s.positive === undefined ? null : s.positive ? 1 : 0, now()],
      )
    }
  }
}

function getDb(): Database {
  if (!db) throw new Error('Local database not initialized')
  return db
}

// Helper to map SQLite rows (snake_case) to camelCase
function rowToOffer(r: Record<string, unknown>): OfferListItem {
  return {
    id: r.id as string,
    company: r.company as string,
    position: r.position as string,
    level: r.level as string | null,
    type: r.type as string | null,
    modality: r.modality as string | null,
    salaryMin: r.salary_min as number | null,
    salaryMax: r.salary_max as number | null,
    salaryCurrency: r.salary_currency as string | null,
    salaryPeriod: r.salary_period as string | null,
    currentStageId: r.current_stage_id as string | null,
    appliedAt: r.applied_at as string,
    sourceUrl: r.source_url as string | null,
    sourcePlatform: r.source_platform as string | null,
    workspaceId: r.workspace_id as string | null,
    notes: r.notes as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    stageName: r.stage_name as string | null,
    stageSlug: r.stage_slug as string | null,
    stageColor: r.stage_color as string | null,
  }
}

export function createLocalClient(): ApiClient {
  return {
    health: {
      check: async () => ({ status: 'ok', timestamp: now() }),
    },

    offers: {
      list: async (filters?: OfferFilters) => {
        const d = getDb()
        let sql = `SELECT o.*, ps.name as stage_name, ps.slug as stage_slug, ps.color as stage_color
          FROM offers o LEFT JOIN pipeline_stages ps ON o.current_stage_id = ps.id
          WHERE o.deleted_at IS NULL`
        const params: unknown[] = []
        let idx = 1
        if (filters?.workspace_id) {
          sql += ` AND o.workspace_id = $${idx++}`
          params.push(filters.workspace_id)
        }
        if (filters?.stage_id) {
          sql += ` AND o.current_stage_id = $${idx++}`
          params.push(filters.stage_id)
        }
        if (filters?.search) {
          sql += ` AND (o.company LIKE $${idx} OR o.position LIKE $${idx})`
          params.push(`%${filters.search}%`)
          idx++
        }
        sql += ' ORDER BY o.applied_at DESC'
        if (filters?.limit) {
          sql += ` LIMIT $${idx++}`
          params.push(filters.limit)
        }
        if (filters?.offset) {
          sql += ` OFFSET $${idx++}`
          params.push(filters.offset)
        }
        const rows = await d.select<Record<string, unknown>[]>(sql, params)
        return rows.map(rowToOffer)
      },

      get: async (id: string) => {
        const d = getDb()
        const rows = await d.select<Record<string, unknown>[]>(
          `SELECT o.*, ps.name as stage_name, ps.slug as stage_slug, ps.color as stage_color,
                  ps.is_terminal as stage_is_terminal
           FROM offers o LEFT JOIN pipeline_stages ps ON o.current_stage_id = ps.id
           WHERE o.id = $1 AND o.deleted_at IS NULL`, [id],
        )
        if (rows.length === 0) throw new Error('Offer not found')
        const r = rows[0]

        const techs = await d.select<Record<string, unknown>[]>(
          `SELECT t.id, t.name, t.category, ot.context
           FROM offer_technologies ot JOIN technologies t ON ot.technology_id = t.id
           WHERE ot.offer_id = $1`, [id],
        )

        const contactRows = await d.select<Record<string, unknown>[]>(
          `SELECT c.id, c.name, c.email, c.linkedin_url, c.company, c.role
           FROM offer_contacts oc JOIN contacts c ON oc.contact_id = c.id
           WHERE oc.offer_id = $1`, [id],
        )

        let cvSnapshot = null
        if (r.cv_snapshot_id) {
          const cvRows = await d.select<Record<string, unknown>[]>(
            'SELECT id, label FROM cv_snapshots WHERE id = $1', [r.cv_snapshot_id],
          )
          if (cvRows.length > 0) cvSnapshot = { id: cvRows[0].id as string, label: cvRows[0].label as string }
        }

        const detail: OfferDetail = {
          id: r.id as string,
          company: r.company as string,
          position: r.position as string,
          level: r.level as string | null,
          type: r.type as string | null,
          modality: r.modality as string | null,
          salaryMin: r.salary_min as number | null,
          salaryMax: r.salary_max as number | null,
          salaryCurrency: r.salary_currency as string | null,
          salaryPeriod: r.salary_period as string | null,
          currentStageId: r.current_stage_id as string | null,
          appliedAt: r.applied_at as string,
          sourceUrl: r.source_url as string | null,
          sourcePlatform: r.source_platform as string | null,
          workspaceId: r.workspace_id as string | null,
          notes: r.notes as string | null,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
          stage: r.current_stage_id ? {
            id: r.current_stage_id as string,
            name: r.stage_name as string,
            slug: r.stage_slug as string,
            color: r.stage_color as string,
            isTerminal: !!(r.stage_is_terminal as number),
          } : null,
          workspace: null,
          cvSnapshot,
          technologies: techs.map((t) => ({
            id: t.id as string,
            name: t.name as string,
            category: t.category as string | null,
            context: t.context as string | null,
          })),
          contacts: contactRows.map((c) => ({
            id: c.id as string,
            name: c.name as string,
            email: c.email as string | null,
            linkedinUrl: (c.linkedin_url as string) || '',
            company: c.company as string | null,
            role: c.role as string | null,
          })),
        }

        if (r.workspace_id) {
          const wsRows = await d.select<Record<string, unknown>[]>(
            'SELECT id, name, icon, color FROM workspaces WHERE id = $1', [r.workspace_id],
          )
          if (wsRows.length > 0) {
            detail.workspace = {
              id: wsRows[0].id as string,
              name: wsRows[0].name as string,
              icon: wsRows[0].icon as string | null,
              color: wsRows[0].color as string | null,
            }
          }
        }

        return detail
      },

      create: async (data: CreateOfferInput) => {
        const d = getDb()
        const id = uuid()
        const ts = now()
        await d.execute(
          `INSERT INTO offers (id, company, position, level, type, modality, salary_min, salary_max, salary_currency, salary_period, current_stage_id, applied_at, source_url, source_platform, cv_snapshot_id, workspace_id, notes, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [id, data.company, data.position, data.level ?? null, data.type ?? null, data.modality ?? null,
           data.salaryMin ?? null, data.salaryMax ?? null, data.salaryCurrency ?? 'USD', data.salaryPeriod ?? 'monthly',
           data.currentStageId ?? null, data.appliedAt ?? ts, data.sourceUrl ?? null, data.sourcePlatform ?? null,
           data.cvSnapshotId ?? null, data.workspaceId ?? null, data.notes ?? null, ts, ts],
        )
        // Fetch and return
        const rows = await d.select<Record<string, unknown>[]>(
          `SELECT o.*, ps.name as stage_name, ps.slug as stage_slug, ps.color as stage_color
           FROM offers o LEFT JOIN pipeline_stages ps ON o.current_stage_id = ps.id WHERE o.id = $1`, [id],
        )
        return rowToOffer(rows[0])
      },

      update: async (id: string, data: UpdateOfferInput) => {
        const d = getDb()
        const sets: string[] = []
        const params: unknown[] = []
        let idx = 1
        const fields: [string, unknown][] = [
          ['company', data.company], ['position', data.position], ['level', data.level],
          ['type', data.type], ['modality', data.modality], ['salary_min', data.salaryMin],
          ['salary_max', data.salaryMax], ['salary_currency', data.salaryCurrency],
          ['salary_period', data.salaryPeriod], ['current_stage_id', data.currentStageId],
          ['applied_at', data.appliedAt], ['source_url', data.sourceUrl],
          ['source_platform', data.sourcePlatform], ['cv_snapshot_id', data.cvSnapshotId],
          ['workspace_id', data.workspaceId], ['notes', data.notes],
        ]
        for (const [col, val] of fields) {
          if (val !== undefined) {
            sets.push(`${col} = $${idx++}`)
            params.push(val ?? null)
          }
        }
        if (sets.length === 0) return rowToOffer({} as Record<string, unknown>)
        sets.push(`updated_at = $${idx++}`)
        params.push(now())
        params.push(id)
        await d.execute(`UPDATE offers SET ${sets.join(', ')} WHERE id = $${idx}`, params)
        const rows = await d.select<Record<string, unknown>[]>(
          `SELECT o.*, ps.name as stage_name, ps.slug as stage_slug, ps.color as stage_color
           FROM offers o LEFT JOIN pipeline_stages ps ON o.current_stage_id = ps.id WHERE o.id = $1`, [id],
        )
        return rowToOffer(rows[0])
      },

      delete: async (id: string) => {
        const d = getDb()
        await d.execute('UPDATE offers SET deleted_at = $1 WHERE id = $2', [now(), id])
      },

      changeStatus: async (id: string, data: ChangeStatusInput) => {
        const d = getDb()
        const rows = await d.select<[{ current_stage_id: string | null }]>(
          'SELECT current_stage_id FROM offers WHERE id = $1', [id],
        )
        const fromStageId = rows[0]?.current_stage_id ?? null
        const ts = now()
        await d.execute('UPDATE offers SET current_stage_id = $1, updated_at = $2 WHERE id = $3', [data.stageId, ts, id])
        await d.execute(
          'INSERT INTO offer_status_log (id, offer_id, from_stage_id, to_stage_id, note, changed_at) VALUES ($1,$2,$3,$4,$5,$6)',
          [uuid(), id, fromStageId, data.stageId, data.note ?? null, ts],
        )
        return { success: true, fromStageId: fromStageId ?? null, toStageId: data.stageId }
      },

      addContact: async (offerId: string, contactId: string) => {
        const d = getDb()
        await d.execute('INSERT OR IGNORE INTO offer_contacts (offer_id, contact_id) VALUES ($1,$2)', [offerId, contactId])
      },

      removeContact: async (offerId: string, contactId: string) => {
        const d = getDb()
        await d.execute('DELETE FROM offer_contacts WHERE offer_id = $1 AND contact_id = $2', [offerId, contactId])
      },

      listCalls: async (offerId: string) => {
        const d = getDb()
        const rows = await d.select<Record<string, unknown>[]>(
          `SELECT pc.*, c.name as contact_name FROM phone_calls pc
           LEFT JOIN contacts c ON pc.contact_id = c.id
           WHERE pc.offer_id = $1 ORDER BY pc.called_at DESC`, [offerId],
        )
        return rows.map((r) => ({
          id: r.id as string, offerId: r.offer_id as string,
          phoneNumber: r.phone_number as string | null, contactId: r.contact_id as string | null,
          calledAt: r.called_at as string, durationMinutes: r.duration_minutes as number | null,
          notes: r.notes as string | null, callType: r.call_type as string,
          contactName: r.contact_name as string | null,
          createdAt: r.created_at as string, updatedAt: r.updated_at as string,
        })) as PhoneCall[]
      },

      addCall: async (offerId: string, data: CreateCallInput) => {
        const d = getDb()
        const id = uuid()
        const ts = now()
        await d.execute(
          `INSERT INTO phone_calls (id, offer_id, phone_number, contact_id, called_at, duration_minutes, notes, call_type, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [id, offerId, data.phoneNumber ?? null, data.contactId ?? null, data.calledAt, data.durationMinutes ?? null, data.notes ?? null, data.callType ?? 'inbound', ts, ts],
        )
        const rows = await d.select<Record<string, unknown>[]>('SELECT * FROM phone_calls WHERE id = $1', [id])
        const r = rows[0]
        return {
          id: r.id as string, offerId: r.offer_id as string,
          phoneNumber: r.phone_number as string | null, contactId: r.contact_id as string | null,
          calledAt: r.called_at as string, durationMinutes: r.duration_minutes as number | null,
          notes: r.notes as string | null, callType: r.call_type as string,
          createdAt: r.created_at as string, updatedAt: r.updated_at as string,
        } as PhoneCall
      },

      listQuestions: async (offerId: string) => {
        const d = getDb()
        const rows = await d.select<Record<string, unknown>[]>(
          'SELECT * FROM interview_questions WHERE offer_id = $1 ORDER BY created_at DESC', [offerId],
        )
        return rows.map((r) => ({
          id: r.id as string, offerId: r.offer_id as string, question: r.question as string,
          myAnswer: r.my_answer as string | null, difficulty: r.difficulty as string | null,
          category: r.category as string | null, askedAt: r.asked_at as string | null,
          createdAt: r.created_at as string, updatedAt: r.updated_at as string,
        })) as InterviewQuestion[]
      },

      createQuestion: async (offerId: string, data: CreateQuestionInput) => {
        const d = getDb()
        const id = uuid()
        const ts = now()
        await d.execute(
          `INSERT INTO interview_questions (id, offer_id, question, my_answer, difficulty, category, asked_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, offerId, data.question, data.myAnswer ?? null, data.difficulty ?? null, data.category ?? null, data.askedAt ?? null, ts, ts],
        )
        return { id, offerId, question: data.question, myAnswer: data.myAnswer ?? null, difficulty: data.difficulty ?? null, category: data.category ?? null, askedAt: data.askedAt ?? null, createdAt: ts, updatedAt: ts } as InterviewQuestion
      },

      updateQuestion: async (_offerId: string, qId: string, data: UpdateQuestionInput) => {
        const d = getDb()
        const sets: string[] = []
        const params: unknown[] = []
        let idx = 1
        if (data.question !== undefined) { sets.push(`question = $${idx++}`); params.push(data.question) }
        if (data.myAnswer !== undefined) { sets.push(`my_answer = $${idx++}`); params.push(data.myAnswer) }
        if (data.difficulty !== undefined) { sets.push(`difficulty = $${idx++}`); params.push(data.difficulty) }
        if (data.category !== undefined) { sets.push(`category = $${idx++}`); params.push(data.category) }
        if (data.askedAt !== undefined) { sets.push(`asked_at = $${idx++}`); params.push(data.askedAt) }
        sets.push(`updated_at = $${idx++}`)
        params.push(now())
        params.push(qId)
        await d.execute(`UPDATE interview_questions SET ${sets.join(', ')} WHERE id = $${idx}`, params)
        const rows = await d.select<Record<string, unknown>[]>('SELECT * FROM interview_questions WHERE id = $1', [qId])
        const r = rows[0]
        return {
          id: r.id as string, offerId: r.offer_id as string, question: r.question as string,
          myAnswer: r.my_answer as string | null, difficulty: r.difficulty as string | null,
          category: r.category as string | null, askedAt: r.asked_at as string | null,
          createdAt: r.created_at as string, updatedAt: r.updated_at as string,
        } as InterviewQuestion
      },

      deleteQuestion: async (_offerId: string, qId: string) => {
        await getDb().execute('DELETE FROM interview_questions WHERE id = $1', [qId])
      },

      addTechnology: async (offerId: string, data: AddTechnologyInput) => {
        await getDb().execute(
          'INSERT OR IGNORE INTO offer_technologies (offer_id, technology_id, context) VALUES ($1,$2,$3)',
          [offerId, data.technologyId, data.context ?? null],
        )
      },

      removeTechnology: async (offerId: string, techId: string) => {
        await getDb().execute('DELETE FROM offer_technologies WHERE offer_id = $1 AND technology_id = $2', [offerId, techId])
      },

      getStatusLog: async (offerId: string) => {
        const d = getDb()
        // offer_created event
        const offerRows = await d.select<Record<string, unknown>[]>(
          `SELECT o.id, o.company, o.position, o.created_at, ps.name as stage_name, ps.color as stage_color
           FROM offers o LEFT JOIN pipeline_stages ps ON o.current_stage_id = ps.id
           WHERE o.id = $1`, [offerId],
        )
        const events: StatusLogEntry[] = offerRows.map((r) => ({
          type: 'offer_created' as const,
          timestamp: r.created_at as string,
          offerId: r.id as string,
          company: r.company as string,
          position: r.position as string,
          stageName: r.stage_name as string | null,
          stageColor: r.stage_color as string | null,
        }))
        // status_changed events
        const logRows = await d.select<Record<string, unknown>[]>(
          `SELECT osl.*, o.company, o.position, ps.name as stage_name, ps.color as stage_color
           FROM offer_status_log osl
           JOIN offers o ON osl.offer_id = o.id
           JOIN pipeline_stages ps ON osl.to_stage_id = ps.id
           WHERE osl.offer_id = $1 ORDER BY osl.changed_at ASC`, [offerId],
        )
        for (const r of logRows) {
          events.push({
            type: 'status_changed',
            timestamp: r.changed_at as string,
            offerId: r.offer_id as string,
            company: r.company as string,
            position: r.position as string,
            stageName: r.stage_name as string | null,
            stageColor: r.stage_color as string | null,
            note: r.note as string | null,
          })
        }
        return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      },
    },

    contacts: {
      list: async (params?: ContactFilters) => {
        const d = getDb()
        let sql = 'SELECT c.*, (SELECT COUNT(*) FROM offer_contacts oc WHERE oc.contact_id = c.id) as offer_count FROM contacts c WHERE 1=1'
        const p: unknown[] = []
        let idx = 1
        if (params?.search) {
          sql += ` AND (c.name LIKE $${idx} OR c.email LIKE $${idx} OR c.company LIKE $${idx})`
          p.push(`%${params.search}%`)
          idx++
        }
        sql += ' ORDER BY c.name'
        if (params?.limit) { sql += ` LIMIT $${idx++}`; p.push(params.limit) }
        if (params?.offset) { sql += ` OFFSET $${idx++}`; p.push(params.offset) }
        const rows = await d.select<Record<string, unknown>[]>(sql, p)
        return rows.map((r) => ({
          id: r.id as string, name: r.name as string, email: r.email as string | null,
          linkedinUrl: r.linkedin_url as string | null, company: r.company as string | null,
          role: r.role as string | null, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
          offerCount: r.offer_count as number,
        })) as Contact[]
      },

      create: async (data: CreateContactInput) => {
        const d = getDb()
        const id = uuid()
        const ts = now()
        await d.execute(
          'INSERT INTO contacts (id, name, email, linkedin_url, company, role, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [id, data.name, data.email ?? null, data.linkedinUrl ?? null, data.company ?? null, data.role ?? null, ts, ts],
        )
        return { id, name: data.name, email: data.email ?? null, linkedinUrl: data.linkedinUrl ?? null, company: data.company ?? null, role: data.role ?? null, createdAt: ts, updatedAt: ts } as Contact
      },
    },

    timeline: {
      list: async (params?: TimelineFilters) => {
        const d = getDb()
        // Build events from offers + status log
        let offerSql = `SELECT o.id, o.company, o.position, o.created_at, ps.name as stage_name, ps.color as stage_color
          FROM offers o LEFT JOIN pipeline_stages ps ON o.current_stage_id = ps.id
          WHERE o.deleted_at IS NULL`
        const p: unknown[] = []
        let idx = 1
        if (params?.workspace_id) {
          offerSql += ` AND o.workspace_id = $${idx++}`
          p.push(params.workspace_id)
        }
        const offerRows = await d.select<Record<string, unknown>[]>(offerSql, p)
        const offerIds = offerRows.map((r) => r.id as string)

        const events: TimelineResponse['events'] = offerRows.map((r) => ({
          type: 'offer_created' as const,
          timestamp: r.created_at as string,
          offerId: r.id as string,
          company: r.company as string,
          position: r.position as string,
          stageName: r.stage_name as string | null,
          stageColor: r.stage_color as string | null,
        }))

        if (offerIds.length > 0) {
          const placeholders = offerIds.map((_, i) => `$${i + 1}`).join(',')
          const logRows = await d.select<Record<string, unknown>[]>(
            `SELECT osl.*, o.company, o.position, ps.name as stage_name, ps.color as stage_color
             FROM offer_status_log osl
             JOIN offers o ON osl.offer_id = o.id
             JOIN pipeline_stages ps ON osl.to_stage_id = ps.id
             WHERE osl.offer_id IN (${placeholders})
             ORDER BY osl.changed_at ASC`, offerIds,
          )
          for (const r of logRows) {
            events.push({
              type: 'status_changed',
              timestamp: r.changed_at as string,
              offerId: r.offer_id as string,
              company: r.company as string,
              position: r.position as string,
              stageName: r.stage_name as string | null,
              stageColor: r.stage_color as string | null,
              note: r.note as string | null,
            })
          }
        }

        // Filter by date
        let filtered = events
        if (params?.from_date) filtered = filtered.filter((e) => e.timestamp >= params.from_date!)
        if (params?.to_date) filtered = filtered.filter((e) => e.timestamp <= params.to_date!)
        filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

        if (params?.limit) filtered = filtered.slice(params.offset ?? 0, (params.offset ?? 0) + params.limit)

        // Stats
        const stageStats = await d.select<{ stage_name: string; count: number }[]>(
          `SELECT ps.name as stage_name, COUNT(*) as count FROM offers o
           JOIN pipeline_stages ps ON o.current_stage_id = ps.id
           WHERE o.deleted_at IS NULL GROUP BY ps.name`,
        )

        return {
          events: filtered,
          stats: {
            total_offers: offerRows.length,
            by_stage: stageStats.map((s) => ({ stageName: s.stage_name, count: s.count })),
          },
        } as TimelineResponse
      },
    },

    pipeline: {
      list: async () => {
        const rows = await getDb().select<Record<string, unknown>[]>(
          'SELECT * FROM pipeline_stages ORDER BY sort_order',
        )
        return rows.map((r) => ({
          id: r.id as string, name: r.name as string, slug: r.slug as string,
          color: r.color as string, sortOrder: r.sort_order as number,
          isTerminal: !!(r.is_terminal as number), isPositive: r.is_positive === null ? null : !!(r.is_positive as number),
          createdAt: r.created_at as string,
        })) as PipelineStage[]
      },

      create: async (data: CreateStageInput) => {
        const d = getDb()
        const id = uuid()
        const ts = now()
        const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        await d.execute(
          'INSERT INTO pipeline_stages (id, name, slug, color, sort_order, is_terminal, is_positive, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [id, data.name, slug, data.color, data.sortOrder ?? 0, data.isTerminal ? 1 : 0, data.isPositive === undefined ? null : data.isPositive ? 1 : 0, ts],
        )
        return { id, name: data.name, slug, color: data.color, sortOrder: data.sortOrder ?? 0, isTerminal: data.isTerminal ?? false, isPositive: data.isPositive ?? null, createdAt: ts } as PipelineStage
      },

      update: async (id: string, data: UpdateStageInput) => {
        const d = getDb()
        const sets: string[] = []
        const params: unknown[] = []
        let idx = 1
        if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name) }
        if (data.slug !== undefined) { sets.push(`slug = $${idx++}`); params.push(data.slug) }
        if (data.color !== undefined) { sets.push(`color = $${idx++}`); params.push(data.color) }
        if (data.sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); params.push(data.sortOrder) }
        if (data.isTerminal !== undefined) { sets.push(`is_terminal = $${idx++}`); params.push(data.isTerminal ? 1 : 0) }
        if (data.isPositive !== undefined) { sets.push(`is_positive = $${idx++}`); params.push(data.isPositive ? 1 : 0) }
        if (sets.length === 0) return {} as PipelineStage
        params.push(id)
        await d.execute(`UPDATE pipeline_stages SET ${sets.join(', ')} WHERE id = $${idx}`, params)
        const rows = await d.select<Record<string, unknown>[]>('SELECT * FROM pipeline_stages WHERE id = $1', [id])
        const r = rows[0]
        return {
          id: r.id as string, name: r.name as string, slug: r.slug as string,
          color: r.color as string, sortOrder: r.sort_order as number,
          isTerminal: !!(r.is_terminal as number), isPositive: r.is_positive === null ? null : !!(r.is_positive as number),
          createdAt: r.created_at as string,
        } as PipelineStage
      },

      delete: async (id: string) => {
        await getDb().execute('DELETE FROM pipeline_stages WHERE id = $1', [id])
      },

      reorder: async (ids: string[]) => {
        const d = getDb()
        for (let i = 0; i < ids.length; i++) {
          await d.execute('UPDATE pipeline_stages SET sort_order = $1 WHERE id = $2', [i, ids[i]])
        }
      },
    },

    workspaces: {
      list: async () => {
        const rows = await getDb().select<Record<string, unknown>[]>(
          'SELECT * FROM workspaces WHERE deleted_at IS NULL ORDER BY sort_order',
        )
        return rows.map((r) => ({
          id: r.id as string, name: r.name as string, description: r.description as string | null,
          icon: r.icon as string | null, color: r.color as string | null, sortOrder: r.sort_order as number,
          filters: JSON.parse((r.filters as string) || '{}'),
          createdAt: r.created_at as string, updatedAt: r.updated_at as string,
        })) as Workspace[]
      },

      create: async (data: CreateWorkspaceInput) => {
        const d = getDb()
        const id = uuid()
        const ts = now()
        await d.execute(
          'INSERT INTO workspaces (id, name, description, icon, color, filters, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [id, data.name, data.description ?? null, data.icon ?? null, data.color ?? null, '{}', ts, ts],
        )
        return { id, name: data.name, description: data.description ?? null, icon: data.icon ?? null, color: data.color ?? null, sortOrder: 0, filters: {}, createdAt: ts, updatedAt: ts } as Workspace
      },

      update: async (id: string, data: UpdateWorkspaceInput) => {
        const d = getDb()
        const sets: string[] = []
        const params: unknown[] = []
        let idx = 1
        if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name) }
        if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description) }
        if (data.icon !== undefined) { sets.push(`icon = $${idx++}`); params.push(data.icon) }
        if (data.color !== undefined) { sets.push(`color = $${idx++}`); params.push(data.color) }
        sets.push(`updated_at = $${idx++}`)
        params.push(now())
        params.push(id)
        await d.execute(`UPDATE workspaces SET ${sets.join(', ')} WHERE id = $${idx}`, params)
        const rows = await d.select<Record<string, unknown>[]>('SELECT * FROM workspaces WHERE id = $1', [id])
        const r = rows[0]
        return {
          id: r.id as string, name: r.name as string, description: r.description as string | null,
          icon: r.icon as string | null, color: r.color as string | null, sortOrder: r.sort_order as number,
          filters: JSON.parse((r.filters as string) || '{}'),
          createdAt: r.created_at as string, updatedAt: r.updated_at as string,
        } as Workspace
      },

      delete: async (id: string) => {
        await getDb().execute('UPDATE workspaces SET deleted_at = $1 WHERE id = $2', [now(), id])
      },
    },

    technologies: {
      list: async (params?: TechnologyFilters) => {
        const d = getDb()
        let sql = 'SELECT * FROM technologies WHERE 1=1'
        const p: unknown[] = []
        let idx = 1
        if (params?.category) { sql += ` AND category = $${idx++}`; p.push(params.category) }
        if (params?.search) { sql += ` AND name LIKE $${idx++}`; p.push(`%${params.search}%`) }
        sql += ' ORDER BY name'
        const rows = await d.select<Record<string, unknown>[]>(sql, p)
        return rows.map((r) => ({
          id: r.id as string, name: r.name as string, category: r.category as string | null,
          createdAt: r.created_at as string,
        })) as Technology[]
      },

      create: async (data: CreateTechnologyInput) => {
        const d = getDb()
        const id = uuid()
        const ts = now()
        await d.execute('INSERT INTO technologies (id, name, category, created_at) VALUES ($1,$2,$3,$4)', [id, data.name, data.category ?? null, ts])
        return { id, name: data.name, category: data.category ?? null, createdAt: ts } as Technology
      },

      update: async (id: string, data: UpdateTechnologyInput) => {
        const d = getDb()
        const sets: string[] = []
        const params: unknown[] = []
        let idx = 1
        if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name) }
        if (data.category !== undefined) { sets.push(`category = $${idx++}`); params.push(data.category) }
        if (sets.length === 0) return {} as Technology
        params.push(id)
        await d.execute(`UPDATE technologies SET ${sets.join(', ')} WHERE id = $${idx}`, params)
        const rows = await d.select<Record<string, unknown>[]>('SELECT * FROM technologies WHERE id = $1', [id])
        const r = rows[0]
        return { id: r.id as string, name: r.name as string, category: r.category as string | null, createdAt: r.created_at as string } as Technology
      },

      delete: async (id: string) => {
        const d = getDb()
        await d.execute('DELETE FROM offer_technologies WHERE technology_id = $1', [id])
        await d.execute('DELETE FROM technologies WHERE id = $1', [id])
      },
    },

    apiKeys: {
      // API Keys are not relevant in local mode — return stubs
      list: async () => [],
      create: async () => ({ id: '', label: 'local', keyPrefix: 'local', rawKey: 'local-mode' }),
      revoke: async () => {},
    },

    cvs: {
      list: async (filters?: CvFilters) => {
        const d = getDb()
        let sql = `SELECT cs.*,
          (SELECT COUNT(*) FROM offers o WHERE o.cv_snapshot_id = cs.id AND o.deleted_at IS NULL) as offer_count
          FROM cv_snapshots cs WHERE cs.deleted_at IS NULL`
        const p: unknown[] = []
        let idx = 1
        if (filters?.type) { sql += ` AND cs.type = $${idx++}`; p.push(filters.type) }
        if (filters?.search) { sql += ` AND cs.label LIKE $${idx++}`; p.push(`%${filters.search}%`) }
        sql += ' ORDER BY cs.created_at DESC'
        const rows = await d.select<Record<string, unknown>[]>(sql, p)
        return rows.map((r) => ({
          id: r.id as string, label: r.label as string, type: r.type as 'cv' | 'cover_letter',
          notes: r.notes as string | null, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
          offerCount: r.offer_count as number,
        })) as CvSnapshot[]
      },

      get: async (id: string) => {
        const d = getDb()
        const rows = await d.select<Record<string, unknown>[]>(
          'SELECT * FROM cv_snapshots WHERE id = $1 AND deleted_at IS NULL', [id],
        )
        if (rows.length === 0) throw new Error('CV not found')
        const r = rows[0]
        const offerRows = await d.select<Record<string, unknown>[]>(
          'SELECT id, company, position, applied_at FROM offers WHERE cv_snapshot_id = $1 AND deleted_at IS NULL', [id],
        )
        return {
          id: r.id as string, label: r.label as string, type: r.type as 'cv' | 'cover_letter',
          latexSource: r.latex_source as string, compiledPdf: r.compiled_pdf as string | null,
          notes: r.notes as string | null, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
          offers: offerRows.map((o) => ({
            id: o.id as string, company: o.company as string, position: o.position as string, appliedAt: o.applied_at as string,
          })),
        } as CvSnapshotDetail
      },

      create: async (data: CreateCvInput) => {
        const d = getDb()
        const id = uuid()
        const ts = now()
        await d.execute(
          'INSERT INTO cv_snapshots (id, label, type, latex_source, compiled_pdf, notes, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [id, data.label, data.type ?? 'cv', data.latexSource, data.compiledPdf ?? null, data.notes ?? null, ts, ts],
        )
        return {
          id, label: data.label, type: data.type ?? 'cv', latexSource: data.latexSource,
          compiledPdf: data.compiledPdf ?? null, notes: data.notes ?? null, createdAt: ts, updatedAt: ts, offers: [],
        } as CvSnapshotDetail
      },

      update: async (id: string, data: UpdateCvInput) => {
        const d = getDb()
        const sets: string[] = []
        const params: unknown[] = []
        let idx = 1
        if (data.label !== undefined) { sets.push(`label = $${idx++}`); params.push(data.label) }
        if (data.type !== undefined) { sets.push(`type = $${idx++}`); params.push(data.type) }
        if (data.latexSource !== undefined) { sets.push(`latex_source = $${idx++}`); params.push(data.latexSource) }
        if (data.compiledPdf !== undefined) { sets.push(`compiled_pdf = $${idx++}`); params.push(data.compiledPdf) }
        if (data.notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(data.notes) }
        sets.push(`updated_at = $${idx++}`)
        params.push(now())
        params.push(id)
        await d.execute(`UPDATE cv_snapshots SET ${sets.join(', ')} WHERE id = $${idx}`, params)
        const rows = await d.select<Record<string, unknown>[]>('SELECT * FROM cv_snapshots WHERE id = $1', [id])
        const r = rows[0]
        const offerRows = await d.select<Record<string, unknown>[]>(
          'SELECT id, company, position, applied_at FROM offers WHERE cv_snapshot_id = $1 AND deleted_at IS NULL', [id],
        )
        return {
          id: r.id as string, label: r.label as string, type: r.type as 'cv' | 'cover_letter',
          latexSource: r.latex_source as string, compiledPdf: r.compiled_pdf as string | null,
          notes: r.notes as string | null, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
          offers: offerRows.map((o) => ({
            id: o.id as string, company: o.company as string, position: o.position as string, appliedAt: o.applied_at as string,
          })),
        } as CvSnapshotDetail
      },

      delete: async (id: string) => {
        await getDb().execute('UPDATE cv_snapshots SET deleted_at = $1 WHERE id = $2', [now(), id])
      },
    },
  }
}
