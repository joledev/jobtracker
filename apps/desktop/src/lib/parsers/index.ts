import type { JobPlatform, ParsedOffer, ParseResult, ParseTemplate } from './types'
import { occParser } from './occ'
import { linkedinParser } from './linkedin'
import { indeedParser } from './indeed'
import { computrabajoParser } from './computrabajo'
import { genericParser } from './generic'
import { getText, htmlToText, truncate, parseSalary, extractTechnologies } from './utils'

const platformParsers = [occParser, linkedinParser, indeedParser, computrabajoParser]

const confidenceMap: Record<JobPlatform, number> = {
  OCC: 0.85,
  LinkedIn: 0.85,
  Indeed: 0.85,
  Computrabajo: 0.85,
  generic: 0.3,
}

export const detectPlatform = (doc: Document, html: string): { platform: JobPlatform; confidence: number } => {
  for (const parser of platformParsers) {
    if (parser.detect(doc, html)) {
      return { platform: parser.platform, confidence: confidenceMap[parser.platform] }
    }
  }
  return { platform: 'generic', confidence: 0.3 }
}

const resolveDescription = (doc: Document, desc: string | string[] | undefined): string | undefined => {
  if (!desc) return undefined
  const selectors = Array.isArray(desc) ? desc : [desc]
  const parts: string[] = []
  for (const sel of selectors) {
    const el = doc.querySelector(sel)
    if (el) parts.push(htmlToText(el.innerHTML))
  }
  return parts.length > 0 ? parts.join('\n\n') : undefined
}

const applyTemplate = (doc: Document, template: ParseTemplate): ParsedOffer => {
  const { selectors } = template
  const company = selectors.company ? getText(doc, selectors.company) : undefined
  const position = selectors.position ? getText(doc, selectors.position) : undefined
  const location = selectors.location ? getText(doc, selectors.location) : undefined
  const modality = selectors.modality ? getText(doc, selectors.modality) : undefined
  const type = selectors.type ? getText(doc, selectors.type) : undefined
  const level = selectors.level ? getText(doc, selectors.level) : undefined
  const salaryText = selectors.salary ? getText(doc, selectors.salary) || '' : ''
  const salary = parseSalary(salaryText)
  const description = resolveDescription(doc, selectors.description)
  const fullText = description || ''

  return {
    company,
    position,
    location,
    modality,
    type,
    level,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    salaryPeriod: salary.period,
    description,
    technologies: extractTechnologies(fullText),
    sourcePlatform: template.platform || undefined,
  }
}

export const parseJobHtml = (html: string, templates?: ParseTemplate[]): ParseResult => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const rawText = htmlToText(html)

  if (templates?.length) {
    for (const template of templates) {
      const offer = applyTemplate(doc, template)
      if (offer.position || offer.company) {
        return {
          platform: 'generic',
          offer,
          confidence: 0.7,
          rawTextPreview: truncate(rawText, 500),
        }
      }
    }
  }

  const { platform, confidence } = detectPlatform(doc, html)

  const parserInstance = platformParsers.find((p) => p.platform === platform) || genericParser
  const offer = parserInstance.parse(doc, html)

  return {
    platform,
    offer,
    confidence,
    rawTextPreview: truncate(rawText, 500),
  }
}

export const parsedOfferToFormValues = (parsed: ParsedOffer): Record<string, string> => {
  const values: Record<string, string> = {}

  if (parsed.company) values.company = parsed.company
  if (parsed.position) values.position = parsed.position
  if (parsed.level) values.level = parsed.level
  if (parsed.type) values.type = parsed.type
  if (parsed.modality) values.modality = parsed.modality
  if (parsed.salaryMin) values.salaryMin = String(parsed.salaryMin)
  if (parsed.salaryMax) values.salaryMax = String(parsed.salaryMax)
  if (parsed.salaryCurrency) values.salaryCurrency = parsed.salaryCurrency
  if (parsed.salaryPeriod) values.salaryPeriod = parsed.salaryPeriod
  if (parsed.sourceUrl) values.sourceUrl = parsed.sourceUrl
  if (parsed.sourcePlatform) values.sourcePlatform = parsed.sourcePlatform
  if (parsed.description) values.notes = parsed.description.slice(0, 1000)

  return values
}

export type { JobPlatform, ParsedOffer, ParseResult, ParseTemplate }
