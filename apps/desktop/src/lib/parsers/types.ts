export type JobPlatform = 'OCC' | 'LinkedIn' | 'Indeed' | 'Computrabajo' | 'generic'

export interface ParsedOffer {
  company?: string
  position?: string
  level?: string
  type?: string
  modality?: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  salaryPeriod?: string
  sourceUrl?: string
  sourcePlatform?: string
  description?: string
  technologies?: string[]
  location?: string
}

export interface ParseResult {
  platform: JobPlatform
  offer: ParsedOffer
  confidence: number
  rawTextPreview: string
}

export interface ParseTemplate {
  id: string
  name: string
  platform: string
  selectors: {
    company?: string
    position?: string
    salary?: string
    location?: string
    modality?: string
    type?: string
    level?: string
    description?: string | string[]
  }
  createdAt: string
}

export interface JobParser {
  platform: JobPlatform
  detect: (doc: Document, html: string) => boolean
  parse: (doc: Document, html: string) => ParsedOffer
}
