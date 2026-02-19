import type { JobParser } from './types'
import { getText, parseSalary, parseModality, parseLevel, parseJobType, extractTechnologies, htmlToText } from './utils'

export const computrabajoParser: JobParser = {
  platform: 'Computrabajo',

  detect: (_doc, html) => html.includes('computrabajo.com'),

  parse: (doc, html) => {
    const position = getText(doc, 'h1.title_offer')
      || getText(doc, '.box_detail h1')
      || getText(doc, 'h1')
    const company = getText(doc, '.info_company .enterprise')
      || getText(doc, '.box_detail .fs16')
    const location = getText(doc, '.info_company .location')
      || getText(doc, '.box_detail .fs13')

    const descriptionEl = doc.querySelector('.offer_description')
      || doc.querySelector('.box_detail .mbB')
    const descriptionHtml = descriptionEl?.innerHTML || ''
    const description = descriptionHtml ? htmlToText(descriptionHtml) : undefined

    const salaryText = getText(doc, '.tag.base.salario') || getText(doc, '.info_company .salary') || ''
    const salary = parseSalary(salaryText)
    const fullText = htmlToText(html)

    return {
      company,
      position,
      location,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency || 'MXN',
      salaryPeriod: salary.period || 'monthly',
      modality: parseModality(fullText),
      level: parseLevel(position || fullText),
      type: parseJobType(fullText),
      description,
      technologies: extractTechnologies(fullText),
      sourcePlatform: 'Computrabajo',
    }
  },
}
