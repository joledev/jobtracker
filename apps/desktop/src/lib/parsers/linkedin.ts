import type { JobParser } from './types'
import { getText, parseSalary, parseModality, parseLevel, parseJobType, extractTechnologies, htmlToText, getAllText } from './utils'

export const linkedinParser: JobParser = {
  platform: 'LinkedIn',

  detect: (_doc, html) => html.includes('linkedin.com'),

  parse: (doc, html) => {
    const position = getText(doc, '.topcard__title')
      || getText(doc, '.top-card-layout__title')
      || getText(doc, 'h1')
    const company = getText(doc, '.topcard__org-name-link')
      || getText(doc, '.topcard__flavor a')
      || getText(doc, '.top-card-layout__second-subline a')
    const location = getText(doc, '.topcard__flavor--bullet')
      || getText(doc, '.top-card-layout__bullet')

    const descriptionEl = doc.querySelector('.show-more-less-html__markup')
      || doc.querySelector('.description__text')
    const descriptionHtml = descriptionEl?.innerHTML || ''
    const description = descriptionHtml ? htmlToText(descriptionHtml) : undefined

    const criteria = getAllText(doc, '.description__job-criteria-item .description__job-criteria-text')
    const criteriaLabels = getAllText(doc, '.description__job-criteria-item .description__job-criteria-subheader')

    let salaryText = ''
    const fullText = htmlToText(html)

    const salaryIdx = criteriaLabels.findIndex((l) => /salary|sueldo|compensaci/i.test(l))
    if (salaryIdx >= 0 && criteria[salaryIdx]) {
      salaryText = criteria[salaryIdx]
    }

    const salary = parseSalary(salaryText || fullText)

    return {
      company,
      position,
      location,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency || 'USD',
      salaryPeriod: salary.period || 'annual',
      modality: parseModality(fullText),
      level: parseLevel(position || fullText),
      type: parseJobType(criteria.join(' ') || fullText),
      description,
      technologies: extractTechnologies(fullText),
      sourcePlatform: 'LinkedIn',
    }
  },
}
