// Pipeline & Workspaces

export interface PipelineStage {
  id: string
  name: string
  slug: string
  color: string
  sortOrder: number
  isTerminal: boolean
  isPositive: boolean | null
  createdAt: string
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  sortOrder: number
  filters: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// Technologies & CVs

export interface Technology {
  id: string
  name: string
  category: string | null
  createdAt: string
}

export interface CvSnapshot {
  id: string
  label: string
  type: 'cv' | 'cover_letter'
  notes: string | null
  createdAt: string
  updatedAt: string
  offerCount: number
}

export interface CvSnapshotDetail extends Omit<CvSnapshot, 'offerCount'> {
  latexSource: string
  compiledPdf: string | null
  offers: { id: string; company: string; position: string; appliedAt: string }[]
}

export interface CreateCvInput {
  label: string
  latexSource: string
  type?: 'cv' | 'cover_letter'
  notes?: string
  compiledPdf?: string
}

export type UpdateCvInput = Partial<CreateCvInput>

export interface CvFilters {
  type?: 'cv' | 'cover_letter'
  search?: string
}

// Offers — list endpoint (flat stage data)

export interface OfferListItem {
  id: string
  company: string
  position: string
  level: string | null
  type: string | null
  modality: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  currentStageId: string | null
  appliedAt: string
  sourceUrl: string | null
  sourcePlatform: string | null
  workspaceId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  stageName: string | null
  stageSlug: string | null
  stageColor: string | null
}

// Offers — detail endpoint (nested objects)

export interface OfferDetail extends Omit<OfferListItem, 'stageName' | 'stageSlug' | 'stageColor'> {
  stage: {
    id: string
    name: string
    slug: string
    color: string
    isTerminal: boolean
  } | null
  workspace: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
  cvSnapshot: {
    id: string
    label: string
  } | null
  technologies: {
    id: string
    name: string
    category: string | null
    context: string | null
  }[]
  contacts: {
    id: string
    name: string
    email: string | null
    linkedinUrl: string
    company: string | null
    role: string | null
  }[]
}

// Contacts

export interface Contact {
  id: string
  name: string
  email: string | null
  linkedinUrl: string | null
  company: string | null
  role: string | null
  createdAt: string
  updatedAt: string
  offerCount?: number
}

// Phone Calls

export type CommunicationChannel = 'email' | 'linkedin' | 'whatsapp' | 'other'
export type CommunicationDirection = 'inbound' | 'outbound'

/** Correo, mensaje de LinkedIn o WhatsApp. Las llamadas van en PhoneCall:
 *  tienen duracion y numero, y no conviene el mismo evento en dos tablas. */
export interface Communication {
  id: string
  offerId: string
  contactId: string | null
  channel: CommunicationChannel
  direction: CommunicationDirection
  subject: string | null
  body: string | null
  occurredAt: string
  contactName?: string | null
  createdAt: string
}

export interface PhoneCall {
  id: string
  offerId: string
  phoneNumber: string | null
  contactId: string | null
  calledAt: string
  durationMinutes: number | null
  notes: string | null
  callType: string
  contactName?: string | null
  createdAt: string
  updatedAt: string
}

// Interview Questions

export interface InterviewQuestion {
  id: string
  offerId: string
  question: string
  myAnswer: string | null
  difficulty: string | null
  category: string | null
  askedAt: string | null
  createdAt: string
  updatedAt: string
}

// Reminders

export interface Reminder {
  id: string
  offerId: string
  title: string
  scheduledAt: string
  locationType: 'video' | 'in_person'
  videoLink: string | null
  address: string | null
  contactId: string | null
  contactName?: string | null
  notes: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateReminderInput {
  title: string
  scheduledAt: string
  locationType: 'video' | 'in_person'
  videoLink?: string
  address?: string
  contactId?: string
  notes?: string
}

export type UpdateReminderInput = Partial<CreateReminderInput>

// Offer Technologies (from detail endpoint)

export interface OfferTechnology {
  id: string
  name: string
  category: string | null
  context: string | null
}

// Status Log (from timeline endpoint, filtered by offer)

export interface StatusLogEntry {
  type: 'offer_created' | 'status_changed'
  timestamp: string
  offerId: string
  company: string
  position: string
  stageName: string | null
  stageColor: string | null
  note?: string | null
}

// Timeline

export interface TimelineEvent {
  type: 'offer_created' | 'status_changed'
  timestamp: string
  offerId: string
  company: string
  position: string
  stageName: string | null
  stageColor: string | null
  note?: string | null
}

export interface TimelineStats {
  total_offers: number
  by_stage: { stageName: string; count: number }[]
}

export interface TimelineResponse {
  events: TimelineEvent[]
  stats: TimelineStats
}

// Inputs

export interface CreateOfferInput {
  company: string
  position: string
  level?: string
  type?: string
  modality?: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  salaryPeriod?: string
  currentStageId?: string
  appliedAt?: string
  sourceUrl?: string
  sourcePlatform?: string
  cvSnapshotId?: string
  workspaceId?: string
  notes?: string
}

export type UpdateOfferInput = Partial<CreateOfferInput>

export interface ChangeStatusInput {
  stageId: string
  note?: string
}

export interface CreateContactInput {
  name: string
  email?: string
  linkedinUrl?: string
  company?: string
  role?: string
}

export interface CreateCommunicationInput {
  contactId?: string
  channel?: CommunicationChannel
  direction?: CommunicationDirection
  subject?: string
  body?: string
  occurredAt: string
}

export type UpdateCommunicationInput = Partial<CreateCommunicationInput>

export interface CreateCallInput {
  phoneNumber?: string
  contactId?: string
  calledAt: string
  durationMinutes?: number
  notes?: string
  callType?: string
}

export interface CreateQuestionInput {
  question: string
  myAnswer?: string
  difficulty?: string
  category?: string
  askedAt?: string
}

export type UpdateQuestionInput = Partial<CreateQuestionInput>

export interface AddTechnologyInput {
  technologyId: string
  context?: string
}

// API Keys

export interface ApiKey {
  id: string
  label: string
  keyPrefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface CreateApiKeyResponse {
  id: string
  label: string
  keyPrefix: string
  rawKey: string
}

// Settings inputs

export interface CreateStageInput {
  name: string
  slug?: string
  color: string
  sortOrder?: number
  isTerminal?: boolean
  isPositive?: boolean
}

export type UpdateStageInput = Partial<CreateStageInput>

export interface CreateWorkspaceInput {
  name: string
  description?: string
  icon?: string
  color?: string
}

export type UpdateWorkspaceInput = Partial<CreateWorkspaceInput>

export interface CreateTechnologyInput {
  name: string
  category?: string
}

export interface UpdateTechnologyInput {
  name?: string
  category?: string | null
}

// Filters

export interface OfferFilters {
  search?: string
  stage_id?: string
  workspace_id?: string
  limit?: number
  offset?: number
}

export interface TechnologyFilters {
  category?: string
  search?: string
}

export interface ContactFilters {
  search?: string
  limit?: number
  offset?: number
}

export interface TimelineFilters {
  workspace_id?: string
  stage_id?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}
