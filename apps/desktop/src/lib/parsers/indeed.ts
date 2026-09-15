import type { JobParser } from './types'
import { getText, parseSalary, parseModality, parseLevel, parseJobType, extractTechnologies, htmlToText } from './utils'

export const indeedParser: JobParser = {
  platform: 'Indeed',

  detect: (_doc, html) => html.includes('indeed.com'),

  parse: (doc, html) => {
    const position = getText(doc, '.jobsearch-JobInfoHeader-title')
      || getText(doc, '[data-testid="jobsearch-JobInfoHeader-title"]')
      || getText(doc, 'h1')
    const company = getText(doc, '[data-company-name]')
      || getText(doc, '.jobsearch-CompanyInfoWithoutHeaderImage a')
      || getText(doc, '.css-1ioi40n')
    const location = getText(doc, '.jobsearch-JobInfoHeader-subtitle .css-1restlb')
      || getText(doc, '[data-testid="job-location"]')

    const descriptionEl = doc.querySelector('#jobDescriptionText')
      || doc.querySelector('.jobsearch-jobDescriptionText')
    const descriptionHtml = descriptionEl?.innerHTML || ''
    const description = descriptionHtml ? htmlToText(descriptionHtml) : undefined

    const salaryText = getText(doc, '#salaryInfoAndJobType') || getText(doc, '.salary-snippet') || ''
    const salary = parseSalary(salaryText)
    const fullText = htmlToText(html)

    return {
      company,
      position,
      location,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      salaryPeriod: salary.period,
      modality: parseModality(fullText),
      level: parseLevel(position || fullText),
      type: parseJobType(fullText),
      description,
      technologies: extractTechnologies(fullText),
      sourcePlatform: 'Indeed',
    }
  },
}
