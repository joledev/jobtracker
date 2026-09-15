import type { JobParser, ParsedOffer } from './types'
import { getText, getAttr, parseSalary, parseModality, parseLevel, parseJobType, extractTechnologies, htmlToText } from './utils'

interface JobPostingLD {
  '@type'?: string
  title?: string
  hiringOrganization?: { name?: string } | string
  jobLocation?: { address?: { addressLocality?: string; addressRegion?: string } }
  baseSalary?: { value?: { minValue?: number; maxValue?: number; unitText?: string }; currency?: string }
  description?: string
  employmentType?: string
  jobLocationType?: string
}

const parseJsonLd = (doc: Document): JobPostingLD | null => {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '')
      if (data['@type'] === 'JobPosting') return data
      if (Array.isArray(data['@graph'])) {
        const posting = data['@graph'].find((item: Record<string, unknown>) => item['@type'] === 'JobPosting')
        if (posting) return posting
      }
    } catch {
      // invalid JSON, skip
    }
  }
  return null
}

const fromJsonLd = (ld: JobPostingLD): ParsedOffer => {
  const org = ld.hiringOrganization
  const company = typeof org === 'string' ? org : org?.name

  const addr = ld.jobLocation?.address
  const location = addr ? [addr.addressLocality, addr.addressRegion].filter(Boolean).join(', ') : undefined

  const baseSalary = ld.baseSalary
  const salaryVal = baseSalary?.value
  const periodMap: Record<string, string> = { YEAR: 'annual', MONTH: 'monthly', HOUR: 'hourly' }

  const desc = ld.description ? htmlToText(ld.description) : undefined

  return {
    company,
    position: ld.title,
    location,
    salaryMin: salaryVal?.minValue,
    salaryMax: salaryVal?.maxValue,
    salaryCurrency: baseSalary?.currency,
    salaryPeriod: salaryVal?.unitText ? periodMap[salaryVal.unitText] : undefined,
    description: desc,
    type: ld.employmentType ? parseJobType(ld.employmentType) : undefined,
    modality: ld.jobLocationType === 'TELECOMMUTE' ? 'remote' : undefined,
    technologies: desc ? extractTechnologies(desc) : [],
  }
}

export const genericParser: JobParser = {
  platform: 'generic',

  detect: () => true,

  parse: (doc, html) => {
    const ld = parseJsonLd(doc)
    if (ld) {
      const offer = fromJsonLd(ld)
      if (offer.position || offer.company) return offer
    }

    const fullText = htmlToText(html)
    const position = getText(doc, 'h1') || getText(doc, 'h2')
    const company = getAttr(doc, 'meta[property="og:site_name"]', 'content')

    const salary = parseSalary(fullText)

    return {
      company,
      position,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      salaryPeriod: salary.period,
      modality: parseModality(fullText),
      level: parseLevel(fullText),
      type: parseJobType(fullText),
      description: fullText.slice(0, 2000),
      technologies: extractTechnologies(fullText),
    }
  },
}
