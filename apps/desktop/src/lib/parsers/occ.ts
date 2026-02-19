import type { JobParser } from './types'
import { getText, parseSalary, parseModality, parseLevel, parseJobType, extractTechnologies, htmlToText } from './utils'

export const occParser: JobParser = {
  platform: 'OCC',

  detect: (_doc, html) => html.includes('occ.com.mx'),

  parse: (doc, html) => {
    const position = getText(doc, '[data-test="job-title"]')
      || getText(doc, 'h1')
    const company = getText(doc, '[data-test="company-name"]')
      || getText(doc, '.company-name')
    const salaryText = getText(doc, '[data-test="salary"]') || ''
    const salary = parseSalary(salaryText)
    const descriptionEl = doc.querySelector('[data-test="job-description"]') || doc.querySelector('.description')
    const descriptionHtml = descriptionEl?.innerHTML || ''
    const description = descriptionHtml ? htmlToText(descriptionHtml) : undefined
    const fullText = htmlToText(html)

    return {
      company,
      position,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency || 'MXN',
      salaryPeriod: salary.period || 'monthly',
      modality: parseModality(fullText),
      level: parseLevel(position || fullText),
      type: parseJobType(fullText),
      description,
      technologies: extractTechnologies(fullText),
      sourcePlatform: 'OCC',
    }
  },
}
