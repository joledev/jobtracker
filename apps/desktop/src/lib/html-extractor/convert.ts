import type { ExtractedNode } from './types'
import { parseSalary, parseLevel, parseJobType, parseModality } from '@/lib/parsers/utils'

export const assignmentsToFormValues = (nodes: ExtractedNode[]): Record<string, string> => {
  const values: Record<string, string> = {}
  const notesParts: string[] = []

  for (const node of nodes) {
    switch (node.assignment) {
      case 'position':
        values.position = node.text
        break
      case 'company':
        values.company = node.text
        break
      case 'salary': {
        const salary = parseSalary(node.text)
        if (salary.min) values.salaryMin = String(salary.min)
        if (salary.max) values.salaryMax = String(salary.max)
        if (salary.currency) values.salaryCurrency = salary.currency
        if (salary.period) values.salaryPeriod = salary.period
        break
      }
      case 'level': {
        const level = parseLevel(node.text)
        if (level) values.level = level
        break
      }
      case 'type': {
        const type = parseJobType(node.text)
        if (type) values.type = type
        break
      }
      case 'modality': {
        const modality = parseModality(node.text)
        if (modality) values.modality = modality
        break
      }
      case 'location':
        notesParts.push(`Ubicacion: ${node.text}`)
        break
      case 'notes':
        notesParts.push(node.text)
        break
    }
  }

  if (notesParts.length > 0) {
    values.notes = notesParts.join('\n')
  }

  return values
}
